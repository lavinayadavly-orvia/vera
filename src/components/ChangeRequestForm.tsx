import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ChangeRequestFormProps {
  onSubmit: (changeRequest: ChangeRequest) => void;
  onCancel: () => void;
  isRegenerating: boolean;
}

export interface ChangeRequest {
  changeDescription: string;
  specificAreas: string[];
  keepExisting: string[];
}

const SPECIFIC_AREAS = [
  'Tone and style',
  'Content depth',
  'Visual design',
  'Data and statistics',
  'Structure and flow',
  'Target audience focus',
  'Length and detail',
  'Examples and case studies'
];

const KEEP_EXISTING = [
  'Overall structure',
  'Color palette',
  'Core message',
  'Data points',
  'Visual style',
  'Length'
];

export function ChangeRequestForm({ onSubmit, onCancel, isRegenerating }: ChangeRequestFormProps) {
  const [changeDescription, setChangeDescription] = useState('');
  const [specificAreas, setSpecificAreas] = useState<string[]>([]);
  const [keepExisting, setKeepExisting] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!changeDescription.trim()) {
      return;
    }

    onSubmit({
      changeDescription: changeDescription.trim(),
      specificAreas,
      keepExisting
    });
  };

  const toggleArea = (area: string) => {
    setSpecificAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const toggleKeep = (item: string) => {
    setKeepExisting(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 shadow-xl animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Request Changes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Describe what you'd like to change and we'll regenerate
            </p>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={onCancel}
            disabled={isRegenerating}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main change description */}
        <div className="space-y-2">
          <Label htmlFor="changes">What would you like to change?</Label>
          <Textarea
            id="changes"
            placeholder="E.g., Make it more professional, add more data about India, use warmer colors, shorten the content..."
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isRegenerating}
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what you want different. The more detail, the better the result.
          </p>
        </div>

        {/* Specific areas to focus on */}
        <div className="space-y-3">
          <Label>Focus these areas for changes (optional)</Label>
          <div className="grid grid-cols-2 gap-3">
            {SPECIFIC_AREAS.map(area => (
              <div key={area} className="flex items-center space-x-2">
                <Checkbox
                  id={`area-${area}`}
                  checked={specificAreas.includes(area)}
                  onCheckedChange={() => toggleArea(area)}
                  disabled={isRegenerating}
                />
                <label
                  htmlFor={`area-${area}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {area}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* What to keep */}
        <div className="space-y-3">
          <Label>Keep these unchanged (optional)</Label>
          <div className="grid grid-cols-2 gap-3">
            {KEEP_EXISTING.map(item => (
              <div key={item} className="flex items-center space-x-2">
                <Checkbox
                  id={`keep-${item}`}
                  checked={keepExisting.includes(item)}
                  onCheckedChange={() => toggleKeep(item)}
                  disabled={isRegenerating}
                />
                <label
                  htmlFor={`keep-${item}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={!changeDescription.trim() || isRegenerating}
          >
            {isRegenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Regenerate with Changes
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          💡 Tip: You can request changes multiple times until you're satisfied with the result
        </p>
      </form>
    </Card>
  );
}
