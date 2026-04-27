import '../lib/load-env.mjs';
import { getAudioProviderState } from './audio.mjs';
import { getDesignProviderState } from './design.mjs';
import { getDocumentProviderState } from './document.mjs';
import { getPresentationProviderState } from './presentation.mjs';
import { getSearchProviderState } from './search.mjs';
import { getConfiguredVideoProvider } from './video.mjs';

const TEXT_PROVIDER = String(process.env.TEXT_PROVIDER || 'openai').trim().toLowerCase();
const VIDEO_PROVIDER = String(process.env.VIDEO_PROVIDER || process.env.VITE_VIDEO_PROVIDER || '').trim().toLowerCase();

export function getProviderRegistrySummary() {
  const audio = getAudioProviderState();
  const reportDocument = getDocumentProviderState('report');
  const whitePaperDocument = getDocumentProviderState('white-paper');
  const presentation = getPresentationProviderState();
  const activeVideoProvider = getConfiguredVideoProvider();
  const infographicDesign = getDesignProviderState('infographic');
  const socialDesign = getDesignProviderState('social-post');

  return {
    text: {
      selected: TEXT_PROVIDER,
      active: 'openai',
      label: 'OpenAI server-side generation',
    },
    search: getSearchProviderState(),
    audio: {
      ...audio,
      label: audio.active === 'elevenlabs' ? 'ElevenLabs voice pipeline' : 'OpenAI speech pipeline',
    },
    document: {
      ...reportDocument,
      byContentType: {
        report: reportDocument,
        'white-paper': whitePaperDocument,
      },
    },
    presentation,
    design: {
      ...infographicDesign,
      byContentType: {
        infographic: infographicDesign,
        'social-post': socialDesign,
      },
    },
    video: {
      selected: VIDEO_PROVIDER || 'native',
      active: activeVideoProvider || 'native-package',
      label: activeVideoProvider === 'luma' ? 'Luma render pipeline' : 'Native video package',
      note: activeVideoProvider
        ? 'Video rendering is routed through the configured provider.'
        : 'Vera generates a storyboard, scene-frame package, narration track, and production manifest without an external MP4 renderer.',
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

  if (contentType === 'report' || contentType === 'white-paper') {
    const documentState = registry.document.byContentType[contentType];
    return {
      text: registry.text.active,
      document: documentState.active,
    };
  }

  if (contentType === 'infographic' || contentType === 'social-post') {
    const designState = contentType === 'social-post'
      ? registry.design.byContentType['social-post']
      : registry.design.byContentType.infographic;
    return {
      text: registry.text.active,
      design: designState.active,
    };
  }

  if (contentType === 'video') {
    return {
      text: registry.text.active,
      audio: registry.audio.active,
      video: registry.video.active,
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
      providers: { text: registry.text.active, design: registry.design.byContentType.infographic.active },
      note: registry.design.byContentType.infographic.note,
    },
    'social-post': {
      contentType: 'social-post',
      providers: { text: registry.text.active, design: registry.design.byContentType['social-post'].active },
      note: registry.design.byContentType['social-post'].note,
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
      providers: { text: registry.text.active, audio: registry.audio.active, video: registry.video.active },
      note: registry.video.note,
    },
    document: {
      contentType: 'document',
      providers: { text: registry.text.active },
      note: 'Document generation is currently native to Vera.',
    },
    report: {
      contentType: 'report',
      providers: { text: registry.text.active, document: registry.document.byContentType.report.active },
      note: registry.document.byContentType.report.note,
    },
    'white-paper': {
      contentType: 'white-paper',
      providers: { text: registry.text.active, document: registry.document.byContentType['white-paper'].active },
      note: registry.document.byContentType['white-paper'].note,
    },
  };
}
