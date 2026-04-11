import type { VideoAspectRatio, VideoCreativeDirection, VideoRenderSummary, VideoScene } from '@/types';

type SupportedVideoProvider = 'luma';

interface RenderVideoSequenceParams {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  scenes: VideoScene[];
  creativeDirection: VideoCreativeDirection;
}

interface RenderedVideoResult {
  renderedVideoUrl: string;
  summary: VideoRenderSummary;
}

interface LumaGenerationResponse {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  failure_reason?: string | null;
  assets?: {
    video?: string;
  };
}

const VIDEO_PROVIDER = cleanProvider(import.meta.env.VITE_VIDEO_PROVIDER);
const LUMA_API_KEY = import.meta.env.VITE_LUMA_API_KEY;
const LUMA_MODEL = import.meta.env.VITE_LUMA_MODEL || 'ray-flash-2';
const LUMA_RESOLUTION = import.meta.env.VITE_LUMA_RESOLUTION || '720p';
const LUMA_SCENE_DURATION = import.meta.env.VITE_LUMA_SCENE_DURATION || '5s';
const LUMA_POLL_INTERVAL_MS = parseIntEnv(import.meta.env.VITE_LUMA_POLL_INTERVAL_MS, 4000);
const LUMA_TIMEOUT_MS = parseIntEnv(import.meta.env.VITE_LUMA_TIMEOUT_MS, 240000);
const LUMA_BASE_URL = 'https://api.lumalabs.ai/dream-machine/v1';

function cleanProvider(value: unknown): SupportedVideoProvider | null {
  const provider = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return provider === 'luma' ? 'luma' : null;
}

function parseIntEnv(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildLumaScenePrompt(
  scene: VideoScene,
  prompt: string,
  creativeDirection: VideoCreativeDirection,
): string {
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
    `Keep one clear focal action, premium lighting, and consistent world-building.`,
    `Do not render any text, subtitles, logos, labels, or watermarks.`,
    `Avoid: ${creativeDirection.doNotShow.join(', ') || 'crowded layouts, collage visuals, split screens'}.`,
  ].join(' ');
}

async function lumaRequest<T>(path: string, init: RequestInit): Promise<T> {
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

  return response.json() as Promise<T>;
}

async function createLumaGeneration(payload: Record<string, unknown>): Promise<LumaGenerationResponse> {
  const body = JSON.stringify(payload);

  try {
    return await lumaRequest<LumaGenerationResponse>('/generations', {
      method: 'POST',
      body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/404/.test(message)) {
      throw error;
    }

    return lumaRequest<LumaGenerationResponse>('/generations/video', {
      method: 'POST',
      body,
    });
  }
}

async function getLumaGeneration(id: string): Promise<LumaGenerationResponse> {
  return lumaRequest<LumaGenerationResponse>(`/generations/${id}`, {
    method: 'GET',
  });
}

async function waitForLumaGeneration(id: string): Promise<LumaGenerationResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < LUMA_TIMEOUT_MS) {
    const generation = await getLumaGeneration(id);
    if (generation.state === 'completed') {
      return generation;
    }
    if (generation.state === 'failed') {
      throw new Error(generation.failure_reason || 'Video generation failed.');
    }
    await sleep(LUMA_POLL_INTERVAL_MS);
  }

  throw new Error('Video generation timed out while waiting for provider completion.');
}

async function renderWithLuma(params: RenderVideoSequenceParams): Promise<RenderedVideoResult | null> {
  if (!LUMA_API_KEY) {
    return null;
  }

  const generationIds: string[] = [];
  let latestGeneration: LumaGenerationResponse | null = null;

  for (const scene of params.scenes) {
    const payload: Record<string, unknown> = {
      prompt: buildLumaScenePrompt(scene, params.prompt, params.creativeDirection),
      model: LUMA_MODEL,
      aspect_ratio: params.aspectRatio,
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

    const created = await createLumaGeneration(payload);
    const completed = await waitForLumaGeneration(created.id);
    latestGeneration = completed;
    generationIds.push(completed.id);
  }

  if (!latestGeneration?.assets?.video) {
    throw new Error('Video provider completed without a downloadable video asset.');
  }

  return {
    renderedVideoUrl: latestGeneration.assets.video,
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

export function getConfiguredVideoProvider(): SupportedVideoProvider | null {
  if (VIDEO_PROVIDER === 'luma' && LUMA_API_KEY) {
    return 'luma';
  }
  return null;
}

export async function renderVideoSequence(params: RenderVideoSequenceParams): Promise<RenderedVideoResult | null> {
  if (VIDEO_PROVIDER !== 'luma') {
    return null;
  }

  return renderWithLuma(params);
}

