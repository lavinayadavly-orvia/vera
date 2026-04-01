import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AuditDashboardSummary, Market } from '@/types';
import { BarChart3, Clock3, DollarSign, Target } from 'lucide-react';

interface AuditDashboardPanelProps {
  dashboard: AuditDashboardSummary;
  currentMarket: Market;
}

function formatMarketLabel(market: Market) {
  if (market === 'dubai') return 'Dubai / UAE';
  if (market === 'us') return 'United States';
  if (market === 'uk') return 'United Kingdom';
  return market.charAt(0).toUpperCase() + market.slice(1);
}

function formatCost(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AuditDashboardPanel({ dashboard, currentMarket }: AuditDashboardPanelProps) {
  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Audit Dashboard</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Operational view of approval speed and asset cost against the target of compressing approval from 6 weeks to 6 days.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
            {dashboard.goalLabel}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="w-4 h-4 text-primary" />
              Cycle Estimate
            </div>
            <p className="text-2xl font-semibold">{dashboard.currentAsset.estimatedCycleDays}d</p>
            <p className="text-xs text-muted-foreground">{formatMarketLabel(dashboard.currentAsset.market)} · {dashboard.currentAsset.namespace}</p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-primary" />
              Asset Cost
            </div>
            <p className="text-2xl font-semibold">{formatCost(dashboard.currentAsset.estimatedCost)}</p>
            <p className="text-xs text-muted-foreground">Estimated production and review cost</p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4 text-primary" />
              Approval Progress
            </div>
            <p className="text-2xl font-semibold">{dashboard.currentAsset.approvalProgress}%</p>
            <p className="text-xs text-muted-foreground">Reusable block approval coverage</p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="w-4 h-4 text-primary" />
              Snapshots
            </div>
            <p className="text-2xl font-semibold">{dashboard.snapshotCount}</p>
            <p className="text-xs text-muted-foreground">Immutable audit states captured</p>
          </div>
        </div>

        <div className="rounded-xl border bg-background/50 p-4 space-y-3">
          <p className="text-sm font-medium">Market Benchmarks</p>
          <div className="grid gap-3">
            {dashboard.marketBenchmarks.map((metric) => (
              <div
                key={metric.market}
                className={cn(
                  'rounded-lg border p-3',
                  metric.market === currentMarket ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-sm">{formatMarketLabel(metric.market)}</span>
                  <span className="text-xs text-muted-foreground">
                    {metric.averageApprovalDays}d avg · target {metric.targetDays}d
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assets tracked: {metric.assetsTracked} · Estimated cost: {formatCost(metric.estimatedAssetCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bottleneck: {metric.bottleneck}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
