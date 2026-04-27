import '../lib/load-env.mjs';
import { generateGammaArtifact, getGammaRuntimeSettings, isGammaConfigured } from './gamma.mjs';

const DOCUMENT_PROVIDER = String(process.env.DOCUMENT_PROVIDER || process.env.VITE_DOCUMENT_PROVIDER || 'native')
  .trim()
  .toLowerCase();

function getSelectedDocumentProvider() {
  return DOCUMENT_PROVIDER === 'gamma' ? 'gamma' : 'native';
}

function getProviderLabel(provider) {
  return provider === 'gamma' ? 'Gamma long-form pipeline' : 'Native document renderer';
}

function stripMarkdownFence(text) {
  return String(text || '')
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function tryRenderDocumentExternally({ request, markdown }) {
  const selected = getSelectedDocumentProvider();
  if (selected !== 'gamma' || !isGammaConfigured()) {
    return null;
  }

  if (!['report', 'white-paper'].includes(request.contentType)) {
    return null;
  }

  return generateGammaArtifact({
    inputText: stripMarkdownFence(markdown),
    format: 'document',
    exportAs: 'pdf',
    additionalInstructions: [
      'Keep the structure polished and editorial.',
      'Preserve the factual wording from the source text.',
      'Do not invent claims, citations, or metrics beyond the provided content.',
    ].join(' '),
  });
}

export function getDocumentProviderState(contentType = 'report') {
  const selected = getSelectedDocumentProvider();
  if (selected === 'gamma') {
    const gamma = getGammaRuntimeSettings();
    const gammaEligible = ['report', 'white-paper'].includes(contentType);
    return {
      selected,
      active: gamma.configured && gammaEligible ? 'gamma' : 'native',
      label: getProviderLabel(selected),
      configured: gamma.configured,
      baseUrl: gamma.baseUrl,
      note: gamma.configured
        ? gammaEligible
          ? 'Gamma long-form rendering is enabled. Vera falls back to the native renderer only if the provider run fails.'
          : 'Gamma is selected, but standard document outputs stay native in Vera right now.'
        : 'Gamma is selected, but GAMMA_API_KEY is missing. Vera uses the native document renderer.',
    };
  }

  return {
    selected: 'native',
    active: 'native',
    label: getProviderLabel('native'),
    configured: true,
    note: 'Long-form document outputs render natively in Vera.',
  };
}
