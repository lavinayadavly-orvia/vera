import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ModularContentLibrary, WithdrawalMonitorSummary } from '@/types';
import { Blocks, Link2Off, RefreshCw } from 'lucide-react';

interface ContentLibraryPanelProps {
  library: ModularContentLibrary;
  withdrawalMonitor: WithdrawalMonitorSummary;
}

function getStatusClasses(status: 'approved' | 'needs-review' | 'blocked') {
  if (status === 'approved') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'blocked') return 'border-red-500/30 bg-red-500/10 text-red-700';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
}

export function ContentLibraryPanel({ library, withdrawalMonitor }: ContentLibraryPanelProps) {
  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Modular Content Library</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Approved blocks can be reused across slides, banners, social posts, and long-form documents without rebuilding them from scratch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
              {library.reusableApprovedCount} reusable approved
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
              {library.blockedCount} blocked
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border bg-background/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Blocks className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Reusable Blocks</p>
            </div>
            {library.blocks.length > 0 ? (
              <div className="grid gap-3">
                {library.blocks.map((block) => (
                  <div key={block.blockId} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{block.blockId}</span>
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-background text-muted-foreground">
                        {block.kind}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-medium', getStatusClasses(block.approvalStatus))}>
                        {block.approvalStatus.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{block.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reuse in: {block.reusableIn.join(' · ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {block.notes.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-background/80 p-4">
                <p className="text-sm font-medium">No evidence-backed reusable blocks yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This run did not capture screened source documents, so Vera is not treating any copy as reusable approved content.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-background/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Automatic Withdrawal Monitor</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium capitalize">{withdrawalMonitor.watchStatus}</p>
              <p className="text-sm text-muted-foreground mt-1">{withdrawalMonitor.action}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Webhook ready: {withdrawalMonitor.webhookReady ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="space-y-3">
              {withdrawalMonitor.watchedSources.map((source) => (
                <div key={source.sourceDocId} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2Off className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{source.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {source.sourceDocId} · {source.trigger}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-sm font-medium">Impacted reusable blocks</p>
              <p className="text-xs text-muted-foreground mt-1">
                {withdrawalMonitor.impactedBlockIds.length > 0
                  ? withdrawalMonitor.impactedBlockIds.join(' · ')
                  : 'No approved blocks are currently safe to monitor for automatic withdrawal.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
