import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { analyticsService } from '@/services/analytics';

interface FeedbackCardProps {
  contentType: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackCard({ contentType, onFeedbackSubmitted }: FeedbackCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isHelpful === null) return;

    setIsSubmitting(true);
    try {
      await analyticsService.trackFeedbackSubmitted(contentType, isHelpful, rating ?? undefined);
      setSubmitted(true);
      setTimeout(() => {
        setIsHelpful(null);
        setRating(null);
        setComment('');
      }, 2000);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-primary">Thanks for your feedback!</p>
            <p className="text-xs text-muted-foreground">We use your input to improve Vera</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Was this helpful?</CardTitle>
        <CardDescription>Your feedback helps us improve Vera</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button variant={isHelpful === true ? 'default' : 'outline'} size="sm" onClick={() => setIsHelpful(true)} className="flex-1 gap-2">
            <ThumbsUp className="w-4 h-4" /> Yes, helpful
          </Button>
          <Button variant={isHelpful === false ? 'default' : 'outline'} size="sm" onClick={() => setIsHelpful(false)} className="flex-1 gap-2">
            <ThumbsDown className="w-4 h-4" /> Not helpful
          </Button>
        </div>

        {isHelpful === true && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs font-medium">How would you rate this?</Label>
            <RadioGroup value={rating?.toString()} onValueChange={(v) => setRating(parseInt(v))}>
              {[['1', '⭐ Good'], ['2', '⭐⭐ Very Good'], ['3', '⭐⭐⭐ Excellent']].map(([val, label]) => (
                <div key={val} className="flex items-center space-x-2">
                  <RadioGroupItem value={val} id={`rating-${val}`} />
                  <Label htmlFor={`rating-${val}`} className="font-normal text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {isHelpful !== null && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="feedback-comment" className="text-xs font-medium">
              {isHelpful ? 'What did you like?' : 'What could improve?'} (optional)
            </Label>
            <Textarea id="feedback-comment" placeholder="Share your thoughts..." value={comment} onChange={(e) => setComment(e.target.value)} className="text-sm h-20 resize-none" />
          </div>
        )}

        {isHelpful !== null && (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="sm">
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
