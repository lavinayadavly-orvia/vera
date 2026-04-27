import type { ContentType, DetailedGenerationParams, GeneratedOutput, GenerationRequest, PromptBlueprint } from '@/types';

export type BackendGenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type BackendRuntimeMode = 'frontend-bridge' | 'server-executed';

export interface BackendGenerationRecord {
  id: string;
  status: BackendGenerationStatus;
  mode: BackendRuntimeMode;
  request: DetailedGenerationParams;
  output?: GeneratedOutput | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{
    phase: string;
    message: string;
    timestamp: string;
  }>;
}

const BACKEND_API_URL = (import.meta.env.VITE_BACKEND_API_URL || '').trim().replace(/\/$/, '');
const SERVER_EXECUTED_CONTENT_TYPES: ContentType[] = ['infographic', 'video', 'document', 'report', 'white-paper', 'presentation', 'social-post', 'podcast'];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Backend request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function isBackendRuntimeEnabled(): boolean {
  return BACKEND_API_URL.length > 0;
}

export function getBackendRuntimeUrl(): string | null {
  return BACKEND_API_URL || null;
}

export function supportsServerSideGeneration(contentType: ContentType): boolean {
  return SERVER_EXECUTED_CONTENT_TYPES.includes(contentType);
}

export async function createBackendGeneration(
  request: DetailedGenerationParams,
): Promise<BackendGenerationRecord> {
  const payload = await requestJson<{ generation: BackendGenerationRecord }>('/api/generations', {
    method: 'POST',
    body: JSON.stringify({ request }),
  });

  return payload.generation;
}

export async function listBackendGenerations(limit = 50): Promise<BackendGenerationRecord[]> {
  const payload = await requestJson<{ generations: BackendGenerationRecord[] }>(`/api/generations?limit=${limit}`, {
    method: 'GET',
  });

  return payload.generations;
}

export function toGenerationHistoryItem(record: BackendGenerationRecord): GenerationRequest {
  const sourceCount = record.output?.sources?.length
    || record.output?.screenedSources?.length
    || 0;

  return {
    id: record.id,
    userId: record.request.userId,
    prompt: record.request.prompt,
    contentType: record.request.contentType,
    status: record.status === 'queued' ? 'pending' : record.status,
    outputUrl: record.output?.downloadUrl,
    outputFormat: record.output?.format,
    market: record.output?.market || record.request.market,
    audience: record.output?.audience || record.request.targetAudience,
    sourceCount,
    hasSavedOutput: Boolean(record.output),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getBackendGeneration(id: string): Promise<BackendGenerationRecord> {
  const payload = await requestJson<{ generation: BackendGenerationRecord }>(`/api/generations/${id}`, {
    method: 'GET',
  });

  return payload.generation;
}

export async function waitForBackendGeneration(
  id: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (generation: BackendGenerationRecord) => void;
  } = {},
): Promise<BackendGenerationRecord> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 180000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const generation = await getBackendGeneration(id);
    options.onUpdate?.(generation);
    if (generation.status === 'completed' || generation.status === 'failed') {
      return generation;
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error('Timed out while waiting for the Vera backend generation to complete.');
}

export async function generatePromptOptionsViaBackend(theme: string): Promise<PromptBlueprint[]> {
  const payload = await requestJson<{ options: PromptBlueprint[] }>('/api/prompt-options', {
    method: 'POST',
    body: JSON.stringify({ theme }),
  });

  return payload.options;
}

export async function completeBackendGeneration(
  id: string,
  output: GeneratedOutput,
): Promise<BackendGenerationRecord> {
  const payload = await requestJson<{ generation: BackendGenerationRecord }>(`/api/generations/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ output }),
  });

  return payload.generation;
}

export async function failBackendGeneration(
  id: string,
  error: string,
): Promise<BackendGenerationRecord> {
  const payload = await requestJson<{ generation: BackendGenerationRecord }>(`/api/generations/${id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ error }),
  });

  return payload.generation;
}
