import { Button } from '@/components/ui/button';
import { Sparkles, History } from 'lucide-react';

interface HeaderProps {
  onHistoryClick: () => void;
  onLogoClick?: () => void;
}

export function Header({ onHistoryClick, onLogoClick }: HeaderProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={onLogoClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DoneandDone</h1>
              <p className="text-xs text-muted-foreground">Instant Content Creation</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onHistoryClick}>
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
