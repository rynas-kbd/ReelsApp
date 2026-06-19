import { type LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface/40 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
        <Icon className="h-7 w-7 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {subtitle && (
        <p className="mt-1.5 max-w-md text-sm text-text-secondary">{subtitle}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
