import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Share2, Sparkles, ChevronLeft, ChevronRight, ExternalLink, Image, RefreshCw, Check, CheckCircle2, MessageSquare, ThumbsUp, Headphones, FileText, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GeneratedOutput } from '@/types';
import { useState } from 'react';
import { FeedbackCard } from '@/components/FeedbackCard';
import { EditSuggestionChat } from '@/components/EditSuggestionChat';
import { analyticsService } from '@/services/analytics';
import { SampleGalleryModal } from '@/components/SampleGalleryModal';
import { sampleData } from '@/data/sampleData';

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
      'mp4': 'MP4 Video',
      'video-script': 'Video Script + Thumbnail',
      'video-frames': 'Video Scenes (Ready to Edit)',
      'audio-script': 'Podcast Script + Cover',
      'white-paper': 'White Paper + Cover',
      'pptx': 'PowerPoint Presentation',
      'docx': 'Word Document',
      'carousel': 'Carousel (Multiple Slides)'
    };
    return formats[output.format] || output.format.toUpperCase();
  };

  const downloadTextFile = (type: 'md' | 'html') => {
    const t = (output.theme || 'content').replace(/\s+/g, '_').toLowerCase();
    let blob: Blob, ext: string;
    
    if (type === 'md') {
      blob = new Blob([output.content], { type: 'text/markdown' });
      ext = 'md';
    } else {
      const h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${output.theme}</title><link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#0E0F13;color:#F5F0E8;max-width:820px;margin:0 auto;padding:60px 36px 80px;line-height:1.85}h1{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;letter-spacing:-1px;margin-bottom:6px}h2{font-size:18px;color:rgba(245,240,232,.5);font-weight:300;margin-bottom:28px}h3{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin:28px 0 10px;color:#FF5C3A}ul,ol{margin:0 0 16px 20px}li{margin-bottom:6px;color:rgba(245,240,232,.7)}p{color:rgba(245,240,232,.7);margin-bottom:14px;font-weight:300}.meta{font-size:12px;color:rgba(245,240,232,.3);margin-bottom:32px;display:flex;gap:12px;flex-wrap:wrap}.meta span{background:rgba(255,92,58,.15);color:#FF7A5C;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}.footer{margin-top:56px;font-size:12px;color:rgba(245,240,232,.25);border-top:1px solid rgba(245,240,232,.08);padding-top:16px}.logo{display:inline-flex;margin-bottom:40px;font-family:'Syne',sans-serif;font-size:13px;font-weight:800}.d1{background:#FF5C3A;color:#0E0F13;padding:5px 10px;border-radius:5px 0 0 5px}.d2{background:#F5F0E8;color:#0E0F13;padding:5px 10px;border-radius:0 5px 5px 0}</style></head><body><div class="logo"><span class="d1">Done</span><span class="d2">andDone</span></div><h1>${output.theme}</h1><div class="meta"><span>${output.format}</span><span>${output.extent}</span><span>${output.audience}</span></div><div style="white-space:pre-wrap">${output.content.replace(/</g,'&lt;')}</div><div class="footer">Prepared by DoneandDone · Medical Affairs Content Studio · Medical Affairs Review Recommended</div></body></html>`;
      blob = new Blob([h], { type: 'text/html' });
      ext = 'html';
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doneanddone_${t}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: `${ext.toUpperCase()} Downloaded`,
      description: 'Your file is ready.'
    });
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
  const isTextDocument = isVideoScript || isAudioScript || isWhitePaper || (isInfographic && !isHtmlDocument);
  const isVideoFrames = output.format === 'video-frames';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Content is Ready!</h2>
          <p className="text-muted-foreground mt-1">
            Generated {output.contentType.replace('-', ' ')} • {getFormatLabel()}
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
                          {isVideoScript ? 'Video Script' : isAudioScript ? 'Podcast Script' : isWhitePaper ? 'White Paper' : isInfographic ? 'Infographic' : 'Document'} Generated
                        </p>
                        <p className="text-xs text-white/80">
                          {isAudioScript ? 'Full audio script + cover art' : isWhitePaper ? 'Comprehensive document + cover art' : isInfographic ? 'Structured content + layout template' : 'Professional storyboard + thumbnail'}
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
                {isVideoScript ? 'Video Script & Storyboard' : isAudioScript ? 'Podcast Dialogue Script' : isInfographic ? 'Infographic Content & Layout' : 'White Paper Content'}
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const docTitle = isVideoScript ? 'Video Script' : isAudioScript ? 'Podcast Script' : isInfographic ? 'Infographic Content' : 'White Paper';
                  const scriptWindow = window.open('', '_blank');
                  if (scriptWindow) {
                    scriptWindow.document.write(`
                      <html>
                        <head>
                          <title>${docTitle}</title>
                          <style>
                            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
                            h1 { color: #333; border-bottom: 3px solid #7C3AED; padding-bottom: 10px; }
                            pre { background: #f4f4f4; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: inherit; }
                          </style>
                        </head>
                        <body>
                          <h1>${docTitle}</h1>
                          <pre>${output.content}</pre>
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
            <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{output.content.slice(0, 1000)}...</pre>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Click "View Full Document" to see the complete text content and production notes.
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
               {/* 1123px height matches A4 vertical aspect exactly */}
               <iframe 
                 srcDoc={output.content}
                 className="w-full h-[1123px] border-none"
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
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Sources</h3>
            <p className="text-sm text-muted-foreground italic">
              Content generated from general knowledge; no specific sources retrieved.
            </p>
          </div>
        </Card>
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
        {isTextDocument && (
          <Button 
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              import('@/utils/pdfGenerator').then(({ generateAndDownloadPDF }) => {
                generateAndDownloadPDF(output.content, {
                  format: output.format || output.contentType,
                  theme: output.theme || 'Content',
                  extent: output.extent || 'Standard',
                  audience: output.audience || 'General'
                });
                toast({
                  title: 'PDF Downloaded',
                  description: 'Your branded typography PDF is ready.'
                });
              });
            }} 
            size="lg" 
            className="flex-1 text-base font-semibold"
          >
            <Download className="w-5 h-5 mr-2" />
            Download PDF Document
          </Button>
        )}
        {isTextDocument && (
          <Button 
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadTextFile('md');
            }} 
            size="lg" 
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <FileText className="w-5 h-5 mr-2" />
            Markdown
          </Button>
        )}
        {isTextDocument && (
          <Button 
            onClick={() => {
              analyticsService.trackDownloadClicked(output.contentType);
              downloadTextFile('html');
            }} 
            size="lg" 
            variant="outline"
            className="flex-1 text-base font-semibold"
          >
            <Code className="w-5 h-5 mr-2" />
            HTML Copy
          </Button>
        )}
        <Button 
          onClick={() => {
            analyticsService.trackDownloadClicked(output.contentType);
            if (isTextDocument) {
              // Download thumbnail image
              if(output.downloadUrl) {
                window.open(output.downloadUrl, '_blank');
              }
              toast({
                title: 'Cover Image Downloaded',
                description: 'Use "View Full Document" button above to access the complete text.',
              });
            } else {
              onDownload();
            }
          }} 
          size="lg" 
          variant={isTextDocument ? "outline" : "default"}
          className="flex-1 text-base font-semibold"
        >
          <Image className="w-5 h-5 mr-2" />
          {isTextDocument ? 'Cover Image' : hasCarousel ? 'Download All Slides' : hasVideoScenes ? 'Download Video Scenes' : 'Download'}
        </Button>
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
