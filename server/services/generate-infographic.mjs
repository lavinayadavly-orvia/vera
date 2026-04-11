import { generateObject } from '../providers/openai.mjs';
import { getProviderStackForContentType } from '../providers/registry.mjs';
import { searchWebSources } from '../providers/search.mjs';

const COLOR_CLASSES = ['c-mint', 'c-gold', 'c-sky', 'c-purple', 'c-red', ''];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    id: `S${index + 1}`,
    citation: `${source.title} — ${source.domain}${source.publishedYear ? ` (${source.publishedYear})` : ''}`,
  }));
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
    ...data.stats.map((stat) => `- ${stat.value}: ${stat.label}`),
    '',
    '## Evidence Snapshot',
    ...data.sections.map((section) => [`### ${section.title}`, ...section.bullets.map((bullet) => `- ${bullet}`), '']).flat(),
    '## Action Plan',
    ...data.actions.map((action) => `- ${action}`),
    '',
    '## References',
    ...data.references.map((reference) => `- ${reference.id}: ${reference.citation}`),
  ].join('\n').trim();
}

function compileInfographicHtml(data) {
  const statsMarkup = data.stats.map((stat) => `
    <article class="stat-card ${escapeHtml(stat.colorClass)}">
      <div class="stat-value">${escapeHtml(stat.value)}</div>
      <div class="stat-label">${escapeHtml(stat.label)}</div>
    </article>
  `).join('');

  const sectionMarkup = data.sections.map((section) => `
    <article class="section-card ${escapeHtml(section.colorClass)}">
      <h3>${escapeHtml(section.title)}</h3>
      <ul>
        ${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
      </ul>
    </article>
  `).join('');

  const actionMarkup = data.actions.map((action, index) => `
    <div class="action-item">
      <span class="action-index">${index + 1}</span>
      <span>${escapeHtml(action)}</span>
    </div>
  `).join('');

  const referenceMarkup = data.references.map((reference) => `
    <li><strong>${escapeHtml(reference.id)}</strong> ${escapeHtml(reference.citation)}</li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.hero.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef4ef 100%);
    color: #173226;
    padding: 24px;
  }
  .page {
    max-width: 860px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
    border: 1px solid rgba(23, 50, 38, 0.08);
  }
  .hero {
    padding: 36px 36px 28px;
    background: linear-gradient(135deg, #0f6a55 0%, #1f8b73 100%);
    color: #ffffff;
  }
  .kicker {
    display: inline-flex;
    padding: 6px 12px;
    background: rgba(255,255,255,0.14);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  h1 {
    margin: 0;
    font-size: 42px;
    line-height: 1.02;
    letter-spacing: -0.04em;
  }
  .subtitle {
    margin-top: 14px;
    max-width: 640px;
    font-size: 15px;
    line-height: 1.7;
    color: rgba(255,255,255,0.92);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
  }
  .meta span {
    display: inline-flex;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .section {
    padding: 28px 36px;
    border-top: 1px solid rgba(23, 50, 38, 0.08);
  }
  .section h2 {
    margin: 0 0 16px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #0f6a55;
  }
  .stats-grid,
  .section-grid {
    display: grid;
    gap: 14px;
  }
  .stats-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .section-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .stat-card,
  .section-card,
  .highlight,
  .reference-card {
    border-radius: 20px;
    padding: 18px;
    background: #f6f8fa;
    border: 1px solid rgba(23, 50, 38, 0.08);
  }
  .stat-card.c-mint, .section-card.c-mint { background: #e9f7f2; }
  .stat-card.c-gold, .section-card.c-gold { background: #fff6df; }
  .stat-card.c-sky, .section-card.c-sky { background: #eaf3ff; }
  .stat-card.c-purple, .section-card.c-purple { background: #f1ecff; }
  .stat-card.c-red, .section-card.c-red { background: #ffeded; }
  .stat-value {
    font-size: 34px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 8px;
  }
  .stat-label {
    font-size: 13px;
    line-height: 1.5;
    color: #4a6357;
  }
  .highlight p {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: #284338;
  }
  .section-card h3 {
    margin: 0 0 10px;
    font-size: 18px;
  }
  .section-card ul,
  .references ol {
    margin: 0;
    padding-left: 18px;
  }
  .section-card li,
  .references li {
    margin: 8px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #365045;
  }
  .actions {
    display: grid;
    gap: 12px;
  }
  .action-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    border-radius: 16px;
    background: #f8fafb;
    border: 1px solid rgba(23, 50, 38, 0.08);
    font-size: 14px;
    line-height: 1.6;
    color: #284338;
  }
  .action-index {
    display: inline-flex;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    align-items: center;
    justify-content: center;
    background: #0f6a55;
    color: #fff;
    font-weight: 700;
    flex-shrink: 0;
  }
  .references {
    padding: 28px 36px 36px;
    background: #fbfcfd;
    border-top: 1px solid rgba(23, 50, 38, 0.08);
  }
  .references h2 {
    margin: 0 0 14px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #0f6a55;
  }
  .footer {
    margin-top: 12px;
    font-size: 12px;
    color: #688276;
  }
  @media (max-width: 860px) {
    body { padding: 12px; }
    .hero, .section, .references { padding-left: 20px; padding-right: 20px; }
    .stats-grid, .section-grid { grid-template-columns: 1fr; }
    h1 { font-size: 34px; }
  }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; max-width: none; }
  }
</style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="kicker">${escapeHtml(data.hero.kicker)}</div>
      <h1>${escapeHtml(data.hero.title)}</h1>
      <p class="subtitle">${escapeHtml(data.hero.subtitle)}</p>
      <div class="meta">
        <span>${escapeHtml(data.meta.audience)}</span>
        <span>${escapeHtml(data.meta.market)}</span>
        <span>${escapeHtml(data.meta.extent)}</span>
      </div>
    </section>

    <section class="section">
      <h2>Key Metrics</h2>
      <div class="stats-grid">${statsMarkup}</div>
    </section>

    <section class="section">
      <h2>Why It Matters</h2>
      <div class="highlight"><p>${escapeHtml(data.highlight)}</p></div>
    </section>

    <section class="section">
      <h2>Evidence Snapshot</h2>
      <div class="section-grid">${sectionMarkup}</div>
    </section>

    <section class="section">
      <h2>Action Plan</h2>
      <div class="actions">${actionMarkup}</div>
    </section>

    <section class="references">
      <h2>References</h2>
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

  if (sources.length === 0) {
    const data = buildSourcePendingInfographic(request, references);
    const html = compileInfographicHtml(data);
    const textContent = buildInfographicText(data);

    return {
      contentType: 'infographic',
      content: html,
      textContent,
      format: 'html',
      downloadUrl: '#',
      market: request.market,
      audience: request.targetAudience,
      apiNamespace: request.apiNamespace,
      renderVariant: 'poster',
      sources,
      screenedSources: sources,
      providerStack: getProviderStackForContentType('infographic'),
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

  const data = {
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
  };

  const html = compileInfographicHtml(data);
  const textContent = buildInfographicText(data);

  return {
    contentType: 'infographic',
    content: html,
    textContent,
    format: 'html',
    downloadUrl: '#',
    market: request.market,
    audience: request.targetAudience,
    apiNamespace: request.apiNamespace,
    renderVariant: 'poster',
    sources,
    screenedSources: sources,
    providerStack: getProviderStackForContentType('infographic'),
  };
}
