import type { DetailedGenerationParams, GeneratedOutput } from '@/types';
import { buildComplianceArchitectureSummary, inferApiNamespace } from '@/services/complianceArchitecture';
import { getDeliveryContract } from '@/services/deliveryContracts';
import { evaluateOperationalGuardrails } from '@/services/operationalGuardrails';
import { scrubGenerationInput } from '@/services/privacyScrubber';
import { buildSourcePolicyBundle } from '@/services/sourceGovernance';

function toSearchCandidate(source: NonNullable<GeneratedOutput['screenedSources']>[number]) {
  return {
    title: source.title,
    link: source.url || (source.domain ? `https://${source.domain}` : ''),
    snippet: source.snippet || '',
  };
}

export function hydrateOutputForVera(
  rawOutput: GeneratedOutput,
  params: DetailedGenerationParams,
): GeneratedOutput {
  const namespace = params.apiNamespace || inferApiNamespace(params);
  const output: GeneratedOutput = {
    ...rawOutput,
    theme: rawOutput.theme || params.prompt,
    market: rawOutput.market || params.market,
    extent: rawOutput.extent || params.scientificDepth,
    audience: rawOutput.audience || params.targetAudience,
    apiNamespace: rawOutput.apiNamespace || namespace,
    deliveryContract: rawOutput.deliveryContract || getDeliveryContract(params.contentType),
  };

  const sourceCandidates = (output.screenedSources || output.sources || [])
    .map(toSearchCandidate)
    .filter((candidate) => candidate.title && candidate.link);

  const sourceBundle = buildSourcePolicyBundle({
    prompt: params.prompt,
    contentType: params.contentType,
    targetAudience: params.targetAudience,
    market: params.market,
    apiNamespace: namespace,
  }, sourceCandidates, Math.max(output.sources?.length || 0, 5));

  output.sources = output.sources && output.sources.length > 0 ? output.sources : sourceBundle.sources;
  output.screenedSources = output.screenedSources && output.screenedSources.length > 0 ? output.screenedSources : sourceBundle.screenedSources;
  output.sourceGovernance = sourceBundle.governance;

  const { scrubReport } = scrubGenerationInput(params);
  output.operationalGuardrails = evaluateOperationalGuardrails({
    market: params.market,
    prompt: params.prompt,
    targetAudience: params.targetAudience,
  }, output);

  const complianceArchitecture = buildComplianceArchitectureSummary({
    generationParams: {
      ...params,
      apiNamespace: namespace,
    },
    output,
    scrubReport,
  });

  output.complianceArchitecture = complianceArchitecture;
  output.regulatoryContentType = complianceArchitecture.regulatoryContentType;

  return output;
}
