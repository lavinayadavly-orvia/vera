import type {
  ApiNamespace,
  AuditSnapshot,
  ContentType,
  GeneratedOutput,
  Market,
  PiiScrubReport,
  RegulatoryContentType,
  RulesEngineReport,
} from '@/types';

const PROVIDER_MODEL = 'gpt-4o';

export function buildProviderComplianceProfile(namespace: ApiNamespace) {
  return {
    provider: 'OpenAI Browser Client',
    model: PROVIDER_MODEL,
    zeroDataRetention: 'unsupported' as const,
    namespace,
    notes: [
      'Current implementation uses browser-side OpenAI calls and does not guarantee provider-side zero data retention.',
      'For production ZDR, route requests through Azure OpenAI ZDR or AWS Bedrock and disable browser-direct inference.',
    ],
  };
}

export function createAuditSnapshot(params: {
  output: GeneratedOutput;
  market: Market;
  namespace: ApiNamespace;
  contentType: ContentType;
  regulatoryContentType: RegulatoryContentType;
  prompt: string;
  scrubReport: PiiScrubReport;
  rulesEngine: RulesEngineReport;
  priorSnapshots?: AuditSnapshot[];
}): AuditSnapshot[] {
  const createdAt = new Date().toISOString();
  const snapshot: AuditSnapshot = {
    snapshotId: `snap_${Date.now()}`,
    createdAt,
    llmModel: PROVIDER_MODEL,
    rulesEngineVersion: params.rulesEngine.version,
    namespace: params.namespace,
    market: params.market,
    contentType: params.contentType,
    regulatoryContentType: params.regulatoryContentType,
    stateBlob: JSON.stringify(
      {
        createdAt,
        prompt: params.prompt,
        output: {
          content: params.output.content,
          textContent: params.output.textContent,
          contentType: params.output.contentType,
          format: params.output.format,
          theme: params.output.theme,
          renderVariant: params.output.renderVariant,
          market: params.output.market,
          audience: params.output.audience,
          sourceCount: params.output.sources?.length || 0,
          sources: params.output.sources || [],
          sourceGovernance: params.output.sourceGovernance,
          operationalGuardrails: params.output.operationalGuardrails,
        },
        scrubReport: params.scrubReport,
        rulesEngine: params.rulesEngine,
      },
      null,
      2,
    ),
  };

  return [...(params.priorSnapshots || []), snapshot];
}
