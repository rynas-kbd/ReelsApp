'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#16161D',
          border: '1px solid #2A2A36',
          color: '#F4F4F5',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
        },
      }}
      {...props}
    />
  );
}
