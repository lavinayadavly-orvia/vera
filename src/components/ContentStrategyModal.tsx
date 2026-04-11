import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContentStrategyMatrix } from '@/components/ContentStrategyMatrix';
import type { ContentStrategySelection } from '@/types';

const CONTENT_STRATEGY_URL = '/content-strategy-matrix.html';

interface ContentStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: ContentStrategySelection | null;
}

export function ContentStrategyModal({ open, onOpenChange, context }: ContentStrategyModalProps) {
  const [showStandalone, setShowStandalone] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="h-[92vh] max-w-7xl gap-0 overflow-hidden border border-[#0b6b6f]/12 bg-white/96 p-0 shadow-[0_28px_120px_rgba(8,54,58,0.12)] backdrop-blur-xl">
        <div className="border-b border-[#0b6b6f]/10 px-6 py-5 pr-14">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 text-left">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#c96a22]">Studio guidance</p>
                <DialogTitle className="text-3xl font-semibold tracking-[-0.04em] text-[#0b6b6f]">Content Strategy</DialogTitle>
                <DialogDescription>
                  Audience, format, market, evidence, and MLR guidance in one native Vera view.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-[#0b6b6f] hover:bg-[#fff4ea] hover:text-[#c96a22]" onClick={() => setShowStandalone((current) => !current)}>
                  {showStandalone ? 'Use Native View' : 'Use Standalone View'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#0b6b6f]/12 bg-[#fbffff] text-[#0b6b6f] hover:bg-[#eff8f8]"
                  onClick={() => window.open(CONTENT_STRATEGY_URL, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Standalone
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="h-[calc(92vh-109px)] overflow-y-auto bg-[#fcffff]">
          {showStandalone ? (
            <iframe
              key={open ? 'open' : 'closed'}
              title="Content Strategy & MLR Matrix"
              src={CONTENT_STRATEGY_URL}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <ContentStrategyMatrix context={context} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
