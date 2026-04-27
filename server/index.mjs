import './lib/load-env.mjs';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import path from 'node:path';
import { createRuntimeStore } from './lib/store.mjs';
import { createAssetManager } from './lib/assets.mjs';
import { packageServerOutputAssets } from './lib/output-packagers.mjs';
import { getFormatCapabilityMap, getProviderRegistrySummary } from './providers/registry.mjs';
import { checkSearchProviderConnection } from './providers/search.mjs';
import { generatePromptOptions } from './services/prompt-options.mjs';
import { generateOutputOnServer, supportsServerSideGeneration } from './services/generate-output.mjs';

const PORT = Number.parseInt(process.env.VERA_API_PORT || process.env.DND_API_PORT || '8787', 10);
const HOST = process.env.VERA_API_HOST || process.env.DND_API_HOST || '127.0.0.1';
const STORE_FILE = process.env.VERA_STORE_FILE || process.env.DND_STORE_FILE || path.join(process.cwd(), 'server/data/runtime-store.sqlite');
const ASSET_ROOT = process.env.VERA_ASSET_DIR || process.env.DND_ASSET_DIR || path.join(process.cwd(), 'server/data/assets');

const store = createRuntimeStore(STORE_FILE);
await store.init();
const generationQueue = [];
let workerActive = false;
const assetManager = createAssetManager({
  rootDir: ASSET_ROOT,
  publicBaseUrl: `http://${HOST}:${PORT}/api/assets`,
});

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  });
  response.end(JSON.stringify(payload));
}

function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, corsHeaders());
  response.end();
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function toPublicRecord(record) {
  return {
    id: record.id,
    status: record.status,
    mode: record.mode,
    request: record.request,
    output: record.output,
    error: record.error,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    timeline: record.timeline,
  };
}

function createRecordForRequest(generationRequest, mode) {
  const now = new Date().toISOString();
  return {
    id: `gen_${randomUUID()}`,
    mode,
    status: mode === 'server-executed' ? 'queued' : 'processing',
    request: generationRequest,
    output: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    timeline: [
      createTimelineEntry('queued', 'Generation request accepted by the Vera API.'),
      ...(mode === 'server-executed'
        ? [createTimelineEntry('queued', 'Generation queued for the server worker.')]
        : [createTimelineEntry('processing', 'Frontend bridge execution started.')]),
    ],
  };
}

function createSnapshotFromRecord(record) {
  return {
    snapshotId: `snap_${randomUUID()}`,
    generationId: record.id,
    createdAt: new Date().toISOString(),
    status: record.status,
    contentType: record.request.contentType,
    market: record.request.market,
    namespace: record.request.apiNamespace,
    prompt: record.request.prompt,
    outputFormat: record.output?.format || null,
    outputSummary: record.output
      ? {
          theme: record.output.theme || null,
          audience: record.output.audience || null,
          hasSources: Boolean(record.output.sources?.length),
          sourceCount: record.output.sources?.length || 0,
          screenedSourceCount: record.output.screenedSources?.length || 0,
        }
      : null,
  };
}

async function runServerGeneration(record) {
  try {
    await store.updateGeneration(record.id, (existing) => ({
      ...existing,
      status: 'processing',
      updatedAt: new Date().toISOString(),
      timeline: [
        ...existing.timeline,
        createTimelineEntry('processing', 'Server worker started generation.'),
      ],
    }));

    const generatedOutput = await generateOutputOnServer(record.request);
    const output = await persistGeneratedOutput(generatedOutput);
    const updated = await store.updateGeneration(record.id, (existing) => ({
      ...existing,
      status: 'completed',
      output,
      error: null,
      updatedAt: new Date().toISOString(),
      timeline: [
        ...existing.timeline,
        createTimelineEntry('quality-check', 'Server generation completed basic output validation.'),
        createTimelineEntry('ready', 'Server-side output is ready for review.'),
      ],
    }));
    if (updated) {
      await store.createSnapshot(createSnapshotFromRecord(updated));
    }
  } catch (error) {
    const updated = await store.updateGeneration(record.id, (existing) => ({
      ...existing,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Generation failed.',
      updatedAt: new Date().toISOString(),
      timeline: [
        ...existing.timeline,
        createTimelineEntry('failed', error instanceof Error ? error.message : 'Generation failed.'),
      ],
    }));
    if (updated) {
      await store.createSnapshot(createSnapshotFromRecord(updated));
    }
  }
}

