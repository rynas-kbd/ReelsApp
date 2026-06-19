import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { STRINGS } from '@reelvault/shared';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${STRINGS.app.name} — ${STRINGS.app.tagline}`,
  description: STRINGS.app.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
