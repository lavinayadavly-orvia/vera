import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles } from 'lucide-react';
import type { GenerationRequest } from '@/types';

interface HistoryPanelProps {
  onClose: () => void;
  onRestore: (prompt: string) => void;
}

const HISTORY_KEY = 'doneanddone_history';

export function HistoryPanel({ onClose, onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<GenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed: GenerationRequest[] = raw ? JSON.parse(raw) : [];
      setHistory(parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Generation History</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No generation history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your created content will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id} className="p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                          {item.contentType.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{item.status}</Badge>
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { onRestore(item.prompt); onClose(); }}>
                      Reuse
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Helper to save to local history
export function saveToHistory(item: GenerationRequest) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: GenerationRequest[] = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100))); // Keep last 100
  } catch {
    // Ignore
  }
}