async function persistGeneratedOutput(output) {
  return packageServerOutputAssets(output, assetManager);
}

function enqueueGeneration(generationId) {
  if (!generationQueue.includes(generationId)) {
    generationQueue.push(generationId);
  }
  void drainQueue();
}

async function drainQueue() {
  if (workerActive) return;
  workerActive = true;

  try {
    while (generationQueue.length > 0) {
      const nextId = generationQueue.shift();
      if (!nextId) continue;

      const record = store.getGeneration(nextId);
      if (!record || record.status === 'completed' || record.status === 'failed') {
        continue;
      }

      await runServerGeneration(record);
    }
  } finally {
    workerActive = false;
  }
}

function createTimelineEntry(phase, message) {
  return {
    phase,
    message,
    timestamp: new Date().toISOString(),
  };
}

function notFound(response) {
  sendJson(response, 404, {
    error: 'Not found',
  });
}

async function handleHealth(response) {
  const summary = await store.getSummary();
  sendJson(response, 200, {
    status: 'ok',
    mode: 'hybrid-platform',
    uptimeSeconds: Math.round(process.uptime()),
    store: summary,
    queue: {
      depth: generationQueue.length,
      active: workerActive,
    },
    providers: getProviderRegistrySummary(),
    formats: getFormatCapabilityMap(),
  });
}

async function handleProviders(response) {
  sendJson(response, 200, {
    providers: getProviderRegistrySummary(),
    formats: getFormatCapabilityMap(),
  });
}

async function handleSourceHealth(url, response) {
  const query = url.searchParams.get('q') || undefined;
  const result = await checkSearchProviderConnection(query);
  sendJson(response, result.ok ? 200 : 503, result);
}

async function handleCreateGeneration(request, response) {
  const body = await readJsonBody(request);
  const generationRequest = body?.request;

  if (!generationRequest || typeof generationRequest !== 'object') {
    sendJson(response, 400, {
      error: 'A request payload is required.',
    });
    return;
  }

  const mode = supportsServerSideGeneration(generationRequest.contentType) ? 'server-executed' : 'frontend-bridge';
  const record = createRecordForRequest(generationRequest, mode);

  await store.createGeneration(record);
  if (mode === 'server-executed') {
    enqueueGeneration(record.id);
  }
  sendJson(response, 201, {
    generation: toPublicRecord(record),
  });
}

async function handlePromptOptions(request, response) {
  const body = await readJsonBody(request);
  const theme = typeof body?.theme === 'string' ? body.theme.trim() : '';

  if (!theme) {
    sendJson(response, 400, {
      error: 'A theme is required.',
    });
    return;
  }

  const options = await generatePromptOptions(theme);
  sendJson(response, 200, {
    options,
  });
}

async function handleListGenerations(url, response) {
  const limit = Number.parseInt(url.searchParams.get('limit') || '25', 10);
  const items = await store.listGenerations(Number.isFinite(limit) ? limit : 25);
  sendJson(response, 200, {
    generations: items.map(toPublicRecord),
  });
}

async function handleListSnapshots(url, response) {
  const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const items = await store.listSnapshots(Number.isFinite(limit) ? limit : 50);
  sendJson(response, 200, {
    snapshots: items,
  });
}

function sanitizeDownloadName(value) {
  return String(value || 'vera-asset')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'vera-asset';
}

async function handleGetAsset(assetId, method, response, options = {}) {
  try {
    const asset = await assetManager.readAsset(assetId);
    const headers = {
      'content-type': asset.contentType,
      ...corsHeaders(),
    };
    if (options.download) {
      headers['content-disposition'] = `attachment; filename="${sanitizeDownloadName(assetId)}"`;
    }
    response.writeHead(200, headers);
    if (method === 'HEAD') {
      response.end();
      return;
    }
    response.end(asset.body);
  } catch (error) {
    notFound(response);
  }
}

