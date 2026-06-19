'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Eye, Film, Users } from 'lucide-react';
import { STRINGS, type LibraryStats } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { fetchLibraryStats } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { formatDate, formatNumber } from '@/lib/utils';

const ACCENT = '#7C3AED';
const ACCENT_TO = '#D946EF';

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Film;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
          <Icon className="h-5 w-5 text-accent" />
        </span>
        <div>
          <p className="text-2xl font-bold text-text">{value}</p>
          <p className="text-xs text-text-secondary">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: '#1F1F29',
  border: '1px solid #2A2A36',
  borderRadius: 12,
  color: '#F4F4F5',
  fontSize: 12,
};

export function StatsView() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setStats(await fetchLibraryStats(supabase));
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalReels === 0) {
    return <EmptyState icon={BarChart3} title={STRINGS.stats.title} subtitle={STRINGS.stats.noData} />;
  }

  const totalAuthors = stats.topAuthors.length;
  const totalViews = stats.mostViewed.reduce((a, r) => a + (r.view_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Cartes synthèse */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Film} label={STRINGS.stats.totalReels} value={formatNumber(stats.totalReels)} />
        <StatCard
          icon={BarChart3}
          label={STRINGS.stats.byCategory}
          value={formatNumber(stats.byCategory.length)}
        />
        <StatCard icon={Users} label={STRINGS.stats.topAuthors} value={formatNumber(totalAuthors)} />
        <StatCard icon={Eye} label={STRINGS.library.views} value={formatNumber(totalViews)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle>{STRINGS.stats.byCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byCategory.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">{STRINGS.stats.noData}</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {stats.byCategory.map((c) => (
                        <Cell key={c.categoryId} fill={c.color || ACCENT} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="w-full space-y-1.5 sm:w-44">
                  {stats.byCategory.map((c) => (
                    <li key={c.categoryId} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color || ACCENT }}
                      />
                      <span className="flex-1 truncate text-text-secondary">{c.name}</span>
                      <span className="text-text-muted">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart top comptes */}
        <Card>
          <CardHeader>
            <CardTitle>{STRINGS.stats.topAuthors}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topAuthors.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">{STRINGS.stats.noData}</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={stats.topAuthors.map((a) => ({
                    name: `@${a.author_username}`,
                    count: a.count,
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A36" horizontal={false} />
                  <XAxis type="number" stroke="#71717A" fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#71717A"
                    fontSize={12}
                    width={110}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1F1F29' }} />
                  <Bar dataKey="count" fill={ACCENT_TO} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line chart évolution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{STRINGS.stats.overTime}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.overTime.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">{STRINGS.stats.noData}</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.overTime} margin={{ left: 0, right: 16 }}>
                  <defs>
                    <linearGradient id="lineAccent" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={ACCENT} />
                      <stop offset="100%" stopColor={ACCENT_TO} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A36" />
                  <XAxis dataKey="date" stroke="#71717A" fontSize={12} />
                  <YAxis stroke="#71717A" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="url(#lineAccent)"
                    strokeWidth={2.5}
                    dot={{ fill: ACCENT, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Les plus consultés */}
      <Card>
        <CardHeader>
          <CardTitle>{STRINGS.stats.mostViewed}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mostViewed.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{STRINGS.stats.noData}</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {stats.mostViewed.slice(0, 8).map((reel, i) => (
                <li key={reel.id} className="flex items-center gap-3 py-3">
                  <span className="w-5 text-sm font-semibold text-text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {reel.title || reel.caption || 'Réel sans titre'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {reel.author_username ? `@${reel.author_username} · ` : ''}
                      {STRINGS.library.addedOn} {formatDate(reel.added_at)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-text-secondary">
                    <Eye className="h-4 w-4" />
                    {formatNumber(reel.view_count)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
