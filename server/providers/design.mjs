import '../lib/load-env.mjs';

const DESIGN_PROVIDER = String(process.env.DESIGN_PROVIDER || process.env.VITE_DESIGN_PROVIDER || 'native')
  .trim()
  .toLowerCase();
const CANVA_ACCESS_TOKEN = (process.env.CANVA_ACCESS_TOKEN || '').trim();
const CANVA_API_BASE_URL = (process.env.CANVA_API_BASE_URL || 'https://api.canva.com/rest/v1').trim().replace(/\/+$/, '');
const CANVA_INFOGRAPHIC_TEMPLATE_ID = (process.env.CANVA_INFOGRAPHIC_TEMPLATE_ID || '').trim();
const CANVA_SOCIAL_TEMPLATE_ID = (process.env.CANVA_SOCIAL_TEMPLATE_ID || '').trim();
const CANVA_POLL_INTERVAL_MS = Number.parseInt(process.env.CANVA_POLL_INTERVAL_MS || '4000', 10);
const CANVA_TIMEOUT_MS = Number.parseInt(process.env.CANVA_TIMEOUT_MS || '180000', 10);
const GAMMA_API_KEY = (process.env.GAMMA_API_KEY || '').trim();
const GAMMA_BASE_URL = (process.env.GAMMA_BASE_URL || 'https://public-api.gamma.app/v1.0').trim();

function getSelectedDesignProvider() {
  if (DESIGN_PROVIDER === 'canva') return 'canva';
  if (DESIGN_PROVIDER === 'gamma') return 'gamma';
  return 'native';
}

function getProviderLabel(provider) {
  switch (provider) {
    case 'canva':
      return 'Canva design pipeline';
    case 'gamma':
      return 'Gamma design pipeline';
    default:
      return 'Native design renderer';
  }
}

function hasCanvaTemplate() {
  return Boolean(CANVA_INFOGRAPHIC_TEMPLATE_ID || CANVA_SOCIAL_TEMPLATE_ID);
}

function getCanvaTemplateId(contentType) {
  if (contentType === 'social-post') return CANVA_SOCIAL_TEMPLATE_ID;
  if (contentType === 'infographic') return CANVA_INFOGRAPHIC_TEMPLATE_ID;
  return '';
}

