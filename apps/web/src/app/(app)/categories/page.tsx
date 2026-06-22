import { STRINGS } from '@reelvault/shared';
import { CategoryManager } from '@/components/dashboard/category-manager';

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {STRINGS.nav.categories}
      </h1>
      <CategoryManager />
    </div>
  );
}
