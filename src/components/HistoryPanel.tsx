import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import type { GenerationRequest } from '@/types';
import { isBackendRuntimeEnabled, listBackendGenerations, toGenerationHistoryItem } from '@/services/backendRuntime';

interface HistoryPanelProps {
  onClose: () => void;
  onReusePrompt: (prompt: string) => void;
  onOpenGeneration: (item: GenerationRequest) => void;
}

const HISTORY_KEY = 'vera_history';
const LEGACY_HISTORY_KEY = ['done', 'anddone', 'history'].join('_');

type HistoryFilter = 'all' | 'completed' | 'processing' | 'failed';

export function HistoryPanel({ onClose, onReusePrompt, onOpenGeneration }: HistoryPanelProps) {
  const [history, setHistory] = useState<GenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');

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

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return history.filter((item) => {
      if (filter !== 'all' && item.status !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item.prompt,
        item.contentType,
        item.market,
        item.audience,
        item.outputFormat,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [filter, history, query]);

  const completedCount = history.filter((item) => item.status === 'completed').length;
  const sourceBackedCount = history.filter((item) => (item.sourceCount || 0) > 0).length;

  const filterButtons: Array<{ value: HistoryFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' },
  ];

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
          <div className="mb-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e8688]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search prompts, formats, markets, or audiences"
                  className="h-11 rounded-full border-[#0b6b6f]/12 bg-[#fbffff] pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filterButtons.map((button) => (
                  <Button
                    key={button.value}
                    type="button"
                    size="sm"
                    variant={filter === button.value ? 'default' : 'outline'}
                    className={filter === button.value
                      ? 'rounded-full bg-[#0b6b6f] text-white hover:bg-[#09585b]'
                      : 'rounded-full border-[#0b6b6f]/12 bg-white text-[#0b6b6f] hover:bg-[#eff8f8]'}
                    onClick={() => setFilter(button.value)}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[20px] border border-[#0b6b6f]/10 bg-[#fcffff] px-4 py-3 shadow-none">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8688]">Stored runs</p>
                <p className="mt-2 text-2xl font-semibold text-[#0b6b6f]">{history.length}</p>
              </Card>
              <Card className="rounded-[20px] border border-[#0b6b6f]/10 bg-[#fcffff] px-4 py-3 shadow-none">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8688]">Completed</p>
                <p className="mt-2 text-2xl font-semibold text-[#0b6b6f]">{completedCount}</p>
              </Card>
              <Card className="rounded-[20px] border border-[#0b6b6f]/10 bg-[#fcffff] px-4 py-3 shadow-none">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8688]">Source-backed</p>
                <p className="mt-2 text-2xl font-semibold text-[#0b6b6f]">{sourceBackedCount}</p>
              </Card>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No generation history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your created content will appear here</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#0b6b6f]/16 bg-[#fbffff] px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#0b6b6f]">No matching generations</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a broader search or switch the status filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
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
                      <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.market && (
                          <span className="rounded-full border border-[#0b6b6f]/10 bg-white px-2.5 py-1">
                            {item.market.toUpperCase()}
                          </span>
                        )}
                        {item.outputFormat && (
                          <span className="rounded-full border border-[#0b6b6f]/10 bg-white px-2.5 py-1">
                            {item.outputFormat.toUpperCase()}
                          </span>
                        )}
                        {typeof item.sourceCount === 'number' && (
                          <span className="rounded-full border border-[#0b6b6f]/10 bg-white px-2.5 py-1">
                            {item.sourceCount} source{item.sourceCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {item.status === 'completed' && item.hasSavedOutput && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-[#0b6b6f]/14 bg-white text-[#0b6b6f] hover:bg-[#eff8f8]"
                          onClick={() => {
                            onOpenGeneration(item);
                            onClose();
                          }}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          Open output
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-[#0b6b6f] hover:bg-[#fff4ea] hover:text-[#c96a22]"
                        onClick={() => {
                          onReusePrompt(item.prompt);
                          onClose();
                        }}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reuse prompt
                      </Button>
                    </div>
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
