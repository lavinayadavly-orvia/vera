import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Share2, Sparkles, ChevronLeft, ChevronRight, ExternalLink, Image, RefreshCw, Check, CheckCircle2, MessageSquare, ThumbsUp, Headphones, FileText, Code, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GeneratedOutput } from '@/types';
import { useState } from 'react';
import { FeedbackCard } from '@/components/FeedbackCard';
import { EditSuggestionChat } from '@/components/EditSuggestionChat';
import { analyticsService } from '@/services/analytics';
import { SampleGalleryModal } from '@/components/SampleGalleryModal';
import { sampleData } from '@/data/sampleData';
import { downloadAudioFile, downloadHtmlDocument, downloadJsonManifest, downloadMarkdown, downloadPresentationOutline, downloadPrimaryVisual, downloadStoryboard, downloadWordCompatibleDocument } from '@/utils/exporters';
import { renderMarkdownToHtml } from '@/utils/markdownRenderer';
import { ReferenceManagerPanel } from '@/components/ReferenceManagerPanel';
import { ComplianceArchitecturePanel } from '@/components/ComplianceArchitecturePanel';
import { ContentLibraryPanel } from '@/components/ContentLibraryPanel';
import { AuditDashboardPanel } from '@/components/AuditDashboardPanel';

interface OutputPreviewProps {
  output: GeneratedOutput;
  onDownload: () => void;
  onShare: () => void;
  onNewGeneration: () => void;
  onRequestChanges: () => void;
  onConfirmFinal: () => void;
  iterationNumber: number;
  showChangeRequest: boolean;
  generationId?: string;
  onEditApplied?: (newOutput: any) => void;
}

