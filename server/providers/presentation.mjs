import '../lib/load-env.mjs';
import { generateGammaArtifact, getGammaRuntimeSettings, isGammaConfigured } from './gamma.mjs';

const PRESENTATION_PROVIDER = String(process.env.PRESENTATION_PROVIDER || process.env.VITE_PRESENTATION_PROVIDER || 'native')
  .trim()
  .toLowerCase();
const PLUS_AI_API_KEY = (process.env.PLUS_AI_API_KEY || '').trim();
const PLUS_AI_API_BASE_URL = (process.env.PLUS_AI_API_BASE_URL || 'https://api.plusdocs.com/r/v0').trim().replace(/\/+$/, '');
const PLUS_AI_TEMPLATE_ID = (process.env.PLUS_AI_TEMPLATE_ID || '').trim();
const PLUS_AI_LANGUAGE = (process.env.PLUS_AI_LANGUAGE || 'en').trim();
const PLUS_AI_TEXT_HANDLING = String(process.env.PLUS_AI_TEXT_HANDLING || 'PRESERVE').trim().toUpperCase();
const PLUS_AI_POLL_INTERVAL_MS = Number.parseInt(process.env.PLUS_AI_POLL_INTERVAL_MS || '5000', 10);
const PLUS_AI_TIMEOUT_MS = Number.parseInt(process.env.PLUS_AI_TIMEOUT_MS || '300000', 10);
const PLUS_AI_INCLUDE_USER_TIPS = String(process.env.PLUS_AI_INCLUDE_USER_TIPS || 'false').trim().toLowerCase() === 'true';
function getSelectedPresentationProvider() {
  if (PRESENTATION_PROVIDER === 'plus-ai') return 'plus-ai';
  if (PRESENTATION_PROVIDER === 'gamma') return 'gamma';
  return 'native';
}

function getProviderLabel(provider) {
  switch (provider) {
    case 'plus-ai':
      return 'Plus AI presentation pipeline';
    case 'gamma':
      return 'Gamma presentation pipeline';
    default:
      return 'Native PPTX renderer';
  }
}

function getNormalisedTextHandling() {
  return ['DEFAULT', 'PRESERVE', 'STRICT'].includes(PLUS_AI_TEXT_HANDLING)
    ? PLUS_AI_TEXT_HANDLING
    : 'PRESERVE';
}

