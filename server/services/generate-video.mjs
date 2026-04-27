import { generateObject } from '../providers/openai.mjs';
import { generateSpeechDataUrl } from '../providers/audio.mjs';
import { getProviderStackForContentType } from '../providers/registry.mjs';
import { searchWebSources } from '../providers/search.mjs';
import { getConfiguredVideoProvider, renderVideoSequence } from '../providers/video.mjs';

function buildSearchQuery(request) {
  return [
    request.prompt,
    request.market && request.market !== 'global' ? request.market : '',
    request.targetAudience,
    'clinical guidance evidence narrative',
  ]
    .filter(Boolean)
    .join(' ');
}

function inferVideoPackaging(prompt) {
  const lower = prompt.toLowerCase();
  if (/\bshorts|reels|tiktok|vertical|instagram reel\b/.test(lower)) {
    return {
      aspectRatio: '9:16',
      targetSceneCount: 5,
      targetDurationRange: [25, 40],
      platformIntent: 'shorts',
      pacingLabel: 'fast and punchy',
      onScreenTextWords: 7,
      voiceoverWords: 24,
    };
  }

  if (/\bsquare|linkedin|instagram post\b/.test(lower)) {
    return {
      aspectRatio: '1:1',
      targetSceneCount: 5,
      targetDurationRange: [30, 45],
      platformIntent: 'social',
      pacingLabel: 'tight editorial rhythm',
      onScreenTextWords: 8,
      voiceoverWords: 28,
    };
  }

  return {
    aspectRatio: '16:9',
    targetSceneCount: 6,
    targetDurationRange: [45, 75],
    platformIntent: 'presentation',
    pacingLabel: 'measured, polished, cinematic',
    onScreenTextWords: 9,
    voiceoverWords: 32,
  };
}

function cleanText(value, fallback, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trimEnd()}…` : normalized;
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapText(value, maxLineLength, maxLines) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]+$/, '')}…`;
  }

  return lines;
}

