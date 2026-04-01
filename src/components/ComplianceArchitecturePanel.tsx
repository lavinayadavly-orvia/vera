import { Card } from '@/components/ui/card';
import type { ComplianceArchitectureSummary, Market } from '@/types';
import { DatabaseZap, FileLock2, History, Shield, ShieldAlert, ShieldCheck, Vault } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceArchitecturePanelProps {
  summary: ComplianceArchitectureSummary;
  market?: Market;
}

function getStatusClasses(status: ComplianceArchitectureSummary['rulesEngine']['status']) {
  if (status === 'pass') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
  return 'border-red-500/30 bg-red-500/10 text-red-700';
}

function formatMarketLabel(market?: Market) {
  if (!market) return 'Global';
  if (market === 'dubai') return 'Dubai / UAE';
  if (market === 'us') return 'United States';
  if (market === 'uk') return 'United Kingdom';
  return market.charAt(0).toUpperCase() + market.slice(1);
}

export function ComplianceArchitecturePanel({ summary, market }: ComplianceArchitecturePanelProps) {
  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Compliance Architecture</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Namespace separation, market rules, snapshots, privacy scrub, and Veeva synchronization scaffolding for {formatMarketLabel(market)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
              {summary.namespace}
            </span>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', getStatusClasses(summary.rulesEngine.status))}>
              {summary.rulesEngine.status}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
              {summary.regulatoryContentType}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4 text-primary" />
              Rules Engine
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.rulesEngine.version} · {summary.rulesEngine.findings.length} finding{summary.rulesEngine.findings.length === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-muted-foreground">
              Constraints: {summary.rulesEngine.constrainedBy.slice(0, 2).join(' · ') || 'No market overrides'}
            </p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DatabaseZap className="w-4 h-4 text-primary" />
              Provider & ZDR
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.provider.provider} · {summary.provider.model}
            </p>
            <p className="text-xs text-muted-foreground">
              Zero data retention: {summary.provider.zeroDataRetention}
            </p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileLock2 className="w-4 h-4 text-primary" />
              Content Hierarchy
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.hierarchy.parent.label} {'->'} {summary.hierarchy.child.label}
            </p>
            <p className="text-xs text-muted-foreground">
              Brand lock: {summary.hierarchy.brandLock.tokensLocked ? 'Enabled' : 'Disabled'} · {summary.hierarchy.brandLock.lockedTokenGroups.join(', ')}
            </p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Vault className="w-4 h-4 text-primary" />
              Veeva Vault
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.veeva.connection.configured ? 'Configured' : 'Not configured'}
            </p>
            <p className="text-xs text-muted-foreground">
              Sync: {summary.veeva.assetLink.syncCapabilities.join(' · ')}
            </p>
          </div>

          <div className="rounded-xl border bg-background/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Security & Roles
            </div>
            <p className="text-sm text-muted-foreground">
              SSO required: {summary.security.ssoRequired ? 'Yes' : 'No'} · {summary.security.approvalModel}
            </p>
            <p className="text-xs text-muted-foreground">
              Workflow isolation: {summary.security.workflowIsolation}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border bg-background/50 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Rules Findings</p>
              <div className="grid gap-3 mt-3">
                {summary.rulesEngine.findings.length > 0 ? (
                  summary.rulesEngine.findings.map((finding) => (
                    <div key={finding.ruleId} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {finding.severity === 'block' ? (
                          <ShieldAlert className="w-4 h-4 text-red-600" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                        )}
                        <span className="font-medium text-sm">{finding.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.message}</p>
                      {finding.requiredDisclaimers && finding.requiredDisclaimers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Required disclaimers: {finding.requiredDisclaimers.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active rules findings for this output.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">PII / PHI Scrubber</p>
              <p className="text-sm text-muted-foreground mt-2">
                Status: {summary.scrubReport.status} · {summary.scrubReport.matchCount} replacement{summary.scrubReport.matchCount === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.scrubReport.notes.join(' · ')}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-background/50 p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Audit Snapshots</p>
              </div>
              <div className="grid gap-3 mt-3">
                {summary.snapshots.map((snapshot) => (
                  <div key={snapshot.snapshotId} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{snapshot.snapshotId}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {snapshot.createdAt} · {snapshot.llmModel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {snapshot.namespace} · {snapshot.regulatoryContentType}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Veeva Sync Target</p>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.veeva.assetLink.objectType} · {summary.veeva.assetLink.assetStatus}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Metadata: {Object.entries(summary.veeva.assetLink.metadataFields).map(([key, value]) => `${key}=${value}`).join(' · ')}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Translation & Role Guardrails</p>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.security.translationPolicy}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Roles: {summary.security.roles.map((role) => `${role.role}${role.canApprove ? ' (approve)' : ''}`).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
