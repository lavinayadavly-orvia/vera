import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { DetailedPromptForm, type DetailedPromptData } from '@/components/DetailedPromptForm';
import { GuidedThemeForm } from '@/components/GuidedThemeForm';
import { OutputPreview } from '@/components/OutputPreview';
import { HistoryPanel } from '@/components/HistoryPanel';
import { Landing } from '@/pages/Landing';
import { generateDetailedContent } from '@/services/generator';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { analyticsService } from '@/services/analytics';
import type { GeneratedOutput, OutputIteration } from '@/types';
import { ChangeRequestForm, type ChangeRequest } from '@/components/ChangeRequestForm';

interface DemoOutput {
  title: string;
  description: string;
  format: string;
  preview: string;
}

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [iterationHistory, setIterationHistory] = useState<OutputIteration[]>([]);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [baseGenerationData, setBaseGenerationData] = useState<DetailedPromptData | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize analytics on component mount
  useEffect(() => {
    analyticsService.initialize();
  }, []);

  const handleGenerate = async (data: DetailedPromptData) => {
    setIsGenerating(true);
    setCurrentPrompt(data.prompt);
    setBaseGenerationData(data); // Store for iterations
    const startTime = Date.now();
    
    // Track generation started
    await analyticsService.trackGenerationStarted(data.contentType);
    
    try {
      // Check if user is authenticated
      let userId: string = localStorage.getItem('doneanddone_uid') || `anon_${Date.now()}`;
      if (!localStorage.getItem('doneanddone_uid')) localStorage.setItem('doneanddone_uid', userId);

      const result = await generateDetailedContent({
        ...data,
        userId,
        iterationNumber: 1
      });

      const duration = Date.now() - startTime;
      
      // Track generation completed
      await analyticsService.trackGenerationCompleted(data.contentType, duration);

      // Generate and save generation ID
      const newGenerationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setGenerationId(newGenerationId);

      setOutput(result);
      setCurrentIteration(1);
      setIterationHistory([{
        iterationNumber: 1,
        output: result,
        timestamp: new Date().toISOString()
      }]);
      
      toast({
        title: 'Content Generated!',
        description: 'Your content is ready to download.',
      });
    } catch (error) {
      console.error('Generation failed:', error);
      
      // Track generation failure
      await analyticsService.trackGenerationFailed(
        data.contentType, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      toast({
        title: 'Generation Failed',
        description: `Error details: ${error?.message || error?.toString() || JSON.stringify(error)}`,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (output?.downloadUrl) {
      window.open(output.downloadUrl, '_blank');
      toast({
        title: 'Download Started',
        description: 'Your content is being downloaded.',
      });
    }
  };

  const handleShare = () => {
    if (output?.downloadUrl) {
      navigator.clipboard.writeText(output.downloadUrl);
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard.',
      });
    }
  };

  const handleNewGeneration = () => {
    setOutput(null);
    setCurrentPrompt('');
    setDemoMode(false);
    setShowChangeRequest(false);
    setIterationHistory([]);
    setCurrentIteration(1);
    setBaseGenerationData(null);
    setGenerationId(null);
  };

  const handleRestorePrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
    setOutput(null);
  };

  const handleRequestChanges = () => {
    setShowChangeRequest(true);
    toast({
      title: 'Request Changes',
      description: 'Describe what you\'d like to change and we\'ll regenerate your content.',
    });
  };

  const handleConfirmFinal = () => {
    toast({
      title: 'Perfect!',
      description: 'Your content is ready to download and share.',
    });
    
    // Track final confirmation
    analyticsService.trackEvent({
      eventType: 'output_confirmed',
      contentType: output?.contentType,
      iterationNumber: currentIteration
    });
  };

  const handleChangeRequestSubmit = async (changeRequest: ChangeRequest) => {
    if (!baseGenerationData || !output) {
      toast({
        title: 'Error',
        description: 'Original generation data not found. Please start a new generation.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setShowChangeRequest(false);
    const startTime = Date.now();
    const newIterationNumber = currentIteration + 1;

    // Track refinement started
    await analyticsService.trackEvent({
      eventType: 'refinement_started',
      contentType: baseGenerationData.contentType,
      iterationNumber: newIterationNumber
    });

    try {
      let userId: string = localStorage.getItem('doneanddone_uid') || `anon_${Date.now()}`;
      if (!localStorage.getItem('doneanddone_uid')) localStorage.setItem('doneanddone_uid', userId);

      const result = await generateDetailedContent({
        ...baseGenerationData,
        userId,
        changeRequest: {
          changeDescription: changeRequest.changeDescription,
          specificAreas: changeRequest.specificAreas,
          keepExisting: changeRequest.keepExisting
        },
        previousOutput: output,
        iterationNumber: newIterationNumber
      });

      const duration = Date.now() - startTime;

      // Track refinement completed
      await analyticsService.trackEvent({
        eventType: 'refinement_completed',
        contentType: baseGenerationData.contentType,
        iterationNumber: newIterationNumber,
        durationMs: duration
      });

      setOutput(result);
      setCurrentIteration(newIterationNumber);
      setIterationHistory(prev => [...prev, {
        iterationNumber: newIterationNumber,
        output: result,
        changeRequest: {
          changeDescription: changeRequest.changeDescription,
          specificAreas: changeRequest.specificAreas,
          keepExisting: changeRequest.keepExisting
        },
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: `Version ${newIterationNumber} Generated!`,
        description: 'Your refined content is ready. Request more changes or confirm it\'s final.',
      });
    } catch (error) {
      console.error('Refinement failed:', error);

      await analyticsService.trackEvent({
        eventType: 'refinement_failed',
        contentType: baseGenerationData.contentType,
        iterationNumber: newIterationNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: 'Refinement Failed',
        description: 'Sorry, something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDemoGenerate = async (demoData: DemoOutput) => {
    // User confirmed the demo preview - now generate the actual content
    setShowLanding(false);
    setDemoMode(true);
    setIsGenerating(true);
    const startTime = Date.now();

    try {
      let userId: string = localStorage.getItem('doneanddone_uid') || `anon_${Date.now()}`;
      if (!localStorage.getItem('doneanddone_uid')) localStorage.setItem('doneanddone_uid', userId);

      // Create detailed prompt data from demo
      const detailedData: DetailedPromptData = {
        prompt: 'Create an infographic on daily hydration — blue and white palette.',
        contentType: 'infographic',
        tone: 'professional',
        length: 'medium',
        scientificDepth: 'intermediate',
        targetAudience: 'General public'
      };

      // Track demo generation started
      await analyticsService.trackGenerationStarted('infographic');

      const result = await generateDetailedContent({
        ...detailedData,
        userId
      });
      
      const duration = Date.now() - startTime;
      await analyticsService.trackGenerationCompleted('infographic', duration);
      
      setOutput(result);
      setCurrentPrompt(detailedData.prompt);

      toast({
        title: 'Demo Content Generated!',
        description: 'See what DoneandDone can create.',
      });
    } catch (error) {
      console.error('Demo generation failed:', error);
      
      await analyticsService.trackGenerationFailed(
        'infographic',
        error instanceof Error ? error.message : 'Demo generation failed'
      );
      
      toast({
        title: 'Demo Generation Failed',
        description: 'Try creating your own content instead.',
        variant: 'destructive'
      });
      setDemoMode(false);
    } finally {
      setIsGenerating(false);
    }
  };

  if (showLanding) {
    return (
      <>
        <Landing onLaunchApp={() => setShowLanding(false)} onDemoGenerate={handleDemoGenerate} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient background with glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-accent/30 to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <Header onHistoryClick={() => setShowHistory(true)} onLogoClick={() => setShowLanding(true)} />
      
      <main className="container mx-auto px-4 py-12">
        {!output ? (
          <div className="space-y-8">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-in">
                Create Anything from
                <span className="block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent mt-2">
                  A Single Prompt
                </span>
              </h2>
              <p className="text-lg text-muted-foreground animate-fade-in">
                Generate infographics, videos, presentations, social posts, documents, and reports
                instantly with AI. Professional quality.
              </p>
            </div>

            <GuidedThemeForm 
              onGenerate={handleGenerate} 
              isGenerating={isGenerating}
            />

            {isGenerating && (
              <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="bg-card/80 backdrop-blur-sm border rounded-2xl p-8 text-center space-y-4 shadow-lg">
                  <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-lg font-semibold">Creating Your Content...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI is analyzing your prompt and generating professional content
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {showChangeRequest ? (
              <ChangeRequestForm
                onSubmit={handleChangeRequestSubmit}
                onCancel={() => setShowChangeRequest(false)}
                isRegenerating={isGenerating}
              />
            ) : (
              <OutputPreview
                output={output}
                onDownload={handleDownload}
                onShare={handleShare}
                onNewGeneration={handleNewGeneration}
                onRequestChanges={handleRequestChanges}
                onConfirmFinal={handleConfirmFinal}
                iterationNumber={currentIteration}
                showChangeRequest={showChangeRequest}
                generationId={generationId || undefined}
                onEditApplied={(newOutput) => {
                  // Handle AI-suggested edits
                  setOutput(newOutput);
                  toast({
                    title: 'Edit Applied',
                    description: 'Your content has been updated based on the suggestion.',
                  });
                }}
              />
            )}
            
            {isGenerating && (
              <div className="max-w-4xl mx-auto mt-6 animate-fade-in">
                <div className="bg-card/80 backdrop-blur-sm border rounded-2xl p-8 text-center space-y-4 shadow-lg">
                  <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-lg font-semibold">
                      {currentIteration > 1 ? `Refining Version ${currentIteration}...` : 'Creating Your Content...'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentIteration > 1 
                        ? 'AI is applying your requested changes and regenerating...'
                        : 'AI is analyzing your prompt and generating professional content'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showHistory && (
        <HistoryPanel 
          onClose={() => setShowHistory(false)}
          onRestore={handleRestorePrompt}
        />
      )}

        <Toaster />
      </div>
    </div>
  );
}

export default App; 