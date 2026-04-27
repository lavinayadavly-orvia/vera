import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_URL = (process.env.VERA_QC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const TIMEOUT_MS = Number.parseInt(process.env.VERA_QC_TIMEOUT_MS || '360000', 10);
const POLL_MS = Number.parseInt(process.env.VERA_QC_POLL_MS || '1500', 10);
const RUN_ID = `vera-qc-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const REPORT_DIR = path.join(process.cwd(), 'server/data/qc-runs');
const REPORT_PATH = path.join(REPORT_DIR, `${RUN_ID}.json`);

const requests = [
  {
    contentType: 'infographic',
    prompt: 'Create an HCP infographic on hypertension screening after age 40. Keep it evidence-aware, source-safe, and visually premium.',
  },
  {
    contentType: 'presentation',
    prompt: 'Create a clinician presentation on improving hypertension control after age 40 with practical management takeaways.',
  },
  {
    contentType: 'video',
    prompt: 'Create a 16:9 professional video package explaining why adults over 40 should monitor blood pressure regularly.',
  },
  {
    contentType: 'podcast',
    prompt: 'Create a short professional podcast episode on patient conversations around hypertension screening after age 40.',
  },
  {
    contentType: 'document',
    prompt: 'Create a professional document for clinicians on hypertension screening workflow improvements.',
  },
  {
    contentType: 'report',
    prompt: 'Create an evidence-led report on hypertension control gaps in adults over 40.',
  },
  {
    contentType: 'white-paper',
    prompt: 'Create a white paper on scalable hypertension screening programs for adults over 40.',
  },
  {
    contentType: 'social-post',
    prompt: 'Create a LinkedIn-ready social post for clinicians about prioritising blood pressure screening after 40.',
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(pathname, init) {
  const response = await fetch(`${API_URL}${pathname}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${pathname} failed with ${response.status}: ${text}`);
  }
  return payload;
}

async function checkAsset(url) {
  if (!url || url === '#') {
    return { ok: false, url, status: null, error: 'missing-url' };
  }
  if (url.startsWith('data:')) {
    return { ok: true, url: 'data-url', status: 200, error: null };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, url, status: null, error: 'unsupported-url' };
  }
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      ok: response.ok,
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      error: response.ok ? null : 'asset-not-ok',
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function hasPlaceholder(text) {
  return /\[SOURCE NEEDED[^\]]*\]|\bSOURCE NEEDED\b|\bCLAIM_ID\b|\[CLAIM_ID[^\]]*\]/i.test(String(text || ''));
}

function buildRequest(item, index) {
  return {
    userId: `qc_${RUN_ID}`,
    prompt: item.prompt,
    contentType: item.contentType,
    tone: item.contentType === 'social-post' ? 'professional' : 'academic',
    market: 'global',
    apiNamespace: item.contentType === 'social-post' ? 'marketing' : 'medical',
    length: 'short',
    scientificDepth: 'advanced',
    targetAudience: item.contentType === 'social-post' ? 'HCPs / clinicians' : 'HCPs / clinicians',
    iterationNumber: 1,
    qcRunId: RUN_ID,
    qcSequence: index + 1,
  };
}

async function waitForGeneration(id) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < TIMEOUT_MS) {
    const payload = await requestJson(`/api/generations/${id}`);
    const generation = payload.generation;
    if (generation.status === 'completed' || generation.status === 'failed') {
      return generation;
    }
    await sleep(POLL_MS);
  }
  throw new Error(`Generation ${id} timed out after ${TIMEOUT_MS}ms`);
}

async function validateOutput(generation, health) {
  const output = generation.output || {};
  const issues = [];
  const assetChecks = [];
  const sourceCount = Array.isArray(output.sources) ? output.sources.length : 0;
  const screenedSourceCount = Array.isArray(output.screenedSources) ? output.screenedSources.length : 0;
  const googleConfigured = Boolean(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY)
    && Boolean(process.env.GOOGLE_CX || process.env.VITE_GOOGLE_CX);

  if (generation.status !== 'completed') {
    issues.push(`Generation failed: ${generation.error || 'unknown error'}`);
  }
  if (output.contentType !== generation.request.contentType) {
    issues.push(`Content type mismatch: expected ${generation.request.contentType}, got ${output.contentType}`);
  }
  if (!output.content || hasPlaceholder(output.content) || hasPlaceholder(output.textContent)) {
    issues.push('Output contains source-needed or claim-id placeholder text.');
  }
  if (sourceCount === 0) {
    issues.push(googleConfigured
      ? 'Google search is configured but no approved sources were captured.'
      : 'No approved sources were captured from Google or the curated official-source fallback.');
  }

  const primaryAsset = await checkAsset(output.downloadUrl);
  assetChecks.push({ label: 'downloadUrl', ...primaryAsset });
  if (!primaryAsset.ok) {
    issues.push(`Primary download asset is not valid: ${primaryAsset.error}`);
  }

  if (output.previewUrl) {
    assetChecks.push({ label: 'previewUrl', ...(await checkAsset(output.previewUrl)) });
  }
  if (output.pdfUrl) {
    assetChecks.push({ label: 'pdfUrl', ...(await checkAsset(output.pdfUrl)) });
  }
  if (output.audioUrl) {
    assetChecks.push({ label: 'audioUrl', ...(await checkAsset(output.audioUrl)) });
  }
  if (output.renderedVideoUrl) {
    assetChecks.push({ label: 'renderedVideoUrl', ...(await checkAsset(output.renderedVideoUrl)) });
  }

  if (output.contentType === 'infographic') {
    if (output.format !== 'html') issues.push(`Infographic should render as html, got ${output.format}`);
    if (!String(output.content || '').includes('<!DOCTYPE html>')) issues.push('Infographic content is not a complete HTML document.');
    if (!String(output.content || '').includes('class="masthead"') || !String(output.content || '').includes('class="signal-panel"')) {
      issues.push('Infographic is not using the premium long-form renderer.');
    }
  }

  if (output.contentType === 'presentation' && !/\.pptx(\?|$)/i.test(String(output.downloadUrl || ''))) {
    issues.push('Presentation did not produce a hosted PPTX asset.');
  }

  if (output.contentType === 'podcast' && !output.audioUrl) {
    issues.push('Podcast did not produce an audio URL.');
  }

  if (output.contentType === 'video') {
    if (!Array.isArray(output.videoScenes) || output.videoScenes.length === 0) {
      issues.push('Video did not produce scene frames.');
    }
    if (!output.videoPackage?.narrationScript) {
      issues.push('Video did not produce narration script.');
    }
    if (!output.videoRender) {
      issues.push('Video did not report render/provider status.');
    }
  }

  if (output.contentType === 'social-post' && !String(output.content || '').includes('##')) {
    issues.push('Social post output is missing structured markdown sections.');
  }

  return {
    contentType: generation.request.contentType,
    generationId: generation.id,
    status: generation.status,
    mode: generation.mode,
    format: output.format || null,
    theme: output.theme || null,
    downloadUrl: output.downloadUrl || null,
    previewUrl: output.previewUrl || null,
    pdfUrl: output.pdfUrl || null,
    audioUrl: output.audioUrl || null,
    renderedVideoUrl: output.renderedVideoUrl || null,
    sourceCount,
    screenedSourceCount,
    sourceMode: googleConfigured ? 'google-configured' : 'google-not-configured',
    providerStack: output.providerStack || null,
    healthProviderNote: health.formats?.[generation.request.contentType]?.note || null,
    assetChecks,
    issues,
    passed: issues.length === 0 && assetChecks.every((asset) => asset.ok),
  };
}

async function run() {
  const startedAt = new Date().toISOString();
  const health = await requestJson('/api/health');
  const providers = await requestJson('/api/providers');
  const promptOptions = await requestJson('/api/prompt-options', {
    method: 'POST',
    body: JSON.stringify({ theme: 'hypertension screening after 40' }),
  });

  const results = [];
  for (let index = 0; index < requests.length; index += 1) {
    const item = requests[index];
    const request = buildRequest(item, index);
    console.log(`[qc] ${index + 1}/${requests.length} generating ${item.contentType}`);
    try {
      const created = await requestJson('/api/generations', {
        method: 'POST',
        body: JSON.stringify({ request }),
      });
      const completed = await waitForGeneration(created.generation.id);
      results.push(await validateOutput(completed, health));
      console.log(`[qc] ${item.contentType}: ${completed.status}`);
    } catch (error) {
      results.push({
        contentType: item.contentType,
        generationId: null,
        status: 'failed',
        issues: [error instanceof Error ? error.message : String(error)],
        passed: false,
      });
      console.log(`[qc] ${item.contentType}: failed`);
    }
  }

  const generations = await requestJson('/api/generations?limit=25');
  const snapshots = await requestJson('/api/snapshots?limit=25');
  const report = {
    runId: RUN_ID,
    startedAt,
    finishedAt: new Date().toISOString(),
    apiUrl: API_URL,
    health,
    providers,
    promptOptionsCount: Array.isArray(promptOptions.options) ? promptOptions.options.length : 0,
    results,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.passed).length,
      failed: results.filter((result) => !result.passed).length,
      generationIds: results.map((result) => result.generationId).filter(Boolean),
      latestStoredGenerationCount: generations.generations?.length || 0,
      latestStoredSnapshotCount: snapshots.snapshots?.length || 0,
    },
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`[qc] report: ${REPORT_PATH}`);
  console.log(`[qc] passed ${report.summary.passed}/${report.summary.total}`);

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[qc] fatal:', error);
  process.exitCode = 1;
});
