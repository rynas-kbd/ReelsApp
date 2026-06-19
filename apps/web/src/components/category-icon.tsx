import {
  Dumbbell,
  Utensils,
  Shirt,
  Laugh,
  TrendingUp,
  Plane,
  Gamepad2,
  Palette,
  Folder,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  utensils: Utensils,
  shirt: Shirt,
  laugh: Laugh,
  'trending-up': TrendingUp,
  plane: Plane,
  'gamepad-2': Gamepad2,
  palette: Palette,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const Icon = (icon && ICONS[icon]) || Folder;
  return <Icon className={className} />;
}
