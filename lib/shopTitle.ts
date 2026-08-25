import { SPORTS } from '@/lib/constants';
export function getShopPageTitle({
  q,
  sport,
  badge
}: {
  q?: string;
  sport?: string;
  badge?: string;
}): string {
  if (q) return `Search: "${q}"`;
  const activeSport = SPORTS.find(s => s.slug === sport);
  if (activeSport) return `${activeSport.icon} ${activeSport.label}`;
  if (badge) return badge.charAt(0) + badge.slice(1).toLowerCase();
  return 'All Products';
}
