export interface AnalyticsEvent {
  eventType: 'generation_started' | 'generation_completed' | 'generation_failed' | 'feedback_submitted' | 'download_clicked' | 'share_clicked' | 'output_confirmed' | 'refinement_started' | 'refinement_completed' | 'refinement_failed';
  contentType?: string;
  iterationNumber?: number;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  async initialize() {
    // No-op: auth removed
  }

  async trackEvent(event: AnalyticsEvent) {
    // Local console logging only - no external dependency
    console.log('[Analytics]', event);
  }

  trackGenerationStarted(contentType: string) {
    return this.trackEvent({ eventType: 'generation_started', contentType });
  }

  trackGenerationCompleted(contentType: string, duration?: number) {
    return this.trackEvent({ eventType: 'generation_completed', contentType, metadata: { duration } });
  }

  trackGenerationFailed(contentType: string, error?: string) {
    return this.trackEvent({ eventType: 'generation_failed', contentType, metadata: { error } });
  }

  trackDownloadClicked(contentType: string) {
    return this.trackEvent({ eventType: 'download_clicked', contentType });
  }

  trackShareClicked(contentType: string) {
    return this.trackEvent({ eventType: 'share_clicked', contentType });
  }

  trackFeedbackSubmitted(contentType: string, isHelpful: boolean, rating?: number) {
    return this.trackEvent({ eventType: 'feedback_submitted', contentType, metadata: { isHelpful, rating } });
  }
}

export const analyticsService = new AnalyticsService();
