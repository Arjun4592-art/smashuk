import 'server-only'
import fs from 'fs'
import path from 'path'

/**
 * Auto-discovers every static route under app/(website) so it can be
 * managed from the SEO dashboard without any manual registration step.
 *
 * Add a new page anywhere under app/(website)/**\/page.tsx and it will
 * show up in the SEO dashboard's "Pages" tab on the next load — no need
 * to touch this file, lib/seo-config.ts, or the dashboard page.
 *
 * Excluded automatically:
 *  - dynamic segments, e.g. [slug], [handle], [id], [...rest]
 *    (those are per-item pages — products, blog posts, collections —
 *    and are already handled by their own dedicated tabs)
 *  - functional/account routes that don't need SEO (cart, checkout, etc.)
 */

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
])

// Legacy keys that must stay exactly as-is for backwards compatibility with
// SEO data already saved against them (before auto-discovery existed).
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
    // Skip dynamic segments ([slug], [handle], [...rest]) and private/group
    // folders that aren't part of the URL (route groups like "(shop)").
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