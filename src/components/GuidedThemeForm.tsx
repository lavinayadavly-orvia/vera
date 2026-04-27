import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Mic, FileText, Video, Image as ImageIcon, LayoutTemplate, ScrollText, BarChart3, Newspaper, ShieldCheck, Megaphone } from 'lucide-react';
import type { ApiNamespace, ContentStrategySelection, ContentType, Market, PromptBlueprint } from '@/types';
import { generatePromptsFromTheme } from '@/services/generator';
import { generatePromptOptionsViaBackend, isBackendRuntimeEnabled } from '@/services/backendRuntime';
import { getDeliveryContract } from '@/services/deliveryContracts';
import { useToast } from '@/hooks/use-toast';

export interface DetailedPromptData {
  prompt: string;
  contentType: ContentType;
  market: Market;
  apiNamespace: ApiNamespace;
  tone: 'professional' | 'casual' | 'academic' | 'persuasive' | 'inspirational';
  length: 'short' | 'medium' | 'long' | 'comprehensive';
  scientificDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  targetAudience: string;
}

interface GuidedThemeFormProps {
  onGenerate: (data: DetailedPromptData) => Promise<void>;
  isGenerating: boolean;
  onDraftChange?: (draft: ContentStrategySelection) => void;
}

const FORMAT_OPTIONS: Array<{
  value: ContentType;
  label: string;
  desc: string;
  icon: typeof ImageIcon;
}> = [
  { value: 'infographic', label: 'Infographic', desc: 'Exportable visual asset', icon: ImageIcon },
  { value: 'white-paper', label: 'White Paper', desc: 'Final PDF document package', icon: FileText },
  { value: 'presentation', label: 'Presentation', desc: 'Editable PPTX deck', icon: LayoutTemplate },
  { value: 'video', label: 'Video', desc: 'Final rendered video', icon: Video },
  { value: 'podcast', label: 'Podcast', desc: 'Script plus audio delivery', icon: Mic },
  { value: 'document', label: 'Document', desc: 'Professional DOC/PDF package', icon: ScrollText },
  { value: 'report', label: 'Report', desc: 'Evidence-led final report', icon: BarChart3 },
  { value: 'social-post', label: 'Social Post', desc: 'Export-ready social creative', icon: Newspaper }
];

const TONE_OPTIONS: DetailedPromptData['tone'][] = [
  'professional',
  'academic',
  'persuasive',
  'casual',
  'inspirational'
];

const MARKET_OPTIONS: Array<{ value: Market; label: string; desc: string }> = [
  { value: 'global', label: 'Global', desc: 'Default global medical-review standards' },
  { value: 'india', label: 'India', desc: 'UCPMP-sensitive language and lower literacy target' },
  { value: 'singapore', label: 'Singapore', desc: 'Reference currency re-validation focus' },
  { value: 'dubai', label: 'Dubai / UAE', desc: 'Arabic localisation and transliteration caution' },
  { value: 'germany', label: 'Germany', desc: 'Promotional content cross-checks against SmPC alignment' },
  { value: 'us', label: 'United States', desc: 'Fair-balance and boxed-warning review expectations' },
  { value: 'uk', label: 'United Kingdom', desc: 'ABPI promotional substantiation and SPC consistency checks' },
];

const NAMESPACE_OPTIONS: Array<{
  value: ApiNamespace;
  label: string;
  desc: string;
  icon: typeof ShieldCheck;
}> = [
  {
    value: 'medical',
    label: 'Medical',
    desc: 'Medical Affairs / scientific exchange namespace with evidence-governed outputs',
    icon: ShieldCheck
  },
  {
    value: 'marketing',
    label: 'Marketing',
    desc: 'Commercial / promotional namespace with market-specific term controls',
    icon: Megaphone
  }
];

const AUDIENCE_PRESETS = {
  general: 'General public',
  hcp: 'Healthcare Professionals (HCPs)',
  leadership: 'Business leaders and decision-makers'
} as const;

