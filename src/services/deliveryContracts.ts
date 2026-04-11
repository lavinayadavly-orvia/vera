import type { ContentType, DeliveryContractSummary } from '@/types';
import { getConfiguredVideoProvider } from '@/services/videoProviders';

const DESIGN_PROVIDER = (import.meta.env.VITE_DESIGN_PROVIDER || 'native').trim();
const PRESENTATION_PROVIDER = (import.meta.env.VITE_PRESENTATION_PROVIDER || 'native').trim();
const AUDIO_PROVIDER = (import.meta.env.VITE_AUDIO_PROVIDER || 'openai').trim().toLowerCase();

function getDesignProviderLabel() {
  if (DESIGN_PROVIDER === 'canva') return 'Canva routing (native fallback)';
  if (DESIGN_PROVIDER === 'gamma') return 'Gamma routing (native fallback)';
  return 'Native infographic renderer';
}

function getPresentationProviderLabel() {
  if (PRESENTATION_PROVIDER === 'plus-ai') return 'Plus AI presentation pipeline';
  if (PRESENTATION_PROVIDER === 'gamma') return 'Gamma routing (native fallback)';
  return 'Native PPTX renderer';
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
    primaryDeliverable: 'MP4',
    supportingDeliverables: ['Transcript', 'Captions'],
    providerLabel: 'Video renderer required',
    readiness: 'provider-required',
    note: 'A real video render provider must be configured before Video can be delivered as a final MP4.',
    finalOnly: true,
  };
}

export function getDeliveryContract(contentType: ContentType): DeliveryContractSummary {
  switch (contentType) {
    case 'infographic':
      return {
        contentType,
        formatLabel: 'Infographic',
        primaryDeliverable: 'HTML / PDF',
        supportingDeliverables: ['PNG export', 'Source pack'],
        providerLabel: getDesignProviderLabel(),
        readiness: 'ready',
        note: DESIGN_PROVIDER === 'native'
          ? 'Delivers an exportable visual asset with structured source-backed content.'
          : 'External design routing is configured, with Vera’s native infographic renderer still active as the delivery fallback.',
        finalOnly: true,
      };
    case 'white-paper':
      return {
        contentType,
        formatLabel: 'White Paper',
        primaryDeliverable: 'PDF',
        supportingDeliverables: ['DOC', 'Markdown', 'HTML'],
        providerLabel: 'Native document renderer',
        readiness: 'ready',
        note: 'Delivers a final long-form document package.',
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
            : 'Gamma presentation routing is selected, with Vera still falling back to native PPTX until the Gamma adapter is enabled.',
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
        providerLabel: 'Native report renderer',
        readiness: 'ready',
        note: 'Delivers a final evidence-led report package.',
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
          : 'External design routing is configured, with Vera’s native social renderer still active as the delivery fallback.',
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
