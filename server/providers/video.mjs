import '../lib/load-env.mjs';

const VIDEO_PROVIDER = (process.env.VIDEO_PROVIDER || process.env.VITE_VIDEO_PROVIDER || '').trim().toLowerCase();
const LUMA_API_KEY = process.env.LUMA_API_KEY || process.env.VITE_LUMA_API_KEY || '';
const LUMA_MODEL = process.env.LUMA_MODEL || process.env.VITE_LUMA_MODEL || 'ray-flash-2';
const LUMA_RESOLUTION = process.env.LUMA_RESOLUTION || process.env.VITE_LUMA_RESOLUTION || '720p';
const LUMA_SCENE_DURATION = process.env.LUMA_SCENE_DURATION || process.env.VITE_LUMA_SCENE_DURATION || '5s';
const LUMA_POLL_INTERVAL_MS = Number.parseInt(process.env.LUMA_POLL_INTERVAL_MS || process.env.VITE_LUMA_POLL_INTERVAL_MS || '4000', 10);
const LUMA_TIMEOUT_MS = Number.parseInt(process.env.LUMA_TIMEOUT_MS || process.env.VITE_LUMA_TIMEOUT_MS || '240000', 10);
const LUMA_BASE_URL = 'https://api.lumalabs.ai/dream-machine/v1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadBinary(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Video asset download failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function lumaRequest(path, init) {
  const response = await fetch(`${LUMA_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${LUMA_API_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Luma request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function createGeneration(payload) {
  const body = JSON.stringify(payload);
  try {
    return await lumaRequest('/generations', { method: 'POST', body });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/404/.test(message)) {
      throw error;
    }
    return lumaRequest('/generations/video', { method: 'POST', body });
  }
}

async function getGeneration(id) {
  return lumaRequest(`/generations/${id}`, { method: 'GET' });
}

async function waitForGeneration(id) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < LUMA_TIMEOUT_MS) {
    const generation = await getGeneration(id);
    if (generation.state === 'completed') return generation;
    if (generation.state === 'failed') {
      throw new Error(generation.failure_reason || 'Video generation failed.');
    }
    await sleep(LUMA_POLL_INTERVAL_MS);
  }
  throw new Error('Video generation timed out while waiting for provider completion.');
}

function buildScenePrompt(scene, prompt, creativeDirection) {
  return [
    `Create a premium cinematic video shot about ${prompt}.`,
    `Scene role: ${scene.beatRole || 'proof'}.`,
    `Scene objective: ${scene.visualDescription}.`,
    `Shot type: ${scene.shotType || 'cinematic coverage'}.`,
    `Motion cue: ${scene.motionCue || 'subtle editorial motion'}.`,
    `Visual style: ${creativeDirection.visualStyle}.`,
    `Subject focus: ${creativeDirection.subjectFocus}.`,
    `Recurring motif: ${scene.continuityAnchor || creativeDirection.recurringMotif}.`,
    `Camera language: ${creativeDirection.cameraLanguage}.`,
    `Edit rhythm: ${creativeDirection.editRhythm}.`,
    `Hook strategy: ${creativeDirection.hookStrategy}.`,
    'Keep one clear focal action, premium lighting, and consistent world-building.',
    'Do not render any text, subtitles, logos, labels, or watermarks.',
    `Avoid: ${(creativeDirection.doNotShow || []).join(', ') || 'crowded layouts, collage visuals, split screens'}.`,
  ].join(' ');
}

export function getConfiguredVideoProvider() {
  return VIDEO_PROVIDER === 'luma' && LUMA_API_KEY ? 'luma' : null;
}

export async function renderVideoSequence({ prompt, aspectRatio, scenes, creativeDirection }) {
  if (getConfiguredVideoProvider() !== 'luma') {
    throw new Error('Video rendering requires a configured Luma provider.');
  }

  let latestGeneration = null;
  const generationIds = [];

  for (const scene of scenes) {
    const payload = {
      prompt: buildScenePrompt(scene, prompt, creativeDirection),
      model: LUMA_MODEL,
      aspect_ratio: aspectRatio,
      resolution: LUMA_RESOLUTION,
      duration: LUMA_SCENE_DURATION,
      loop: false,
    };

    if (latestGeneration?.id) {
      payload.keyframes = {
        frame0: {
          type: 'generation',
          id: latestGeneration.id,
        },
      };
    }

    const created = await createGeneration(payload);
    const completed = await waitForGeneration(created.id);
    latestGeneration = completed;
    generationIds.push(completed.id);
  }

  if (!latestGeneration?.assets?.video) {
    throw new Error('Video provider completed without a downloadable video asset.');
  }

  const remoteUrl = latestGeneration.assets.video;
  const binary = await downloadBinary(remoteUrl);

  return {
    renderedVideoUrl: remoteUrl,
    remoteUrl,
    binary,
    summary: {
      provider: 'luma',
      status: 'completed',
      mode: generationIds.length > 1 ? 'extended-sequence' : 'text-to-video',
      model: LUMA_MODEL,
      resolution: LUMA_RESOLUTION,
      durationSeconds: generationIds.length * 5,
      generationId: latestGeneration.id,
      generationIds,
    },
  };
}
