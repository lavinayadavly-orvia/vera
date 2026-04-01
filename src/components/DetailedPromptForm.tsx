import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ChevronRight, ChevronLeft, ShieldCheck, Megaphone } from 'lucide-react';
import type { ApiNamespace, ContentType, Market } from '@/types';

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

interface DetailedPromptFormProps {
  onGenerate: (data: DetailedPromptData) => Promise<void>;
  isGenerating: boolean;
}

const contentTypeKeywords: Record<ContentType, string[]> = {
  'infographic': ['infographic', 'infographics', 'visual', 'chart', 'diagram'],
  'video': ['video', 'animation', 'clip', 'motion', 'animated'],
  'presentation': ['presentation', 'slides', 'deck', 'powerpoint', 'ppt'],
  'social-post': ['social', 'post', 'linkedin', 'twitter', 'instagram', 'facebook', 'carousel'],
  'document': ['document', 'doc', 'report', 'article', 'write'],
  'report': ['report', 'analysis', 'summary', 'findings', 'data'],
  'podcast': ['podcast', 'audio', 'episode', 'interview', 'narrate'],
  'white-paper': ['white paper', 'whitepaper', 'research paper', 'technical paper', 'scientific paper']
};

function inferNamespace(contentType: ContentType, prompt: string, audience: string): ApiNamespace {
  if (contentType === 'social-post' || /\bbrand|campaign|launch|promo|promotional\b/i.test(prompt)) {
    return 'marketing';
  }

  if (/\bhcp|clinician|medical affairs|msl|scientific exchange\b/i.test(audience)) {
    return 'medical';
  }

  return 'medical';
}

