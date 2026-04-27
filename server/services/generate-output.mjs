import { generateText } from '../providers/openai.mjs';
import { generateSpeechDataUrl } from '../providers/audio.mjs';
import { tryRenderDesignExternally } from '../providers/design.mjs';
import { tryRenderDocumentExternally } from '../providers/document.mjs';
import { getProviderStackForContentType } from '../providers/registry.mjs';
import { tryRenderPresentationExternally } from '../providers/presentation.mjs';
import { searchWebSources } from '../providers/search.mjs';
import { generateInfographicOnServer } from './generate-infographic.mjs';
import { generateVideoOnServer } from './generate-video.mjs';

const SERVER_SUPPORTED_TYPES = new Set(['infographic', 'video', 'document', 'report', 'white-paper', 'presentation', 'social-post', 'podcast']);

function sentenceCase(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Vera Draft';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatReferences(sources) {
  if (!sources.length) {
    return ['## References', '- Reference pack pending source capture.'].join('\n');
  }

  return [
    '## References',
    ...sources.slice(0, 8).map((source, index) => {
      const sourceId = source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`;
      return `- ${sourceId}: ${source.title} — ${source.domain}${source.publishedYear ? ` (${source.publishedYear})` : ''}`;
    }),
  ].join('\n');
}

function buildSearchQuery(request) {
  return [
    request.prompt,
    request.market && request.market !== 'global' ? request.market : '',
    request.targetAudience,
    request.apiNamespace === 'medical' ? 'clinical evidence guideline study' : 'campaign communication guidance',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildSystemPrompt(request, sources) {
  const sourceBlock = sources.length
    ? sources.map((source, index) => {
      const sourceId = source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`;
      return `${sourceId}. ${source.title} — ${source.domain}${source.snippet ? ` — ${source.snippet}` : ''}${source.verbatimAnchor ? ` Anchor: ${source.verbatimAnchor}` : ''}`;
    }).join('\n')
    : 'No web sources were captured for this run. Do not fabricate citations.';

  const formatInstructions = {
    document: 'Write a professional markdown document with title, executive summary, main sections, recommendations, and references.',
    report: 'Write an evidence-led markdown report with executive summary, findings, analysis, recommendations, and references.',
    'white-paper': 'Write a polished markdown white paper with abstract, context, analysis, strategic implications, conclusion, and references.',
    presentation: 'Write a markdown presentation draft with slide-by-slide sections using headings like "## Slide 1: Title". Include speaker notes as bullets where useful.',
    'social-post': 'Write a polished social media content package in markdown with headline options, main post copy, caption, CTA, and references.',
    podcast: 'Write a spoken-word podcast script in markdown with opening, segment headings, transitions, closing, and references.',
  };

  return `You are Vera's server-side content engine.

Create a ${request.contentType} for:
- Market: ${request.market}
- Namespace: ${request.apiNamespace}
- Tone: ${request.tone}
- Length: ${request.length}
- Scientific depth: ${request.scientificDepth}
- Audience: ${request.targetAudience}

${formatInstructions[request.contentType]}

Rules:
- Use only supported factual claims.
- Prefer the captured sources when they are relevant.
- Never output [SOURCE NEEDED], CLAIM_ID markers, or placeholder citations.
- Write clean markdown with real headings.
- Keep the copy presentation-ready and user-facing.
- Keep factual claims traceable to the captured source set. Use the references section IDs as the audit trail; do not invent uncited facts.
- If no sources are captured, do not invent statistics, trial outcomes, prevalence figures, study claims, or guideline statements.
- If no sources are captured, keep the draft qualitative and clearly safe for later evidence enrichment.

Captured sources:
${sourceBlock}

User prompt:
${request.prompt}`;
}

function buildSourcePendingDraft(request) {
  const title = sentenceCase(request.prompt);
  const audience = request.targetAudience || 'the intended audience';
  const market = request.market === 'global' ? 'global use' : `${request.market} use`;
  const namespace = request.apiNamespace === 'medical' ? 'medical-review' : 'campaign';

  switch (request.contentType) {
    case 'presentation':
      return [
        `# ${title}`,
        '',
        '## Presentation Overview',
        `Built for ${audience} in ${market}. This draft keeps to qualitative framing because no verified source pack was captured for this run.`,
        '',
        '### Slide 1: Title Slide',
        `- Main title: ${title}`,
        `- Subtitle: ${request.tone} ${namespace} narrative for ${audience}`,
        '- Hook: Why this topic matters now',
        '- Speaker notes: Open with the practical relevance and keep claims qualitative until the evidence pack is attached.',
        '',
        '### Slide 2: Context',
        '- Define the problem space clearly',
        '- Explain why the issue matters for the intended audience',
        '- Keep the framing high-level and non-numeric',
        '',
        '### Slide 3: Key Drivers',
        '- Outline the main contributing factors',
        '- Separate behavioral, clinical, and system-level drivers where relevant',
        '- Avoid unsupported prevalence or outcome claims',
        '',
        '### Slide 4: Implications',
        '- Summarize what the audience should understand or act on',
        '- Highlight operational, educational, or clinical implications',
        '- Reserve quantitative proof points for the validated source pack',
        '',
        '### Slide 5: Recommended Next Steps',
        '- Add the verified source pack',
        '- Map approved claims to each slide before external use',
        '- Finalize market-specific review language',
        '',
      ].join('\n');
    case 'social-post':
      return [
        `# ${title}`,
        '',
        '## Headline Options',
        '- A clearer way to frame the conversation',
        '- Why this topic deserves attention now',
        '- A practical perspective for the right audience',
        '',
        '## Main Post Copy',
        `This draft is structured for ${audience} and keeps to qualitative framing because no verified source pack was captured in this run. Focus the post on relevance, context, and the practical takeaway, then attach approved evidence before adding numbers or comparative claims.`,
        '',
        '## CTA',
        '- Review the evidence pack before publication',
        '',
      ].join('\n');
    case 'podcast':
      return [
        `# ${title}`,
        '',
        '## Opening',
        `Welcome. Today we are looking at ${request.prompt}, with a focus on what matters for ${audience}. This draft keeps the discussion qualitative until the verified source pack is attached.`,
        '',
        '## Segment 1: Why This Matters',
        '- Frame the issue in plain, credible language',
        '- Explain the relevance without unsupported numbers',
        '',
        '## Segment 2: Core Drivers',
        '- Walk through the main forces shaping the issue',
        '- Keep the language grounded and practical',
        '',
        '## Segment 3: What To Do Next',
        '- Summarize the best next steps',
        '- Note where evidence-backed details will be inserted after verification',
        '',
        '## Closing',
        'Thanks for listening. Before release, attach the approved reference pack and validate any quantitative or study-based claims.',
        '',
      ].join('\n');
    default:
      return [
        `# ${title}`,
        '',
        '## Executive Summary',
        `This draft is structured for ${audience} and ${market}. It intentionally avoids unsupported quantitative claims because no verified source pack was captured for this run.`,
        '',
        '## Context',
        `Summarize the topic in a way that is useful for ${audience}. Keep the framing descriptive, practical, and appropriate for a ${request.tone} ${namespace} output.`,
        '',
        '## Core Themes',
        '- Explain the main issue or opportunity',
        '- Describe the key drivers or barriers',
        '- Outline the implications for the intended audience',
        '',
        '## Recommended Next Steps',
        '- Attach verified sources before adding factual claims',
        '- Validate market-specific language and positioning',
        '- Convert this qualitative draft into an evidence-anchored final asset',
        '',
      ].join('\n');
  }
}

function inferFormat(contentType) {
  switch (contentType) {
    case 'presentation':
      return 'pptx';
    case 'podcast':
      return 'audio-script';
    case 'social-post':
      return 'social-post';
    case 'report':
      return 'pdf';
    case 'white-paper':
      return 'white-paper';
    default:
      return 'docx';
  }
}

function needsAudio(contentType) {
  return contentType === 'podcast';
}

function buildProviderArtifactLinks({ presentationRender, documentRender, designRender }) {
  const links = [];

  if (presentationRender?.provider) {
    links.push({
      stage: 'presentation',
      provider: presentationRender.provider,
      label: presentationRender.provider === 'gamma' ? 'Open in Gamma' : presentationRender.provider === 'plus-ai' ? 'Open provider export' : 'Open presentation asset',
      viewUrl: presentationRender.gammaUrl || undefined,
      downloadUrl: presentationRender.remoteUrl || undefined,
      generationId: presentationRender.generationId || undefined,
      note: presentationRender.provider === 'gamma'
        ? 'Gamma-backed presentation export.'
        : presentationRender.provider === 'plus-ai'
          ? 'Provider-rendered editable presentation export.'
          : undefined,
    });
  }

  if (documentRender?.provider) {
    links.push({
      stage: 'document',
      provider: documentRender.provider,
      label: documentRender.provider === 'gamma' ? 'Open in Gamma' : 'Open long-form asset',
      viewUrl: documentRender.gammaUrl || undefined,
      downloadUrl: documentRender.remoteUrl || undefined,
      generationId: documentRender.generationId || undefined,
      note: documentRender.provider === 'gamma' ? 'Gamma-backed long-form export.' : undefined,
    });
  }

  if (designRender?.provider) {
    links.push({
      stage: 'design',
      provider: designRender.provider,
      label: designRender.provider === 'canva' ? 'Edit in Canva' : designRender.provider === 'gamma' ? 'Open in Gamma' : 'Open design asset',
      editUrl: designRender.editUrl || undefined,
      viewUrl: designRender.viewUrl || designRender.gammaUrl || undefined,
      downloadUrl: designRender.remoteUrl || undefined,
      generationId: designRender.generationId || designRender.designId || undefined,
      note: designRender.provider === 'canva'
        ? 'Canva-backed design export with editable source.'
        : designRender.provider === 'gamma'
          ? 'Gamma-backed social export.'
          : undefined,
    });
  }

  return links;
}

export function supportsServerSideGeneration(contentType) {
  return SERVER_SUPPORTED_TYPES.has(contentType);
}

export async function generateOutputOnServer(request) {
  if (!supportsServerSideGeneration(request.contentType)) {
    throw new Error(`Server-side generation is not configured yet for ${request.contentType}.`);
  }

  if (request.contentType === 'infographic') {
    return generateInfographicOnServer(request);
  }

  if (request.contentType === 'video') {
    return generateVideoOnServer(request);
  }

  const sources = await searchWebSources(buildSearchQuery(request), 6);
  const markdown = sources.length === 0
    ? buildSourcePendingDraft(request)
    : await generateText({
        prompt: buildSystemPrompt(request, sources),
        maxTokens: request.contentType === 'social-post' ? 1200 : 2600,
      });

  let audioUrl;
  if (needsAudio(request.contentType)) {
    const speechSource = markdown.length > 4000 ? markdown.slice(0, 4000) : markdown;
    audioUrl = await generateSpeechDataUrl({ text: speechSource });
  }

  const content = `${markdown.trim()}\n\n${formatReferences(sources)}`.trim();
  let providerStack = getProviderStackForContentType(request.contentType);
  let presentationRender = null;
  let documentRender = null;

  if (request.contentType === 'presentation') {
    try {
      presentationRender = await tryRenderPresentationExternally({
        request,
        markdown: content,
      });

      if (presentationRender?.provider) {
        providerStack = {
          ...providerStack,
          presentation: presentationRender.provider,
        };
      }
    } catch (error) {
      console.warn('[vera] External presentation render failed, using native PPTX fallback.', error);
      providerStack = {
        ...providerStack,
        presentation: 'native',
      };
    }
  }

  if (request.contentType === 'report' || request.contentType === 'white-paper') {
    try {
      documentRender = await tryRenderDocumentExternally({
        request,
        markdown: content,
      });

      if (documentRender?.provider) {
        providerStack = {
          ...providerStack,
          document: documentRender.provider,
        };
      }
    } catch (error) {
      console.warn('[vera] External long-form render failed, using native fallback.', error);
      providerStack = {
        ...providerStack,
        document: 'native',
      };
    }
  }

  let designRender = null;
  if (request.contentType === 'social-post') {
    try {
      designRender = await tryRenderDesignExternally({
        request,
        contentType: 'social-post',
        markdown: content,
        sources,
      });

      if (designRender?.provider) {
        providerStack = {
          ...providerStack,
          design: designRender.provider,
        };
      }
    } catch (error) {
      console.warn('[vera] External social-post render failed, using native fallback.', error);
      providerStack = {
        ...providerStack,
        design: 'native',
      };
    }
  }

  const providerLinks = buildProviderArtifactLinks({
    presentationRender,
    documentRender,
    designRender,
  });

  return {
    contentType: request.contentType,
    content,
    textContent: content,
    format: documentRender ? 'pdf' : designRender ? 'image' : inferFormat(request.contentType),
    downloadUrl: request.contentType === 'podcast'
      ? (audioUrl || '#')
      : documentRender?.remoteUrl
        ? documentRender.remoteUrl
        : designRender?.viewUrl
          ? designRender.viewUrl
          : presentationRender?.remoteUrl || '#',
    previewUrl: designRender?.previewUrl,
    audioUrl,
    market: request.market,
    audience: request.targetAudience,
    apiNamespace: request.apiNamespace,
    sources,
    screenedSources: sources,
    providerStack,
    providerLinks,
    __presentationBinary: presentationRender?.binary,
    __documentBinary: documentRender?.binary,
    __documentExtension: documentRender?.extension,
    __designBinary: designRender?.binary,
    __designExtension: designRender?.extension,
  };
}