function getFrameSize(aspectRatio) {
  if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1280, height: 720 };
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function buildNativeFrameDataUrl({ title, packaging, creativeDirection, scene, index, total }) {
  const { width, height } = getFrameSize(packaging.aspectRatio);
  const isVertical = packaging.aspectRatio === '9:16';
  const isSquare = packaging.aspectRatio === '1:1';
  const headline = cleanText(scene.onScreenText || scene.sceneTitle, title, isVertical ? 68 : 88);
  const body = cleanText(scene.visualDescription, creativeDirection.storyArc, isVertical ? 150 : 180);
  const headlineLines = wrapText(headline, isVertical ? 18 : isSquare ? 24 : 32, isVertical ? 4 : 3);
  const bodyLines = wrapText(body, isVertical ? 32 : isSquare ? 42 : 56, isVertical ? 5 : 3);
  const titleLines = wrapText(title, isVertical ? 24 : 34, 2);
  const safeMotif = cleanText(scene.continuityAnchor || creativeDirection.recurringMotif, 'Vera visual system', 42);
  const margin = isVertical ? 92 : 72;
  const cardWidth = width - margin * 2;
  const cardHeight = isVertical ? 720 : isSquare ? 500 : 360;
  const cardY = isVertical ? 540 : isSquare ? 360 : 215;
  const headlineSize = isVertical ? 74 : isSquare ? 62 : 58;
  const titleSize = isVertical ? 36 : 26;
  const bodySize = isVertical ? 34 : 24;
  const sceneBadgeX = width - margin - 190;
  const sceneBadgeY = margin;
  const accentLineY = cardY + cardHeight - (isVertical ? 130 : 88);
  const motifY = height - margin - (isVertical ? 78 : 36);

  const titleMarkup = titleLines.map((line, lineIndex) => (
    `<tspan x="${margin}" dy="${lineIndex === 0 ? 0 : titleSize * 1.24}">${escapeSvgText(line)}</tspan>`
  )).join('');
  const headlineMarkup = headlineLines.map((line, lineIndex) => (
    `<tspan x="${margin + 44}" dy="${lineIndex === 0 ? 0 : headlineSize * 1.08}">${escapeSvgText(line)}</tspan>`
  )).join('');
  const bodyMarkup = bodyLines.map((line, lineIndex) => (
    `<tspan x="${margin + 48}" dy="${lineIndex === 0 ? 0 : bodySize * 1.42}">${escapeSvgText(line)}</tspan>`
  )).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvgText(title)} scene ${index + 1}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#06191d"/>
      <stop offset="0.48" stop-color="#083f42"/>
      <stop offset="1" stop-color="#0b6b6f"/>
    </linearGradient>
    <radialGradient id="glowA" cx="78%" cy="24%" r="50%">
      <stop offset="0" stop-color="#ff7a2b" stop-opacity="0.58"/>
      <stop offset="1" stop-color="#ff7a2b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="14%" cy="82%" r="54%">
      <stop offset="0" stop-color="#88f4df" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#88f4df" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="34" flood-color="#02080a" flood-opacity="0.38"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glowA)"/>
  <rect width="${width}" height="${height}" fill="url(#glowB)"/>
  <g opacity="0.14" stroke="#d7fffb" stroke-width="1">
    ${Array.from({ length: Math.ceil(width / 80) }, (_, i) => `<path d="M${i * 80} 0V${height}"/>`).join('')}
    ${Array.from({ length: Math.ceil(height / 80) }, (_, i) => `<path d="M0 ${i * 80}H${width}"/>`).join('')}
  </g>
  <g transform="translate(${width * 0.54} ${height * 0.46})" opacity="0.54" fill="none">
    <path d="M0 -${isVertical ? 260 : 160}L${isVertical ? 260 : 160} 0L0 ${isVertical ? 260 : 160}L-${isVertical ? 260 : 160} 0Z" stroke="#9cf8e8" stroke-width="3"/>
    <path d="M0 -${isVertical ? 190 : 118}L${isVertical ? 190 : 118} 0L0 ${isVertical ? 190 : 118}L-${isVertical ? 190 : 118} 0Z" stroke="#ff7a2b" stroke-width="2"/>
  </g>
  <text x="${margin}" y="${margin + titleSize}" fill="#c7fbf5" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="800" letter-spacing="8">${titleMarkup}</text>
  <rect x="${sceneBadgeX}" y="${sceneBadgeY}" width="190" height="54" rx="27" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.24)"/>
  <text x="${sceneBadgeX + 95}" y="${sceneBadgeY + 34}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" text-anchor="middle" letter-spacing="3">SCENE ${index + 1}/${total}</text>
  <g filter="url(#softShadow)">
    <rect x="${margin}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="42" fill="rgba(2,15,18,0.76)" stroke="rgba(199,251,245,0.32)"/>
    <rect x="${margin + 28}" y="${cardY + 28}" width="${cardWidth - 56}" height="14" rx="7" fill="#ff6b2c"/>
    <text x="${margin + 44}" y="${cardY + (isVertical ? 140 : 110)}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="${headlineSize}" font-weight="900" letter-spacing="-2">${headlineMarkup}</text>
    <text x="${margin + 48}" y="${accentLineY + (isVertical ? 58 : 42)}" fill="#d9f8f4" font-family="Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="500">${bodyMarkup}</text>
  </g>
  <path d="M${margin} ${motifY}H${width - margin}" stroke="#ff7a2b" stroke-width="4" stroke-linecap="round"/>
  <text x="${margin}" y="${motifY - 26}" fill="#93e4dc" font-family="Inter, Arial, sans-serif" font-size="${isVertical ? 26 : 18}" font-weight="800" letter-spacing="5">${escapeSvgText(String(scene.beatRole || 'proof').toUpperCase())}</text>
  <text x="${width - margin}" y="${motifY - 26}" fill="#e8fffb" font-family="Inter, Arial, sans-serif" font-size="${isVertical ? 26 : 18}" font-weight="700" text-anchor="end">${escapeSvgText(safeMotif)}</text>
  <text x="${margin}" y="${height - margin + (isVertical ? 4 : 0)}" fill="rgba(255,255,255,0.58)" font-family="Inter, Arial, sans-serif" font-size="${isVertical ? 22 : 15}" font-weight="700" letter-spacing="7">VERA NATIVE VIDEO PACKAGE</text>
