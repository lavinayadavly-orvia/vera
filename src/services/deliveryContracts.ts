import type { ContentType, DeliveryContractSummary } from '@/types';
import { getConfiguredVideoProvider } from '@/services/videoProviders';

const DESIGN_PROVIDER = (import.meta.env.VITE_DESIGN_PROVIDER || 'native').trim();
const DOCUMENT_PROVIDER = (import.meta.env.VITE_DOCUMENT_PROVIDER || 'native').trim();
const PRESENTATION_PROVIDER = (import.meta.env.VITE_PRESENTATION_PROVIDER || 'native').trim();
const AUDIO_PROVIDER = (import.meta.env.VITE_AUDIO_PROVIDER || 'openai').trim().toLowerCase();

function getDesignProviderLabel() {
  if (DESIGN_PROVIDER === 'canva') return 'Canva design pipeline';
  if (DESIGN_PROVIDER === 'gamma') return 'Gamma social pipeline';
  return 'Native infographic renderer';
}

function getPresentationProviderLabel() {
  if (PRESENTATION_PROVIDER === 'plus-ai') return 'Plus AI presentation pipeline';
  if (PRESENTATION_PROVIDER === 'gamma') return 'Gamma presentation pipeline';
  return 'Native PPTX renderer';
}

function getDocumentProviderLabel() {
  if (DOCUMENT_PROVIDER === 'gamma') return 'Gamma long-form pipeline';
  return 'Native document renderer';
}

function getAudioProviderLabel() {
  if (AUDIO_PROVIDER === 'elevenlabs') return 'ElevenLabs voice pipeline';
  return 'OpenAI voice pipeline';
}

function getVideoContract(): DeliveryContractSummary {
  const provider = getConfiguredVideoProvider();

  if (provider === 'luma') {
    return {
      contentType: 'video',
      formatLabel: 'Video',
      primaryDeliverable: 'MP4',
      supportingDeliverables: ['Transcript', 'Captions', 'Storyboard package'],
      providerLabel: 'Luma render pipeline',
      readiness: 'ready',
      note: 'Generates a final rendered MP4 with supporting production assets.',
      finalOnly: true,
    };
  }

  return {
    contentType: 'video',
    formatLabel: 'Video',
    primaryDeliverable: 'Storyboard + Audio',
    supportingDeliverables: ['Scene frames', 'Transcript', 'Production JSON'],
    providerLabel: 'Native video package',
    readiness: 'ready',
    note: 'Delivers a scene-frame storyboard, narration track, and production package now. Configure Luma to add final MP4 rendering.',
    finalOnly: true,
  };
}

export function getDeliveryContract(contentType: ContentType): DeliveryContractSummary {
  switch (contentType) {
    case 'infographic':
      return {
        contentType,
        formatLabel: 'Infographic',
        primaryDeliverable: DESIGN_PROVIDER === 'canva' ? 'PNG Design' : 'HTML / PDF',
        supportingDeliverables: ['PNG export', 'Source pack'],
        providerLabel: getDesignProviderLabel(),
        readiness: 'ready',
        note: DESIGN_PROVIDER === 'native'
          ? 'Delivers an exportable visual asset with structured source-backed content.'
          : DESIGN_PROVIDER === 'canva'
            ? 'Uses Canva template autofill and export when the server token and Vera template are configured, with native infographic rendering as the fallback.'
            : 'Gamma is selected, but infographic rendering currently stays native in Vera while Gamma remains enabled only for social-post outputs.',
        finalOnly: true,
      };
    case 'white-paper':
      return {
        contentType,
        formatLabel: 'White Paper',
        primaryDeliverable: 'PDF',
        supportingDeliverables: ['DOC', 'Markdown', 'HTML'],
        providerLabel: getDocumentProviderLabel(),
        readiness: 'ready',
        note: DOCUMENT_PROVIDER === 'gamma'
          ? 'Uses Gamma for polished long-form PDF rendering when the server key is configured, with Vera falling back to native output if the provider run fails.'
          : 'Delivers a final long-form document package.',
        finalOnly: true,
      };
    case 'presentation':
      return {
        contentType,
        formatLabel: 'Presentation',
        primaryDeliverable: 'PPTX',
        supportingDeliverables: ['PDF export', 'Editable speaker notes'],
        providerLabel: getPresentationProviderLabel(),
        readiness: 'ready',
        note: PRESENTATION_PROVIDER === 'native'
          ? 'Delivers a real editable PowerPoint deck.'
          : PRESENTATION_PROVIDER === 'plus-ai'
            ? 'Uses Plus AI for presentation rendering when the server key is configured, with Vera falling back to native PPTX if the provider run fails.'
            : 'Uses Gamma for presentation rendering when the server key is configured, with Vera falling back to native PPTX if the provider run fails.',
        finalOnly: true,
      };
    case 'podcast':
      return {
        contentType,
        formatLabel: 'Podcast',
        primaryDeliverable: 'Script + Audio',
        supportingDeliverables: ['Transcript'],
        providerLabel: getAudioProviderLabel(),
        readiness: 'ready',
        note: AUDIO_PROVIDER === 'elevenlabs'
          ? 'Delivers a finished podcast script with server-side ElevenLabs audio when configured.'
          : 'Delivers a finished podcast script with server-side audio generation when available.',
        finalOnly: true,
      };
    case 'document':
      return {
        contentType,
        formatLabel: 'Document',
        primaryDeliverable: 'DOC',
        supportingDeliverables: ['PDF', 'Markdown', 'HTML'],
        providerLabel: 'Native document renderer',
        readiness: 'ready',
        note: 'Delivers a final professional document package.',
        finalOnly: true,
      };
    case 'report':
      return {
        contentType,
        formatLabel: 'Report',
        primaryDeliverable: 'PDF',
        supportingDeliverables: ['DOC', 'Markdown', 'HTML'],
        providerLabel: getDocumentProviderLabel(),
        readiness: 'ready',
        note: DOCUMENT_PROVIDER === 'gamma'
          ? 'Uses Gamma for polished long-form PDF rendering when the server key is configured, with Vera falling back to native output if the provider run fails.'
          : 'Delivers a final evidence-led report package.',
        finalOnly: true,
      };
    case 'social-post':
      return {
        contentType,
        formatLabel: 'Social Post',
        primaryDeliverable: 'Image / Carousel',
        supportingDeliverables: ['Caption copy', 'Asset package'],
        providerLabel: getDesignProviderLabel(),
        readiness: 'ready',
        note: DESIGN_PROVIDER === 'native'
          ? 'Delivers export-ready social assets and supporting copy.'
          : DESIGN_PROVIDER === 'canva'
            ? 'Uses Canva template autofill and export for social-ready visuals when the server token and Vera template are configured, with native copy rendering as the fallback.'
            : 'Uses Gamma for social-post rendering when the server key is configured, with Vera falling back to native copy rendering if the provider run fails.',
        finalOnly: true,
      };
    default:
      return getVideoContract();
  }
}

export function getDeliveryReadinessError(contentType: ContentType): string | null {
  const contract = getDeliveryContract(contentType);
  if (contract.readiness === 'ready') {
    return null;
  }

  return `${contract.formatLabel} requires a configured render provider before Vera can deliver the promised final ${contract.primaryDeliverable}. ${contract.note}`;
}
