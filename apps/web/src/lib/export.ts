import type { ReelWithCategory } from '@reelvault/shared';
import { formatDate } from '@/lib/utils';

/** Échappe une valeur pour CSV (guillemets + virgules + retours ligne). */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Génère le contenu CSV de la bibliothèque. */
export function reelsToCsv(reels: ReelWithCategory[]): string {
  const header = [
    'Titre',
    'Compte',
    'Catégorie',
    'Vues',
    'Ajouté le',
    'Lien',
  ];
  const rows = reels.map((r) =>
    [
      csvCell(r.title || r.caption || ''),
      csvCell(r.author_username ? `@${r.author_username}` : ''),
      csvCell(r.category?.name ?? ''),
      csvCell(r.view_count),
      csvCell(formatDate(r.added_at)),
      csvCell(r.ig_url),
    ].join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

/** Déclenche le téléchargement d'un blob côté navigateur. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
