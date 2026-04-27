import '../lib/load-env.mjs';

const GAMMA_API_KEY = (process.env.GAMMA_API_KEY || '').trim();
const GAMMA_BASE_URL = (process.env.GAMMA_BASE_URL || 'https://public-api.gamma.app/v1.0').trim().replace(/\/+$/, '');
const GAMMA_THEME_ID = (process.env.GAMMA_THEME_ID || '').trim();
const GAMMA_LANGUAGE = (process.env.GAMMA_LANGUAGE || 'en').trim();
const GAMMA_FOLDER_IDS = String(process.env.GAMMA_FOLDER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const GAMMA_POLL_INTERVAL_MS = Number.parseInt(process.env.GAMMA_POLL_INTERVAL_MS || '5000', 10);
const GAMMA_TIMEOUT_MS = Number.parseInt(process.env.GAMMA_TIMEOUT_MS || '300000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getExtensionForExport(exportAs) {
  if (exportAs === 'pptx') return 'pptx';
  if (exportAs === 'pdf') return 'pdf';
  return 'png';
}

async function gammaRequest(path, init) {
  const response = await fetch(`${GAMMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': GAMMA_API_KEY,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gamma request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function createGammaGeneration(payload) {
  return gammaRequest('/generations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function getGammaGeneration(generationId) {
  return gammaRequest(`/generations/${generationId}`, {
    method: 'GET',
  });
}

async function waitForGammaGeneration(generationId) {
  const deadline = Date.now() + GAMMA_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const generation = await getGammaGeneration(generationId);
    if (generation.status === 'completed') {
      return generation;
    }
    if (generation.status === 'failed') {
      throw new Error(`Gamma generation ${generationId} failed.`);
    }
    await sleep(GAMMA_POLL_INTERVAL_MS);
  }

  throw new Error(`Gamma generation timed out after ${GAMMA_TIMEOUT_MS}ms.`);
}

async function downloadGammaExport(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gamma export download failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isGammaConfigured() {
  return Boolean(GAMMA_API_KEY);
}

export function getGammaRuntimeSettings() {
  return {
    configured: Boolean(GAMMA_API_KEY),
    baseUrl: GAMMA_BASE_URL,
    themeId: GAMMA_THEME_ID || null,
    folderIds: GAMMA_FOLDER_IDS,
  };
}

export async function generateGammaArtifact({
  inputText,
  format,
  exportAs,
  numCards,
  dimensions,
  additionalInstructions,
}) {
  if (!GAMMA_API_KEY) {
    return null;
  }

  const payload = {
    inputText,
    textMode: 'preserve',
    format,
    exportAs,
    imageOptions: {
      source: 'noImages',
    },
    textOptions: {
      language: GAMMA_LANGUAGE,
    },
  };

  if (typeof numCards === 'number' && Number.isFinite(numCards)) {
    payload.numCards = numCards;
  }

  if (dimensions) {
    payload.cardOptions = {
      dimensions,
    };
  }

  if (additionalInstructions) {
    payload.additionalInstructions = additionalInstructions;
  }

  if (GAMMA_THEME_ID) {
    payload.themeId = GAMMA_THEME_ID;
  }

  if (GAMMA_FOLDER_IDS.length > 0) {
    payload.folderIds = GAMMA_FOLDER_IDS;
  }

  const created = await createGammaGeneration(payload);
  const generationId = created.generationId;
  if (!generationId) {
    throw new Error('Gamma did not return a generationId.');
  }

  const result = await waitForGammaGeneration(generationId);
  if (!result.exportUrl) {
    throw new Error(`Gamma generation ${generationId} completed without an exportUrl.`);
  }

  const binary = await downloadGammaExport(result.exportUrl);

  return {
    provider: 'gamma',
    generationId,
    gammaUrl: result.gammaUrl || null,
    remoteUrl: result.exportUrl,
    binary,
    extension: getExtensionForExport(exportAs),
  };
}
