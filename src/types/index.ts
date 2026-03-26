export type ContentType = 'infographic' | 'video' | 'presentation' | 'social-post' | 'document' | 'report' | 'podcast' | 'white-paper';

export interface GenerationRequest {
  id: string;
  userId: string;
  prompt: string;
  contentType: ContentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  outputFormat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSource {
  title: string;
  domain: string;
  url?: string;
  snippet?: string;
  section?: string;
  page?: number;
  type: 'web' | 'document' | 'knowledge';
}

export interface InfographicData {
  heroContent: {
    title: string;
    subtitle: string;
  };
  mainText: {
    heading: string;
    body: string;
  }[];
  insight: {
    statistic: string;
    description: string;
  }[];
  takeaway: {
    point: string;
  }[];
}

export interface GeneratedOutput {
  contentType: ContentType;
  content: string;
  format: string;
  downloadUrl: string;
  previewUrl?: string;
  audioUrl?: string;
  extent?: string;
  audience?: string;
  theme?: string;
  carouselSlides?: CarouselSlide[];
  sources?: ContentSource[];
  videoThumbnail?: string;
  videoScenes?: VideoScene[];
  infographicData?: InfographicData;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface VideoScene {
  sceneNumber: number;
  imageUrl: string;
  visualDescription: string;
  onScreenText: string;
  voiceoverText: string;
  duration: number;
}

export interface DetailedGenerationParams {
  prompt: string;
  contentType: ContentType;
  tone: 'professional' | 'casual' | 'academic' | 'persuasive' | 'inspirational';
  length: 'short' | 'medium' | 'long' | 'comprehensive';
  scientificDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  targetAudience: string;
  userId: string;
  changeRequest?: ChangeRequestData;
  previousOutput?: GeneratedOutput;
  iterationNumber?: number;
}

export interface ChangeRequestData {
  changeDescription: string;
  specificAreas: string[];
  keepExisting: string[];
}

export interface OutputIteration {
  iterationNumber: number;
  output: GeneratedOutput;
  changeRequest?: ChangeRequestData;
  timestamp: string;
}
