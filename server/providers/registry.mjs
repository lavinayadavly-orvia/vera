import '../lib/load-env.mjs';
import { getAudioProviderState } from './audio.mjs';
import { getDesignProviderState } from './design.mjs';
import { getPresentationProviderState } from './presentation.mjs';
import { getConfiguredVideoProvider } from './video.mjs';

const TEXT_PROVIDER = String(process.env.TEXT_PROVIDER || 'openai').trim().toLowerCase();
const VIDEO_PROVIDER = String(process.env.VIDEO_PROVIDER || process.env.VITE_VIDEO_PROVIDER || '').trim().toLowerCase();

export function getProviderRegistrySummary() {
  const audio = getAudioProviderState();
  const design = getDesignProviderState();
  const presentation = getPresentationProviderState();
  const activeVideoProvider = getConfiguredVideoProvider();

  return {
    text: {
      selected: TEXT_PROVIDER,
      active: 'openai',
      label: 'OpenAI server-side generation',
    },
    audio: {
      ...audio,
      label: audio.active === 'elevenlabs' ? 'ElevenLabs voice pipeline' : 'OpenAI speech pipeline',
    },
    presentation,
    design,
    video: {
      selected: VIDEO_PROVIDER || null,
      active: activeVideoProvider,
      label: activeVideoProvider === 'luma' ? 'Luma render pipeline' : 'Video renderer required',
      note: activeVideoProvider ? 'Video rendering is routed through the configured provider.' : 'No server-side video renderer is currently active.',
    },
  };
}

export function getProviderStackForContentType(contentType) {
  const registry = getProviderRegistrySummary();

  if (contentType === 'podcast') {
    return {
      text: registry.text.active,
      audio: registry.audio.active,
    };
  }

  if (contentType === 'presentation') {
    return {
      text: registry.text.active,
      presentation: registry.presentation.active,
    };
  }

  if (contentType === 'infographic' || contentType === 'social-post') {
    return {
      text: registry.text.active,
      design: registry.design.active,
    };
  }

  if (contentType === 'video') {
    return {
      text: registry.text.active,
      audio: registry.audio.active,
      video: registry.video.active || registry.video.selected || 'unconfigured',
    };
  }

  return {
    text: registry.text.active,
  };
}

export function getFormatCapabilityMap() {
  const registry = getProviderRegistrySummary();

  return {
    infographic: {
      contentType: 'infographic',
      providers: { text: registry.text.active, design: registry.design.active },
      note: registry.design.note,
    },
    'social-post': {
      contentType: 'social-post',
      providers: { text: registry.text.active, design: registry.design.active },
      note: registry.design.note,
    },
    presentation: {
      contentType: 'presentation',
      providers: { text: registry.text.active, presentation: registry.presentation.active },
      note: registry.presentation.note,
    },
    podcast: {
      contentType: 'podcast',
      providers: { text: registry.text.active, audio: registry.audio.active },
      note: registry.audio.note,
    },
    video: {
      contentType: 'video',
      providers: { text: registry.text.active, audio: registry.audio.active, video: registry.video.active || 'unconfigured' },
      note: registry.video.note,
    },
    document: {
      contentType: 'document',
      providers: { text: registry.text.active },
      note: 'Document generation is currently native to Vera.',
    },
    report: {
      contentType: 'report',
      providers: { text: registry.text.active },
      note: 'Report generation is currently native to Vera.',
    },
    'white-paper': {
      contentType: 'white-paper',
      providers: { text: registry.text.active },
      note: 'White paper generation is currently native to Vera.',
    },
  };
}
