import { Logo } from '@/components/brand/logo';
import { STRINGS } from '@reelvault/shared';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Halos d'accent en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-[120px]"
        style={{ background: 'rgba(217, 70, 239, 0.18)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" showName />
          <p className="mt-3 text-sm text-text-secondary">{STRINGS.app.tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
