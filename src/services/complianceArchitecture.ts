import type { ApiNamespace, ComplianceArchitectureSummary, DetailedGenerationParams, GeneratedOutput, PiiScrubReport } from '@/types';
import { buildProviderComplianceProfile, createAuditSnapshot } from '@/services/auditSnapshots';
import { buildContentHierarchy } from '@/services/contentHierarchy';
import { buildModularContentLibrary } from '@/services/contentLibrary';
import { buildEvidenceDossier } from '@/services/referenceManager';
import { evaluateRegulatoryRules } from '@/services/regulatoryRules';
import { buildSecurityArchitecture } from '@/services/securityArchitecture';
import { buildWithdrawalMonitor } from '@/services/withdrawalMonitor';
import { buildAuditDashboard } from '@/services/auditDashboard';
import {
  buildApprovedClaimsRequest,
  buildPushFinalAssetRequest,
  buildVeevaAssetLink,
  buildVaultDocumentPayload,
  buildWithdrawalWebhookDescriptor,
  getVeevaConnectionStatus,
} from '@/services/veevaVault';

export function inferApiNamespace(params: Pick<DetailedGenerationParams, 'contentType' | 'targetAudience' | 'prompt'>): ApiNamespace {
  if (params.contentType === 'social-post' || /\bbrand|campaign|launch|promo|promotional\b/i.test(params.prompt)) {
    return 'marketing';
  }

  if (/\bhcp|clinician|medical affairs|msl\b/i.test(params.targetAudience)) {
    return 'medical';
  }

  return 'medical';
}

export function buildComplianceArchitectureSummary(params: {
  generationParams: DetailedGenerationParams;
  output: GeneratedOutput;
  scrubReport: PiiScrubReport;
  priorSnapshots?: ComplianceArchitectureSummary['snapshots'];
}): ComplianceArchitectureSummary {
  const namespace = params.generationParams.apiNamespace || inferApiNamespace(params.generationParams);
  const rulesEngine = evaluateRegulatoryRules({
    market: params.generationParams.market,
    namespace,
    output: params.output,
  });
  const dossier = buildEvidenceDossier(params.output.textContent || params.output.content, params.output.sources, namespace);
  const provider = buildProviderComplianceProfile(namespace);
  const hierarchy = buildContentHierarchy(params.generationParams.prompt, params.generationParams.market);
  const veevaConnection = getVeevaConnectionStatus();
  const veevaAssetLink = buildVeevaAssetLink(
    params.generationParams.prompt,
    params.generationParams.contentType,
    params.generationParams.market,
    rulesEngine.regulatoryContentType,
  );
  const contentLibrary = buildModularContentLibrary({
    output: params.output,
    dossier,
    rulesEngine,
  });
  const withdrawalMonitor = buildWithdrawalMonitor({
    contentLibrary,
    watchedSources: dossier.sourceDocuments.map((document) => ({
      sourceDocId: document.sourceDocId,
      title: document.title,
      sourceType: document.sourceType,
    })),
    veevaAssetLink,
  });
  const security = buildSecurityArchitecture();

  const snapshots = createAuditSnapshot({
    output: params.output,
    market: params.generationParams.market,
    namespace,
    contentType: params.generationParams.contentType,
    regulatoryContentType: rulesEngine.regulatoryContentType,
    prompt: params.generationParams.prompt,
    scrubReport: params.scrubReport,
    rulesEngine,
    priorSnapshots: params.priorSnapshots,
  });
  const auditDashboard = buildAuditDashboard({
    market: params.generationParams.market,
    namespace,
    contentType: params.generationParams.contentType,
    rulesEngine,
    contentLibrary,
    snapshotCount: snapshots.length,
  });

  return {
    namespace,
    regulatoryContentType: rulesEngine.regulatoryContentType,
    provider,
    dossier,
    contentLibrary,
    rulesEngine,
    snapshots,
    scrubReport: params.scrubReport,
    hierarchy,
    withdrawalMonitor,
    auditDashboard,
    security,
    veeva: {
      connection: {
        ...veevaConnection,
        notes: [
          ...veevaConnection.notes,
          `Prepared payload shape: ${JSON.stringify(buildVaultDocumentPayload(params.generationParams.prompt, params.generationParams.market, veevaAssetLink.metadataFields))}`,
          `Approved claims request: ${JSON.stringify(buildApprovedClaimsRequest())}`,
          `Push final asset request: ${JSON.stringify(buildPushFinalAssetRequest(veevaAssetLink.metadataFields))}`,
          `Withdrawal webhook: ${JSON.stringify(buildWithdrawalWebhookDescriptor())}`,
        ],
      },
      assetLink: veevaAssetLink,
    },
  };
}
