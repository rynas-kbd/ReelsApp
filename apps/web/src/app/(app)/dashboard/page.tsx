import { redirect } from 'next/navigation';

// L'ancien tableau de bord est désormais éclaté en /stats et /categories.
export default function DashboardPage() {
  redirect('/stats');
}
