import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import type { ContentType } from '@/types';

interface PromptInputProps {
  onGenerate: (prompt: string, contentType: ContentType) => Promise<void>;
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

export function PromptInput({ onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [detectedType, setDetectedType] = useState<ContentType | null>(null);

  const detectContentType = (text: string): ContentType => {
    const lowerText = text.toLowerCase();
    
    for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type as ContentType;
      }
    }
    
    // Default to infographic if no specific type detected
    return 'infographic';
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (value.trim()) {
      const type = detectContentType(value);
      setDetectedType(type);
    } else {
      setDetectedType(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    const type = detectedType || 'infographic';
    await onGenerate(prompt, type);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  const examples = [
    'Create a short video about World Stroke Day with a red and yellow color palette',
    'Design a LinkedIn carousel on the benefits of digital health records',
    'Make an infographic about sustainable energy sources',
    'Generate a presentation on AI trends in 2025'
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create... e.g., 'Create an HEOR Value Dossier summary slide for a new biosimilar'"
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

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          size="lg"
          className="w-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
    </div>
  );
}
