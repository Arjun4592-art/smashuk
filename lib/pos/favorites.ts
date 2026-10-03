export interface FavoriteTab {
  id: string
  label: string
  /** true for tabs created by staff; false/undefined for built-in tabs */
  custom?: boolean
}

export type FavoriteTabId = string
export type FavoritesMap = Record<FavoriteTabId, string[]>

export const DEFAULT_FAVORITE_TABS: FavoriteTab[] = [
  { id: 'badminton-stringing', label: 'Badminton Stringing' },
  { id: 'tennis-stringing', label: 'Tennis Stringing' },
  { id: 'squash-stringing', label: 'Squash Stringing' },
  { id: 'shuttles', label: 'Shuttles' },
  { id: 'balls', label: 'Balls' },
  { id: 'grips', label: 'Grips' },
]

export const MAX_FAVORITES_PER_TAB = 50
export const MAX_CUSTOM_TABS = 10
export const MAX_TAB_LABEL_LENGTH = 24

const CUSTOM_TAB_ID_RE = /^custom-[a-z0-9]{1,40}$/

export function normalizeTabLabel(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TAB_LABEL_LENGTH)
}

export function isDefaultTabId(id: unknown): boolean {
  return DEFAULT_FAVORITE_TABS.some((t) => t.id === id)
}

export function isCustomTabId(id: unknown): id is string {
  return typeof id === 'string' && CUSTOM_TAB_ID_RE.test(id)
}

export function newCustomTabId(): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `custom-${Date.now().toString(36)}${rand}`
}

/**
 * True if `label` clashes (case-insensitively) with an existing tab.
 * Pass `excludeId` when renaming so a tab doesn't clash with itself.
 */
export function tabLabelExists(
  tabs: FavoriteTab[],
  label: string,
  excludeId?: string,
): boolean {
  const needle = label.toLowerCase()
  return tabs.some(
    (t) => t.id !== excludeId && t.label.toLowerCase() === needle,
  )
}

/**
 * Builds the full, ordered tab list: built-in tabs first, then the custom
 * tabs saved in store metadata. Invalid, duplicate or over-limit custom tabs
 * are dropped.
 */
export function sanitizeTabs(rawCustom: unknown): FavoriteTab[] {
  const tabs: FavoriteTab[] = DEFAULT_FAVORITE_TABS.map((t) => ({ ...t }))
  if (!Array.isArray(rawCustom)) return tabs
  const seenIds = new Set(tabs.map((t) => t.id))
  let customCount = 0
  for (const item of rawCustom) {
    if (customCount >= MAX_CUSTOM_TABS) break
    if (!item || typeof item !== 'object') continue
    const { id, label } = item as Record<string, unknown>
    const cleanLabel = normalizeTabLabel(label)
    if (!isCustomTabId(id) || !cleanLabel || seenIds.has(id)) continue
    if (tabLabelExists(tabs, cleanLabel)) continue
    seenIds.add(id)
    tabs.push({ id, label: cleanLabel, custom: true })
    customCount++
  }
  return tabs
}

export function customTabsOnly(tabs: FavoriteTab[]): FavoriteTab[] {
  return tabs
    .filter((t) => t.custom)
    .map((t) => ({ id: t.id, label: t.label, custom: true }))
}

export function emptyFavorites(
  tabs: FavoriteTab[] = DEFAULT_FAVORITE_TABS,
): FavoritesMap {
  const result: FavoritesMap = {}
  for (const tab of tabs) result[tab.id] = []
  return result
}

/**
 * Normalises a saved favorites map against the given tab list. Entries for
 * tabs that no longer exist (e.g. a deleted custom tab) are dropped.
 */
export function sanitizeFavorites(
  raw: unknown,
  tabs: FavoriteTab[] = DEFAULT_FAVORITE_TABS,
): FavoritesMap {
  const result = emptyFavorites(tabs)
  if (!raw || typeof raw !== 'object') return result
  for (const tab of tabs) {
    const list = (raw as Record<string, unknown>)[tab.id]
    if (!Array.isArray(list)) continue
    const seen = new Set<string>()
    for (const id of list) {
      if (typeof id === 'string' && id) seen.add(id)
    }
    result[tab.id] = Array.from(seen).slice(0, MAX_FAVORITES_PER_TAB)
  }
  return result
}
