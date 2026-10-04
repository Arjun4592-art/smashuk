// Shared (client + server safe) types, defaults and sanitiser for the
// dashboard-managed website menu. The saved copy lives in Medusa store
// metadata under `megaMenu`; if nothing is saved, the hardcoded defaults in
// lib/mega-menu-data.ts are used, so the site never ends up with an empty menu.
import { MEGA_MENUS } from '@/lib/mega-menu-data'

export interface MegaMenuLink {
  label: string
  href: string
}
export interface MegaMenuColumn {
  heading: string
  links: MegaMenuLink[]
}
export interface MegaMenuFeatured {
  label: string
  description: string
  href: string
  cta: string
  image?: string
}
export interface MegaMenu {
  label: string
  icon: string
  href: string
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeatured
  featured2?: MegaMenuFeatured
}
export interface MegaMenuEntry extends MegaMenu {
  key: string
  visible: boolean
}
export interface NavLinkEntry {
  label: string
  href: string
  highlight?: boolean
  visible: boolean
}
export interface MegaMenuConfig {
  menus: MegaMenuEntry[]
  navLinks: NavLinkEntry[]
}

export const DEFAULT_NAV_LINKS: NavLinkEntry[] = [
  { label: 'New Arrivals', href: '/shop?badge=NEW', visible: true },
  {
    label: 'Sale 🔥',
    href: '/shop?badge=SALE',
    highlight: true,
    visible: true,
  },
  { label: 'Gift Cards', href: '/gift-cards', visible: true },
  { label: 'Blog', href: '/blog', visible: true },
]

export function getDefaultMegaMenuConfig(): MegaMenuConfig {
  return {
    menus: Object.entries(MEGA_MENUS).map(([key, menu]) => ({
      ...(JSON.parse(JSON.stringify(menu)) as MegaMenu),
      key,
      visible: true,
    })),
    navLinks: DEFAULT_NAV_LINKS.map((l) => ({ ...l })),
  }
}

const str = (v: unknown, max = 300) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

// Links must be a page on this site or a normal web / mail / phone link.
// Anything else (javascript:, data:, ...) is dropped rather than rendered.
const safeHref = (v: unknown, max = 500) => {
  const h = str(v, max)
  return /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(h) ? h : ''
}

function cleanFeatured(raw: any): MegaMenuFeatured | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const label = str(raw.label)
  const href = safeHref(raw.href)
  if (!label || !href) return undefined
  const image = safeHref(raw.image)
  return {
    label,
    description: str(raw.description, 400),
    href,
    cta: str(raw.cta, 60) || 'Shop Now',
    ...(image ? { image } : {}),
  }
}

function slugKey(raw: unknown, fallback: string) {
  const s = str(raw, 40)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Keys must not start with a digit, otherwise JS would reorder them as
  // integer keys when the menu is turned into an object.
  return s && /^[a-zA-Z]/.test(s) ? s : fallback
}

// Never trust the browser: normalise whatever arrives into a valid config.
export function sanitizeMegaMenuConfig(input: any): MegaMenuConfig {
  const used = new Set<string>()
  const menus: MegaMenuEntry[] = (
    Array.isArray(input?.menus) ? input.menus : []
  )
    .slice(0, 12)
    .map((m: any, i: number): MegaMenuEntry | null => {
      const label = str(m?.label, 40)
      if (!label) return null
      let key = slugKey(m?.key, slugKey(label, `menu${i + 1}`))
      while (used.has(key)) key = `${key}-${i + 1}`
      used.add(key)
      const columns: MegaMenuColumn[] = (
        Array.isArray(m?.columns) ? m.columns : []
      )
        .slice(0, 6)
        .map((c: any) => ({
          heading: str(c?.heading, 60),
          links: (Array.isArray(c?.links) ? c.links : [])
            .slice(0, 30)
            .map((l: any) => ({
              label: str(l?.label, 80),
              href: safeHref(l?.href),
            }))
            .filter((l: MegaMenuLink) => l.label && l.href),
        }))
        .filter((c: MegaMenuColumn) => c.heading && c.links.length > 0)
      const featured = cleanFeatured(m?.featured)
      const featured2 = cleanFeatured(m?.featured2)
      return {
        key,
        visible: m?.visible !== false,
        label,
        icon: str(m?.icon, 8),
        href: safeHref(m?.href) || '/shop',
        columns,
        ...(featured ? { featured } : {}),
        ...(featured2 ? { featured2 } : {}),
      }
    })
    .filter(Boolean) as MegaMenuEntry[]

  const navLinks: NavLinkEntry[] = (
    Array.isArray(input?.navLinks) ? input.navLinks : []
  )
    .slice(0, 10)
    .map((l: any) => ({
      label: str(l?.label, 40),
      href: safeHref(l?.href),
      highlight: l?.highlight === true,
      visible: l?.visible !== false,
    }))
    .filter((l: NavLinkEntry) => l.label && l.href)

  return { menus, navLinks }
}

// Only what the storefront should show, in the order the owner set.
export function toStorefrontMenus(
  config: MegaMenuConfig,
): Record<string, MegaMenu> {
  const out: Record<string, MegaMenu> = {}
  for (const m of config.menus) {
    if (!m.visible) continue
    const { key, visible: _v, ...menu } = m
    out[key] = menu
  }
  return out
}
export function toStorefrontNavLinks(config: MegaMenuConfig): NavLinkEntry[] {
  return config.navLinks.filter((l) => l.visible)
}
