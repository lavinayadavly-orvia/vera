import type {
  ContentType,
  Market,
  RegulatoryContentType,
  VeevaAssetLink,
  VeevaConnectionStatus,
} from '@/types';

const THERAPEUTIC_AREA_KEYWORDS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'Diabetes', patterns: [/\bdiabetes\b/i, /\bglp-1\b/i, /\binsulin\b/i] },
  { label: 'Oncology', patterns: [/\boncology\b/i, /\bcancer\b/i, /\btumou?r\b/i] },
  { label: 'Cardiology', patterns: [/\bcardio/i, /\bheart\b/i, /\bstroke\b/i] },
  { label: 'Rare Disease', patterns: [/\brare disease\b/i, /\borphan\b/i] },
];

function inferTherapeuticArea(prompt: string): string {
  const match = THERAPEUTIC_AREA_KEYWORDS.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(prompt)),
  );
  return match?.label || 'General Medicine';
}

function marketLabel(market: Market): string {
  if (market === 'dubai') return 'Dubai / UAE';
  if (market === 'us') return 'United States';
  if (market === 'uk') return 'United Kingdom';
  return market.charAt(0).toUpperCase() + market.slice(1);
}

export function getVeevaConnectionStatus(): VeevaConnectionStatus {
  const vaultDomain = import.meta.env.VITE_VEEVA_VAULT_DOMAIN;
  const clientId = import.meta.env.VITE_VEEVA_CLIENT_ID;

  return {
    configured: Boolean(vaultDomain && clientId),
    authMode: 'oidc-oauth2',
    vaultDomain: vaultDomain || undefined,
    webhookReady: Boolean(vaultDomain && clientId),
    crudCapabilities: ['get', 'post', 'status-listen'],
    notes: vaultDomain && clientId
      ? [
          'OIDC / OAuth2 configuration detected for Vault connectivity.',
          'Use POST to Document__v for finalized assets and GET for approved claims/components.',
        ]
      : [
          'Veeva Vault integration is scaffolded but not configured in this environment.',
          'Add VITE_VEEVA_VAULT_DOMAIN and VITE_VEEVA_CLIENT_ID to enable live connectivity.',
        ],
  };
}

export function buildVeevaAssetLink(
  prompt: string,
  contentType: ContentType,
  market: Market,
  regulatoryContentType: RegulatoryContentType,
): VeevaAssetLink {
  return {
    objectType: 'Document__v',
    assetStatus: 'not-synced',
    metadataFields: {
      Product: 'To be mapped from approved claims library',
      Country: marketLabel(market),
      TherapeuticArea: inferTherapeuticArea(prompt),
      RegulatoryContentType: regulatoryContentType,
      AssetFormat: contentType,
    },
    syncCapabilities: ['get-approved-claims', 'post-final-asset', 'withdrawal-webhook'],
  };
}

export function buildVaultDocumentPayload(
  title: string,
  market: Market,
  metadataFields: Record<string, string>,
): Record<string, string> {
  return {
    name__v: title,
    country__c: marketLabel(market),
    ...metadataFields,
  };
}

export function buildApprovedClaimsRequest(): Record<string, string> {
  return {
    method: 'GET',
    object: 'Approved_Claim__v',
    purpose: 'Populate the local approved claims / approved components library.',
  };
}

export function buildPushFinalAssetRequest(metadataFields: Record<string, string>): Record<string, unknown> {
  return {
    method: 'POST',
    object: 'Document__v',
    payloadMapping: metadataFields,
    purpose: 'Push finalized approved content into Veeva Vault / PromoMats.',
  };
}

export function buildWithdrawalWebhookDescriptor(): Record<string, string> {
  return {
    event: 'document_status_change',
    trigger: 'Approved -> Expired or Withdrawn',
    action: 'Mark linked local asset as withdrawn and block further reuse.',
  };
}
