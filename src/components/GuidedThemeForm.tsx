import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Mic, FileText, Video, Image as ImageIcon } from 'lucide-react';
import type { ContentType } from '@/types';
import { generatePromptsFromTheme } from '@/services/generator';
import { useToast } from '@/hooks/use-toast';

export interface DetailedPromptData {
  prompt: string;
  contentType: ContentType;
  tone: 'professional' | 'casual' | 'academic' | 'persuasive' | 'inspirational';
  length: 'short' | 'medium' | 'long' | 'comprehensive';
  scientificDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  targetAudience: string;
}

interface GuidedThemeFormProps {
  onGenerate: (data: DetailedPromptData) => Promise<void>;
  isGenerating: boolean;
}

export function GuidedThemeForm({ onGenerate, isGenerating }: GuidedThemeFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [theme, setTheme] = useState('');
  
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [contentType, setContentType] = useState<ContentType>('infographic');
  const [extent, setExtent] = useState<'academic' | 'scientific' | 'general'>('scientific');
  const [audience, setAudience] = useState<'hcp' | 'general' | 'custom'>('general');
  const [customAudience, setCustomAudience] = useState('');

  const handleGeneratePrompts = async () => {
    if (!theme.trim()) return;
    try {
      setIsGeneratingPrompts(true);
      const prompts = await generatePromptsFromTheme(theme);
      setSuggestedPrompts(prompts);
      setStep(2);
    } catch (error: any) {
      console.error("Failed to generate prompts:", error);
      toast({
        title: "Couldn't generate angles",
        description: `Error details: ${error?.message || error?.toString() || JSON.stringify(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedPrompt || isGenerating) return;

    // Map the selected "extent" to our internal tone/depth structures
    let tone: DetailedPromptData['tone'] = 'professional';
    let depth: DetailedPromptData['scientificDepth'] = 'intermediate';

    if (extent === 'academic') {
      tone = 'academic';
      depth = 'expert';
    } else if (extent === 'scientific') {
      tone = 'professional';
      depth = 'advanced';
    } else if (extent === 'general') {
      tone = 'casual';
      depth = 'basic';
    }

    const targetAudience = audience === 'custom' ? customAudience : (audience === 'hcp' ? 'Healthcare Professionals (HCPs)' : 'General Public');

    const data: DetailedPromptData = {
      prompt: selectedPrompt,
      contentType,
      tone,
      length: 'long', // Podcasts and whitepapers default to long
      scientificDepth: depth,
      targetAudience
    };

    await onGenerate(data);
  };

  const formats = [
    { value: 'infographic', label: 'Infographic', icon: ImageIcon, desc: 'Visual summaries' },
    { value: 'video', label: 'Video', icon: Video, desc: 'Motion graphics' },
    { value: 'podcast', label: 'Podcast', icon: Mic, desc: 'Audio scripts' },
    { value: 'white-paper', label: 'White Paper', icon: FileText, desc: 'Comprehensive reports' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
              step >= num ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'
            }`}>
              {num}
            </div>
            {num < 3 && <div className={`h-0.5 w-16 transition-colors ${step > num ? 'bg-primary' : 'bg-muted-foreground'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Input Theme */}
      {step === 1 && (
        <Card className="border-2 animate-fade-in shadow-md">
          <CardHeader>
            <CardTitle>What is your underlying theme?</CardTitle>
            <CardDescription>
              Enter a broad topic or theme (e.g., "Obesity in female under 35y in Korea"). Our AI will craft highly-targeted angles for you to choose from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., 'Obesity in female under 35y in Korea'"
              className="min-h-[100px] text-lg resize-none bg-card focus:border-primary transition-all p-4"
              disabled={isGeneratingPrompts}
            />
            <Button
              onClick={handleGeneratePrompts}
              disabled={theme.trim().length < 5 || isGeneratingPrompts}
              size="lg"
              className="w-full mt-4"
            >
              {isGeneratingPrompts ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gathering Insights...</>
              ) : (
                <>Generate Angles <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Choose your Prompt */}
      {step === 2 && (
        <Card className="border-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Choose your Angle</CardTitle>
            <CardDescription>
              Based on "{theme}", select the approach that best fits your goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedPrompt} onValueChange={setSelectedPrompt} className="grid grid-cols-1 gap-4">
              {suggestedPrompts.map((p, idx) => (
                <Label
                  key={idx}
                  htmlFor={`prompt-${idx}`}
                  className={`cursor-pointer border-2 rounded-xl p-5 hover:border-primary/50 transition-all ${
                    selectedPrompt === p ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={p} id={`prompt-${idx}`} className="mt-1" />
                    <span className="text-base font-medium leading-relaxed">{p}</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
            
            <div className="flex gap-3 pt-6">
              <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!selectedPrompt} size="lg" className="flex-1">
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Refine formats */}
      {step === 3 && (
        <Card className="border-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Refine the Details</CardTitle>
            <CardDescription>Who is this for and what format do they prefer?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Format */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Format</Label>
              <RadioGroup value={contentType} onValueChange={(val) => setContentType(val as ContentType)}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formats.map(f => {
                    const Icon = f.icon;
                    return (
                      <Label key={f.value} htmlFor={`fmt-${f.value}`} className="cursor-pointer">
                        <div className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 text-center transition-all ${
                          contentType === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}>
                          <RadioGroupItem value={f.value} id={`fmt-${f.value}`} className="sr-only" />
                          <Icon className={`w-8 h-8 ${contentType === f.value ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="font-semibold">{f.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                          </div>
                        </div>
                      </Label>
                    )
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Extent */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Extent & Depth</Label>
              <RadioGroup value={extent} onValueChange={(val) => setExtent(val as any)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Label htmlFor="ext-academic" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent focus-within:ring-2 ring-primary">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="ext-academic" value="academic" />
                      <div>
                        <p className="font-semibold">Academic</p>
                        <p className="text-sm text-muted-foreground">Heavy research & expert depth</p>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="ext-scientific" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent focus-within:ring-2 ring-primary">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="ext-scientific" value="scientific" />
                      <div>
                        <p className="font-semibold">Scientific</p>
                        <p className="text-sm text-muted-foreground">Data-driven but accessible</p>
                      </div>
                    </div>
                  </Label>
                  <Label htmlFor="ext-general" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent focus-within:ring-2 ring-primary">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="ext-general" value="general" />
                      <div>
                        <p className="font-semibold">General Awareness</p>
                        <p className="text-sm text-muted-foreground">Easy to understand for the public</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Audience */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Target Audience</Label>
              <RadioGroup value={audience} onValueChange={(val) => setAudience(val as any)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Label htmlFor="aud-hcp" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="aud-hcp" value="hcp" />
                      <span className="font-semibold">Healthcare Professionals (HCPs)</span>
                    </div>
                  </Label>
                  <Label htmlFor="aud-gen" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="aud-gen" value="general" />
                      <span className="font-semibold">General Population</span>
                    </div>
                  </Label>
                  <Label htmlFor="aud-custom" className="cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id="aud-custom" value="custom" />
                      <span className="font-semibold">Custom...</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              {audience === 'custom' && (
                <div className="mt-4 animate-fade-in pl-2">
                  <Textarea
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    placeholder="Describe your specific target audience..."
                    className="mt-2 text-base resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1" disabled={isGenerating}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handleGenerateContent} 
                className="flex-1 text-lg py-6" 
                size="lg"
                disabled={isGenerating || (audience === 'custom' && !customAudience.trim())}
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> Generate Content</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
