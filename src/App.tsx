import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { GuidedThemeForm, type DetailedPromptData } from '@/components/GuidedThemeForm';
import { OutputPreview } from '@/components/OutputPreview';
import { HistoryPanel } from '@/components/HistoryPanel';
import { ContentStrategyModal } from '@/components/ContentStrategyModal';
import { Landing } from '@/pages/Landing';
import { generateDetailedContent } from '@/services/generator';
import { getDeliveryReadinessError } from '@/services/deliveryContracts';
import { getHostedFinalDeliverableUrl, getShareableOutputLabel, getShareableOutputUrl } from '@/services/outputAssets';
import { completeBackendGeneration, createBackendGeneration, failBackendGeneration, getBackendGeneration, isBackendRuntimeEnabled, supportsServerSideGeneration, waitForBackendGeneration } from '@/services/backendRuntime';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { analyticsService } from '@/services/analytics';
import { hydrateOutputForVera } from '@/services/outputHydration';
import type { ContentStrategySelection, GeneratedOutput, GenerationRequest, OutputIteration } from '@/types';
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
  const [showContentStrategy, setShowContentStrategy] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [iterationHistory, setIterationHistory] = useState<OutputIteration[]>([]);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [baseGenerationData, setBaseGenerationData] = useState<DetailedPromptData | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [contentStrategyContext, setContentStrategyContext] = useState<ContentStrategySelection | null>(null);
  const [backendProgressLabel, setBackendProgressLabel] = useState<string | null>(null);
  const [backendProgressDetail, setBackendProgressDetail] = useState<string | null>(null);
  const { toast } = useToast();
  const legacyUserIdKey = ['done', 'anddone', 'uid'].join('_');

  // Initialize analytics on component mount
  useEffect(() => {
    analyticsService.initialize();
  }, []);

  const ensureUserId = () => {
    const existing = localStorage.getItem('vera_uid');
    if (existing) return existing;

    const legacy = localStorage.getItem(legacyUserIdKey);
    if (legacy) {
      localStorage.setItem('vera_uid', legacy);
      return legacy;
    }

    const created = `anon_${Date.now()}`;
    localStorage.setItem('vera_uid', created);
    return created;
  };

  const beginBackendGeneration = async (request: Parameters<typeof createBackendGeneration>[0]) => {
    if (!isBackendRuntimeEnabled()) return null;

    try {
      const record = await createBackendGeneration(request);
      setGenerationId(record.id);
      return record.id;
    } catch (error) {
      console.warn('Vera backend runtime unavailable, continuing locally.', error);
      toast({
        title: 'Backend Runtime Unavailable',
        description: 'Continuing in local execution mode while the Vera API is unavailable.',
      });
      return null;
    }
  };

  const finishBackendGeneration = async (id: string | null, result: GeneratedOutput) => {
    if (!id || !isBackendRuntimeEnabled()) return;

    try {
      await completeBackendGeneration(id, result);
    } catch (error) {
      console.warn('Failed to persist completed generation to backend runtime.', error);
    }
  };

  const markBackendGenerationFailed = async (id: string | null, error: unknown) => {
    if (!id || !isBackendRuntimeEnabled()) return;

    try {
      const message = error instanceof Error ? error.message : String(error);
      await failBackendGeneration(id, message);
    } catch (syncError) {
      console.warn('Failed to persist failed generation to backend runtime.', syncError);
    }
  };

  const resolveGenerationFromBackend = async (data: DetailedPromptData & { userId: string; changeRequest?: any; previousOutput?: GeneratedOutput | null; iterationNumber?: number }) => {
    const backendRecord = await createBackendGeneration(data);
    setGenerationId(backendRecord.id);
    const initialTimeline = backendRecord.timeline[backendRecord.timeline.length - 1];
    setBackendProgressLabel(backendRecord.status === 'queued' ? 'Queued in Vera API...' : 'Processing in Vera API...');
    setBackendProgressDetail(initialTimeline?.message || 'Your request has been accepted by the backend.');
    const completed = await waitForBackendGeneration(backendRecord.id, {
      onUpdate: (generation) => {
        const latestTimeline = generation.timeline[generation.timeline.length - 1];
        setBackendProgressLabel(
          generation.status === 'queued'
            ? 'Queued in Vera API...'
            : generation.status === 'processing'
              ? 'Processing in Vera API...'
              : generation.status === 'failed'
                ? 'Generation Failed'
                : 'Quality Check Complete',
        );
        setBackendProgressDetail(latestTimeline?.message || 'Vera is processing your request.');
      },
    });
    if (completed.status === 'failed' || !completed.output) {
      throw new Error(completed.error || 'Server-side generation failed.');
    }
    return {
      generationId: backendRecord.id,
      output: completed.output,
    };
  };

  const handleGenerate = async (data: DetailedPromptData) => {
    const readinessError = getDeliveryReadinessError(data.contentType);
    if (readinessError) {
      toast({
        title: 'Format Not Ready',
        description: readinessError,
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setCurrentPrompt(data.prompt);
    setBaseGenerationData(data); // Store for iterations
    setBackendProgressLabel(null);
    setBackendProgressDetail(null);
    setContentStrategyContext({
      contentType: data.contentType,
      market: data.market,
      apiNamespace: data.apiNamespace,
      targetAudience: data.targetAudience,
    });
    const startTime = Date.now();
    const userId = ensureUserId();
    let backendGenerationId: string | null = null;
    
    // Track generation started
    await analyticsService.trackGenerationStarted(data.contentType);
    
    try {
      let result: GeneratedOutput;
      if (isBackendRuntimeEnabled() && supportsServerSideGeneration(data.contentType)) {
        const resolved = await resolveGenerationFromBackend({
          ...data,
          userId,
          iterationNumber: 1,
        });
        backendGenerationId = resolved.generationId;
        result = hydrateOutputForVera(resolved.output, {
          ...data,
          userId,
          iterationNumber: 1,
        });
      } else {
        backendGenerationId = await beginBackendGeneration({
          ...data,
          userId,
          iterationNumber: 1,
        });

        result = await generateDetailedContent({
          ...data,
          userId,
          iterationNumber: 1
        });
      }

      const duration = Date.now() - startTime;
      
      // Track generation completed
      await analyticsService.trackGenerationCompleted(data.contentType, duration);
      if (!supportsServerSideGeneration(data.contentType)) {
        await finishBackendGeneration(backendGenerationId, result);
      }

      const newGenerationId = backendGenerationId || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setGenerationId(newGenerationId);

      setOutput(result);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);
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
      await markBackendGenerationFailed(backendGenerationId, error);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);
      
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
    const deliverableUrl = output ? getHostedFinalDeliverableUrl(output) : null;
    if (deliverableUrl) {
      window.open(deliverableUrl, '_blank');
      toast({
        title: 'Download Started',
        description: 'Your hosted final asset is opening.',
      });
      return;
    }

    toast({
      title: 'Use Export Buttons Below',
      description: 'This format is exported locally from the buttons in the output panel.',
      variant: 'destructive'
    });
  };

  const handleShare = () => {
    const shareableUrl = output ? getShareableOutputUrl(output) : null;
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      toast({
        title: 'Link Copied',
        description: `${getShareableOutputLabel(output!)} link copied to clipboard.`,
      });
      return;
    }

    toast({
      title: 'No Share Link Available',
      description: 'This output does not have a hosted asset link yet. Export it locally instead.',
      variant: 'destructive'
    });
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
    setContentStrategyContext(null);
    setBackendProgressLabel(null);
    setBackendProgressDetail(null);
  };

  const handleRestorePrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
    setOutput(null);
  };

  const handleOpenSavedGeneration = async (item: GenerationRequest) => {
    setDemoMode(false);
    setIsGenerating(true);
    setBackendProgressLabel('Loading saved output...');
    setBackendProgressDetail('Fetching the stored asset, sources, and compliance state from Vera.');

    try {
      if (!isBackendRuntimeEnabled()) {
        throw new Error('Saved output restore requires the Vera backend runtime.');
      }

      const generation = await getBackendGeneration(item.id);
      if (!generation.output) {
        throw new Error('This saved generation does not have an output payload attached.');
      }

      const hydratedOutput = hydrateOutputForVera(generation.output, generation.request);
      const iterationNumber = generation.request.iterationNumber || 1;

      setOutput(hydratedOutput);
      setCurrentPrompt(generation.request.prompt);
      setBaseGenerationData({
        prompt: generation.request.prompt,
        contentType: generation.request.contentType,
        market: generation.request.market,
        apiNamespace: generation.request.apiNamespace,
        tone: generation.request.tone,
        length: generation.request.length,
        scientificDepth: generation.request.scientificDepth,
        targetAudience: generation.request.targetAudience,
      });
      setGenerationId(generation.id);
      setCurrentIteration(iterationNumber);
      setIterationHistory([
        {
          iterationNumber,
          output: hydratedOutput,
          changeRequest: generation.request.changeRequest,
          timestamp: generation.updatedAt,
        },
      ]);
      setShowChangeRequest(false);
      setContentStrategyContext({
        contentType: generation.request.contentType,
        market: generation.request.market,
        apiNamespace: generation.request.apiNamespace,
        targetAudience: generation.request.targetAudience,
      });

      toast({
        title: 'Saved Output Loaded',
        description: 'The stored generation is open again with its current exports and evidence panels.',
      });
    } catch (error) {
      console.error('Failed to restore saved generation:', error);
      toast({
        title: 'Saved Output Unavailable',
        description: error instanceof Error ? error.message : 'The stored generation could not be reopened.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);
    }
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
    setBackendProgressLabel(null);
    setBackendProgressDetail(null);
    const startTime = Date.now();
    const newIterationNumber = currentIteration + 1;
    const userId = ensureUserId();
    let backendGenerationId: string | null = null;

    // Track refinement started
    await analyticsService.trackEvent({
      eventType: 'refinement_started',
      contentType: baseGenerationData.contentType,
      iterationNumber: newIterationNumber
    });

    try {
      let result: GeneratedOutput;
      if (isBackendRuntimeEnabled() && supportsServerSideGeneration(baseGenerationData.contentType)) {
        const resolved = await resolveGenerationFromBackend({
          ...baseGenerationData,
          userId,
          changeRequest: {
            changeDescription: changeRequest.changeDescription,
            specificAreas: changeRequest.specificAreas,
            keepExisting: changeRequest.keepExisting
          },
          previousOutput: output,
          iterationNumber: newIterationNumber,
        });
        backendGenerationId = resolved.generationId;
        result = hydrateOutputForVera(resolved.output, {
          ...baseGenerationData,
          userId,
          changeRequest: {
            changeDescription: changeRequest.changeDescription,
            specificAreas: changeRequest.specificAreas,
            keepExisting: changeRequest.keepExisting
          },
          previousOutput: output,
          iterationNumber: newIterationNumber,
        });
      } else {
        backendGenerationId = await beginBackendGeneration({
          ...baseGenerationData,
          userId,
          changeRequest: {
            changeDescription: changeRequest.changeDescription,
            specificAreas: changeRequest.specificAreas,
            keepExisting: changeRequest.keepExisting
          },
          previousOutput: output,
          iterationNumber: newIterationNumber,
        });

        result = await generateDetailedContent({
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
      }

      const duration = Date.now() - startTime;
      if (!supportsServerSideGeneration(baseGenerationData.contentType)) {
        await finishBackendGeneration(backendGenerationId, result);
      }

      // Track refinement completed
      await analyticsService.trackEvent({
        eventType: 'refinement_completed',
        contentType: baseGenerationData.contentType,
        iterationNumber: newIterationNumber,
        durationMs: duration
      });

      setOutput(result);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);
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
      await markBackendGenerationFailed(backendGenerationId, error);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);

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
    setBackendProgressLabel(null);
    setBackendProgressDetail(null);
    const startTime = Date.now();
    const userId = ensureUserId();
    let backendGenerationId: string | null = null;

    try {
      // Create detailed prompt data from demo
      const detailedData: DetailedPromptData = {
        prompt: 'Create an infographic on daily hydration — blue and white palette.',
        contentType: 'infographic',
        market: 'global',
        apiNamespace: 'medical',
        tone: 'professional',
        length: 'medium',
        scientificDepth: 'intermediate',
        targetAudience: 'General public'
      };

      // Track demo generation started
      await analyticsService.trackGenerationStarted('infographic');

      let result: GeneratedOutput;
      if (isBackendRuntimeEnabled() && supportsServerSideGeneration(detailedData.contentType)) {
        const resolved = await resolveGenerationFromBackend({
          ...detailedData,
          userId,
          iterationNumber: 1,
        });
        backendGenerationId = resolved.generationId;
        result = hydrateOutputForVera(resolved.output, {
          ...detailedData,
          userId,
          iterationNumber: 1,
        });
      } else {
        backendGenerationId = await beginBackendGeneration({
          ...detailedData,
          userId,
          iterationNumber: 1,
        });

        result = await generateDetailedContent({
          ...detailedData,
          userId
        });
      }
      
      const duration = Date.now() - startTime;
      await analyticsService.trackGenerationCompleted('infographic', duration);
      if (!supportsServerSideGeneration(detailedData.contentType)) {
        await finishBackendGeneration(backendGenerationId, result);
      }
      
      setOutput(result);
      setCurrentPrompt(detailedData.prompt);
      setGenerationId(backendGenerationId || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);

      toast({
        title: 'Demo Content Generated!',
        description: 'See what Vera can create.',
      });
    } catch (error) {
      console.error('Demo generation failed:', error);
      await markBackendGenerationFailed(backendGenerationId, error);
      setBackendProgressLabel(null);
      setBackendProgressDetail(null);
      
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
    <div className="relative min-h-screen overflow-hidden bg-[#fcfefd] text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbfb_44%,#eef7f9_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_11%_16%,rgba(255,122,26,0.08),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(11,107,111,0.08),transparent_26%),radial-gradient(circle_at_48%_88%,rgba(38,154,140,0.06),transparent_28%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(11,107,111,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(11,107,111,0.08)_1px,transparent_1px)] [background-size:92px_92px]" />
      <div className="absolute left-[-8rem] top-24 h-80 w-80 rounded-full bg-[#ffb06b]/16 blur-3xl" />
      <div className="absolute right-[-6rem] top-20 h-72 w-72 rounded-full bg-[#6ecfd0]/14 blur-3xl" />
      <div className="absolute bottom-12 left-1/2 h-52 w-[55%] -translate-x-1/2 rounded-full bg-[#9ee5d2]/16 blur-3xl" />
      
      <div className="relative z-10">
        <Header
          onHistoryClick={() => setShowHistory(true)}
          onContentStrategyClick={() => setShowContentStrategy(true)}
          onLogoClick={() => setShowLanding(true)}
        />
      
      <main className="mx-auto w-full max-w-[1800px] px-6 py-10 md:px-8 md:py-12 xl:px-12">
        {!output ? (
          <div className="space-y-10">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="space-y-6 rounded-[34px] border border-[#0b6b6f]/12 bg-white/94 px-7 py-8 shadow-[0_28px_100px_rgba(8,54,58,0.08)] backdrop-blur-md md:px-9 md:py-10">
                <p className="animate-fade-in text-[11px] uppercase tracking-[0.26em] text-[#c96a22]">Vera workspace</p>
                <h2 className="animate-fade-in text-4xl font-semibold leading-[0.95] tracking-[-0.05em] md:text-6xl">
                  Type. Choose.
                  <span className="mt-2 block text-[#0D9488]">Ta-Da!</span>
                </h2>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground animate-fade-in md:text-lg">
                  Start with one line, review stronger prompt directions, set the right format, and let Vera route the brief into a usable deliverable path.
                </p>
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  {[
                    { label: 'Brief', value: 'one line in' },
                    { label: 'Route', value: 'format-aware' },
                    { label: 'Deliver', value: 'export-ready' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-[#0b6b6f]/12 bg-[#f9ffff] px-4 py-4 shadow-[0_10px_30px_rgba(11,107,111,0.05)]">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#6f898a]">{item.label}</div>
                      <div className="mt-2 text-sm font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[34px] border border-[#ff7a1a]/16 bg-[linear-gradient(145deg,#fffdf9_0%,#f4fbfb_58%,#eef9f4_100%)] px-7 py-8 text-foreground shadow-[0_28px_110px_rgba(18,68,72,0.08)] md:px-8 md:py-9">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#c96a22]">How to use Vera</p>
                <div className="mt-6 space-y-5">
                  {[
                    'Write a concise brief.',
                    'Pick the strongest direction.',
                    'Choose the output track and generate.',
                  ].map((line, index) => (
                    <div key={line} className="grid grid-cols-[42px_1fr] gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b6b6f] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(11,107,111,0.2)]">
                        {index + 1}
                      </div>
                      <div className="pt-2 text-sm font-medium leading-6 text-[#14393b]">{line}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-sm leading-7 text-[#506869]">
                  Vera opens with a cleaner editorial workspace so the product feels like a creative system, not a leftover prompt tool.
                </p>
              </div>
            </div>

            <GuidedThemeForm 
              onGenerate={handleGenerate} 
              isGenerating={isGenerating}
              onDraftChange={setContentStrategyContext}
            />

            {isGenerating && (
              <div className="w-full animate-fade-in">
                <div className="rounded-[30px] border border-[#0b6b6f]/14 bg-white/92 p-8 text-center shadow-[0_20px_80px_rgba(11,107,111,0.08)] backdrop-blur-sm">
                  <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-lg font-semibold text-[#0b6b6f]">{backendProgressLabel || 'Creating Your Content...'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {backendProgressDetail || 'AI is analyzing your prompt and generating professional content'}
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
                  if (newOutput?.contentType !== 'infographic') {
                    toast({
                      title: 'Edit Applied',
                      description: 'Your content has been updated based on the suggestion.',
                    });
                  }
                }}
              />
            )}
            
            {isGenerating && (
              <div className="mt-6 w-full animate-fade-in">
                <div className="rounded-[30px] border border-[#0b6b6f]/14 bg-white/92 p-8 text-center shadow-[0_20px_80px_rgba(11,107,111,0.08)] backdrop-blur-sm">
                  <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-lg font-semibold text-[#0b6b6f]">
                      {backendProgressLabel || (currentIteration > 1 ? `Refining Version ${currentIteration}...` : 'Creating Your Content...')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {backendProgressDetail || (currentIteration > 1 
                        ? 'AI is applying your requested changes and regenerating...'
                        : 'AI is analyzing your prompt and generating professional content'
                      )}
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
          onReusePrompt={handleRestorePrompt}
          onOpenGeneration={handleOpenSavedGeneration}
        />
      )}

      <ContentStrategyModal
        open={showContentStrategy}
        onOpenChange={setShowContentStrategy}
        context={contentStrategyContext ?? (output ? {
          contentType: output.contentType,
          market: output.market,
          apiNamespace: output.apiNamespace,
          targetAudience: output.audience,
        } : null)}
      />

        <Toaster />
      </div>
    </div>
  );
}

export default App; 
