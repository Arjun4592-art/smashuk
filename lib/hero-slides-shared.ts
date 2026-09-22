import { SPORTS } from '@/lib/constants'

// Shared (client + server) definition of the home page hero slider: the shape
// stored in the Medusa store metadata, the default slides, and the sanitiser
// used both when saving from the dashboard and when reading for the website.

export type HeroThirdStat =
  'rating' | 'delivery' | 'authentic' | 'returns' | 'none'

export interface HeroSlide {
  id: string
  enabled: boolean
  /** Full-width background image URL. */
  image: string
  /** Small pill above the heading, e.g. "🏸 New Season Collection". */
  badge: string
  /** Line 1 + "\n" + line 2. Line 2 is shown in the accent colour. */
  heading: string
  subheading: string
  ctaLabel: string
  ctaHref: string
  secondaryLabel: string
  secondaryHref: string
  /** Sport slug ('' = none). Drives the stats numbers and the highlighted "Browse" pill. */
  sport: string
  showStats: boolean
  thirdStat: HeroThirdStat
}

export const MAX_HERO_SLIDES = 8

export const HERO_THIRD_STAT_OPTIONS: {
  value: HeroThirdStat
  label: string
}[] = [
  { value: 'rating', label: 'Average rating' },
  { value: 'delivery', label: '48hr fast delivery' },
  { value: 'authentic', label: '100% authentic' },
  { value: 'returns', label: 'Free returns' },
  { value: 'none', label: 'None (only products + brands)' },
]

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-badminton',
    enabled: true,
    image:
      'https://images.unsplash.com/flagged/photo-1572987337807-6174e06ba9d0?w=1920&q=80',
    badge: '🏸 New Season Collection',
    heading: 'Play Like\nA Champion',
    subheading:
      'Premium badminton gear for every level — from beginner to pro.',
    ctaLabel: 'Shop Badminton',
    ctaHref: '/shop?sport=badminton',
    secondaryLabel: 'View All',
    secondaryHref: '/shop',
    sport: 'badminton',
    showStats: true,
    thirdStat: 'rating',
  },
  {
    id: 'slide-tennis',
    enabled: true,
    image:
      'https://images.unsplash.com/photo-1758040252389-47b48246fecb?w=1920&q=80',
    badge: '🎾 Tennis Season',
    heading: 'Ace Every\nShot',
    subheading:
      "Wilson, Babolat, Head — the world's best rackets, delivered to you.",
    ctaLabel: 'Shop Tennis',
    ctaHref: '/shop?sport=tennis',
    secondaryLabel: 'View All',
    secondaryHref: '/shop',
    sport: 'tennis',
    showStats: true,
    thirdStat: 'delivery',
  },
  {
    id: 'slide-padel',
    enabled: true,
    image:
      'https://images.unsplash.com/photo-1761644541691-2a746c638881?w=1920&q=80',
    badge: '🏓 Padel Rising',
    heading: 'Dominate\nThe Court',
    subheading:
      'Adidas, Bullpadel, Babolat — premium padel gear for every level.',
    ctaLabel: 'Shop Padel',
    ctaHref: '/shop?sport=padel',
    secondaryLabel: 'View All',
    secondaryHref: '/shop',
    sport: 'padel',
    showStats: true,
    thirdStat: 'authentic',
  },
  {
    id: 'slide-squash',
    enabled: true,
    image:
      'https://images.unsplash.com/photo-1694723844104-a1495e30c7b0?w=1920&q=80',
    badge: '🥎 Squash Essentials',
    heading: 'Smash It\nEvery Time',
    subheading:
      'Dunlop, Head, Wilson — professional squash equipment at your fingertips.',
    ctaLabel: 'Shop Squash',
    ctaHref: '/shop?sport=squash',
    secondaryLabel: 'View All',
    secondaryHref: '/shop',
    sport: 'squash',
    showStats: true,
    thirdStat: 'returns',
  },
]

export function newHeroSlide(): HeroSlide {
  return {
    id: `slide-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    enabled: true,
    image: '',
    badge: '',
    heading: '',
    subheading: '',
    ctaLabel: 'Shop Now',
    ctaHref: '/shop',
    secondaryLabel: '',
    secondaryHref: '',
    sport: '',
    showStats: false,
    thirdStat: 'rating',
  }
}

/** Internal path ("/shop?x=1") or absolute http(s) URL. Anything else is invalid. */
export function isValidHref(v: string): boolean {
  const s = v.trim()
  if (s.startsWith('/') && !s.startsWith('//')) return true
  return /^https?:\/\/\S+$/i.test(s)
}

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const href = (v: unknown) => {
  const s = str(v, 500)
  return s && isValidHref(s) ? s : ''
}

const THIRD_STATS = new Set<string>([
  'rating',
  'delivery',
  'authentic',
  'returns',
  'none',
])
const SPORT_SLUGS = new Set<string>(SPORTS.map((s) => s.slug))

export function sanitizeHeroSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: HeroSlide[] = []
  for (const raw of input.slice(0, MAX_HERO_SLIDES)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const lines = (typeof r.heading === 'string' ? r.heading : '')
      .split('\n')
      .slice(0, 2)
      .map((l) => l.trim().slice(0, 60))
    const heading = lines[1]
      ? `${lines[0] ?? ''}\n${lines[1]}`
      : (lines[0] ?? '')
    const image = href(r.image)
    if (!image && !heading) continue
    let id = str(r.id, 40) || `slide-${out.length + 1}`
    while (seen.has(id)) id = `${id}-x`
    seen.add(id)
    const ctaLabel = str(r.ctaLabel, 40)
    const ctaHref = href(r.ctaHref)
    const secondaryLabel = str(r.secondaryLabel, 40)
    const secondaryHref = href(r.secondaryHref)
    out.push({
      id,
      enabled: r.enabled !== false,
      image,
      badge: str(r.badge, 60),
      heading,
      subheading: str(r.subheading, 200),
      ctaLabel: ctaHref ? ctaLabel : '',
      ctaHref: ctaLabel ? ctaHref : '',
      secondaryLabel: secondaryHref ? secondaryLabel : '',
      secondaryHref: secondaryLabel ? secondaryHref : '',
      sport: SPORT_SLUGS.has(str(r.sport, 40)) ? str(r.sport, 40) : '',
      showStats: r.showStats !== false,
      thirdStat: THIRD_STATS.has(String(r.thirdStat))
        ? (r.thirdStat as HeroThirdStat)
        : 'none',
    })
  }
  return out
}