function inferSlideCount(markdown) {
  const matches = String(markdown || '').match(/^###\s*Slide/igm);
  if (matches?.length) {
    return Math.min(Math.max(matches.length, 3), 30);
  }
  return undefined;
}

function stripMarkdownFence(text) {
  return String(text || '')
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function buildPlusAiPrompt({ request, markdown }) {
  const cleanedMarkdown = stripMarkdownFence(markdown);
  const lines = [
    'Create a polished, editable PowerPoint presentation for Vera.',
    'Preserve the structure and factual intent of the supplied markdown presentation draft.',
    'Do not invent additional statistics, claims, or citations beyond the provided draft.',
    'Keep slide titles concise, body copy presentation-ready, and speaker-note content out of the visible slide body unless it is already framed as slide content.',
    `Audience: ${request.targetAudience}`,
    `Market: ${request.market}`,
    `Namespace: ${request.apiNamespace}`,
    `Tone: ${request.tone}`,
    '',
    'Approved markdown presentation draft:',
    cleanedMarkdown,
  ];

  return lines.join('\n');
}

async function createPlusAiPresentation(payload) {
  const response = await fetch(`${PLUS_AI_API_BASE_URL}/presentation`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${PLUS_AI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Plus AI create request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function pollPlusAiPresentation(pollingUrl) {
  const deadline = Date.now() + PLUS_AI_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await fetch(pollingUrl, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${PLUS_AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Plus AI polling failed (${response.status}): ${message}`);
    }

    const payload = await response.json();
    if (payload.status === 'GENERATED' && payload.url) {
      return payload;
    }

    if (payload.status === 'FAILED') {
      throw new Error(`Plus AI presentation generation failed for ${payload.id || 'unknown request'}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, PLUS_AI_POLL_INTERVAL_MS));
  }

  throw new Error(`Plus AI presentation generation timed out after ${PLUS_AI_TIMEOUT_MS}ms.`);
}

async function downloadPresentationBinary(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Plus AI presentation download failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function tryRenderPresentationExternally({ request, markdown }) {
  const selected = getSelectedPresentationProvider();
  if (selected === 'plus-ai') {
    if (!PLUS_AI_API_KEY) {
      return null;
    }

    const payload = {
      prompt: buildPlusAiPrompt({ request, markdown }),
      language: PLUS_AI_LANGUAGE,
      includeUserTips: PLUS_AI_INCLUDE_USER_TIPS,
      textHandling: getNormalisedTextHandling(),
    };

    const numberOfSlides = inferSlideCount(markdown);
    if (numberOfSlides) {
      payload.numberOfSlides = numberOfSlides;
    }

    if (PLUS_AI_TEMPLATE_ID) {
      payload.templateId = PLUS_AI_TEMPLATE_ID;
    }

    const created = await createPlusAiPresentation(payload);
    const pollingUrl = created.pollingUrl || (created.id ? `${PLUS_AI_API_BASE_URL}/presentation/${created.id}` : '');
    if (!pollingUrl) {
      throw new Error('Plus AI did not return a polling URL for the presentation request.');
    }

    const result = await pollPlusAiPresentation(pollingUrl);
    const binary = await downloadPresentationBinary(result.url);

    return {
      provider: 'plus-ai',
      binary,
      remoteUrl: result.url,
      generationId: result.id || created.id || null,
      slideTitles: Array.isArray(result.slides) ? result.slides : [],
    };
  }

  if (selected === 'gamma' && isGammaConfigured()) {
    const slideCount = inferSlideCount(markdown);
    const gammaInput = stripMarkdownFence(markdown)
      .replace(/^###\s*/gm, '---\n')
      .trim();

    return generateGammaArtifact({
      inputText: gammaInput,
      format: 'presentation',
      exportAs: 'pptx',
      numCards: slideCount,
      dimensions: '16:9',
      additionalInstructions: [
        'Keep the slide structure clean and presentation-ready.',
        'Preserve the factual wording from the source text.',
        'Do not invent claims, citations, or metrics beyond the provided content.',
      ].join(' '),
    });
  }

  return null;
}

export function getPresentationProviderState() {
  const selected = getSelectedPresentationProvider();

  if (selected === 'plus-ai') {
    return {
      selected,
      active: PLUS_AI_API_KEY ? 'plus-ai' : 'native',
      label: getProviderLabel(selected),
      configured: Boolean(PLUS_AI_API_KEY),
      apiBaseUrl: PLUS_AI_API_BASE_URL,
      note: PLUS_AI_API_KEY
        ? 'Plus AI presentation rendering is enabled. Vera falls back to native PPTX only if the provider run fails.'
        : 'Plus AI is selected, but PLUS_AI_API_KEY is missing. Vera uses the native PPTX renderer.',
    };
  }

  if (selected === 'gamma') {
    const gamma = getGammaRuntimeSettings();
    return {
      selected,
      active: isGammaConfigured() ? 'gamma' : 'native',
      label: getProviderLabel(selected),
      configured: gamma.configured,
      baseUrl: gamma.baseUrl,
      note: gamma.configured
        ? 'Gamma presentation rendering is enabled. Vera falls back to native PPTX only if the provider run fails.'
        : 'Gamma is selected, but GAMMA_API_KEY is missing. Vera uses the native PPTX renderer.',
    };
  }

  return {
    selected: 'native',
    active: 'native',
    label: getProviderLabel('native'),
    configured: true,
    note: 'Presentation export is rendered natively in Vera.',
  };
}
