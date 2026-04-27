import { generateObject } from '../providers/openai.mjs';
import { tryRenderDesignExternally } from '../providers/design.mjs';
import { getProviderStackForContentType } from '../providers/registry.mjs';
import { searchWebSources } from '../providers/search.mjs';

const COLOR_CLASSES = ['c-mint', 'c-gold', 'c-sky', 'c-purple', 'c-red', ''];

function stripPlaceholderTokens(value) {
  return String(value || '')
    .replace(/\[SOURCE NEEDED:[^\]]*\]/gi, ' ')
    .replace(/\[SOURCE NEEDED\]/gi, ' ')
    .replace(/\[CLAIM_ID:[^\]]*\]/gi, ' ')
    .replace(/\bSOURCE NEEDED\b/gi, ' ')
    .replace(/\bCLAIM_ID\b/gi, ' ')
    .replace(/\bC\d{3,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value, fallback) {
  const cleaned = stripPlaceholderTokens(value);
  return cleaned || fallback;
}

function cleanList(values, limit, fallbackItems = []) {
  const items = (Array.isArray(values) ? values : [])
    .map((value) => stripPlaceholderTokens(value))
    .filter(Boolean)
    .slice(0, limit);

  if (items.length > 0) {
    return items;
  }

  return fallbackItems.slice(0, limit);
}

function normalizeColorClass(value, fallback = '') {
  return COLOR_CLASSES.includes(value) ? value : fallback;
}

function sanitizeInfographicData(data, request) {
  const safeTitle = cleanText(data?.hero?.title, request.prompt);
  const safeSubtitle = cleanText(
    data?.hero?.subtitle,
    'A concise visual summary built for review and export.',
  );

  const safeStats = (Array.isArray(data?.stats) ? data.stats : []).slice(0, 4).map((stat, index) => ({
    value: cleanText(stat?.value, index === 0 ? 'Focus' : index === 1 ? 'Review' : index === 2 ? 'Align' : 'Ship'),
    label: cleanText(
      stat?.label,
      index === 0
        ? 'Keep the lead message specific and useful'
        : index === 1
          ? 'Validate claims against approved references'
          : index === 2
            ? 'Adapt the wording to the intended audience'
            : 'Export only after evidence is attached',
    ),
    colorClass: normalizeColorClass(stat?.colorClass, index % 2 === 0 ? 'c-mint' : 'c-gold'),
  }));

  const safeSections = (Array.isArray(data?.sections) ? data.sections : []).slice(0, 3).map((section, index) => ({
    title: cleanText(section?.title, `Insight ${index + 1}`),
    bullets: cleanList(section?.bullets, 4, [
      'Clarify the topic for the intended audience.',
      'Support the narrative with approved evidence.',
      'Keep the takeaway concise and review-ready.',
    ]),
    colorClass: normalizeColorClass(section?.colorClass, index === 0 ? 'c-mint' : index === 1 ? 'c-sky' : 'c-purple'),
  }));

  const safeActions = cleanList(data?.actions, 4, [
    'Attach the verified reference pack before final sign-off.',
    'Validate numerical or comparative claims against approved sources.',
    'Confirm market-specific wording before export.',
  ]);

  return {
    ...data,
    hero: {
      kicker: cleanText(data?.hero?.kicker, 'Evidence snapshot'),
      title: safeTitle.charAt(0).toUpperCase() + safeTitle.slice(1),
      subtitle: safeSubtitle,
    },
    highlight: cleanText(
      data?.highlight,
      'This draft keeps the narrative evidence-led, concise, and ready for review.',
    ),
    stats: safeStats.length > 0 ? safeStats : [
      { value: 'Focus', label: 'Keep the lead message specific and useful', colorClass: 'c-mint' },
      { value: 'Review', label: 'Validate claims against approved references', colorClass: 'c-gold' },
      { value: 'Align', label: 'Adapt the wording to the intended audience', colorClass: 'c-sky' },
      { value: 'Ship', label: 'Export only after evidence is attached', colorClass: 'c-purple' },
    ],
    sections: safeSections.length > 0 ? safeSections : [
      {
        title: 'Core Message',
        bullets: [
          'Define the topic clearly for the intended audience.',
          'Keep the language direct, useful, and non-numeric.',
          'Hold quantitative proof points until sources are verified.',
        ],
        colorClass: 'c-mint',
      },
      {
        title: 'What To Review',
        bullets: [
          'Add the approved source pack before finalizing stats.',
          'Check market-specific wording and claim suitability.',
          'Confirm the right balance of context, evidence, and action.',
        ],
        colorClass: 'c-sky',
      },
      {
        title: 'Next Step',
        bullets: [
          'Replace qualitative statements with approved evidence where needed.',
          'Map each claim to its supporting source before distribution.',
          'Use the final export only after review is complete.',
        ],
        colorClass: 'c-purple',
      },
    ],
    actions: safeActions,
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function safeReferenceHref(value) {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function buildSearchQuery(request) {
  return [
    request.prompt,
    request.market && request.market !== 'global' ? request.market : '',
    request.targetAudience,
    'statistics prevention guidance clinical public health',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildReferences(sources) {
  if (!sources.length) {
    return [{ id: 'REF', citation: 'Reference pack pending source capture.' }];
  }

  return sources.slice(0, 8).map((source, index) => ({
    id: source.sourceDocId || `S${index + 1}`,
    citation: `${source.title} — ${source.domain}${source.publishedYear ? ` (${source.publishedYear})` : ''}`,
    title: source.title,
    domain: source.domain,
    url: source.url,
    sourceType: source.sourceType,
    tier: source.tier,
    suitability: source.suitability,
    anchor: source.verbatimAnchor || source.snippet,
  }));
}

function pickReferenceId(references, index) {
  return references[index % Math.max(references.length, 1)]?.id || 'REF';
}

function attachInfographicSourceRefs(data, references) {
  return {
    ...data,
    stats: data.stats.map((stat, index) => ({
      ...stat,
      sourceId: pickReferenceId(references, index),
    })),
    sections: data.sections.map((section, index) => ({
      ...section,
      sourceId: pickReferenceId(references, index + data.stats.length),
    })),
    actions: data.actions.map((action, index) => ({
      text: typeof action === 'string' ? action : action.text,
      sourceId: pickReferenceId(references, index + data.stats.length + data.sections.length),
    })),
  };
}

function getActionText(action) {
  return typeof action === 'string' ? action : action.text;
}

function getActionSourceId(action) {
  return typeof action === 'string' ? undefined : action.sourceId;
}

function sourceChipMarkup(sourceId) {
  const id = sourceId || 'REF';
  return `<a class="source-chip" href="#ref-${escapeAttribute(id)}" aria-label="Jump to source ${escapeAttribute(id)}">Source ${escapeHtml(id)}</a>`;
}

function buildSourcePendingInfographic(request, references) {
  const title = String(request.prompt || 'Evidence-led infographic').replace(/\s+/g, ' ').trim();
  return {
    hero: {
      kicker: 'Evidence-safe draft',
      title: title.charAt(0).toUpperCase() + title.slice(1),
      subtitle: 'Structured for review without unsupported quantitative claims.',
    },
    highlight: 'This draft keeps the narrative qualitative because no verified source pack was captured for the run.',
    stats: [
      { value: 'Focus', label: 'Keep the lead message specific and useful', colorClass: 'c-mint' },
      { value: 'Review', label: 'Validate claims against approved references', colorClass: 'c-gold' },
      { value: 'Align', label: 'Adapt the wording to the intended audience', colorClass: 'c-sky' },
      { value: 'Ship', label: 'Export only after evidence is attached', colorClass: 'c-purple' },
    ],
    sections: [
      {
        title: 'Core Message',
        bullets: [
          'Define the topic clearly for the intended audience.',
          'Keep the language direct, useful, and non-numeric.',
          'Hold quantitative proof points until sources are verified.',
        ],
        colorClass: 'c-mint',
      },
      {
        title: 'What To Review',
        bullets: [
          'Add the approved source pack before finalizing stats.',
          'Check market-specific wording and claim suitability.',
          'Confirm the right balance of context, evidence, and action.',
        ],
        colorClass: 'c-sky',
      },
      {
        title: 'Next Step',
        bullets: [
          'Replace qualitative statements with approved evidence where needed.',
          'Map each claim to its supporting source before distribution.',
          'Use the final export only after review is complete.',
        ],
        colorClass: 'c-purple',
      },
    ],
    actions: [
      'Attach the verified reference pack.',
      'Add approved numerical proof points only after review.',
      'Finalize the design once evidence is locked.',
    ],
    references,
    meta: {
      audience: request.targetAudience,
      market: request.market === 'global' ? 'Global' : request.market,
      extent: request.apiNamespace === 'medical' ? 'Evidence-led' : 'Campaign-ready',
    },
  };
}

function buildInfographicText(data) {
  return [
    `# ${data.hero.title}`,
    '',
    `## ${data.hero.kicker}`,
    data.hero.subtitle,
    '',
    '## Key Metrics',
    ...data.stats.map((stat) => `- ${stat.value}: ${stat.label} [${stat.sourceId || 'REF'}]`),
    '',
    '## Evidence Snapshot',
    ...data.sections.map((section) => [`### ${section.title} [${section.sourceId || 'REF'}]`, ...section.bullets.map((bullet) => `- ${bullet}`), '']).flat(),
    '## Action Plan',
    ...data.actions.map((action) => `- ${getActionText(action)} [${getActionSourceId(action) || 'REF'}]`),
    '',
    '## References',
    ...data.references.map((reference) => `- ${reference.id}: ${reference.citation}`),
  ].join('\n').trim();
}

function shouldUseClinicalTheme(request) {
  const namespace = String(request?.apiNamespace || '').trim().toLowerCase();
  const tone = String(request?.tone || '').trim().toLowerCase();
  const audience = String(request?.targetAudience || '').trim().toLowerCase();

  if (namespace === 'medical') {
    return true;
  }

  if (namespace === 'marketing' && ['persuasive', 'casual', 'inspirational'].includes(tone)) {
    return false;
  }

  if (['professional', 'academic'].includes(tone)) {
    return true;
  }

  if (/(hcp|clinician|clinical|medical|msl|payer|policy|research|leadership)/i.test(audience)) {
    return true;
  }

  return true;
}

function compileInfographicHtml(data, request = {}) {
  const clinicalTheme = shouldUseClinicalTheme(request);
  const statsMarkup = data.stats.map((stat, index) => `
    <article class="signal-card ${escapeHtml(stat.colorClass)}">
      <div class="signal-index">0${index + 1}</div>
      <div class="signal-value">${escapeHtml(stat.value)}</div>
      <div class="signal-label">${escapeHtml(stat.label)}</div>
      ${sourceChipMarkup(stat.sourceId)}
    </article>
  `).join('');

  const sectionMarkup = data.sections.map((section, index) => `
    <article class="insight-card card-${index + 1} ${escapeHtml(section.colorClass)}">
      <div class="insight-topline">Insight ${index + 1} · <a href="#ref-${escapeAttribute(section.sourceId || 'REF')}">Source ${escapeHtml(section.sourceId || 'REF')}</a></div>
      <h3>${escapeHtml(section.title)}</h3>
      <ul>
        ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
      </ul>
    </article>
  `).join('');

  const actionMarkup = data.actions.map((action, index) => `
    <article class="action-card">
      <div class="action-number">0${index + 1}</div>
      <p>${escapeHtml(getActionText(action))}</p>
      ${sourceChipMarkup(getActionSourceId(action))}
    </article>
  `).join('');

  const referenceMarkup = data.references.map((reference) => `
    <li id="ref-${escapeAttribute(reference.id)}">
      <a class="ref-id" href="${escapeAttribute(safeReferenceHref(reference.url) || `#ref-${reference.id}`)}" target="_blank" rel="noreferrer">${escapeHtml(reference.id)}</a>
      <div class="ref-body">
        <a class="ref-title" href="${escapeAttribute(safeReferenceHref(reference.url) || `#ref-${reference.id}`)}" target="_blank" rel="noreferrer">
          ${escapeHtml(reference.citation)}
        </a>
        <div class="ref-meta">
          ${escapeHtml([reference.tier, reference.sourceType, reference.suitability ? `${reference.suitability} fit` : ''].filter(Boolean).join(' · '))}
        </div>
        ${reference.anchor ? `<p>${escapeHtml(reference.anchor)}</p>` : ''}
      </div>
    </li>
  `).join('');

  const sourceSummaryMarkup = data.references.slice(0, 5).map((reference) => `
    <a class="source-summary-pill" href="#ref-${escapeAttribute(reference.id)}">
      <span>${escapeHtml(reference.id)}</span>
      ${escapeHtml(reference.domain || 'source')}
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.hero.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  :root {
    --ink: #163137;
    --ink-soft: #2b4c53;
    --panel: rgba(255,255,255,0.72);
    --panel-strong: rgba(255,255,255,0.88);
    --line: rgba(21,78,89,0.12);
    --text: #15323a;
    --muted: rgba(21,50,58,0.74);
    --muted-2: rgba(21,50,58,0.54);
    --teal: #127a78;
    --teal-bright: #32c2af;
    --tangerine: #f06a2f;
    --sand: #fff9f1;
    --mint: #58c4a5;
    --gold: #f0b64e;
    --sky: #7ab8ff;
    --green: #8ed3a8;
    --red: #ff7d6c;
  }
  body {
    margin: 0;
    font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
    background:
      radial-gradient(circle at top left, rgba(240,106,47,0.10), transparent 30%),
      radial-gradient(circle at top right, rgba(50,194,175,0.12), transparent 28%),
      linear-gradient(180deg, #eef7f6 0%, #f7fbfb 100%);
    color: var(--text);
    padding: 24px;
  }
  .page {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    background:
      radial-gradient(circle at 78% 12%, rgba(50,194,175,0.14), transparent 22%),
      radial-gradient(circle at 12% 78%, rgba(240,106,47,0.08), transparent 20%),
      linear-gradient(180deg, #fdfefe 0%, #f4fbfa 52%, #edf7f6 100%);
    border-radius: 34px;
    overflow: hidden;
    box-shadow: 0 32px 120px rgba(20, 60, 68, 0.14);
    border: 1px solid rgba(8, 34, 36, 0.10);
    position: relative;
  }
  .page::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(18,122,120,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(18,122,120,0.035) 1px, transparent 1px);
    background-size: 56px 56px;
    opacity: 0.55;
    pointer-events: none;
  }
  .masthead {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding: 28px 34px 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--sand) 0%, #fff8ec 100%);
    color: var(--teal);
    font-weight: 700;
    font-size: 21px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
  }
  .brand-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .brand-name {
    font-size: 13px;
    letter-spacing: 0.34em;
    color: var(--teal);
    font-weight: 700;
  }
  .brand-sub {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted-2);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    max-width: 48%;
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(21,78,89,0.10);
    color: var(--muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
  }
  .hero {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
    gap: 22px;
    padding: 26px 34px 20px;
  }
  .hero-copy {
    padding-top: 6px;
  }
  .kicker {
    display: inline-flex;
    padding: 6px 12px;
    background: rgba(255,255,255,0.78);
    border: 1px solid rgba(21,78,89,0.10);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--teal);
    margin-bottom: 16px;
  }
  h1 {
    margin: 0;
    max-width: 420px;
    font-size: 54px;
    line-height: 0.94;
    letter-spacing: -0.04em;
    color: var(--text);
  }
  .subtitle {
    margin-top: 16px;
    max-width: 440px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  .highlight-band {
    position: relative;
    z-index: 1;
    margin: 0 34px 20px;
    padding: 18px 22px 18px 86px;
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(255,255,255,0.88), rgba(244,251,250,0.96));
    border: 1px solid rgba(21,78,89,0.10);
    min-height: 110px;
  }
  .highlight-band::before {
    content: "";
    position: absolute;
    left: 22px;
    top: 20px;
    width: 40px;
    height: calc(100% - 40px);
    border-radius: 18px;
    background: linear-gradient(180deg, var(--tangerine), rgba(240,106,47,0.18));
  }
  .highlight-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: rgba(18,122,120,0.72);
    font-weight: 700;
    margin-bottom: 10px;
  }
  .highlight-copy {
    margin: 0;
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 34px;
    line-height: 0.98;
    color: #114149;
    max-width: 620px;
  }
  .signal-panel {
    border-radius: 28px;
    padding: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(244,251,250,0.96));
    border: 1px solid rgba(21,78,89,0.10);
    backdrop-filter: blur(18px);
  }
  .signal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .signal-head span:first-child {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(18,122,120,0.72);
    font-weight: 700;
  }
  .signal-head span:last-child {
    font-size: 11px;
    color: var(--muted);
  }
  .signals {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .signal-card {
    position: relative;
    min-height: 132px;
    padding: 16px 14px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,0.82);
    border: 1px solid rgba(21,78,89,0.08);
    overflow: hidden;
  }
  .signal-card::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 4px;
    background: var(--tangerine);
  }
  .signal-card.c-mint::after { background: var(--mint); }
  .signal-card.c-gold::after { background: var(--gold); }
  .signal-card.c-sky::after { background: var(--sky); }
  .signal-card.c-purple::after { background: var(--green); }
  .signal-card.c-red::after { background: var(--red); }
  .signal-index {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(18,122,120,0.52);
    margin-bottom: 12px;
    font-weight: 700;
  }
  .signal-value {
    font-size: 30px;
    line-height: 0.95;
    letter-spacing: -0.04em;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 9px;
  }
  .signal-label {
    font-size: 13px;
    line-height: 1.52;
    color: var(--muted);
  }
  .source-chip {
    display: inline-flex;
    width: max-content;
    max-width: 100%;
    margin-top: 12px;
    padding: 5px 8px;
    border-radius: 999px;
    border: 1px solid rgba(18,122,120,0.16);
    background: rgba(18,122,120,0.08);
    color: rgba(21,50,58,0.78);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-decoration: none;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }
  .source-chip:hover,
  .source-chip:focus {
    color: var(--sand);
    border-color: rgba(240,106,47,0.72);
    background: rgba(240,106,47,0.14);
  }
  .content-grid {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 14px;
    padding: 0 34px 18px;
  }
  .insight-card {
    border-radius: 24px;
    padding: 20px 20px 18px;
    background: linear-gradient(180deg, rgba(255,255,255,0.90), rgba(244,251,250,0.96));
    border: 1px solid rgba(21,78,89,0.10);
    min-height: 248px;
  }
  .card-1 { grid-column: span 7; }
  .card-2 { grid-column: span 5; }
  .card-3 { grid-column: span 12; min-height: 210px; }
  .insight-topline {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(18,122,120,0.62);
    font-weight: 700;
    margin-bottom: 14px;
  }
  .insight-topline a {
    color: rgba(21,50,58,0.78);
    text-decoration: none;
  }
  .insight-topline a:hover {
    color: var(--tangerine);
  }
  .insight-card h3 {
    margin: 0 0 14px;
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--ink);
  }
  .insight-card ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .insight-card li {
    position: relative;
    padding-left: 16px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
  }
  .insight-card li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 10px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--tangerine);
    box-shadow: 0 0 0 5px rgba(240,106,47,0.12);
  }
  .insight-card.c-mint li::before { background: var(--mint); box-shadow: 0 0 0 5px rgba(88,196,165,0.12); }
  .insight-card.c-gold li::before { background: var(--gold); box-shadow: 0 0 0 5px rgba(240,182,78,0.12); }
  .insight-card.c-sky li::before { background: var(--sky); box-shadow: 0 0 0 5px rgba(122,184,255,0.12); }
  .insight-card.c-purple li::before { background: var(--green); box-shadow: 0 0 0 5px rgba(142,211,168,0.12); }
  .insight-card.c-red li::before { background: var(--red); box-shadow: 0 0 0 5px rgba(255,125,108,0.12); }
  .action-zone {
    position: relative;
    z-index: 1;
    padding: 0 34px 24px;
  }
  .zone-label {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: rgba(18,122,120,0.72);
    font-weight: 700;
    margin-bottom: 14px;
  }
  .zone-label::before {
    content: "";
    display: inline-block;
    width: 22px;
    height: 2px;
    background: var(--tangerine);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .action-card {
    border-radius: 22px;
    padding: 16px 16px 18px;
    background: rgba(255,255,255,0.84);
    border: 1px solid rgba(21,78,89,0.10);
    min-height: 132px;
  }
  .action-number {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--tangerine), #ff8a4f);
    color: #fff4e9;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .action-card p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
  }
  .source-summary {
    position: relative;
    z-index: 1;
    margin: 0 34px 24px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-radius: 20px;
    background: rgba(255,255,255,0.84);
    border: 1px solid rgba(21,78,89,0.10);
  }
  .source-summary-text {
    font-size: 12px;
    color: rgba(21,50,58,0.72);
  }
  .source-summary-text strong {
    display: block;
    margin-bottom: 2px;
    color: var(--teal);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .source-summary-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .source-summary-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid rgba(21,78,89,0.12);
    background: rgba(255,255,255,0.72);
    color: rgba(21,50,58,0.78);
    font-size: 11px;
    text-decoration: none;
  }
  .source-summary-pill span {
    color: var(--tangerine);
    font-weight: 800;
  }
  .references {
    position: relative;
    z-index: 1;
    padding: 26px 34px 34px;
    border-top: 1px solid rgba(21,78,89,0.12);
    background:
      linear-gradient(135deg, rgba(240,106,47,0.06), transparent 36%),
      rgba(248,252,252,0.94);
  }
  .references h2 {
    margin: 0 0 8px;
    font-size: 14px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .references-intro {
    margin: 0 0 18px;
    max-width: 760px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(21,50,58,0.72);
  }
  .references ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .references li {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 14px;
    align-items: start;
    padding: 12px;
    border-radius: 18px;
    border: 1px solid rgba(21,78,89,0.10);
    background: rgba(255,255,255,0.86);
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
    scroll-margin-top: 24px;
  }
  .references li:target {
    border-color: rgba(240,106,47,0.8);
    box-shadow: 0 0 0 3px rgba(240,106,47,0.12);
  }
  .ref-id {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 32px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(240,106,47,0.18);
    color: var(--ink);
    border: 1px solid rgba(240,106,47,0.36);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-decoration: none;
  }
  .ref-title {
    color: var(--text);
    text-decoration: none;
    font-weight: 700;
  }
  .ref-title:hover,
  .ref-id:hover {
    color: #bc4e14;
  }
  .ref-meta {
    margin-top: 4px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(18,122,120,0.62);
  }
  .ref-body p {
    margin: 6px 0 0;
    color: rgba(21,50,58,0.62);
    font-size: 12px;
    line-height: 1.55;
  }
  .footer {
    margin-top: 16px;
    font-size: 11px;
    color: var(--muted-2);
  }
  .page.editorial-theme {
    --ink: #f6f3ec;
    --ink-soft: #d6e3e0;
    --panel: rgba(255,255,255,0.06);
    --panel-strong: rgba(255,255,255,0.08);
    --line: rgba(255,255,255,0.12);
    --text: #f6f3ec;
    --muted: rgba(246,243,236,0.72);
    --muted-2: rgba(246,243,236,0.54);
    --sand: #f5e9d2;
    background:
      radial-gradient(circle at 78% 12%, rgba(50,194,175,0.22), transparent 22%),
      radial-gradient(circle at 12% 78%, rgba(240,106,47,0.12), transparent 20%),
      linear-gradient(160deg, #0c1216 0%, #102128 48%, #0d4b4f 100%);
    box-shadow: 0 32px 120px rgba(10, 16, 20, 0.22);
    border: 1px solid rgba(8, 34, 36, 0.14);
  }
  .page.editorial-theme::before {
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    opacity: 0.28;
  }
  .page.editorial-theme .brand-name,
  .page.editorial-theme .highlight-copy,
  .page.editorial-theme .references h2,
  .page.editorial-theme .signal-value,
  .page.editorial-theme .insight-card h3,
  .page.editorial-theme .source-summary-text strong {
    color: var(--sand);
  }
  .page.editorial-theme h1,
  .page.editorial-theme .subtitle,
  .page.editorial-theme .action-card p,
  .page.editorial-theme .signal-label,
  .page.editorial-theme .insight-card li,
  .page.editorial-theme .references li,
  .page.editorial-theme .footer {
    color: var(--muted);
  }
  .page.editorial-theme h1 {
    color: var(--text);
  }
  .page.editorial-theme .meta span,
  .page.editorial-theme .kicker,
  .page.editorial-theme .signal-panel,
  .page.editorial-theme .insight-card,
  .page.editorial-theme .action-card,
  .page.editorial-theme .source-summary {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.10);
  }
  .page.editorial-theme .kicker {
    color: var(--sand);
  }
  .page.editorial-theme .highlight-band {
    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
    border-color: rgba(255,255,255,0.09);
  }
  .page.editorial-theme .signal-card {
    background: rgba(7, 18, 24, 0.46);
    border-color: rgba(255,255,255,0.08);
  }
  .page.editorial-theme .source-summary-pill {
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: rgba(246,243,236,0.78);
  }
  .page.editorial-theme .references {
    border-top-color: rgba(255,255,255,0.14);
    background:
      linear-gradient(135deg, rgba(240,106,47,0.1), transparent 36%),
      rgba(5,12,16,0.48);
  }
  .page.editorial-theme .references-intro,
  .page.editorial-theme .source-summary-text,
  .page.editorial-theme .ref-body p {
    color: rgba(246,243,236,0.7);
  }
  .page.editorial-theme .references li {
    border-color: rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
  }
  .page.editorial-theme .ref-meta,
  .page.editorial-theme .insight-topline,
  .page.editorial-theme .zone-label,
  .page.editorial-theme .signal-head span:first-child,
  .page.editorial-theme .highlight-label,
  .page.editorial-theme .signal-index {
    color: rgba(245,233,210,0.62);
  }
  .page.editorial-theme .insight-topline a,
  .page.editorial-theme .source-chip,
  .page.editorial-theme .ref-title,
  .page.editorial-theme .ref-id {
    color: rgba(245,233,210,0.78);
  }
  .page.editorial-theme .insight-topline a:hover {
    color: var(--sand);
  }
  .page.editorial-theme .source-chip {
    border-color: rgba(245,233,210,0.18);
    background: rgba(245,233,210,0.08);
  }
  .page.editorial-theme .ref-id {
    color: var(--sand);
  }
  .page.editorial-theme .ref-meta {
    color: rgba(245,233,210,0.62);
  }
  @media (max-width: 860px) {
    body { padding: 10px; }
    .page {
      width: 100%;
      min-height: auto;
      border-radius: 24px;
    }
    .masthead,
    .hero,
    .action-zone,
    .references,
    .content-grid {
      padding-left: 20px;
      padding-right: 20px;
    }
    .source-summary {
      margin-left: 20px;
      margin-right: 20px;
      align-items: flex-start;
      flex-direction: column;
    }
    .source-summary-pills {
      justify-content: flex-start;
    }
    .highlight-band {
      margin-left: 20px;
      margin-right: 20px;
      padding-left: 72px;
    }
    .hero {
      grid-template-columns: 1fr;
    }
    .meta {
      justify-content: flex-start;
      max-width: none;
    }
    h1 {
      max-width: none;
      font-size: 42px;
    }
    .highlight-copy {
      font-size: 28px;
    }
    .signals,
    .actions {
      grid-template-columns: 1fr;
    }
    .references li {
      grid-template-columns: 1fr;
    }
    .content-grid {
      grid-template-columns: 1fr;
    }
    .card-1,
    .card-2,
    .card-3 {
      grid-column: span 1;
      min-height: auto;
    }
  }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; width: 210mm; min-height: 297mm; }
  }
