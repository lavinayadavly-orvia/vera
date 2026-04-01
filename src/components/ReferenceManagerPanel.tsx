import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { ClaimNode, CoordinateMap, EvidenceDossier, ReferenceDocument } from '@/types';
import { ExternalLink, FileSearch, Link2, MapPinned } from 'lucide-react';

interface ReferenceManagerPanelProps {
  dossier: EvidenceDossier;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function getClaimStatusClasses(status: ClaimNode['status']) {
  if (status === 'mapped') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'locator-missing') return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
  if (status === 'source-needed') return 'border-red-500/30 bg-red-500/10 text-red-700';
  return 'border-muted bg-muted text-muted-foreground';
}

function getDocumentStatusClasses(status: ReferenceDocument['viewerStatus']) {
  if (status === 'available') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  if (status === 'external') return 'border-blue-500/30 bg-blue-500/10 text-blue-700';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
}

function formatCoordinateLabel(coordinateMap?: CoordinateMap) {
  if (!coordinateMap) return 'Locator unavailable';
  const page = coordinateMap.page ?? '?';
  const paragraph = coordinateMap.paragraph ?? '?';
  return `Page ${page} · Paragraph ${paragraph}`;
}

function buildHighlightStyle(coordinateMap?: CoordinateMap) {
  const x = coordinateMap?.x ?? 36;
  const y = coordinateMap?.y ?? 48;
  const width = coordinateMap?.width ?? 320;
  const height = coordinateMap?.height ?? 56;

  return {
    left: `${Math.max(2, Math.min(88, (x / PAGE_WIDTH) * 100))}%`,
    top: `${Math.max(4, Math.min(86, (y / PAGE_HEIGHT) * 100))}%`,
    width: `${Math.max(10, Math.min(70, (width / PAGE_WIDTH) * 100))}%`,
    height: `${Math.max(8, Math.min(26, (height / PAGE_HEIGHT) * 100))}%`,
  };
}

export function ReferenceManagerPanel({ dossier }: ReferenceManagerPanelProps) {
  const initialClaimId = useMemo(
    () => dossier.claims.find((claim) => claim.status === 'mapped')?.claimId || dossier.claims[0]?.claimId || '',
    [dossier.claims],
  );
  const [activeClaimId, setActiveClaimId] = useState(initialClaimId);

  useEffect(() => {
    setActiveClaimId(initialClaimId);
  }, [initialClaimId]);

  const activeClaim = dossier.claims.find((claim) => claim.claimId === activeClaimId) || dossier.claims[0];
  const activeDocument = dossier.sourceDocuments.find((document) => document.sourceDocId === activeClaim?.sourceDocId);
  const activeCoordinateMap = activeClaim?.coordinateMap || activeDocument?.coordinateMap;
  const mappedClaims = dossier.claims.filter((claim) => claim.status === 'mapped').length;

  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border shadow-md">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Reference Manager</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {dossier.hoverHint}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
              {dossier.namespace}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
              {mappedClaims}/{dossier.claims.length} mapped sentences
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
              {dossier.completeness}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-background text-muted-foreground">
              {(dossier.mappingCoverage * 100).toFixed(0)}% mapped
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <p className="font-medium">Sentence Map</p>
            </div>
            <ScrollArea className="h-[420px] rounded-xl border bg-background/50">
              <div className="space-y-3 p-3">
                {dossier.claims.map((claim) => (
                  <HoverCard key={claim.claimId} openDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveClaimId(claim.claimId)}
                        onFocus={() => setActiveClaimId(claim.claimId)}
                        onClick={() => setActiveClaimId(claim.claimId)}
                        className={cn(
                          'w-full text-left rounded-xl border p-3 transition-colors',
                          activeClaimId === claim.claimId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground">{claim.claimId}</span>
                          <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-medium', getClaimStatusClasses(claim.status))}>
                            {claim.status.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{claim.text}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {claim.sourceTitle || formatCoordinateLabel(claim.coordinateMap)}
                        </p>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent align="start" className="w-[380px] space-y-2">
                      <p className="text-sm font-medium">{claim.sourceTitle || 'No linked reference yet'}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.verbatimAnchor || 'This claim is waiting for a source anchor or locator.'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCoordinateLabel(claim.coordinateMap)}
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-primary" />
              <p className="font-medium">Source Viewer</p>
            </div>

            {activeClaim && activeDocument ? (
              <div className="rounded-xl border bg-background/60 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{activeDocument.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeDocument.domain} · {formatCoordinateLabel(activeCoordinateMap)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap', getDocumentStatusClasses(activeDocument.viewerStatus))}>
                      {activeDocument.viewerStatus.replace('-', ' ')}
                    </span>
                    {activeDocument.url && (
                      <a
                        href={activeDocument.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Open source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-[#f8f6f1] p-4">
                  <div className="relative mx-auto h-[360px] max-w-[270px] rounded-lg border bg-white shadow-sm overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(to bottom, rgba(148, 163, 184, 0.16) 0, rgba(148, 163, 184, 0.16) 1px, transparent 1px, transparent 20px)',
                      }}
                    />
                    <div
                      className="absolute rounded-md border-2 border-primary/60 bg-primary/20 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
                      style={buildHighlightStyle(activeCoordinateMap)}
                    />
                    <div className="absolute left-4 top-4 right-4 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Source PDF
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-[11px] text-slate-500">
                      Highlighted region corresponds to the linked claim anchor.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-background/80 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPinned className="w-4 h-4 text-primary" />
                    Verbatim Anchor
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activeClaim.verbatimAnchor || activeDocument.verbatimAnchor}
                  </p>
                  {activeDocument.screeningSummary && (
                    <p className="text-xs text-muted-foreground">
                      Screening: {activeDocument.screeningSummary}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">
                  No source viewer is available yet for the currently selected claim. The dossier still tracks the claim and can flag missing locators for MLR follow-up.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
