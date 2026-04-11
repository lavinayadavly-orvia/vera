import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles } from 'lucide-react';
import type { GenerationRequest } from '@/types';
import { isBackendRuntimeEnabled, listBackendGenerations, toGenerationHistoryItem } from '@/services/backendRuntime';

interface HistoryPanelProps {
  onClose: () => void;
  onRestore: (prompt: string) => void;
}

const HISTORY_KEY = 'vera_history';
const LEGACY_HISTORY_KEY = ['done', 'anddone', 'history'].join('_');

export function HistoryPanel({ onClose, onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<GenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function loadLocalHistory() {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
        const parsed: GenerationRequest[] = raw
          ? JSON.parse(raw)
          : legacy
            ? JSON.parse(legacy)
            : [];
        if (!raw && parsed.length > 0) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed));
        }
        if (!cancelled) {
          setHistory(parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      } catch {
        if (!cancelled) {
          setHistory([]);
        }
      }
    }

    async function loadHistory() {
      try {
        if (isBackendRuntimeEnabled()) {
          const records = await listBackendGenerations(100);
          if (!cancelled) {
            setHistory(records.map(toGenerationHistoryItem));
            return;
          }
        } else {
          loadLocalHistory();
        }
      } catch {
        loadLocalHistory();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7fcfc]/82 p-4 backdrop-blur-md">
      <Card className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-[#0b6b6f]/12 bg-white/96 shadow-[0_28px_110px_rgba(8,54,58,0.12)] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-[#0b6b6f]/10 px-6 py-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#c96a22]">Archive</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0b6b6f]">Generation History</h2>
          </div>
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
                <Card key={item.id} className="rounded-[24px] border border-[#0b6b6f]/10 bg-[#fcffff] p-4 shadow-[0_8px_28px_rgba(8,54,58,0.04)] transition-colors hover:border-[#0b6b6f]/24">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className={`capitalize ${item.status === 'completed' ? '' : 'bg-[#eff8f8] text-[#0b6b6f]'}`}>
                          {item.contentType.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline" className="capitalize border-[#0b6b6f]/12 bg-white">{item.status}</Badge>
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-full text-[#0b6b6f] hover:bg-[#fff4ea] hover:text-[#c96a22]" onClick={() => { onRestore(item.prompt); onClose(); }}>
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
    const raw = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY);
    const history: GenerationRequest[] = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100))); // Keep last 100
  } catch {
    // Ignore
  }
}
