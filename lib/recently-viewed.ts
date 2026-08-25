const STORAGE_KEY = 'recentlyViewedProductIds';
const MAX_ITEMS = 12;
function isBrowser() {
  return typeof window !== 'undefined';
}
export function getRecentlyViewedIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}
export function recordRecentlyViewed(productId: string): void {
  if (!isBrowser() || !productId) return;
  try {
    const current = getRecentlyViewedIds();
    const next = [productId, ...current.filter(id => id !== productId)].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}
export function clearRecentlyViewed(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