export function OutputPreview({ output, onDownload, onShare, onNewGeneration, onRequestChanges, onConfirmFinal, iterationNumber, showChangeRequest, generationId, onEditApplied }: OutputPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSamples, setShowSamples] = useState(false);
  const [activeTab, setActiveTab] = useState<'feedback' | 'chat'>('chat');
  const { toast } = useToast();
  const hasCarousel = output.carouselSlides && output.carouselSlides.length > 0;
  const totalSlides = hasCarousel ? output.carouselSlides!.length : 1;

  const getFormatLabel = () => {
    const formats: Record<string, string> = {
      'image': 'PNG Image',
      'pdf': 'PDF Document',
      'mp4': 'Video File',
      'video-script': 'Video Script + Cover',
      'video-frames': 'Storyboard + Scene Frames',
      'audio-script': 'Podcast Script + Audio',
      'white-paper': 'White Paper',
      'pptx': 'Presentation Package',
      'docx': 'Document Package',
      'carousel': 'Carousel (Multiple Slides)'
    };
    return formats[output.format] || output.format.toUpperCase();
  };

  const getMarketLabel = () => {
    if (!output.market) return null;
    if (output.market === 'dubai') return 'Dubai / UAE';
    if (output.market === 'us') return 'United States';
    if (output.market === 'uk') return 'United Kingdom';
    return output.market.charAt(0).toUpperCase() + output.market.slice(1);
  };

  const nextSlide = () => {
    if (hasCarousel || hasVideoScenes) {
      const total = hasCarousel ? totalSlides : output.videoScenes!.length;
      setCurrentSlide((prev) => (prev + 1) % total);
    }
  };

  const prevSlide = () => {
    if (hasCarousel || hasVideoScenes) {
      const total = hasCarousel ? totalSlides : output.videoScenes!.length;
      setCurrentSlide((prev) => (prev - 1 + total) % total);
    }
  };

  const currentSlideData = hasCarousel ? output.carouselSlides![currentSlide] : null;
  const hasVideoScenes = output.videoScenes && output.videoScenes.length > 0;
  const currentVideoScene = hasVideoScenes ? output.videoScenes![currentSlide] : null;
  const displayUrl = currentSlideData?.imageUrl || currentVideoScene?.imageUrl || output.previewUrl;
  const isVideoScript = output.format === 'video-script';
  const isAudioScript = output.format === 'audio-script';
  const isWhitePaper = output.format === 'white-paper';
  const isInfographic = output.contentType === 'infographic';
  const isHtmlDocument = output.format === 'html';
  const isPresentation = output.contentType === 'presentation';
  const isDocument = output.contentType === 'document';
  const isReport = output.contentType === 'report';
  const isPodcast = output.contentType === 'podcast';
  const isWhitePaperContent = output.contentType === 'white-paper';
  const isTextDocument = isVideoScript
    || isAudioScript
    || isWhitePaper
    || isPresentation
    || isDocument
    || isReport
    || isPodcast
    || isWhitePaperContent
    || (isInfographic && !isHtmlDocument);
  const isVideoFrames = output.format === 'video-frames';
  const infographicFrameHeight = output.renderVariant === 'poster' ? 'h-[1123px]' : 'h-[1680px]';
  const renderedTextDocumentHtml = renderMarkdownToHtml(output.content);
  const textDocumentLabel = isVideoScript
    ? 'Video Script & Storyboard'
    : isAudioScript
      ? 'Podcast Dialogue Script'
      : isPresentation
        ? 'Presentation Outline'
        : isDocument
          ? 'Document Draft'
          : isReport
            ? 'Report Draft'
            : isWhitePaperContent || isWhitePaper
              ? 'White Paper Draft'
              : isInfographic
                ? 'Infographic Content & Layout'
                : 'Generated Content';
  const getSuitabilityClasses = (suitability?: 'P' | 'S' | 'C' | 'X') => {
    if (suitability === 'P') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    if (suitability === 'S') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    if (suitability === 'C') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Content is Ready!</h2>
          <p className="text-muted-foreground mt-1">
            Generated {output.contentType.replace('-', ' ')} • {getFormatLabel()}
            {getMarketLabel() && ` • ${getMarketLabel()}`}
            {hasCarousel && ` • ${totalSlides} slides`}
            {hasVideoScenes && ` • ${output.videoScenes!.length} scenes`}
            {iterationNumber > 1 && ` • Version ${iterationNumber}`}
          </p>
        </div>
        <Button onClick={onNewGeneration} variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Iteration indicator */}
      {iterationNumber > 1 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            This is version {iterationNumber} of your content, refined based on your feedback
          </span>
        </div>
      )}

      <Card className="p-8 bg-card/80 backdrop-blur-sm border-2 shadow-xl">
        <div className="relative">
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
            {displayUrl && !isInfographic ? (
              <div className="relative w-full h-full">
                <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative group cursor-pointer">
                  <img 
                    src={displayUrl} 
                    alt={currentSlideData?.title || "Generated content preview"} 
                    className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-95"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur-md p-3 rounded-full shadow-xl mb-8 border border-border/50">
                      <ExternalLink className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                </a>
                {isTextDocument && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                )}
                {isTextDocument && (
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {textDocumentLabel} Generated
                        </p>
                        <p className="text-xs text-white/80">
                          {isAudioScript
                            ? 'Full audio script, preview audio, and cover art'
                            : isPresentation
                              ? 'Slide structure, talking points, and export-ready outline'
                              : isDocument || isReport || isWhitePaperContent || isWhitePaper
                                ? 'Structured long-form draft with export options'
                                : isInfographic
                                  ? 'Structured content + layout template'
                                  : 'Professional storyboard + thumbnail'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Content Generated Successfully</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ready to download in {getFormatLabel()} format
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Video Script Info Banner */}
          {isVideoScript && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Full video production requires video editing software. 
                We've generated a professional script with scene breakdowns and a thumbnail. 
                Use the script content below to create your video with tools like Adobe Premiere, Final Cut Pro, or online editors.
              </p>
            </div>
          )}

          {/* Video Frames Info Banner */}
          {isVideoFrames && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Video Scenes Generated!</strong> We've created {output.videoScenes!.length} cinematic frames with voiceover text for your video. 
                Download each scene below and combine them using video editing software like CapCut, Adobe Premiere, or online tools.
              </p>
            </div>
          )}

          {/* Carousel/Video Navigation */}
          {(hasCarousel || hasVideoScenes) && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={prevSlide}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={nextSlide}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {/* Slide Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                {currentSlide + 1} / {hasCarousel ? totalSlides : output.videoScenes!.length}
              </div>
            </>
          )}
        </div>

        {/* Audio Player for Podcasts */}
        {isAudioScript && output.audioUrl && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Listen to Podcast
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <audio 
                controls 
                className="w-full h-12 rounded-md"
                controlsList="nodownload"
              >
                <source src={output.audioUrl} type="audio/mpeg" />
                <source src={output.audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              Generated audio is for preview purposes.
            </p>
          </div>
        )}

        {/* Document Content Display */}
        {isTextDocument && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {textDocumentLabel}
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const docTitle = textDocumentLabel;
                  const scriptWindow = window.open('', '_blank');
                  if (scriptWindow) {
                    scriptWindow.document.write(`
                      <html>
                        <head>
                          <title>${docTitle}</title>
                          <style>
                            body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f8f8fb; color: #1f2937; max-width: 920px; margin: 0 auto; padding: 48px 24px 80px; line-height: 1.7; }
                            h1 { font-size: 2.25rem; line-height: 1.15; margin: 0 0 1.25rem; font-weight: 800; color: #111827; }
                            h2 { font-size: 1.5rem; line-height: 1.25; margin: 2.25rem 0 0.85rem; font-weight: 700; color: #111827; }
                            h3 { font-size: 1.125rem; line-height: 1.35; margin: 1.6rem 0 0.65rem; font-weight: 700; color: #1f2937; }
                            p { margin: 0 0 1rem; color: #374151; }
                            ul, ol { margin: 0 0 1.15rem 1.25rem; padding-left: 1rem; }
                            li { margin: 0.35rem 0; color: #374151; }
                            hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
                            strong { font-weight: 700; color: #111827; }
                            em { font-style: italic; }
                            code { background: #eef2ff; color: #4f46e5; padding: 0.1rem 0.35rem; border-radius: 0.35rem; font-size: 0.92em; }
                            blockquote { margin: 1.25rem 0; padding: 0.25rem 0 0.25rem 1rem; border-left: 4px solid #8b5cf6; background: rgba(139, 92, 246, 0.05); }
                            .doc-shell { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); padding: 32px 36px; }
                          </style>
                        </head>
                        <body>
                          <div class="doc-shell">
                            <h1>${docTitle}</h1>
                            ${renderedTextDocumentHtml}
                          </div>
                        </body>
                      </html>
                    `);
                    scriptWindow.document.close();
                  }
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Document
              </Button>
            </div>
            <div className="bg-background rounded-xl border p-6 max-h-[420px] overflow-y-auto shadow-inner
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h1]:mb-5 [&_h1]:mt-0
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-sm [&_p]:leading-7 [&_p]:text-foreground/80 [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
              [&_li]:text-sm [&_li]:leading-7 [&_li]:text-foreground/80 [&_li]:mb-1.5
              [&_hr]:my-6 [&_hr]:border-border
              [&_strong]:font-semibold [&_strong]:text-foreground
              [&_code]:rounded [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-primary
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:my-4">
              <div dangerouslySetInnerHTML={{ __html: renderedTextDocumentHtml }} />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Click "View Full Document" to see the fully formatted draft.
            </p>
          </div>
        )}

        {/* Full-bleed HTML Document Display (e.g., Infographics) */}
        {isHtmlDocument && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xl flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Medical Affairs Render
              </h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const scriptWindow = window.open('', '_blank');
                    if (scriptWindow) {
                      scriptWindow.document.write(output.content);
                      scriptWindow.document.close();
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Fullscreen
                </Button>
              </div>
            </div>

            <div className="w-full bg-background rounded-2xl overflow-hidden border shadow-inner mt-4">
               {/* Long-form infographic preview */}
               <iframe 
                 srcDoc={output.content}
                 className={`w-full ${infographicFrameHeight} border-none`}
                 title="Infographic Preview"
                 sandbox="allow-same-origin allow-scripts"
               />
            </div>
          </div>
        )}

        {/* Video Scene Info */}
        {currentVideoScene && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Scene {currentVideoScene.sceneNumber}: {currentVideoScene.visualDescription}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">On-Screen Text:</div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{currentVideoScene.onScreenText || 'No text overlay'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Voiceover Script:</div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{currentVideoScene.voiceoverText}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>⏱️ Duration: {currentVideoScene.duration}s</span>
              <span>🎬 Scene {currentVideoScene.sceneNumber} of {output.videoScenes!.length}</span>
            </div>
          </div>
        )}

        {/* Slide Info */}
        {currentSlideData && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">{currentSlideData.title}</h3>
            <p className="text-muted-foreground mt-1">{currentSlideData.description}</p>
          </div>
        )}

        {/* Thumbnail Navigation for Video Scenes */}
        {hasVideoScenes && output.videoScenes!.length > 1 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold text-sm">All Video Scenes:</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {output.videoScenes!.map((scene, index) => (
                <button
                  key={`scene-${scene.sceneNumber}`}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 transition-all ${
                    currentSlide === index 
                      ? 'border-primary shadow-md scale-105' 
                      : 'border-border hover:border-primary/50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={scene.imageUrl} 
                      alt={`Scene ${scene.sceneNumber}`}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center">
                      Scene {scene.sceneNumber} • {scene.duration}s
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thumbnail Navigation for Carousel */}
        {hasCarousel && output.carouselSlides!.length > 1 && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {output.carouselSlides!.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                  currentSlide === index 
                    ? 'border-primary shadow-md scale-105' 
                    : 'border-border hover:border-primary/50 opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={slide.imageUrl} 
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Sources Section */}
      {output.sources && output.sources.length > 0 && (
        <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Sources</h3>
              <p className="text-sm text-muted-foreground">
                Content enhanced with {output.sources.length} {output.sources.length === 1 ? 'source' : 'sources'}
              </p>
            </div>
            {output.sourceGovernance && (
              <div className="rounded-xl border bg-background/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
                    {output.sourceGovernance.communicationFormat}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
                    {output.sourceGovernance.evidenceUseCaseLabel}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Minimum standard:</span> {output.sourceGovernance.minimumSourceStandard}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Non-negotiables:</span> {output.sourceGovernance.nonNegotiables.slice(0, 2).join(' · ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Common failure risks:</span> {output.sourceGovernance.commonFailures.slice(0, 2).join(' · ')}
                </p>
              </div>
            )}
            <div className="grid gap-3">
              {output.sources.map((source, index) => (
                <div
                  key={`${source.domain}-${index}`}
                  className="flex items-start justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{source.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {source.type === 'web' ? '🌐' : '📚'} {source.domain}
                      {source.section && ` • ${source.section}`}
                      {source.page && ` • p. ${source.page}`}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {source.suitability && (
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${getSuitabilityClasses(source.suitability)}`}>
                          {source.suitability === 'P' ? 'Primary' : source.suitability === 'S' ? 'Supporting' : source.suitability === 'C' ? 'Contextual' : 'Excluded'}
                        </span>
                      )}
                      {source.tier && (
                        <span className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-background text-muted-foreground">
                          {source.tier}
                        </span>
                      )}
                      {source.sourceType && (
                        <span className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-background text-muted-foreground">
                          {source.sourceType}
                        </span>
                      )}
                    </div>
                    {source.screeningSummary && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {source.screeningSummary}
                      </div>
                    )}
                  </div>
                  {source.url && source.type === 'web' && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Visit source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
              Content generated from {output.sources.some(s => s.type === 'web') ? 'real-time web data and' : ''} general knowledge; always verify critical information with additional research.
            </p>
          </div>
        </Card>
      )}

      {/* Fallback message if no sources */}
      {(!output.sources || output.sources.length === 0) && (
        <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
          <div className="text-center space-y-3">
            <h3 className="text-lg font-semibold">Sources</h3>
            {output.sourceGovernance && (
              <p className="text-sm text-muted-foreground">
                Evidence profile: <span className="font-medium text-foreground">{output.sourceGovernance.communicationFormat}</span> · {output.sourceGovernance.evidenceUseCaseLabel}
              </p>
            )}
            <p className="text-sm text-muted-foreground italic">
              Content generated from general knowledge; no specific sources retrieved.
            </p>
          </div>
        </Card>
      )}

      {output.operationalGuardrails && (
        <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Operational Guardrails</h3>
              <p className="text-sm text-muted-foreground">
                Market: {output.operationalGuardrails.market === 'dubai' ? 'Dubai / UAE' : output.operationalGuardrails.market === 'us' ? 'United States' : output.operationalGuardrails.market === 'uk' ? 'United Kingdom' : output.operationalGuardrails.market.charAt(0).toUpperCase() + output.operationalGuardrails.market.slice(1)} · {output.operationalGuardrails.summary}
              </p>
            </div>

            {output.operationalGuardrails.issues.length > 0 ? (
              <div className="grid gap-3">
                {output.operationalGuardrails.issues.map((issue, index) => (
                  <div
                    key={`${issue.code}-${index}`}
                    className={`rounded-lg border p-3 ${
                      issue.severity === 'block'
                        ? 'border-red-500/30 bg-red-500/5'
                        : issue.severity === 'warn'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-blue-500/20 bg-blue-500/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        issue.severity === 'block'
                          ? 'border-red-500/30 text-red-700 bg-red-500/10'
                          : issue.severity === 'warn'
                            ? 'border-amber-500/30 text-amber-700 bg-amber-500/10'
                            : 'border-blue-500/30 text-blue-700 bg-blue-500/10'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="font-medium text-sm">{issue.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.message}</p>
                    {issue.suggestions && issue.suggestions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Suggestions: {issue.suggestions.slice(0, 4).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No market, literacy, or source-sufficiency issues were flagged.</p>
            )}

            {output.operationalGuardrails.readability && (
              <div className="rounded-lg border bg-background/50 p-4">
                <p className="text-sm font-medium">Readability</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {output.operationalGuardrails.readability.scoreName} grade:
                  {' '}
                  {output.operationalGuardrails.readability.gradeLevel?.toFixed(1) ?? 'Unavailable'}
                  {' · '}
                  Target: {output.operationalGuardrails.readability.targetLabel}
                </p>
                {output.operationalGuardrails.readability.simplifiedEquivalents.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Simplified equivalents: {output.operationalGuardrails.readability.simplifiedEquivalents.slice(0, 5).map((pair) => `${pair.from} -> ${pair.to}`).join(' · ')}
                  </p>
                )}
              </div>
            )}

            {output.operationalGuardrails.evidenceMap && output.operationalGuardrails.evidenceMap.length > 0 && (
              <div className="rounded-lg border bg-background/50 p-4 space-y-3">
                <p className="text-sm font-medium">Evidence Map</p>
                <div className="grid gap-2">
                  {output.operationalGuardrails.evidenceMap.slice(0, 8).map((entry) => (
                    <div key={entry.claimId} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{entry.claimId}</span>
                      {' · '}
                      {entry.sourceTitle}
                      {' · '}
                      {entry.locator}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {output.complianceArchitecture && (
        <ComplianceArchitecturePanel
          summary={output.complianceArchitecture}
          market={output.market}
        />
      )}

      {output.complianceArchitecture && (
        <ContentLibraryPanel
          library={output.complianceArchitecture.contentLibrary}
          withdrawalMonitor={output.complianceArchitecture.withdrawalMonitor}
        />
      )}

      {output.complianceArchitecture && output.market && (
        <AuditDashboardPanel
          dashboard={output.complianceArchitecture.auditDashboard}
          currentMarket={output.market}
        />
      )}

      {output.complianceArchitecture?.dossier && output.complianceArchitecture.dossier.claims.length > 0 && (
        <ReferenceManagerPanel dossier={output.complianceArchitecture.dossier} />
      )}

      {/* Feedback and Edit Chat Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'feedback' | 'chat')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Edit Assistant
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <ThumbsUp className="w-4 h-4" />
            Quick Feedback
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-4">
          <div className="h-[500px]">
            <EditSuggestionChat
              generationId={generationId || 'unknown'}
              currentOutput={output}
              onEditApplied={onEditApplied}
            />
          </div>
        </TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <FeedbackCard 
            contentType={output.contentType}
            onFeedbackSubmitted={() => {
              analyticsService.trackEvent({
                eventType: 'feedback_submitted',
                contentType: output.contentType
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Change request or confirm final actions */}
      {!showChangeRequest && (
        <div className="bg-accent/20 border border-accent rounded-lg p-4 space-y-3">
          <div className="text-center">
            <p className="font-semibold">How does this look?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Request changes to refine it further, or confirm this as your final version
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={onRequestChanges}
              size="lg" 
              variant="outline"
              className="flex-1 text-base font-semibold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Request Changes
            </Button>
            <Button 
              onClick={onConfirmFinal}
              size="lg" 
              className="flex-1 text-base font-semibold"
            >
              <Check className="w-5 h-5 mr-2" />
              This Looks Great!
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {(isTextDocument || isHtmlDocument) && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              if (isHtmlDocument) {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(output.content);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => printWindow.print(), 400);
                }
                toast({
                  title: 'PDF Print View Opened',
                  description: 'Use your browser print dialog to save the HTML render as PDF.'
                });
                return;
              }

              import('@/utils/pdfGenerator').then(({ generateAndDownloadPDF }) => {
                generateAndDownloadPDF(output.content, {
                  format: output.format || output.contentType,
                  theme: output.theme || 'Content',
                  extent: output.extent || 'Standard',
                  audience: output.audience || 'General'
                });
                toast({
                  title: 'PDF Downloaded',
                  description: 'Your branded PDF is ready.'
                });
              });
            }}
            size="lg"
            className="flex-1 text-base font-semibold"
          >
            <Download className="w-5 h-5 mr-2" />
            PDF
          </Button>
        )}
        {(isTextDocument || isHtmlDocument) && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadHtmlDocument(output);
              toast({
                title: 'HTML Downloaded',
                description: 'Your export-ready HTML file is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <Code className="w-5 h-5 mr-2" />
            HTML
          </Button>
        )}
        {isTextDocument && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadMarkdown(output);
              toast({
                title: 'Markdown Downloaded',
                description: 'Your editable markdown file is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <FileText className="w-5 h-5 mr-2" />
            Markdown
          </Button>
        )}
        {isTextDocument && !isPresentation && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadWordCompatibleDocument(output);
              toast({
                title: 'Word Document Downloaded',
                description: 'Your Word-compatible .doc export is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <FileText className="w-5 h-5 mr-2" />
            Word Doc
          </Button>
        )}
        {isPresentation && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadPresentationOutline(output);
              toast({
                title: 'Slide Outline Downloaded',
                description: 'Your PowerPoint-ready outline (.rtf) is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <FileText className="w-5 h-5 mr-2" />
            Slide Outline
          </Button>
        )}
        {hasVideoScenes && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadStoryboard(output);
              toast({
                title: 'Storyboard Downloaded',
                description: 'Your scene-by-scene storyboard HTML is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <Video className="w-5 h-5 mr-2" />
            Storyboard
          </Button>
        )}
        {hasVideoScenes && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadJsonManifest(output, 'scene_manifest', {
                title: output.theme,
                contentType: output.contentType,
                scenes: output.videoScenes
              });
              toast({
                title: 'Scene Manifest Downloaded',
                description: 'Your production JSON manifest is ready.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <Code className="w-5 h-5 mr-2" />
            Scene JSON
          </Button>
        )}
        {output.audioUrl && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadAudioFile(output);
              toast({
                title: 'Audio Download Started',
                description: 'Your generated audio is opening in a downloadable tab.'
              });
            }}
            size="lg"
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <Headphones className="w-5 h-5 mr-2" />
            Audio
          </Button>
        )}
        {(output.previewUrl || (output.downloadUrl && output.downloadUrl !== '#')) && (
          <Button
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadPrimaryVisual(output);
              toast({
                title: 'Primary Asset Opened',
                description: 'Your primary visual asset is opening in a new tab.'
              });
            }}
            size="lg"
            variant={isTextDocument || isHtmlDocument ? 'outline' : 'default'}
            className="flex-1 text-base font-semibold"
          >
            <Image className="w-5 h-5 mr-2" />
            {isTextDocument || isHtmlDocument ? 'Cover / Key Visual' : hasCarousel ? 'Lead Slide' : hasVideoScenes ? 'Key Frame' : 'Primary Asset'}
          </Button>
        )}
        <Button 
          onClick={() => {
            analyticsService.trackShareClicked(output.contentType);
            onShare();
          }} 
          size="lg" 
          variant="outline" 
          className="flex-1 text-base font-semibold"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share
        </Button>
        <Button 
          onClick={() => setShowSamples(true)}
          size="lg" 
          variant="outline" 
          className="text-base font-semibold"
          title="View sample gallery for inspiration"
        >
          <Image className="w-5 h-5" />
        </Button>
      </div>

      {/* Sample Gallery Modal */}
      <SampleGalleryModal 
        samples={sampleData}
        open={showSamples}
        onOpenChange={setShowSamples}
      />
    </div>
  );
}
