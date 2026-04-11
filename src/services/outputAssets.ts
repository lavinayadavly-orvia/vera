import type { GeneratedOutput } from '@/types';

function normaliseUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return null;
  return trimmed;
}

export function getHostedFinalDeliverableUrl(output: GeneratedOutput): string | null {
  if (output.contentType === 'video') {
    return normaliseUrl(output.renderedVideoUrl) || (output.format === 'mp4' ? normaliseUrl(output.downloadUrl) : null);
  }

  if (output.contentType === 'podcast') {
    return normaliseUrl(output.audioUrl) || normaliseUrl(output.downloadUrl);
  }

  if (output.contentType === 'social-post') {
    if (output.format === 'carousel' && output.carouselSlides?.length) {
      return normaliseUrl(output.carouselSlides[0].imageUrl);
    }
    return normaliseUrl(output.downloadUrl) || normaliseUrl(output.previewUrl);
  }

  if (['infographic', 'presentation', 'document', 'report', 'white-paper'].includes(output.contentType)) {
    return normaliseUrl(output.downloadUrl) || normaliseUrl(output.previewUrl);
  }

  return null;
}

export function hasHostedFinalDeliverable(output: GeneratedOutput): boolean {
  return Boolean(getHostedFinalDeliverableUrl(output));
}

export function getPrimaryVisualUrl(output: GeneratedOutput): string | null {
  if (output.carouselSlides?.length) {
    return normaliseUrl(output.carouselSlides[0].imageUrl);
  }

  if (output.videoThumbnail) {
    return normaliseUrl(output.videoThumbnail);
  }

  return normaliseUrl(output.previewUrl) || normaliseUrl(output.downloadUrl);
}

export function getShareableOutputUrl(output: GeneratedOutput): string | null {
  return getHostedFinalDeliverableUrl(output) || getPrimaryVisualUrl(output);
}

export function getShareableOutputLabel(output: GeneratedOutput): string {
  if (hasHostedFinalDeliverable(output)) {
    return output.deliveryContract?.primaryDeliverable || 'final asset';
  }

  return 'preview asset';
}