export function DetailedPromptForm({ onGenerate, isGenerating }: DetailedPromptFormProps) {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [detectedType, setDetectedType] = useState<ContentType | null>(null);
  const [apiNamespace, setApiNamespace] = useState<ApiNamespace>('medical');
  const [tone, setTone] = useState<DetailedPromptData['tone']>('professional');
  const [length, setLength] = useState<DetailedPromptData['length']>('medium');
  const [scientificDepth, setScientificDepth] = useState<DetailedPromptData['scientificDepth']>('intermediate');
  const [targetAudience, setTargetAudience] = useState('');

  const detectContentType = (text: string): ContentType => {
    const lowerText = text.toLowerCase();
    
    for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type as ContentType;
      }
    }
    
    return 'infographic';
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (value.trim()) {
      const type = detectContentType(value);
      setDetectedType(type);
      setApiNamespace(inferNamespace(type, value, targetAudience));
    } else {
      setDetectedType(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    const data: DetailedPromptData = {
      prompt,
      contentType: detectedType || 'infographic',
      market: 'global',
      apiNamespace,
      tone,
      length,
      scientificDepth,
      targetAudience: targetAudience || 'general audience'
    };
    
    await onGenerate(data);
  };

  const canProceedToStep2 = prompt.trim().length > 10;
  const canProceedToStep3 = canProceedToStep2 && targetAudience.trim().length > 0;

  const examples = [
    'Create a short video about World Stroke Day with a red and yellow color palette',
    'Design a LinkedIn carousel on the benefits of digital health records',
    'Make an infographic about sustainable energy sources',
    'Generate a presentation on AI trends in 2025'
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
          step >= 1 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
        }`}>
          1
        </div>
        <div className={`h-0.5 w-16 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted-foreground'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
          step >= 2 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
        }`}>
          2
        </div>
        <div className={`h-0.5 w-16 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted-foreground'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
          step >= 3 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
        }`}>
          3
        </div>
      </div>

      {/* Step 1: Basic Prompt */}
      {step === 1 && (
        <Card className="border-2 animate-fade-in">
          <CardHeader>
            <CardTitle>What do you want to create?</CardTitle>
            <CardDescription>
              Describe your content idea. Be as specific as possible about the topic, format, and any style preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="e.g., 'Create a short video summarizing the Phase 3 Trial results for a new Oncology compound'"
                  className="min-h-[120px] text-base resize-none pr-32 bg-card/80 backdrop-blur-sm border-2 focus:border-primary transition-all"
                  disabled={isGenerating}
                />
                {detectedType && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="capitalize">
                      {detectedType.replace('-', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">Try these examples:</p>
              <div className="grid gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptChange(example)}
                    disabled={isGenerating}
                    className="text-left text-sm p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              size="lg"
              className="w-full"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Tone, Length, and Depth */}
      {step === 2 && (
        <Card className="border-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Customize your content</CardTitle>
            <CardDescription>
              Help us understand the style and depth you're looking for.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tone Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">What tone should we use?</Label>
              <RadioGroup value={tone} onValueChange={(value) => setTone(value as DetailedPromptData['tone'])}>
                <div className="grid grid-cols-2 gap-3">
                  <Label htmlFor="tone-professional" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      tone === 'professional' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="professional" id="tone-professional" />
                      <div>
                        <div className="font-semibold">Professional</div>
                        <div className="text-xs text-muted-foreground">Formal, business-appropriate</div>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="tone-casual" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      tone === 'casual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="casual" id="tone-casual" />
                      <div>
                        <div className="font-semibold">Casual</div>
                        <div className="text-xs text-muted-foreground">Friendly, conversational</div>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="tone-academic" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      tone === 'academic' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="academic" id="tone-academic" />
                      <div>
                        <div className="font-semibold">Academic</div>
                        <div className="text-xs text-muted-foreground">Scholarly, research-based</div>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="tone-persuasive" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      tone === 'persuasive' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="persuasive" id="tone-persuasive" />
                      <div>
                        <div className="font-semibold">Persuasive</div>
                        <div className="text-xs text-muted-foreground">Convincing, action-oriented</div>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="tone-inspirational" className="cursor-pointer col-span-2">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      tone === 'inspirational' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="inspirational" id="tone-inspirational" />
                      <div>
                        <div className="font-semibold">Inspirational</div>
                        <div className="text-xs text-muted-foreground">Motivating, uplifting</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Length Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">How much content do you need?</Label>
              <Select value={length} onValueChange={(value) => setLength(value as DetailedPromptData['length'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short - Quick overview, key highlights only</SelectItem>
                  <SelectItem value="medium">Medium - Balanced depth with main points covered</SelectItem>
                  <SelectItem value="long">Long - Detailed exploration with examples</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive - In-depth analysis with full coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scientific Depth */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">What level of technical depth?</Label>
              <Select value={scientificDepth} onValueChange={(value) => setScientificDepth(value as DetailedPromptData['scientificDepth'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic - Simple explanations, no jargon</SelectItem>
                  <SelectItem value="intermediate">Intermediate - Some technical terms, context provided</SelectItem>
                  <SelectItem value="advanced">Advanced - Technical depth, assumes prior knowledge</SelectItem>
                  <SelectItem value="expert">Expert - Highly specialized, research-level detail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">API Namespace</Label>
              <RadioGroup value={apiNamespace} onValueChange={(value) => setApiNamespace(value as ApiNamespace)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Label htmlFor="namespace-medical" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      apiNamespace === 'medical' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="medical" id="namespace-medical" />
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-semibold">Medical</div>
                        <div className="text-xs text-muted-foreground">Evidence-governed scientific namespace</div>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="namespace-marketing" className="cursor-pointer">
                    <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 transition-colors ${
                      apiNamespace === 'marketing' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}>
                      <RadioGroupItem value="marketing" id="namespace-marketing" />
                      <Megaphone className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-semibold">Marketing</div>
                        <div className="text-xs text-muted-foreground">Promotional namespace with term controls</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="audience" className="text-base font-semibold">
                Who is your target audience?
              </Label>
              <Textarea
                id="audience"
                value={targetAudience}
                onChange={(e) => {
                  const nextAudience = e.target.value;
                  setTargetAudience(nextAudience);
                  setApiNamespace(inferNamespace(detectedType || 'infographic', prompt, nextAudience));
                }}
                placeholder="e.g., 'Healthcare professionals', 'Key Opinion Leaders', 'Medical Affairs', 'Payers'"
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                size="lg"
                className="flex-1"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review and Generate */}
      {step === 3 && (
        <Card className="border-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Review your request</CardTitle>
            <CardDescription>
              Check the details below and generate your content when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Your prompt</Label>
                <p className="text-base font-medium mt-1">{prompt}</p>
                {detectedType && (
                  <Badge variant="secondary" className="capitalize mt-2">
                    {detectedType.replace('-', ' ')}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-sm text-muted-foreground">Tone</Label>
                  <p className="text-base capitalize font-medium mt-1">{tone}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Length</Label>
                  <p className="text-base capitalize font-medium mt-1">{length}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Technical Depth</Label>
                  <p className="text-base capitalize font-medium mt-1">{scientificDepth}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">API Namespace</Label>
                  <p className="text-base capitalize font-medium mt-1">{apiNamespace}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Target Audience</Label>
                  <p className="text-base font-medium mt-1">{targetAudience}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isGenerating}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="flex-1 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