</style>
</head>
<body>
  <main class="page ${clinicalTheme ? 'clinical-theme' : 'editorial-theme'}">
    <header class="masthead">
      <div class="brand">
        <div class="brand-mark">V</div>
        <div class="brand-copy">
          <div class="brand-name">VERA</div>
          <div class="brand-sub">${clinicalTheme ? 'Clinical infographic system' : 'Editorial infographic system'}</div>
        </div>
      </div>
      <div class="meta">
        <span>${escapeHtml(data.meta.audience)}</span>
        <span>${escapeHtml(data.meta.market)}</span>
        <span>${escapeHtml(data.meta.extent)}</span>
      </div>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <div class="kicker">${escapeHtml(data.hero.kicker)}</div>
        <h1>${escapeHtml(data.hero.title)}</h1>
        <p class="subtitle">${escapeHtml(data.hero.subtitle)}</p>
      </div>
      <aside class="signal-panel">
        <div class="signal-head">
          <span>Signal Board</span>
          <span>4 review cues</span>
        </div>
        <div class="signals">${statsMarkup}</div>
      </aside>
    </section>

    <section class="highlight-band">
      <div class="highlight-label">Why it matters</div>
      <p class="highlight-copy">${escapeHtml(data.highlight)}</p>
    </section>

    <section class="content-grid">
      ${sectionMarkup}
    </section>

    <section class="action-zone">
      <div class="zone-label">Action plan</div>
      <div class="actions">${actionMarkup}</div>
    </section>

    <section class="source-summary" aria-label="Source summary">
      <div class="source-summary-text">
        <strong>Source ledger</strong>
        Every visible source tag links to the full reference below.
      </div>
      <div class="source-summary-pills">${sourceSummaryMarkup}</div>
    </section>

    <section class="references">
      <h2>Source Ledger</h2>
      <p class="references-intro">These are the source records used to build this infographic. Click a source ID or title to open the original reference.</p>
      <ol>${referenceMarkup}</ol>
      <p class="footer">Prepared in Vera for review and export.</p>
    </section>
  </main>