function inferAudiencePreset(audience: string): 'general' | 'hcp' | 'leadership' | 'custom' {
  const normalized = audience.toLowerCase();
  if (normalized.includes('hcp') || normalized.includes('healthcare') || normalized.includes('clinician')) {
    return 'hcp';
  }
  if (normalized.includes('leader') || normalized.includes('executive') || normalized.includes('decision-maker')) {
    return 'leadership';
  }
  if (normalized.includes('general') || normalized.includes('public')) {
    return 'general';
  }
  return 'custom';
}

function inferNamespace(contentType: ContentType, prompt: string, audience: string): ApiNamespace {
  if (contentType === 'social-post' || /\bbrand|campaign|launch|promo|promotional\b/i.test(prompt)) {
    return 'marketing';
  }

  if (/\bhcp|clinician|medical affairs|msl|scientific exchange\b/i.test(audience)) {
    return 'medical';
  }

  return 'medical';
}

export function GuidedThemeForm({ onGenerate, isGenerating, onDraftChange }: GuidedThemeFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [promptOptions, setPromptOptions] = useState<PromptBlueprint[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [contentType, setContentType] = useState<ContentType>('infographic');
  const [market, setMarket] = useState<Market>('global');
  const [apiNamespace, setApiNamespace] = useState<ApiNamespace>('medical');
  const [tone, setTone] = useState<DetailedPromptData['tone']>('professional');
  const [length, setLength] = useState<DetailedPromptData['length']>('medium');
  const [scientificDepth, setScientificDepth] = useState<DetailedPromptData['scientificDepth']>('intermediate');
  const [audiencePreset, setAudiencePreset] = useState<'general' | 'hcp' | 'leadership' | 'custom'>('general');
  const [customAudience, setCustomAudience] = useState('');

  const selectedOption = useMemo(
    () => promptOptions.find((option) => option.id === selectedOptionId) || null,
    [promptOptions, selectedOptionId]
  );

  useEffect(() => {
    if (!selectedOption) return;

    setEditedPrompt(selectedOption.prompt);
    setContentType(selectedOption.recommendedContentType);
    setTone(selectedOption.recommendedTone);
    setLength(selectedOption.recommendedLength);
    setScientificDepth(selectedOption.recommendedScientificDepth);

    const nextAudiencePreset = inferAudiencePreset(selectedOption.recommendedAudience);
    setAudiencePreset(nextAudiencePreset);
    setCustomAudience(nextAudiencePreset === 'custom' ? selectedOption.recommendedAudience : '');
    setApiNamespace(
      inferNamespace(
        selectedOption.recommendedContentType,
        selectedOption.prompt,
        selectedOption.recommendedAudience,
      ),
    );
  }, [selectedOption]);

  useEffect(() => {
    const targetAudience = audiencePreset === 'custom'
      ? customAudience.trim()
      : AUDIENCE_PRESETS[audiencePreset];

    onDraftChange?.({
      contentType,
      market,
      apiNamespace,
      targetAudience: targetAudience || undefined,
    });
  }, [apiNamespace, audiencePreset, contentType, customAudience, market, onDraftChange]);

  const handleGeneratePrompts = async () => {
    if (!brief.trim()) return;

    try {
      setIsGeneratingPrompts(true);
      const options = isBackendRuntimeEnabled()
        ? await generatePromptOptionsViaBackend(brief.trim())
        : await generatePromptsFromTheme(brief.trim());
      setPromptOptions(options);
      setSelectedOptionId(options[0]?.id || '');
      setStep(2);
    } catch (error: any) {
      console.error('Failed to generate prompt options:', error);
      toast({
        title: "Couldn't generate prompt options",
        description: `Error details: ${error?.message || error?.toString() || JSON.stringify(error)}`,
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!editedPrompt.trim() || isGenerating) return;

    const targetAudience = audiencePreset === 'custom'
      ? customAudience.trim()
      : AUDIENCE_PRESETS[audiencePreset];

    const data: DetailedPromptData = {
      prompt: editedPrompt.trim(),
      contentType,
      market,
      apiNamespace,
      tone,
      length,
      scientificDepth,
      targetAudience: targetAudience || 'General public'
    };

    await onGenerate(data);
  };

  const canAdvanceFromBrief = brief.trim().length >= 5;
  const canAdvanceFromOptions = !!selectedOption && editedPrompt.trim().length >= 20;
  const selectedFormatMeta = FORMAT_OPTIONS.find((option) => option.value === contentType);
  const selectedFormatContract = getDeliveryContract(contentType);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 animate-fade-in">
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
              step >= num ? 'border-[#0b6b6f] bg-[#0b6b6f] text-white shadow-[0_12px_30px_rgba(11,107,111,0.22)]' : 'border-[#0b6b6f]/18 bg-white/90 text-[#6f898a]'
            }`}>
              {num}
            </div>
            {num < 3 && <div className={`h-px w-16 transition-colors ${step > num ? 'bg-[#ff7a1a]' : 'bg-[#0b6b6f]/18'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="animate-fade-in overflow-hidden rounded-[34px] border border-[#0b6b6f]/12 bg-white/94 shadow-[0_28px_90px_rgba(8,54,58,0.08)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold tracking-[-0.04em] text-[#0b6b6f]">Start with One Line</CardTitle>
            <CardDescription>
              Give Vera a rough one-line brief. We’ll turn it into four stronger prompt directions for you to choose from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g., diabetes prevention for the general public, or AI trends for hospital leadership"
              className="min-h-[110px] resize-none rounded-[24px] border-[#0b6b6f]/14 bg-[#fbffff] p-4 text-lg transition-all focus:border-[#0b6b6f]"
              disabled={isGeneratingPrompts}
            />
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-dashed border-[#ffcfaa] bg-[#fff8f2] px-3 py-2">Try: "Obesity in women under 35 in Korea"</div>
              <div className="rounded-2xl border border-dashed border-[#ffcfaa] bg-[#fff8f2] px-3 py-2">Try: "Future of digital therapeutics in diabetes care"</div>
              <div className="rounded-2xl border border-dashed border-[#ffcfaa] bg-[#fff8f2] px-3 py-2">Try: "White paper on hospital AI adoption barriers"</div>
            </div>
            <Button
              onClick={handleGeneratePrompts}
              disabled={!canAdvanceFromBrief || isGeneratingPrompts}
              size="lg"
              className="mt-4 w-full rounded-full"
            >
              {isGeneratingPrompts ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Building Prompt Options...</>
              ) : (
                <>Generate 4 Prompt Options <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-fade-in overflow-hidden rounded-[34px] border border-[#0b6b6f]/12 bg-white/94 shadow-[0_28px_90px_rgba(8,54,58,0.08)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold tracking-[-0.04em] text-[#0b6b6f]">Choose Your Direction</CardTitle>
            <CardDescription>
              Pick the detailed prompt that best matches your goal. You can still edit it before generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={selectedOptionId} onValueChange={setSelectedOptionId} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promptOptions.map((option) => (
                <Label
                  key={option.id}
                  htmlFor={`prompt-option-${option.id}`}
                  className={`cursor-pointer rounded-[24px] border p-5 transition-all ${
                    selectedOptionId === option.id ? 'border-[#0b6b6f]/30 bg-[#eff8f8] ring-1 ring-[#ff7a1a]/20' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={option.id} id={`prompt-option-${option.id}`} className="mt-1" />
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{option.label}</span>
                        <Badge variant="secondary" className="capitalize bg-[#fff2e7] text-[#c96a22]">
                          {option.recommendedContentType.replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground/90">{option.angle}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{option.rationale}</p>
                      <div className="rounded-2xl border border-[#0b6b6f]/10 bg-[#fbffff] p-3 text-sm leading-relaxed text-muted-foreground">
                        {option.prompt}
                      </div>
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            {selectedOption && (
              <div className="space-y-3 rounded-[24px] border border-[#0b6b6f]/14 bg-[#f6fbfb] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="edited-prompt" className="text-base font-semibold">Final Prompt</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Edit the selected option before generation if you want to tighten scope, add constraints, or change the ask.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-[#0b6b6f]/14 bg-white">{selectedOption.recommendedTone}</Badge>
                    <Badge variant="outline" className="border-[#0b6b6f]/14 bg-white">{selectedOption.recommendedScientificDepth}</Badge>
                    <Badge variant="outline" className="border-[#0b6b6f]/14 bg-white">{selectedOption.recommendedLength}</Badge>
                  </div>
                </div>
                <Textarea
                  id="edited-prompt"
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[160px] resize-none rounded-[22px] border-[#0b6b6f]/12 bg-white text-base"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1 rounded-full">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canAdvanceFromOptions} size="lg" className="flex-1 rounded-full">
                Choose Format & Settings <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-fade-in overflow-hidden rounded-[34px] border border-[#0b6b6f]/12 bg-white/94 shadow-[0_28px_90px_rgba(8,54,58,0.08)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold tracking-[-0.04em] text-[#0b6b6f]">Choose Format and Delivery</CardTitle>
            <CardDescription>
              Finalize the output format, tone, depth, and audience before generation. Feedback and regeneration stay available after output.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="final-prompt" className="text-lg font-semibold">Prompt Going to Generation</Label>
              <Textarea
                id="final-prompt"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="min-h-[150px] resize-none rounded-[24px] border-[#0b6b6f]/12 bg-[#fbffff] text-base"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-semibold">Format</Label>
              <RadioGroup value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {FORMAT_OPTIONS.map((format) => {
                    const Icon = format.icon;
                    const isRecommended = selectedOption?.recommendedContentType === format.value;
                    const deliveryContract = getDeliveryContract(format.value);
                    return (
                      <Label key={format.value} htmlFor={`fmt-${format.value}`} className="cursor-pointer">
                        <div className={`flex h-full flex-col items-start gap-3 rounded-[22px] border p-4 transition-all ${
                          contentType === format.value ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                        }`}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <RadioGroupItem value={format.value} id={`fmt-${format.value}`} className="sr-only" />
                            <Icon className={`w-7 h-7 ${contentType === format.value ? 'text-[#0b6b6f]' : 'text-muted-foreground'}`} />
                            {isRecommended && <Badge variant="secondary" className="bg-[#fff2e7] text-[#c96a22]">Recommended</Badge>}
                          </div>
                          <div>
                            <p className="font-semibold">{format.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{format.desc}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-[#0b6b6f]/14 bg-white text-[10px]">
                                Final: {deliveryContract.primaryDeliverable}
                              </Badge>
                              <Badge variant={deliveryContract.readiness === 'ready' ? 'secondary' : 'destructive'} className={`text-[10px] ${deliveryContract.readiness === 'ready' ? 'bg-[#eff8f8] text-[#0b6b6f]' : ''}`}>
                                {deliveryContract.readiness === 'ready' ? deliveryContract.providerLabel : 'Setup required'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Label>
                    );
                  })}
                </div>
              </RadioGroup>
              {selectedFormatMeta && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Selected delivery: <span className="font-medium text-foreground">{selectedFormatMeta.label}</span> · {selectedFormatMeta.desc}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Final asset: <span className="font-medium text-foreground">{selectedFormatContract.primaryDeliverable}</span> · Provider: <span className="font-medium text-foreground">{selectedFormatContract.providerLabel}</span>
                  </p>
                  <p className={`text-xs ${selectedFormatContract.readiness === 'ready' ? 'text-muted-foreground' : 'text-amber-700'}`}>
                    {selectedFormatContract.note}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tone</Label>
                <RadioGroup value={tone} onValueChange={(value) => setTone(value as DetailedPromptData['tone'])} className="space-y-2">
                  {TONE_OPTIONS.map((toneOption) => (
                    <Label key={toneOption} htmlFor={`tone-${toneOption}`} className="cursor-pointer">
                      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        tone === toneOption ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                      }`}>
                        <RadioGroupItem value={toneOption} id={`tone-${toneOption}`} />
                        <span className="capitalize font-medium">{toneOption}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Market / Region</Label>
                  <Select value={market} onValueChange={(value) => setMarket(value as Market)}>
                  <SelectTrigger className="rounded-2xl border-[#0b6b6f]/12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {MARKET_OPTIONS.find((option) => option.value === market)?.desc}
                </p>

                <Label className="text-base font-semibold pt-2 block">API Namespace</Label>
                <RadioGroup value={apiNamespace} onValueChange={(value) => setApiNamespace(value as ApiNamespace)} className="space-y-2">
                  {NAMESPACE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Label key={option.value} htmlFor={`namespace-${option.value}`} className="cursor-pointer">
                        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                          apiNamespace === option.value ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                        }`}>
                          <RadioGroupItem value={option.value} id={`namespace-${option.value}`} />
                          <Icon className={`w-4 h-4 mt-0.5 ${apiNamespace === option.value ? 'text-[#0b6b6f]' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                          </div>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>

                <Label className="text-base font-semibold">Length</Label>
                <Select value={length} onValueChange={(value) => setLength(value as DetailedPromptData['length'])}>
                  <SelectTrigger className="rounded-2xl border-[#0b6b6f]/12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-base font-semibold pt-2 block">Scientific Depth</Label>
                <Select value={scientificDepth} onValueChange={(value) => setScientificDepth(value as DetailedPromptData['scientificDepth'])}>
                  <SelectTrigger className="rounded-2xl border-[#0b6b6f]/12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Audience</Label>
                <RadioGroup value={audiencePreset} onValueChange={(value) => setAudiencePreset(value as 'general' | 'hcp' | 'leadership' | 'custom')} className="space-y-2">
                  <Label htmlFor="aud-general" className="cursor-pointer">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      audiencePreset === 'general' ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                    }`}>
                      <RadioGroupItem id="aud-general" value="general" />
                      <span className="font-medium">General public</span>
                    </div>
                  </Label>
                  <Label htmlFor="aud-hcp" className="cursor-pointer">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      audiencePreset === 'hcp' ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                    }`}>
                      <RadioGroupItem id="aud-hcp" value="hcp" />
                      <span className="font-medium">HCPs / clinicians</span>
                    </div>
                  </Label>
                  <Label htmlFor="aud-leadership" className="cursor-pointer">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      audiencePreset === 'leadership' ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                    }`}>
                      <RadioGroupItem id="aud-leadership" value="leadership" />
                      <span className="font-medium">Leadership / decision-makers</span>
                    </div>
                  </Label>
                  <Label htmlFor="aud-custom" className="cursor-pointer">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      audiencePreset === 'custom' ? 'border-[#0b6b6f]/30 bg-[#eff8f8]' : 'border-[#0b6b6f]/12 bg-white hover:border-[#0b6b6f]/28'
                    }`}>
                      <RadioGroupItem id="aud-custom" value="custom" />
                      <span className="font-medium">Custom audience</span>
                    </div>
                  </Label>
                </RadioGroup>

                {audiencePreset === 'custom' && (
                  <Textarea
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    placeholder="Describe the exact audience..."
                    className="min-h-[88px] resize-none rounded-[22px] border-[#0b6b6f]/12 bg-white"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#0b6b6f]/10 pt-4">
              <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1 rounded-full" disabled={isGenerating}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleGenerateContent}
                className="flex-1 rounded-full py-6 text-lg"
                size="lg"
                disabled={isGenerating || !editedPrompt.trim() || (audiencePreset === 'custom' && !customAudience.trim())}
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> Generate Output</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
