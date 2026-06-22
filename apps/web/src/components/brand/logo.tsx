import { Clapperboard } from 'lucide-react';
import { STRINGS } from '@reelvault/shared';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  showName = true,
  size = 'md',
}: {
  className?: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const icon = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const text = size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-gradient-accent shadow-glow',
          box,
        )}
      >
        <Clapperboard className={cn('text-white', icon)} />
      </span>
      {showName && (
        <span className={cn('font-display font-bold tracking-tight text-text', text)}>
          {STRINGS.app.name}
        </span>
      )}
    </span>
  );
}
