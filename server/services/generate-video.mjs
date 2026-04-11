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
      ? sources.slice(0, 8).map((source) => `- ${source.title} — ${source.domain}${source.publishedYear ? ` (${source.publishedYear})` : ''}`)
      : ['- Reference pack pending source capture.']),
  ].join('\n');
}

export async function generateVideoOnServer(request) {
  if (!getConfiguredVideoProvider()) {
    throw new Error('Video generation requires a configured render provider before Vera can deliver a final MP4.');
  }

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
${sources.length ? sources.map((source, index) => `${index + 1}. ${source.title} — ${source.domain}${source.snippet ? ` — ${source.snippet}` : ''}`).join('\n') : 'No web sources were captured.'}

Rules:
- no placeholders
- no source-needed markers
- no citation markers in spoken copy
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

  const renderedVideo = await renderVideoSequence({
    prompt: request.prompt,
    aspectRatio: packaging.aspectRatio,
    scenes,
    creativeDirection,
  });

  const narrationScript = buildNarrationScript(scenes);
  const audioUrl = await generateSpeechDataUrl({
    text: narrationScript.slice(0, 4000),
    voice: inferNarrationVoice(request.tone),
  });

  const title = cleanText(creativeBrief.videoTitle, request.prompt, 90);
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const content = buildVideoMarkdown(title, request, packaging, creativeDirection, scenes, sources);

  return {
    contentType: 'video',
    content,
    textContent: content,
    format: 'mp4',
    downloadUrl: renderedVideo.renderedVideoUrl,
    renderedVideoUrl: renderedVideo.renderedVideoUrl,
    audioUrl,
    market: request.market,
    audience: request.targetAudience,
    apiNamespace: request.apiNamespace,
    theme: title,
    extent: request.apiNamespace === 'medical' ? 'Governed' : 'Standard',
    videoScenes: scenes,
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
    videoRender: renderedVideo.summary,
    sources,
    screenedSources: sources,
    providerStack: getProviderStackForContentType('video'),
  };
}
