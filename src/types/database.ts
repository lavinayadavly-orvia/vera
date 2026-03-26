// Type definitions for Blink Database tables
// This file provides proper TypeScript typing for all Blink DB operations

export interface GenerationRequestRecord {
  id: string;
  userId: string;
  prompt: string;
  contentType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  outputFormat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFeedbackRecord {
  id: string;
  userId: string;
  generationRequestId: string;
  isHelpful: boolean;
  comment?: string;
  rating?: number;
  createdAt: string;
}

export interface EarlyAccessSignupRecord {
  id: string;
  email: string;
  createdAt: string;
  source: 'landing' | 'footer';
}

export interface AnalyticsEventRecord {
  id: string;
  userId: string;
  eventType: 'generation_started' | 'generation_completed' | 'generation_failed' | 'feedback_submitted' | 'download_clicked' | 'share_clicked';
  contentType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface OutputIterationRecord {
  id: string;
  userId: string;
  generationRequestId: string;
  iterationNumber: number;
  changeRequest: string;
  outputData: string;
  createdAt: string;
}

export interface EditSuggestionRecord {
  id: string;
  userId: string;
  generationId: string;
  suggestionText: string;
  responseText?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
}
