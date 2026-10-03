export const FAVORITE_TABS = [
  { id: 'badminton-stringing', label: 'Badminton Stringing' },
  { id: 'tennis-stringing', label: 'Tennis Stringing' },
  { id: 'squash-stringing', label: 'Squash Stringing' },
  { id: 'shuttles', label: 'Shuttles' },
  { id: 'balls', label: 'Balls' },
  { id: 'grips', label: 'Grips' },
] as const

export type FavoriteTabId = (typeof FAVORITE_TABS)[number]['id']
export type FavoritesMap = Record<FavoriteTabId, string[]>

export const MAX_FAVORITES_PER_TAB = 50

export function isFavoriteTabId(value: unknown): value is FavoriteTabId {
  return FAVORITE_TABS.some((t) => t.id === value)
}

export function emptyFavorites(): FavoritesMap {
  const result = {} as FavoritesMap
  for (const tab of FAVORITE_TABS) result[tab.id] = []
  return result
}

export function sanitizeFavorites(raw: unknown): FavoritesMap {
  const result = emptyFavorites()
  if (!raw || typeof raw !== 'object') return result
  for (const tab of FAVORITE_TABS) {
    const list = (raw as Record<string, unknown>)[tab.id]
    if (!Array.isArray(list)) continue
    const seen = new Set<string>()
    for (const id of list) {
      if (typeof id === 'string' && id && !seen.has(id)) seen.add(id)
    }
    result[tab.id] = Array.from(seen).slice(0, MAX_FAVORITES_PER_TAB)
  }
  return result
}