</svg>`;

  return svgDataUrl(svg);
}

function inferNarrationVoice(tone) {
  if (tone === 'academic' || tone === 'professional') return 'nova';
  if (tone === 'persuasive') return 'alloy';
  return 'shimmer';
}

function buildNarrationScript(scenes) {
  return scenes.map((scene) => scene.voiceoverText).join(' ').trim();
}

function buildVideoMarkdown(title, request, packaging, creativeDirection, scenes, sources) {
  return [
    `# ${title}`,
    '',
    '## Delivery',
    `- Aspect ratio: ${packaging.aspectRatio}`,
    `- Platform intent: ${packaging.platformIntent}`,
    `- Pacing: ${packaging.pacingLabel}`,
    '',
    '## Creative Direction',
    `- Story arc: ${creativeDirection.storyArc}`,
    `- Hook: ${creativeDirection.hookStrategy}`,
    `- Visual style: ${creativeDirection.visualStyle}`,
    `- Recurring motif: ${creativeDirection.recurringMotif}`,
    '',
    '## Scene Plan',
    ...scenes.flatMap((scene) => [
      `### Scene ${scene.sceneNumber}: ${scene.sceneTitle}`,
      `- Beat role: ${scene.beatRole}`,
      `- Visual: ${scene.visualDescription}`,
      `- On-screen text: ${scene.onScreenText || 'No text overlay'}`,
      `- Voiceover: ${scene.voiceoverText}`,
      '',
    ]),
    '## References',
    ...(sources.length
      ? sources.slice(0, 8).map((source, index) => {
        const sourceId = source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`;
        return `- ${sourceId}: ${source.title} — ${source.domain}${source.publishedYear ? ` (${source.publishedYear})` : ''}`;
      })
      : ['- Reference pack pending source capture.']),
  ].join('\n');
}

export async function generateVideoOnServer(request) {
  const packaging = inferVideoPackaging(request.prompt);
  const sources = await searchWebSources(buildSearchQuery(request), 5);

  const creativeBrief = await generateObject({
    prompt: `Create a premium creative brief for a video about "${request.prompt}".

Target:
- audience: ${request.targetAudience}
- market: ${request.market}
- namespace: ${request.apiNamespace}
- tone: ${request.tone}
- aspect ratio: ${packaging.aspectRatio}
- pacing: ${packaging.pacingLabel}

Return only clean JSON.`,
    schema: {
      type: 'object',
      properties: {
        videoTitle: { type: 'string' },
        storyArc: { type: 'string' },
        hookStrategy: { type: 'string' },
        voiceTone: { type: 'string' },
        visualStyle: { type: 'string' },
        subjectFocus: { type: 'string' },
        recurringMotif: { type: 'string' },
        cameraLanguage: { type: 'string' },
        editRhythm: { type: 'string' },
        captionStyle: { type: 'string' },
        musicMood: { type: 'string' },
        colorPalette: { type: 'array', items: { type: 'string' } },
        productionNotes: { type: 'array', items: { type: 'string' } },
        continuityNotes: { type: 'array', items: { type: 'string' } },
        doNotShow: { type: 'array', items: { type: 'string' } },
      },
      required: ['videoTitle', 'storyArc', 'hookStrategy', 'voiceTone', 'visualStyle', 'subjectFocus', 'recurringMotif', 'cameraLanguage', 'editRhythm', 'captionStyle', 'musicMood'],
    },
  });

  const creativeDirection = {
    storyArc: cleanText(creativeBrief.storyArc, 'Hook -> context -> proof -> action', 140),
    hookStrategy: cleanText(creativeBrief.hookStrategy, 'Open with the strongest tension or upside.', 140),
    voiceTone: cleanText(creativeBrief.voiceTone, 'clear, assured, evidence-led', 80),
    visualStyle: cleanText(creativeBrief.visualStyle, 'premium editorial realism', 120),
    subjectFocus: cleanText(creativeBrief.subjectFocus, request.prompt, 100),
    recurringMotif: cleanText(creativeBrief.recurringMotif, 'one recurring visual motif', 80),
    cameraLanguage: cleanText(creativeBrief.cameraLanguage, 'cinematic framing and disciplined motion', 100),
    editRhythm: cleanText(creativeBrief.editRhythm, packaging.pacingLabel, 80),
    captionStyle: cleanText(creativeBrief.captionStyle, 'short supers with strong hierarchy', 80),
    continuityNotes: Array.isArray(creativeBrief.continuityNotes) ? creativeBrief.continuityNotes.map((item) => cleanText(item, '', 90)).filter(Boolean).slice(0, 4) : [],
    doNotShow: Array.isArray(creativeBrief.doNotShow) ? creativeBrief.doNotShow.map((item) => cleanText(item, '', 60)).filter(Boolean).slice(0, 5) : [],
  };

  const scenePlan = await generateObject({
    prompt: `Create an exact scene plan for a premium video about "${request.prompt}".

Creative direction:
- story arc: ${creativeDirection.storyArc}
- visual style: ${creativeDirection.visualStyle}
- recurring motif: ${creativeDirection.recurringMotif}
- camera language: ${creativeDirection.cameraLanguage}
- pacing: ${creativeDirection.editRhythm}

Platform requirements:
- exact scene count: ${packaging.targetSceneCount}
- aspect ratio: ${packaging.aspectRatio}
- on-screen text max words: ${packaging.onScreenTextWords}
- voiceover max words: ${packaging.voiceoverWords}

Captured sources:
${sources.length ? sources.map((source, index) => `${source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`}. ${source.title} — ${source.domain}${source.snippet ? ` — ${source.snippet}` : ''}${source.verbatimAnchor ? ` Anchor: ${source.verbatimAnchor}` : ''}`).join('\n') : 'No web sources were captured.'}

Rules:
- no placeholders
- no source-needed markers
- no citation markers in spoken copy
- keep claims aligned to the captured source anchors
- first scene is a hook
- final scene is a CTA or decisive takeaway`,
    schema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          minItems: packaging.targetSceneCount,
          maxItems: packaging.targetSceneCount,
          items: {
            type: 'object',
            properties: {
              sceneNumber: { type: 'number' },
              beatRole: { type: 'string' },
              sceneTitle: { type: 'string' },
              visualDescription: { type: 'string' },
              shotType: { type: 'string' },
              motionCue: { type: 'string' },
              onScreenText: { type: 'string' },
              voiceoverText: { type: 'string' },
              duration: { type: 'number' },
              transition: { type: 'string' },
              editNote: { type: 'string' },
              continuityAnchor: { type: 'string' },
            },
            required: ['sceneNumber', 'beatRole', 'sceneTitle', 'visualDescription', 'shotType', 'motionCue', 'onScreenText', 'voiceoverText', 'duration', 'transition', 'editNote', 'continuityAnchor'],
          },
        },
      },
      required: ['scenes'],
    },
  });

  const title = cleanText(creativeBrief.videoTitle, request.prompt, 90);
  const scenes = (scenePlan.scenes || []).slice(0, packaging.targetSceneCount).map((scene, index) => ({
    sceneNumber: index + 1,
    imageUrl: '',
    beatRole: cleanText(scene.beatRole, index === 0 ? 'hook' : index === packaging.targetSceneCount - 1 ? 'cta' : 'proof', 24),
    sceneTitle: cleanText(scene.sceneTitle, `Scene ${index + 1}`, 60),
    visualDescription: cleanText(scene.visualDescription, request.prompt, 220),
    shotType: cleanText(scene.shotType, 'cinematic coverage', 60),
    motionCue: cleanText(scene.motionCue, 'subtle editorial motion', 80),
    onScreenText: cleanText(scene.onScreenText, '', 72),
    voiceoverText: cleanText(scene.voiceoverText, request.prompt, 220),
    duration: Number.isFinite(scene.duration) ? scene.duration : 5,
    transition: cleanText(scene.transition, 'cut', 40),
    editNote: cleanText(scene.editNote, 'Keep motion and message clean.', 120),
    continuityAnchor: cleanText(scene.continuityAnchor, creativeDirection.recurringMotif, 80),
  }));

  const framedScenes = scenes.map((scene, index) => ({
    ...scene,
    imageUrl: buildNativeFrameDataUrl({
      title,
      packaging,
      creativeDirection,
      scene,
      index,
      total: scenes.length,
    }),
  }));

  let renderedVideo = null;
  let renderFailureNote = '';
  if (getConfiguredVideoProvider()) {
    try {
      renderedVideo = await renderVideoSequence({
        prompt: request.prompt,
        aspectRatio: packaging.aspectRatio,
        scenes: framedScenes,
        creativeDirection,
      });
    } catch (error) {
      renderFailureNote = error instanceof Error ? error.message : String(error);
    }
  }

  const narrationScript = buildNarrationScript(framedScenes);
  let audioUrl;
  try {
    audioUrl = await generateSpeechDataUrl({
      text: narrationScript.slice(0, 4000),
      voice: inferNarrationVoice(request.tone),
    });
  } catch (error) {
    console.warn('[vera] Video narration audio failed; continuing with storyboard package.', error);
  }

  const totalDuration = framedScenes.reduce((sum, scene) => sum + scene.duration, 0);
  const content = buildVideoMarkdown(title, request, packaging, creativeDirection, framedScenes, sources);
  const renderedVideoUrl = renderedVideo?.remoteUrl || renderedVideo?.renderedVideoUrl || '';
  const hasRenderedVideo = Boolean(renderedVideoUrl);
  const nativeRenderSummary = {
    provider: 'native',
    status: renderFailureNote ? 'failed' : 'skipped',
    mode: 'storyboard-package',
    model: 'vera-native-svg-frames',
    resolution: packaging.aspectRatio,
    durationSeconds: totalDuration,
    note: renderFailureNote
      ? `External render failed, so Vera produced a native storyboard and narration package. ${renderFailureNote}`
      : 'No external video renderer is configured. Vera produced a native storyboard, scene frames, script, and narration package.',
  };

  return {
    contentType: 'video',
    content,
    textContent: content,
    format: hasRenderedVideo ? 'mp4' : 'video-frames',
    downloadUrl: hasRenderedVideo ? renderedVideoUrl : '#',
    previewUrl: framedScenes[0]?.imageUrl,
    renderedVideoUrl: hasRenderedVideo ? renderedVideoUrl : undefined,
    audioUrl,
    market: request.market,
    audience: request.targetAudience,
    apiNamespace: request.apiNamespace,
    theme: title,
    extent: request.apiNamespace === 'medical' ? 'Governed' : 'Standard',
    videoThumbnail: framedScenes[0]?.imageUrl,
    videoScenes: framedScenes,
    videoPackage: {
      title,
      totalDuration,
      aspectRatio: packaging.aspectRatio,
      platformIntent: packaging.platformIntent,
      musicMood: cleanText(creativeBrief.musicMood, 'Modern, confident, editorial', 80),
      colorPalette: Array.isArray(creativeBrief.colorPalette) ? creativeBrief.colorPalette.map((item) => cleanText(item, '', 24)).filter(Boolean).slice(0, 5) : [],
      productionNotes: Array.isArray(creativeBrief.productionNotes) ? creativeBrief.productionNotes.map((item) => cleanText(item, '', 120)).filter(Boolean).slice(0, 6) : [],
      narrationScript,
      creativeDirection,
    },
    videoRender: hasRenderedVideo ? renderedVideo.summary : nativeRenderSummary,
    sources,
    screenedSources: sources,
    providerStack: getProviderStackForContentType('video'),
    providerLinks: hasRenderedVideo ? [{
      stage: 'video',
      provider: renderedVideo.summary.provider,
      label: 'Open render asset',
      viewUrl: renderedVideoUrl,
      downloadUrl: renderedVideoUrl,
      generationId: renderedVideo.summary.generationId || undefined,
      note: `${renderedVideo.summary.provider} rendered ${renderedVideo.summary.mode === 'extended-sequence' ? 'a multi-scene sequence' : 'a single provider video'} for this output.`,
    }] : [],
    __videoBinary: renderedVideo?.binary,
    __videoExtension: renderedVideo?.binary ? 'mp4' : undefined,
  };
}
