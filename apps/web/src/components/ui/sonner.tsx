'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'dark'}
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--surface))',
          border: '1px solid hsl(var(--border-subtle))',
          color: 'hsl(var(--text))',
          borderRadius: '16px',
        },
      }}
      {...props}
    />
  );
}
