import { cn } from '@/lib/utils';

interface VeraLogoMarkProps {
  className?: string;
  transparent?: boolean;
}

export function VeraLogoMark({ className, transparent = false }: VeraLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Vera"
      className={cn('block', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Vera</title>
      <desc>Vera intelligence platform logo mark</desc>
      {!transparent && <rect width="64" height="64" rx="16" fill="#F0FAFA" stroke="#CBD5D4" strokeWidth="0.5" />}
      <line x1="19" y1="13" x2="32" y2="48" stroke="#0D9488" strokeWidth="6.5" strokeLinecap="round" />
      <line x1="45" y1="13" x2="32" y2="48" stroke="#0D9488" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="32" cy="49" r="4.5" fill="#0D9488" />
    </svg>
  );
}