async function handleGetGeneration(id, response) {
  const record = store.getGeneration(id);
  if (!record) {
    notFound(response);
    return;
  }

  sendJson(response, 200, {
    generation: toPublicRecord(record),
  });
}

async function handleCompleteGeneration(id, request, response) {
  const body = await readJsonBody(request);
  const output = body?.output;

  if (!output || typeof output !== 'object') {
    sendJson(response, 400, {
      error: 'An output payload is required.',
    });
    return;
  }

  const updated = await store.updateGeneration(id, (existing) => ({
    ...existing,
    status: 'completed',
    output,
    error: null,
    updatedAt: new Date().toISOString(),
    timeline: [
      ...existing.timeline,
      createTimelineEntry('quality-check', 'Frontend bridge reported a completed output payload.'),
      createTimelineEntry('ready', 'Generation marked complete and ready for review.'),
    ],
  }));

  if (!updated) {
    notFound(response);
    return;
  }

  await store.createSnapshot(createSnapshotFromRecord(updated));

  sendJson(response, 200, {
    generation: toPublicRecord(updated),
  });
}

async function handleFailGeneration(id, request, response) {
  const body = await readJsonBody(request);
  const error = typeof body?.error === 'string' ? body.error : 'Generation failed.';

  const updated = await store.updateGeneration(id, (existing) => ({
    ...existing,
    status: 'failed',
    error,
    updatedAt: new Date().toISOString(),
    timeline: [
      ...existing.timeline,
      createTimelineEntry('failed', error),
    ],
  }));

  if (!updated) {
    notFound(response);
    return;
  }

  await store.createSnapshot(createSnapshotFromRecord(updated));

  sendJson(response, 200, {
    generation: toPublicRecord(updated),
  });
}

for (const pendingRecord of await store.listPendingGenerations()) {
  enqueueGeneration(pendingRecord.id);
}

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      notFound(response);
      return;
    }

    if (request.method === 'OPTIONS') {
      sendEmpty(response, 204);
      return;
    }

    const url = new URL(request.url, `http://${HOST}:${PORT}`);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/api/health') {
      await handleHealth(response);
      return;
    }

    if (request.method === 'GET' && path === '/api/providers') {
      await handleProviders(response);
      return;
    }

    if (request.method === 'GET' && path === '/api/source-health') {
      await handleSourceHealth(url, response);
      return;
    }

    if (request.method === 'POST' && path === '/api/generations') {
      await handleCreateGeneration(request, response);
      return;
    }

    if (request.method === 'POST' && path === '/api/prompt-options') {
      await handlePromptOptions(request, response);
      return;
    }

    if (request.method === 'GET' && path === '/api/generations') {
      await handleListGenerations(url, response);
      return;
    }

    if (request.method === 'GET' && path === '/api/snapshots') {
      await handleListSnapshots(url, response);
      return;
    }

    const assetDownloadMatch = path.match(/^\/api\/assets\/([^/]+)\/download$/);
    if ((request.method === 'GET' || request.method === 'HEAD') && assetDownloadMatch) {
      await handleGetAsset(assetDownloadMatch[1], request.method, response, { download: true });
      return;
    }

    const assetMatch = path.match(/^\/api\/assets\/([^/]+)$/);
    if ((request.method === 'GET' || request.method === 'HEAD') && assetMatch) {
      await handleGetAsset(assetMatch[1], request.method, response);
      return;
    }

    const generationMatch = path.match(/^\/api\/generations\/([^/]+)$/);
    if (request.method === 'GET' && generationMatch) {
      await handleGetGeneration(generationMatch[1], response);
      return;
    }

    const completeMatch = path.match(/^\/api\/generations\/([^/]+)\/complete$/);
    if (request.method === 'POST' && completeMatch) {
      await handleCompleteGeneration(completeMatch[1], request, response);
      return;
    }

    const failMatch = path.match(/^\/api\/generations\/([^/]+)\/fail$/);
    if (request.method === 'POST' && failMatch) {
      await handleFailGeneration(failMatch[1], request, response);
      return;
    }

    notFound(response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Vera API listening on http://${HOST}:${PORT}`);
  console.log(`Runtime mode: hybrid-platform`);
  console.log(`Store file: ${STORE_FILE}`);
});