</body>
</html>`;
}

export async function generateInfographicOnServer(request) {
  const sources = await searchWebSources(buildSearchQuery(request), 6);
  const references = buildReferences(sources);
  let providerStack = getProviderStackForContentType('infographic');

  if (sources.length === 0) {
    const data = attachInfographicSourceRefs(sanitizeInfographicData(buildSourcePendingInfographic(request, references), request), references);
    const html = compileInfographicHtml(data, request);
    const textContent = buildInfographicText(data);
    let designRender = null;

    try {
      designRender = await tryRenderDesignExternally({
        request,
        contentType: 'infographic',
        markdown: textContent,
        infographicData: data,
        sources,
      });
      if (designRender?.provider) {
        providerStack = {
          ...providerStack,
          design: designRender.provider,
        };
      }
    } catch (error) {
      console.warn('[vera] External infographic render failed, using native HTML fallback.', error);
      providerStack = {
        ...providerStack,
        design: 'native',
      };
    }

    return {
      contentType: 'infographic',
      content: html,
      textContent,
      format: designRender ? 'image' : 'html',
      downloadUrl: designRender?.viewUrl || '#',
      previewUrl: designRender?.previewUrl,
      market: request.market,
      audience: request.targetAudience,
      apiNamespace: request.apiNamespace,
      renderVariant: 'poster',
      infographicData: data,
      sources,
      screenedSources: sources,
      providerStack,
      providerLinks: designRender?.provider
        ? [{
            stage: 'design',
            provider: designRender.provider,
            label: designRender.provider === 'canva' ? 'Edit in Canva' : designRender.provider === 'gamma' ? 'Open in Gamma' : 'Open design asset',
            editUrl: designRender.editUrl || undefined,
            viewUrl: designRender.viewUrl || designRender.gammaUrl || undefined,
            downloadUrl: designRender.remoteUrl || undefined,
            generationId: designRender.generationId || designRender.designId || undefined,
            note: designRender.provider === 'canva'
              ? 'Canva-backed infographic export with editable source.'
              : designRender.provider === 'gamma'
                ? 'Gamma-backed infographic export.'
                : undefined,
          }]
        : [],
      __designBinary: designRender?.binary,
      __designExtension: designRender?.extension,
    };
  }

  const object = await generateObject({
    prompt: `You are Vera's infographic strategist.

