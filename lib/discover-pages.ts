import 'server-only'
import fs from 'fs'
import path from 'path'


export interface DiscoveredPage {
  /** Stable key used to store/read this page's SEO data. */
  key: string
  /** Human-readable label for the dashboard list. */
  label: string
  /** Public URL path. */
  path: string
}

const WEBSITE_ROOT = path.join(process.cwd(), 'app', '(website)')

// Top-level segments to skip entirely (account/functional pages, not content).
const EXCLUDED_TOP_LEVEL = new Set([
  'cart',
  'checkout',
  'orders',
  'profile',
  'wishlist',
  'track',
])

const LEGACY_KEYS: Record<string, string> = {
  '': 'home',
  shop: 'shop',
  collections: 'collections',
  contact: 'contact',
  'local-store': 'local-store',
}

function toLabel(segments: string[]): string {
  if (segments.length === 0) return 'Home Page'
  return segments
    .map((seg) =>
      seg
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    )
    .join(' › ')
}

function keyFor(segments: string[]): string {
  const joined = segments.join('/')
  if (joined in LEGACY_KEYS) return LEGACY_KEYS[joined]
  return segments.join(':')
}

function walk(dir: string, segments: string[], out: DiscoveredPage[]) {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  const hasPageFile = entries.some(
    (e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name),
  )
  if (hasPageFile) {
    out.push({
      key: keyFor(segments),
      label: toLabel(segments),
      path: segments.length ? `/${segments.join('/')}` : '/',
    })
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    
    if (name.startsWith('[')) continue
    if (segments.length === 0 && EXCLUDED_TOP_LEVEL.has(name)) continue
    const nextSegments = name.startsWith('(')
      ? segments // route group — doesn't add a URL segment
      : [...segments, name]
    walk(path.join(dir, name), nextSegments, out)
  }
}

let cache: { at: number; pages: DiscoveredPage[] } | null = null
const CACHE_MS = 60 * 1000 // short cache; this only runs in the admin dashboard

export function discoverStaticPages(): DiscoveredPage[] {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.pages
  const pages: DiscoveredPage[] = []
  try {
    walk(WEBSITE_ROOT, [], pages)
  } catch (err) {
    console.error('[discover-pages] scan failed, falling back to core pages:', err)
    return [
      { key: 'home', label: 'Home Page', path: '/' },
      { key: 'shop', label: 'Shop Page', path: '/shop' },
      { key: 'collections', label: 'Collections Page', path: '/collections' },
      { key: 'contact', label: 'Contact Page', path: '/contact' },
      { key: 'local-store', label: 'Local Store Page', path: '/local-store' },
    ]
  }
  cache = { at: Date.now(), pages }
  return pages
}

export function invalidateDiscoveredPagesCache() {
  cache = null
}

export function isDiscoveredPageKey(key: string): boolean {
  return discoverStaticPages().some((p) => p.key === key)
}