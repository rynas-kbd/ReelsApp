import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { STRINGS, type ReelWithCategory } from '@reelvault/shared';
import { formatDate } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#0B0B0F',
    color: '#F4F4F5',
    padding: 32,
    fontSize: 10,
  },
  title: { fontSize: 20, marginBottom: 4, color: '#FFFFFF' },
  subtitle: { fontSize: 11, marginBottom: 20, color: '#A1A1AA' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A36',
    paddingVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A48',
    paddingVertical: 6,
  },
  cellTitle: { width: '40%', paddingRight: 6 },
  cellAuthor: { width: '20%', paddingRight: 6, color: '#A1A1AA' },
  cellCategory: { width: '20%', paddingRight: 6, color: '#A1A1AA' },
  cellViews: { width: '8%', color: '#A1A1AA' },
  cellDate: { width: '12%', color: '#71717A' },
  headerText: { color: '#D946EF', fontSize: 9 },
});

export function ReelsPdf({ reels }: { reels: ReelWithCategory[] }) {
  return (
    <Document title={`${STRINGS.app.name} — ${STRINGS.settings.export}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{STRINGS.app.name}</Text>
        <Text style={styles.subtitle}>
          {STRINGS.settings.export} — {reels.length} {STRINGS.stats.totalReels.toLowerCase()}
        </Text>

        <View style={styles.headerRow}>
          <Text style={[styles.cellTitle, styles.headerText]}>Titre</Text>
          <Text style={[styles.cellAuthor, styles.headerText]}>Compte</Text>
          <Text style={[styles.cellCategory, styles.headerText]}>Catégorie</Text>
          <Text style={[styles.cellViews, styles.headerText]}>Vues</Text>
          <Text style={[styles.cellDate, styles.headerText]}>{STRINGS.library.addedOn}</Text>
        </View>

        {reels.map((r) => (
          <View key={r.id} style={styles.row} wrap={false}>
            <Text style={styles.cellTitle}>
              {(r.title || r.caption || 'Réel sans titre').slice(0, 80)}
            </Text>
            <Text style={styles.cellAuthor}>
              {r.author_username ? `@${r.author_username}` : '—'}
            </Text>
            <Text style={styles.cellCategory}>{r.category?.name ?? '—'}</Text>
            <Text style={styles.cellViews}>{r.view_count}</Text>
            <Text style={styles.cellDate}>{formatDate(r.added_at)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