function cleanText(value, fallback = '') {
  const cleaned = String(value || '')
    .replace(/\[SOURCE NEEDED:[^\]]+\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function cleanList(values, limit, fallbackItem) {
  const items = (Array.isArray(values) ? values : [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .slice(0, limit);
  if (items.length > 0) return items;
  return fallbackItem ? [fallbackItem] : [];
}

function pullSectionBlock(markdown, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(markdown || '').match(new RegExp(`##\\s+${escapedHeading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i'));
  return match?.[1]?.trim() || '';
}

function extractFirstBullet(block) {
  const line = String(block || '')
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => /^[-*]\s+/.test(entry) || /^\d+\.\s+/.test(entry) || entry.length > 0);
  return cleanText(line?.replace(/^[-*\d.]\s*/, ''), '');
}

function extractBullets(block, limit) {
  const lines = String(block || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^[-*\d.]\s*/, ''));
  return cleanList(lines, limit, '');
}

function buildInfographicAutofillData({ request, infographicData, sources }) {
  const stats = (infographicData?.stats || []).slice(0, 4);
  const sections = (infographicData?.sections || []).slice(0, 3);
  const actions = (infographicData?.actions || []).slice(0, 4);
  const references = (sources || []).slice(0, 4);
  const fields = {
    kicker: { type: 'text', text: cleanText(infographicData?.hero?.kicker, 'Evidence snapshot') },
    title: { type: 'text', text: cleanText(infographicData?.hero?.title, request.prompt) },
    subtitle: { type: 'text', text: cleanText(infographicData?.hero?.subtitle, 'A concise visual summary built for review and export.') },
    highlight: { type: 'text', text: cleanText(infographicData?.highlight, 'Key facts and implications summarised for quick review.') },
    audience: { type: 'text', text: cleanText(request.targetAudience, 'General audience') },
    market: { type: 'text', text: cleanText(request.market === 'global' ? 'Global' : request.market, 'Global') },
    namespace: { type: 'text', text: cleanText(request.apiNamespace === 'medical' ? 'Evidence-led' : 'Campaign-ready', 'Evidence-led') },
  };

  for (let index = 0; index < 4; index += 1) {
    const stat = stats[index];
    fields[`stat_${index + 1}_value`] = { type: 'text', text: cleanText(stat?.value, index === 0 ? 'Focus' : 'Review') };
    fields[`stat_${index + 1}_label`] = { type: 'text', text: cleanText(stat?.label, index === 0 ? 'Keep the message sharp' : 'Support with approved evidence') };
  }

  for (let sectionIndex = 0; sectionIndex < 3; sectionIndex += 1) {
    const section = sections[sectionIndex];
    fields[`section_${sectionIndex + 1}_title`] = { type: 'text', text: cleanText(section?.title, `Section ${sectionIndex + 1}`) };
    const bullets = cleanList(section?.bullets, 3, sectionIndex === 0 ? 'Clarify the topic for the intended audience.' : 'Support the story with approved proof points.');
    for (let bulletIndex = 0; bulletIndex < 3; bulletIndex += 1) {
      fields[`section_${sectionIndex + 1}_bullet_${bulletIndex + 1}`] = {
        type: 'text',
        text: cleanText(bullets[bulletIndex], 'Keep the message concise and review-ready.'),
      };
    }
  }

  for (let actionIndex = 0; actionIndex < 4; actionIndex += 1) {
    fields[`action_${actionIndex + 1}`] = {
      type: 'text',
      text: cleanText(actions[actionIndex], 'Validate the evidence pack before publishing.'),
    };
  }

  for (let referenceIndex = 0; referenceIndex < 4; referenceIndex += 1) {
    const reference = references[referenceIndex];
    fields[`reference_${referenceIndex + 1}`] = {
      type: 'text',
      text: cleanText(
        reference ? `${reference.title} — ${reference.domain}${reference.publishedYear ? ` (${reference.publishedYear})` : ''}` : 'Reference pack pending source capture.',
        'Reference pack pending source capture.',
      ),
    };
  }

  return fields;
}

function buildSocialAutofillData({ request, markdown, sources }) {
  const headlineBlock = pullSectionBlock(markdown, 'Headline Options');
  const bodyBlock = pullSectionBlock(markdown, 'Main Post Copy');
  const ctaBlock = pullSectionBlock(markdown, 'CTA');
  const captionBlock = pullSectionBlock(markdown, 'Caption');
  const references = (sources || []).slice(0, 2);

  return {
    kicker: { type: 'text', text: cleanText(request.apiNamespace === 'medical' ? 'Evidence-led social draft' : 'Campaign social draft', 'Campaign social draft') },
    title: { type: 'text', text: cleanText(extractFirstBullet(headlineBlock), cleanText(request.prompt, 'Social draft')) },
    subtitle: { type: 'text', text: cleanText(request.targetAudience, 'General audience') },
    body: { type: 'text', text: cleanText(bodyBlock.split('\n').filter(Boolean).join(' '), cleanText(request.prompt, 'Use this social draft to frame the core message clearly.')) },
    caption: { type: 'text', text: cleanText(captionBlock.split('\n').filter(Boolean).join(' '), cleanText(bodyBlock.split('\n').filter(Boolean).join(' '), 'Caption copy pending final review.')) },
    cta: { type: 'text', text: cleanText(extractFirstBullet(ctaBlock), 'Review the full evidence pack.') },
    reference_1: {
      type: 'text',
      text: cleanText(
        references[0] ? `${references[0].title} — ${references[0].domain}${references[0].publishedYear ? ` (${references[0].publishedYear})` : ''}` : 'Reference pack pending source capture.',
        'Reference pack pending source capture.',
      ),
    },
    reference_2: {
      type: 'text',
      text: cleanText(
        references[1] ? `${references[1].title} — ${references[1].domain}${references[1].publishedYear ? ` (${references[1].publishedYear})` : ''}` : '',
        '',
      ),
    },
    market: { type: 'text', text: cleanText(request.market === 'global' ? 'Global' : request.market, 'Global') },
  };
}

function buildCanvaAutofillData({ request, contentType, markdown, infographicData, sources }) {
  if (contentType === 'social-post') {
    return buildSocialAutofillData({ request, markdown, sources });
  }
  return buildInfographicAutofillData({ request, infographicData, sources });
}

async function fetchCanvaJson(path, init) {
  const response = await fetch(`${CANVA_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CANVA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Canva request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function createCanvaAutofillJob({ brandTemplateId, title, data }) {
  const payload = await fetchCanvaJson('/autofills', {
    method: 'POST',
    body: JSON.stringify({
      brand_template_id: brandTemplateId,
      title,
      data,
    }),
  });
  return payload.job;
}

async function pollCanvaAutofillJob(jobId) {
  const deadline = Date.now() + CANVA_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const payload = await fetchCanvaJson(`/autofills/${jobId}`, { method: 'GET' });
    const job = payload.job;
    if (job?.status === 'success') return job;
    if (job?.status === 'failed') {
      throw new Error(job?.error?.message || `Canva autofill job ${jobId} failed.`);
    }
    await new Promise((resolve) => setTimeout(resolve, CANVA_POLL_INTERVAL_MS));
  }

  throw new Error(`Canva autofill timed out after ${CANVA_TIMEOUT_MS}ms.`);
}

async function createCanvaExportJob({ designId, formatType }) {
  const payload = await fetchCanvaJson('/exports', {
    method: 'POST',
    body: JSON.stringify({
      design_id: designId,
      format: {
        type: formatType,
      },
    }),
  });
  return payload.job;
}

async function pollCanvaExportJob(jobId) {
  const deadline = Date.now() + CANVA_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const payload = await fetchCanvaJson(`/exports/${jobId}`, { method: 'GET' });
    const job = payload.job;
    if (job?.status === 'success' && Array.isArray(job.urls) && job.urls.length > 0) {
      return job;
    }
    if (job?.status === 'failed') {
      throw new Error(job?.error?.message || `Canva export job ${jobId} failed.`);
    }
    await new Promise((resolve) => setTimeout(resolve, CANVA_POLL_INTERVAL_MS));
  }

  throw new Error(`Canva export timed out after ${CANVA_TIMEOUT_MS}ms.`);
}

async function downloadBinary(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Canva asset download failed (${response.status}): ${message}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function tryRenderDesignExternally({ request, contentType, markdown, infographicData, sources }) {
  const selected = getSelectedDesignProvider();
  const brandTemplateId = getCanvaTemplateId(contentType);

  if (selected !== 'canva' || !CANVA_ACCESS_TOKEN || !brandTemplateId) {
    return null;
  }

  const title = cleanText(request.prompt, contentType === 'social-post' ? 'Vera social post' : 'Vera infographic');
  const data = buildCanvaAutofillData({
    request,
    contentType,
    markdown,
    infographicData,
    sources,
  });

  const createdJob = await createCanvaAutofillJob({
    brandTemplateId,
    title,
    data,
  });
  const autofillResult = createdJob.status === 'success' ? createdJob : await pollCanvaAutofillJob(createdJob.id);
  const design = autofillResult?.result?.design;

  if (!design?.id) {
    throw new Error('Canva autofill completed without a design result.');
  }

  const exportJob = await createCanvaExportJob({
    designId: design.id,
    formatType: 'png',
  });
  const exportResult = exportJob.status === 'success' ? exportJob : await pollCanvaExportJob(exportJob.id);
  const binary = await downloadBinary(exportResult.urls[0]);

  return {
    provider: 'canva',
    binary,
    extension: 'png',
    previewUrl: design.thumbnail?.url || exportResult.urls[0],
    editUrl: design.urls?.edit_url || design.url || null,
    viewUrl: design.urls?.view_url || design.url || null,
    designId: design.id,
  };
}

export function getDesignProviderState() {
  const selected = getSelectedDesignProvider();

  if (selected === 'canva') {
    return {
      selected,
      active: CANVA_ACCESS_TOKEN && hasCanvaTemplate() ? 'canva' : 'native',
      label: getProviderLabel(selected),
      configured: Boolean(CANVA_ACCESS_TOKEN),
      apiBaseUrl: CANVA_API_BASE_URL,
      note: CANVA_ACCESS_TOKEN
        ? hasCanvaTemplate()
          ? 'Canva autofill + export is enabled for configured Vera templates. Native rendering remains the fallback when a template is missing or a provider run fails.'
          : 'Canva is selected, but no Vera Canva template IDs are configured. Vera uses the native renderer.'
        : 'Canva is selected, but CANVA_ACCESS_TOKEN is missing. Vera uses the native renderer.',
    };
  }

  if (selected === 'gamma') {
    return {
      selected,
      active: 'native',
      label: getProviderLabel(selected),
      configured: Boolean(GAMMA_API_KEY),
      baseUrl: GAMMA_BASE_URL,
      note: GAMMA_API_KEY
        ? 'Gamma routing is configured. Vera still falls back to the native renderer until the external adapter is enabled.'
        : 'Gamma is selected, but GAMMA_API_KEY is missing. Vera uses the native renderer.',
    };
  }

  return {
    selected: 'native',
    active: 'native',
    label: getProviderLabel('native'),
    configured: true,
    note: 'Infographic and social outputs render in Vera.',
  };
}