Create a crisp, polished, evidence-led infographic structure for:
- Prompt: ${request.prompt}
- Market: ${request.market}
- Namespace: ${request.apiNamespace}
- Tone: ${request.tone}
- Length: ${request.length}
- Scientific depth: ${request.scientificDepth}
- Audience: ${request.targetAudience}

Rules:
- Keep copy concise and visually scannable.
- No placeholders.
- No raw citations in body bullets.
- No markdown, only structured JSON.
- Use practical, presentation-ready language.
- If sources are available, stay consistent with them.

Captured sources:
${sources.length ? sources.map((source, index) => `${index + 1}. ${source.title} — ${source.domain}${source.snippet ? ` — ${source.snippet}` : ''}`).join('\n') : 'No web sources were captured.'}
`,
    schema: {
      type: 'object',
      properties: {
        hero: {
          type: 'object',
          properties: {
            kicker: { type: 'string' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
          },
          required: ['kicker', 'title', 'subtitle'],
        },
        highlight: { type: 'string' },
        stats: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
              colorClass: { type: 'string', enum: COLOR_CLASSES },
            },
            required: ['value', 'label', 'colorClass'],
          },
        },
        sections: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              bullets: {
                type: 'array',
                minItems: 3,
                maxItems: 4,
                items: { type: 'string' },
              },
              colorClass: { type: 'string', enum: COLOR_CLASSES },
            },
            required: ['title', 'bullets', 'colorClass'],
          },
        },
        actions: {
          type: 'array',
          minItems: 3,
          maxItems: 4,
          items: { type: 'string' },
        },
      },
      required: ['hero', 'highlight', 'stats', 'sections', 'actions'],
    },
  });

  const data = attachInfographicSourceRefs(sanitizeInfographicData({
    hero: {
      kicker: object.hero?.kicker || 'Evidence snapshot',
      title: object.hero?.title || request.prompt,
      subtitle: object.hero?.subtitle || 'A concise visual summary built for review and export.',
    },
    highlight: object.highlight || 'Key facts and implications summarised for quick review.',
    stats: (object.stats || []).slice(0, 4),
    sections: (object.sections || []).slice(0, 3),
    actions: (object.actions || []).slice(0, 4),
    references,
    meta: {
      audience: request.targetAudience,
      market: request.market === 'global' ? 'Global' : request.market,
      extent: request.apiNamespace === 'medical' ? 'Evidence-led' : 'Campaign-ready',
    },
  }, request), references);

  const html = compileInfographicHtml(data, request);
  const textContent = buildInfographicText(data);
  let designRender = null;

  try {
    designRender = await tryRenderDesignExternally({
      request,
      contentType: 'infographic',
      markdown: textContent,
      infographicData: data,
      sources,
    });
    if (designRender?.provider) {
      providerStack = {
        ...providerStack,
        design: designRender.provider,
      };
    }
  } catch (error) {
    console.warn('[vera] External infographic render failed, using native HTML fallback.', error);
    providerStack = {
      ...providerStack,
      design: 'native',
    };
  }

  return {
    contentType: 'infographic',
    content: html,
    textContent,
    format: designRender ? 'image' : 'html',
    downloadUrl: designRender?.viewUrl || '#',
    previewUrl: designRender?.previewUrl,
    market: request.market,
    audience: request.targetAudience,
    apiNamespace: request.apiNamespace,
    renderVariant: 'poster',
    infographicData: data,
    sources,
    screenedSources: sources,
    providerStack,
    providerLinks: designRender?.provider
      ? [{
          stage: 'design',
          provider: designRender.provider,
          label: designRender.provider === 'canva' ? 'Edit in Canva' : designRender.provider === 'gamma' ? 'Open in Gamma' : 'Open design asset',
          editUrl: designRender.editUrl || undefined,
          viewUrl: designRender.viewUrl || designRender.gammaUrl || undefined,
          downloadUrl: designRender.remoteUrl || undefined,
          generationId: designRender.generationId || designRender.designId || undefined,
          note: designRender.provider === 'canva'
            ? 'Canva-backed infographic export with editable source.'
            : designRender.provider === 'gamma'
              ? 'Gamma-backed infographic export.'
              : undefined,
        }]
      : [],
    __designBinary: designRender?.binary,
    __designExtension: designRender?.extension,
  };
}
