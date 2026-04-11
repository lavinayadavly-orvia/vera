import { Button } from '@/components/ui/button';
import { History, LibraryBig } from 'lucide-react';
import { VeraLogoMark } from '@/components/VeraLogo';

interface HeaderProps {
  onHistoryClick: () => void;
  onLogoClick?: () => void;
  onContentStrategyClick?: () => void;
}

export function Header({ onHistoryClick, onLogoClick, onContentStrategyClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#0b6b6f]/10 bg-white/88 shadow-[0_12px_36px_rgba(8,54,58,0.05)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/82">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={onLogoClick} className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <VeraLogoMark className="h-11 w-11 rounded-2xl shadow-sm" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#6e8688]">Content Studio</p>
              <h1 className="text-[1.8rem] font-semibold tracking-[-0.05em] text-[#0b6b6f]">Vera</h1>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onContentStrategyClick} className="rounded-full border-[#0b6b6f]/16 bg-[#f8ffff] px-4 text-[#0b6b6f] hover:bg-[#eef9f9]">
              <LibraryBig className="w-4 h-4 mr-2" />
              Content Strategy
            </Button>
            <Button variant="ghost" size="sm" onClick={onHistoryClick} className="rounded-full px-4 text-[#3e5556] hover:bg-[#fff4ea] hover:text-[#c96a22]">
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
