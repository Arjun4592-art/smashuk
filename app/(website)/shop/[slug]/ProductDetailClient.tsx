'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import DOMPurify from 'isomorphic-dompurify'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/api/store'
import { SITE_URL } from '@/lib/constants'
import ProductGrid from '@/components/website/ProductGrid'
import ProductImageZoom from '@/components/website/ProductImageZoom'
import CrossSellSuggestions from '@/components/website/CrossSellSuggestions'
import {
  StarIcon,
  HeartIcon,
  CartIcon,
  TruckIcon,
  ShieldIcon,
  RefreshIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  FacebookIcon,
  TwitterIcon,
  MailIcon,
  CopyIcon,
} from '@/components/ui/Icons'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/website/ProductReviews'
import SizeGuideModal from '@/components/website/SizeGuideModal'
import NotifyStockForm from '@/components/website/NotifyStockForm'
import { recordRecentlyViewed } from '@/lib/recently-viewed'
import type { CrossSellProduct, Product } from '@/types'
interface StringOption {
  id: string
  name: string
  brand: string
  tensionRange?: string
  bestFor?: string
  color: string
  price: number
  productId: string
  variantId: string
}
interface RacketGripOption {
  id: string
  name: string
  brand: string
  price: number
  productId: string
  variantId: string
  image?: string
}
interface StringSelection {
  string: StringOption
  tension: number
}
type StringSport = 'badminton' | 'tennis' | 'squash'
const STRING_CATEGORY_HANDLE_BY_SPORT: Record<StringSport, string> = {
  badminton: 'stringing-badminton',
  tennis: 'stringing-tennis',
  squash: 'stringing-squash',
}
const STRING_ACCENT_COLORS = [
  '#E8553A',
  '#0A1F44',
  '#6366f1',
  '#16a34a',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#1d4ed8',
  '#b91c1c',
  '#ca8a04',
]
function findSpecValue(
  specs: any[] | undefined,
  label: string,
): string | undefined {
  const spec = (specs ?? []).find((s: any) =>
    (s?.label ?? s?.name ?? '').toLowerCase().includes(label.toLowerCase()),
  )
  return spec?.value
}
async function resolveStringOptions(sport?: string): Promise<StringOption[]> {
  const sportKey =
    (sport?.toLowerCase().trim() as StringSport | undefined) ?? 'badminton'
  const categoryHandle =
    STRING_CATEGORY_HANDLE_BY_SPORT[sportKey] ??
    STRING_CATEGORY_HANDLE_BY_SPORT.badminton
  try {
    const res = await fetch(
      `/api/store/products?category_handle=${encodeURIComponent(categoryHandle)}&limit=50`,
    )
    if (!res.ok) return []
    const data = await res.json()
    const products: any[] = data.products ?? []
    return products
      .map((match: any, i: number): StringOption | null => {
        const variants: any[] = match.variants ?? []
        const purchasable = variants.find(
          (v: any) =>
            v.inventory_quantity === undefined ||
            v.inventory_quantity === null ||
            v.inventory_quantity > 0 ||
            v.allow_backorder === true ||
            v.manage_inventory === false,
        )
        // No purchasable variant = this stringing product is out of stock on
        // the website — don't fall back to an out-of-stock variant, exclude
        // the product from the String Upgrade dropdown instead.
        const variant = purchasable
        if (!variant) return null
        const gbp = (variant.prices ?? []).find(
          (pr: any) => pr.currency_code === 'gbp',
        )
        const calcAmount = variant.calculated_price?.calculated_amount
        const priceAmount =
          calcAmount && calcAmount > 0 ? calcAmount : gbp?.amount
        if (priceAmount === undefined) return null
        // Strip the store's own "Smash Racket Pro" label wherever it shows
        // up (title or metadata brand) — only the string maker's actual
        // brand (Yonex, Li-Ning, Ashaway, etc.) should be shown.
        const isSmashLabel = (s: string) => /smash racket pro/i.test(s)
        const title: string = (match.title ?? 'Stringing')
          .replace(/smash racket pro/gi, '')
          .trim()
        const metaBrand: string = match.metadata?.brand ?? ''
        const brand: string =
          (metaBrand && !isSmashLabel(metaBrand) ? metaBrand : '') ||
          title.split(' ')[0] ||
          ''
        const name =
          brand && title.startsWith(brand)
            ? title.slice(brand.length).trim()
            : title
        const resolved: StringOption = {
          id: match.id,
          name: name.replace(/stringing/i, '').trim() || title,
          brand,
          tensionRange: findSpecValue(match.metadata?.specs, 'tension'),
          bestFor: findSpecValue(match.metadata?.specs, 'best for'),
          color: STRING_ACCENT_COLORS[i % STRING_ACCENT_COLORS.length],
          price: priceAmount,
          productId: match.id,
          variantId: variant.id,
        }
        return resolved
      })
      .filter((r: StringOption | null): r is StringOption => r !== null)
  } catch {
    return []
  }
}
type GripSport = 'badminton' | 'tennis' | 'squash' | 'padel'
const GRIP_SEARCH_CANDIDATES: {
  id: string
  brand: string
  query: string
  sports: GripSport[]
}[] = [
  {
    id: 'yonex-pu-overgrip',
    brand: 'Yonex',
    query: 'Yonex PU Overgrip',
    sports: ['badminton'],
  },
  {
    id: 'victor-fishbone-replacement-grip',
    brand: 'Victor',
    query: 'Victor Fishbone Replacement Grip',
    sports: ['badminton'],
  },
  {
    id: 'yonex-super-grap-pure',
    brand: 'Yonex',
    query: 'Yonex Super Grap Pure AC108',
    sports: ['badminton'],
  },
  {
    id: 'babolat-my-overgrip',
    brand: 'Babolat',
    query: 'Babolat MY Overgrip',
    sports: ['tennis', 'squash', 'padel'],
  },
  {
    id: 'babolat-syntec-x1-white',
    brand: 'Babolat',
    query: 'Babolat Syntec X1 Replacement Grip White',
    sports: ['tennis', 'squash', 'padel'],
  },
  {
    id: 'babolat-syntec-x1-black-yellow',
    brand: 'Babolat',
    query: 'Babolat Syntec X1 Replacement Grip Black Yellow',
    sports: ['tennis', 'squash', 'padel'],
  },
  {
    id: 'babolat-vs-original-overgrip-3pack',
    brand: 'Babolat',
    query: 'Babolat VS Original Feel Overgrip 3 Pack',
    sports: ['tennis', 'squash', 'padel'],
  },
  {
    id: 'babolat-pro-response-overgrip-3pack',
    brand: 'Babolat',
    query: 'Babolat Pro Response Overgrip 3 Pack',
    sports: ['tennis', 'squash', 'padel'],
  },
]
const NO_GRIP_OPTION: RacketGripOption = {
  id: 'none',
  name: 'No Thanks',
  brand: '',
  price: 0,
  productId: '',
  variantId: '',
}
async function resolveGripOptions(sport?: string): Promise<RacketGripOption[]> {
  const sportKey = sport?.toLowerCase().trim() as GripSport | undefined
  const candidates = sportKey
    ? GRIP_SEARCH_CANDIDATES.filter((c) => c.sports.includes(sportKey))
    : GRIP_SEARCH_CANDIDATES
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const res = await fetch(
          `/api/store/products?q=${encodeURIComponent(candidate.query)}&limit=3`,
        )
        if (!res.ok) return null
        const data = await res.json()
        const products: any[] = data.products ?? []
        const match =
          products.find((p: any) =>
            (p.title ?? '')
              .toLowerCase()
              .includes(candidate.brand.toLowerCase()),
          ) ?? products[0]
        if (!match) return null
        const variants: any[] = match.variants ?? []
        const purchasable = variants.find(
          (v: any) =>
            v.inventory_quantity === undefined ||
            v.inventory_quantity === null ||
            v.inventory_quantity > 0 ||
            v.allow_backorder === true ||
            v.manage_inventory === false,
        )
        const variant = purchasable ?? variants[0]
        if (!variant) return null
        const gbp = (variant.prices ?? []).find(
          (pr: any) => pr.currency_code === 'gbp',
        )
        const calcAmount = variant.calculated_price?.calculated_amount
        const priceAmount =
          calcAmount && calcAmount > 0 ? calcAmount : gbp?.amount
        if (priceAmount === undefined) return null
        const image: string | undefined =
          match.thumbnail ?? match.images?.[0]?.url ?? undefined
        const resolved: RacketGripOption = {
          id: candidate.id,
          name: match.title ?? candidate.query,
          brand: candidate.brand,
          price: priceAmount,
          productId: match.id,
          variantId: variant.id,
          image,
        }
        return resolved
      } catch {
        return null
      }
    }),
  )
  return results.filter((r): r is RacketGripOption => r !== null)
}
const TENSION_RANGE_BY_SPORT: Record<
  string,
  {
    min: number
    max: number
  }
> = {
  badminton: {
    min: 18,
    max: 30,
  },
  tennis: {
    min: 44,
    max: 62,
  },
  squash: {
    min: 19,
    max: 24,
  },
}
const DEFAULT_TENSION_RANGE = TENSION_RANGE_BY_SPORT.tennis
function getTensionRangeForSport(sport?: string) {
  if (!sport) return DEFAULT_TENSION_RANGE
  return (
    TENSION_RANGE_BY_SPORT[sport.toLowerCase().trim()] ?? DEFAULT_TENSION_RANGE
  )
}
function SocialShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const shareLinks = [
    {
      label: 'Facebook',
      icon: <FacebookIcon size={16} />,
      href: `https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'Twitter',
      icon: <TwitterIcon size={16} />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: 'Email',
      icon: <MailIcon size={16} />,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    },
  ]
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }
  return (
    <div className='flex items-center gap-2 mb-5'>
      <span className='text-xs font-semibold text-gray-400 font-lato mr-1'>
        Share:
      </span>
      {shareLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`Share on ${link.label}`}
          className='w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#E8553A] hover:border-[#E8553A] transition-colors'
        >
          {link.icon}
        </a>
      ))}
      <button
        type='button'
        onClick={handleCopy}
        aria-label='Copy link'
        className='w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#E8553A] hover:border-[#E8553A] transition-colors'
      >
        {copied ? <CheckIconInline /> : <CopyIcon size={14} />}
      </button>
    </div>
  )
}
function CheckIconInline() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='text-green-500'
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  )
}
type GuideSection = {
  title: string
  items: string[]
}
const BADMINTON_RACKET_GUIDE: GuideSection[] = [
  {
    title: 'Purpose of Play',
    items: [
      'Beginners: opt for even-balanced rackets — easier to learn on and versatile across shots.',
      'Intermediate players: consider a slightly head-heavy racket for power, or head-light for speed, depending on your style.',
      'Advanced players: usually have specific preferences — power, speed, or control — matched to their playing style.',
    ],
  },
  {
    title: 'Weight Class',
    items: [
      'Ultralight (5U/6U/7U): easiest to control, quick swing — good for beginners and defensive players.',
      'Standard (4U): balanced feel — good for intermediate players.',
      'Heavy (3U): emphasises power, harder to manoeuvre — preferred by advanced players.',
    ],
  },
  {
    title: 'Balance Point',
    items: [
      'Head-Heavy: emphasises power, ideal for smashing.',
      'Even Balance: a mix of power and speed, good for all-court play.',
      'Head-Light: emphasises speed and quick reflexes, ideal for the front court and doubles.',
    ],
  },
  {
    title: 'String Tension',
    items: [
      'Beginners: lower end of the range — a larger, more forgiving sweet spot.',
      'Intermediate: mid-range — a good mix of power and control.',
      'Advanced: higher end of the range — precise control, but needs consistent technique.',
    ],
  },
  {
    title: 'Shaft Flexibility',
    items: [
      'Flexible: easier for beginners, generates power with less effort but can compromise accuracy.',
      'Medium: balanced flex, suits most intermediate players.',
      'Stiff: preferred by advanced players — precise, but needs good technique to generate power.',
    ],
  },
  {
    title: 'Grip Size',
    items: [
      'Smaller hands: G5 or smaller.',
      'Average hands: G4.',
      'Larger hands: G3.',
    ],
  },
]
const TENNIS_RACKET_GUIDE: GuideSection[] = [
  {
    title: 'Purpose of Play',
    items: [
      'Beginners: a larger head size gives more power and a bigger sweet spot — forgiving on off-centre hits.',
      'Intermediate players: a mid-plus head size balances power and control.',
      'Advanced players: often prefer smaller head sizes for precision, but it needs consistent technique.',
    ],
  },
  {
    title: 'Weight',
    items: [
      'Lighter (260–280g): easier to manoeuvre — good for beginners, juniors, or slower swing speeds.',
      'Medium (280–310g): a mix of power and control — suits many intermediate players.',
      'Heavier (310g+): more stability and power, but needs good technique — preferred by many advanced players.',
    ],
  },
  {
    title: 'Balance',
    items: [
      'Head-Heavy: more power, especially for shorter swings.',
      'Even-Balance: a balanced feel, suits a broad range of players.',
      'Head-Light: easier to manoeuvre — favoured by advanced players and net play in doubles.',
    ],
  },
  {
    title: 'String Pattern',
    items: [
      'Open (16x18 or 16x19): more spin and power, but strings wear faster.',
      'Dense (18x20): more control and better string durability.',
    ],
  },
  {
    title: 'Choosing the Right Grip Size',
    items: [
      'Ruler test: measure from the middle of your palm to the tip of your ring finger — 4 to 4⅜ inches suits most adults.',
      'On-racket test: hold the racket for a backhand — there should be a finger\u2019s width of space between your fingers and the base of your thumb.',
      'Common sizes: G0 = 4", G1 = 4⅛", G2 = 4¼", G3 = 4⅜", G4 = 4½", G5 = 4⅝".',
      'When in doubt, go smaller — an overgrip can build a grip up, but you can\u2019t reduce one.',
    ],
  },
]
function RacketBuyingGuide({ sport }: { sport?: string }) {
  const sections =
    sport?.toLowerCase().trim() === 'tennis'
      ? TENNIS_RACKET_GUIDE
      : BADMINTON_RACKET_GUIDE
  const guideHref =
    sport?.toLowerCase().trim() === 'tennis'
      ? '/blogs/tennis'
      : '/blogs/news/badminton-racket-guide'
  const title =
    sport?.toLowerCase().trim() === 'tennis'
      ? 'Tennis Racket Quick Guide'
      : 'Quick Badminton Racket Guide'
  const [openSection, setOpenSection] = useState<string | null>(null)
  const handleToggle = (sectionTitle: string) => {
    setOpenSection((current) =>
      current === sectionTitle ? null : sectionTitle,
    )
  }
  return (
    <div className='mt-10 pt-8 border-t border-gray-100 text-left'>
      <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-1 text-left'>
        {title}
      </h2>
      <p className='text-xs text-gray-400 font-lato mb-4 text-left'>
        Not in a rush? Check out our{' '}
        <Link
          href={guideHref}
          className='underline decoration-gray-300 hover:decoration-[#E8553A] hover:text-[#E8553A]'
        >
          detailed racket guide
        </Link>
        .
      </p>
      <div className='divide-y divide-gray-100 border-t border-b border-gray-100'>
        {sections.map((section) => {
          const isOpen = openSection === section.title
          return (
            <div key={section.title} className='py-3'>
              <button
                type='button'
                onClick={() => handleToggle(section.title)}
                aria-expanded={isOpen}
                className='w-full cursor-pointer flex items-center justify-between font-montserrat font-bold text-sm text-[#0A1F44] text-left'
              >
                {section.title}
                <span
                  className={`text-[#E8553A] transition-transform duration-200 text-lg leading-none ${isOpen ? 'rotate-45' : ''}`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
              >
                <ul className='space-y-1.5 pl-1'>
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className='text-sm text-gray-500 font-lato leading-relaxed list-disc list-inside text-left'
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
const PADEL_GUIDE_ROWS: {
  criteria: string
  description: string[]
}[] = [
  {
    criteria: 'Basic Components',
    description: [
      'Frame: Carbon Fibre (power) or Fiberglass (control)',
      'Core: Soft foam (control) or Hard foam (power)',
    ],
  },
  {
    criteria: 'Racket Shapes',
    description: [
      'Diamond: power, high sweet spot',
      'Round: balanced, centred sweet spot',
      'Teardrop: mix, slightly higher sweet spot',
    ],
  },
  {
    criteria: 'Weight',
    description: [
      'Light (360–375g): beginners, women',
      'Medium (375–390g): balanced, most players',
      'Heavy (390g+): advanced players',
    ],
  },
  {
    criteria: 'Balance',
    description: [
      'Head-Heavy: power',
      'Head-Light: control',
      'Even Balance: mix of both',
    ],
  },
  {
    criteria: 'Surface & Texture',
    description: ['Smooth: control', 'Rough/Textured: spin'],
  },
  {
    criteria: 'Racket Thickness',
    description: ['Typically 36–38mm: thicker = more power'],
  },
  {
    criteria: 'Hole Patterns',
    description: ['Varies: larger holes = more elastic racket'],
  },
  {
    criteria: 'Player\u2019s Level/Style',
    description: [
      'Beginners: round, medium-weight, soft core',
      'Intermediate: teardrop, medium-hard core',
      'Advanced: diamond, hard core',
    ],
  },
  {
    criteria: 'Additional Features',
    description: ['Anti-vibration systems', 'Reinforced edges'],
  },
  {
    criteria: 'Budget',
    description: ['Set a price range before shopping'],
  },
  {
    criteria: 'Test Before Buying',
    description: ['Always recommended to get a feel'],
  },
  {
    criteria: 'Consider the Grip',
    description: ['Ensure comfort — it can be changed'],
  },
  {
    criteria: 'Recommendations',
    description: ['Seek insights from players, coaches, or reviews'],
  },
]
function PadelRacketGuide() {
  return (
    <div className='mt-10 pt-8 border-t border-gray-100'>
      <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-1'>
        Padel Racket Quick Guide
      </h2>
      <p className='text-xs text-gray-400 font-lato mb-4'>
        This table simplifies the detailed information into easily digestible
        points. Refer back to the{' '}
        <Link
          href='/blogs/padel/the-ultimate-guide-to-choosing-the-perfect-padel-racket'
          className='underline decoration-gray-300 hover:decoration-[#E8553A] hover:text-[#E8553A]'
        >
          detailed guide
        </Link>{' '}
        for a more in-depth understanding.
      </p>
      <div className='rounded-xl border border-gray-100 overflow-hidden'>
        {PADEL_GUIDE_ROWS.map((row, i) => (
          <div
            key={row.criteria}
            className={`flex flex-col sm:flex-row gap-1 sm:gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
          >
            <span className='sm:w-1/3 text-sm font-bold text-[#0A1F44] font-montserrat shrink-0'>
              {row.criteria}
            </span>
            <div className='sm:w-2/3 space-y-0.5'>
              {row.description.map((line) => (
                <p
                  key={line}
                  className='text-sm text-gray-500 font-lato leading-relaxed'
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function ShoeBuyingGuide({ sport }: { sport?: string }) {
  const sportLabel = sport
    ? sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase()
    : 'Racket Sport'
  return (
    <div className='mt-10 pt-8 border-t border-gray-100 max-w-2xl'>
      <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-4'>
        The Ultimate Guide to Buying {sportLabel} Shoes
      </h2>

      <div className='space-y-5 text-sm text-gray-500 font-lato leading-relaxed'>
        <div>
          <p className='font-montserrat font-bold text-[#0A1F44] mb-1.5'>
            Why special shoes for {sportLabel}?
          </p>
          <p>
            {sportLabel} demands agility, speed, and precision. The right
            footwear enhances performance by offering grip, cushioning, and
            stability, reducing the risk of injuries — unlike regular sneakers,
            these shoes are built specifically for the sport&apos;s demands.
          </p>
        </div>

        <div>
          <p className='font-montserrat font-bold text-[#0A1F44] mb-1.5'>
            Key factors to consider
          </p>
          <ul className='space-y-1.5 list-disc list-inside'>
            <li>
              <strong className='text-[#0A1F44]'>Sole type</strong> — gum sole
              for indoor wooden courts (superior grip), rubber sole for
              cement/concrete outdoor courts.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Cushioning</strong> —
              especially in the midsole, for comfort and shock absorption.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Ventilation</strong> —
              breathable material keeps feet dry and prevents blisters.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Weight</strong> — a lightweight
              shoe improves mobility without sacrificing support.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Ankle support</strong> —
              important if you have a history of ankle injuries.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Shape & fit</strong> — choose a
              design that fits your foot shape snugly but comfortably.
            </li>
            <li>
              <strong className='text-[#0A1F44]'>Durability</strong> — the sport
              is demanding on footwear, so build quality matters.
            </li>
          </ul>
        </div>

        <div>
          <p className='font-montserrat font-bold text-[#0A1F44] mb-1.5'>
            Trending features
          </p>
          <ul className='space-y-1.5 list-disc list-inside'>
            <li>
              Anti-twist outsoles — reduce the chance of rolling an ankle.
            </li>
            <li>
              Energy return technology — better jumps and swifter movement.
            </li>
            <li>Reinforced toe caps — protect toes, extend shoe lifespan.</li>
          </ul>
        </div>

        <div>
          <p className='font-montserrat font-bold text-[#0A1F44] mb-1.5'>
            Setting a budget
          </p>
          <p>
            High-end, pro-endorsed shoes aren&apos;t the only option — plenty of
            mid-range pairs offer excellent performance. Set a budget and find
            the best shoe within it.
          </p>
        </div>
      </div>
    </div>
  )
}
function StringUpgrade({
  sport,
  upgradeType = 'paid',
  onStringChange,
  onGripChange,
}: {
  sport?: string
  upgradeType?: 'free' | 'paid'
  onStringChange?: (sel: StringSelection | null) => void
  onGripChange?: (grip: RacketGripOption | null) => void
}) {
  const { min: tensionMin, max: tensionMax } = getTensionRangeForSport(sport)
  const [enabled, setEnabled] = useState(false)
  const [stringOptions, setStringOptions] = useState<StringOption[]>([])
  const [stringsLoading, setStringsLoading] = useState(true)
  const [selectedStringId, setSelectedStringId] = useState<string | undefined>(
    undefined,
  )
  useEffect(() => {
    let cancelled = false
    setStringsLoading(true)
    resolveStringOptions(sport)
      .then((options) => {
        if (cancelled) return
        const adjusted =
          upgradeType === 'free'
            ? options.map((o) => ({
                ...o,
                price: 0,
              }))
            : options
        setStringOptions(adjusted)
        setSelectedStringId(adjusted[0]?.id)
      })
      .finally(() => {
        if (!cancelled) setStringsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sport, upgradeType])
  const selectedString =
    stringOptions.find((o) => o.id === selectedStringId) ?? stringOptions[0]
  const [tension, setTension] = useState(
    Math.round((tensionMin + tensionMax) / 2),
  )
  const [gripId, setGripId] = useState<string>('none')
  const [gripDropdownOpen, setGripDropdownOpen] = useState(false)
  const gripDropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!gripDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        gripDropdownRef.current &&
        !gripDropdownRef.current.contains(e.target as Node)
      ) {
        setGripDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [gripDropdownOpen])
  const [gripOptions, setGripOptions] = useState<RacketGripOption[]>([])
  const [gripsLoading, setGripsLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    resolveGripOptions(sport)
      .then((options) => {
        if (!cancelled) setGripOptions(options)
      })
      .finally(() => {
        if (!cancelled) setGripsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sport])
  const allGripOptions = [NO_GRIP_OPTION, ...gripOptions]
  const selectedGrip =
    allGripOptions.find((g) => g.id === gripId) ?? NO_GRIP_OPTION
  const toggle = () => {
    if (!selectedString) return
    const next = !enabled
    setEnabled(next)
    onStringChange?.(
      next
        ? {
            string: selectedString,
            tension,
          }
        : null,
    )
  }
  const updateString = (opt: StringOption) => {
    setSelectedStringId(opt.id)
    if (enabled)
      onStringChange?.({
        string: opt,
        tension,
      })
  }
  const updateTension = (val: number) => {
    setTension(val)
    if (enabled && selectedString)
      onStringChange?.({
        string: selectedString,
        tension: val,
      })
  }
  const updateGrip = (id: string) => {
    setGripId(id)
    const grip = allGripOptions.find((g) => g.id === id) ?? null
    onGripChange?.(grip && grip.id !== 'none' ? grip : null)
    setGripDropdownOpen(false)
  }
  return (
    <div className='mb-6 space-y-4'>
      {}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
        <div>
          <button
            type='button'
            onClick={toggle}
            disabled={stringsLoading || !selectedString}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200 disabled:opacity-60 ${stringsLoading ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'} ${enabled ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
          >
            <div className='flex items-center gap-3'>
              <span
                className={`transition-colors ${enabled ? 'text-[#E8553A]' : 'text-gray-400'}`}
              >
                <svg
                  width='22'
                  height='22'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <ellipse cx='11' cy='9' rx='6' ry='7' />
                  <line x1='8' y1='6' x2='14' y2='6' />
                  <line x1='8' y1='9' x2='14' y2='9' />
                  <line x1='8' y1='12' x2='14' y2='12' />
                  <line x1='9' y1='4' x2='9' y2='14' />
                  <line x1='12' y1='4' x2='12' y2='14' />
                  <line x1='11' y1='16' x2='13' y2='22' />
                </svg>
              </span>
              <div className='text-left'>
                <p
                  className={`text-sm font-black font-montserrat transition-colors ${enabled ? 'text-[#E8553A]' : 'text-[#0A1F44]'}`}
                >
                  String Upgrade
                  <span className='ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-lato'>
                    +1 Day
                  </span>
                </p>
                <p className='text-xs text-gray-400 font-lato'>
                  {stringsLoading
                    ? 'Checking available strings…'
                    : !selectedString
                      ? 'No stringing options set up for this sport yet'
                      : enabled
                        ? `${selectedString.brand} ${selectedString.name} · ${tension} lbs — ${selectedString.price > 0 ? `+£${selectedString.price.toFixed(2)}` : 'free'}`
                        : 'Get your racket professionally strung before dispatch'}
                </p>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-all duration-300 relative shrink-0 ${enabled ? 'bg-[#E8553A]' : 'bg-gray-200'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? 'left-5' : 'left-0.5'}`}
              />
            </div>
          </button>
        </div>

        {}
        <div>
          <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider mb-2.5'>
            Racket Grips
            {selectedGrip.price > 0 && (
              <span className='ml-1.5 text-[#E8553A] normal-case tracking-normal'>
                (+ £{selectedGrip.price.toFixed(2)} GBP)
              </span>
            )}
          </p>
          {}
          <div className='relative' ref={gripDropdownRef}>
            <button
              type='button'
              disabled={gripsLoading}
              onClick={() => setGripDropdownOpen((o) => !o)}
              aria-haspopup='listbox'
              aria-expanded={gripDropdownOpen}
              className='w-full flex items-center gap-2.5 px-3.5 py-2.5 pr-9 rounded-xl border-2 border-gray-100 bg-gray-50 text-xs font-montserrat font-bold text-[#0A1F44] focus:outline-none focus:border-[#E8553A] transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 relative'
            >
              {gripsLoading ? (
                <span>Checking available grips…</span>
              ) : (
                <>
                  {selectedGrip.id !== 'none' && selectedGrip.image && (
                    <img
                      src={selectedGrip.image}
                      alt=''
                      className='w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200'
                    />
                  )}
                  <span className='flex-1 min-w-0 flex items-baseline gap-1.5 text-left'>
                    <span className='truncate'>{selectedGrip.name}</span>
                    {selectedGrip.price > 0 && (
                      <span className='shrink-0 text-[#E8553A]'>
                        +£{selectedGrip.price.toFixed(2)} GBP
                      </span>
                    )}
                  </span>
                </>
              )}
              <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className={`transition-transform duration-200 ${gripDropdownOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points='6 9 12 15 18 9' />
                </svg>
              </span>
            </button>

            {gripDropdownOpen && !gripsLoading && (
              <div
                role='listbox'
                className='absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border-2 border-gray-100 bg-white shadow-lg py-1.5'
              >
                {allGripOptions.map((g) => {
                  const isSelected = g.id === gripId
                  const isNoThanks = g.id === 'none'
                  return (
                    <button
                      key={g.id}
                      type='button'
                      role='option'
                      aria-selected={isSelected}
                      onClick={() => updateGrip(g.id)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-montserrat transition-colors ${isSelected ? 'bg-[#E8553A]/10 text-[#E8553A] font-bold' : 'text-[#0A1F44] hover:bg-gray-50 font-semibold'}`}
                    >
                      {}
                      {!isNoThanks &&
                        (g.image ? (
                          <img
                            src={g.image}
                            alt=''
                            className='w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200'
                          />
                        ) : (
                          <span className='w-9 h-9 rounded-lg shrink-0 bg-gray-100 border border-gray-200' />
                        ))}
                      <span className='flex-1 min-w-0 flex items-baseline gap-1.5'>
                        <span className='truncate'>{g.name}</span>
                        {g.price > 0 && (
                          <span
                            className={`shrink-0 ${isSelected ? 'text-[#E8553A]' : 'text-gray-500'}`}
                          >
                            +£{g.price.toFixed(2)} GBP
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {!gripsLoading && gripOptions.length === 0 && (
            <p className='text-[11px] text-gray-400 font-lato mt-1.5'>
              No grip add-ons are set up yet.
            </p>
          )}
          {selectedGrip.price > 0 && (
            <div className='mt-2 bg-[#0A1F44]/5 rounded-xl px-4 py-2.5 flex justify-between'>
              <span className='text-xs font-bold font-montserrat text-[#0A1F44]'>
                {selectedGrip.name}
              </span>
              <span className='text-sm font-black font-montserrat text-[#E8553A]'>
                +£{selectedGrip.price.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {}
      <div
        className={`overflow-hidden transition-all duration-300 ${enabled ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className='border-2 border-[#E8553A]/20 rounded-xl px-4 pb-5 pt-4 space-y-5 bg-white'>
          <div>
            <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider mb-2.5'>
              1. String Selection
            </p>
            <div className='relative'>
              <select
                value={selectedString?.id ?? ''}
                disabled={stringsLoading || stringOptions.length === 0}
                onChange={(e) => {
                  const opt = stringOptions.find((o) => o.id === e.target.value)
                  if (opt) updateString(opt)
                }}
                className={`w-full appearance-none px-3.5 py-3 pr-9 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-montserrat font-bold text-[#0A1F44] focus:outline-none focus:border-[#E8553A] transition-colors cursor-pointer disabled:opacity-60 ${stringsLoading ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'}`}
              >
                {stringOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.brand} {opt.name}{' '}
                    {opt.price > 0 ? `— +£${opt.price.toFixed(2)}` : '— Free'}
                  </option>
                ))}
              </select>
              <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <polyline points='6 9 12 15 18 9' />
                </svg>
              </span>
            </div>
            {!stringsLoading && stringOptions.length === 0 && (
              <p className='text-[11px] text-gray-400 font-lato mt-1.5'>
                No stringing options are set up yet.
              </p>
            )}
            {selectedString &&
              (selectedString.bestFor || selectedString.tensionRange) && (
                <p className='text-[11px] text-gray-400 font-lato mt-1.5'>
                  {[
                    selectedString.bestFor,
                    selectedString.tensionRange &&
                      `Recommended tension ${selectedString.tensionRange}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
          </div>

          <div>
            <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider mb-2.5'>
              2. String Tension
            </p>
            <div className='relative'>
              <select
                value={tension}
                onChange={(e) => updateTension(Number(e.target.value))}
                className='w-full appearance-none px-3.5 py-3 pr-9 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-montserrat font-bold text-[#0A1F44] focus:outline-none focus:border-[#E8553A] transition-colors cursor-pointer'
              >
                {Array.from(
                  {
                    length: tensionMax - tensionMin + 1,
                  },
                  (_, i) => tensionMin + i,
                ).map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
              <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <polyline points='6 9 12 15 18 9' />
                </svg>
              </span>
            </div>
          </div>

          {selectedString && (
            <div className='bg-[#0A1F44]/5 rounded-xl px-4 py-3 space-y-2'>
              <p className='text-xs font-bold text-[#0A1F44] font-montserrat mb-2'>
                Order Summary
              </p>
              <div className='flex justify-between text-xs font-lato'>
                <span className='text-gray-500'>String</span>
                <span className='font-semibold text-[#0A1F44]'>
                  {selectedString.brand} {selectedString.name}
                </span>
              </div>
              <div className='flex justify-between text-xs font-lato'>
                <span className='text-gray-500'>Tension</span>
                <span className='font-semibold text-[#0A1F44]'>
                  {tension} lbs
                </span>
              </div>
              <div className='flex justify-between text-xs font-lato'>
                <span className='text-gray-500'>String Upgrade</span>
                <span
                  className={`font-semibold ${selectedString.price > 0 ? 'text-[#E8553A]' : 'text-green-600'}`}
                >
                  {selectedString.price > 0
                    ? `+£${selectedString.price.toFixed(2)}`
                    : 'Free'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
interface Props {
  product: any
  related: any[]
  crossSellProducts?: CrossSellProduct[]
}
const BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-[#0A1F44] text-white',
  SALE: 'bg-[#E8553A] text-white',
  BESTSELLER: 'bg-amber-500 text-white',
  LIMITED: 'bg-purple-600 text-white',
}
export default function ProductDetailClient({
  product,
  related,
  crossSellProducts = [],
}: Props) {
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >(product.variants?.[0]?.id)
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1
  const selectedVariant =
    product.variants?.find((v: any) => v.id === selectedVariantId) ??
    product.variants?.[0]
  const selectedVariantStock: number =
    typeof selectedVariant?.inventory_quantity === 'number'
      ? selectedVariant.inventory_quantity
      : product.stock
  const selectedVariantInStock: boolean =
    typeof selectedVariant?.inventory_quantity === 'number'
      ? selectedVariant.inventory_quantity > 0
      : product.inStock
  const galleryImages: string[] =
    selectedVariant?.images?.length > 0
      ? selectedVariant.images.map((img: any) => img.url)
      : product.images
  useEffect(() => {
    setActiveImage(0)
  }, [selectedVariantId])
  const optionGroups = useMemo(
    () =>
      (product.options ?? []).map((opt: any) => ({
        id: opt.id,
        title: opt.title,
        values: opt.values?.map((v: any) => v.value) ?? [],
      })),
    [product.options],
  )
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(() => {
    const map: Record<string, string> = {}
    product.variants?.[0]?.options?.forEach((o: any) => {
      const group = (product.options ?? []).find(
        (g: any) => g.id === o.option_id,
      )
      if (group) map[group.title] = o.value
    })
    return map
  })
  useEffect(() => {
    if (optionGroups.length === 0) return
    const match = product.variants?.find((v: any) =>
      optionGroups.every((g: any) => {
        const wanted = selectedOptions[g.title]
        if (!wanted) return true
        const entry = v.options?.find((o: any) => o.option_id === g.id)
        return entry?.value === wanted
      }),
    )
    if (match) setSelectedVariantId(match.id)
  }, [selectedOptions])
  const isOptionValueAvailable = (groupId: string, value: string) =>
    (product.variants ?? []).some((v: any) => {
      const hasThisValue = v.options?.some(
        (o: any) => o.option_id === groupId && o.value === value,
      )
      if (!hasThisValue) return false
      const matchesOtherGroups = optionGroups.every((g: any) => {
        if (g.id === groupId) return true
        const wanted = selectedOptions[g.title]
        if (!wanted) return true
        const entry = v.options?.find((o: any) => o.option_id === g.id)
        return entry?.value === wanted
      })
      if (!matchesOtherGroups) return false
      return (
        typeof v.inventory_quantity !== 'number' || v.inventory_quantity > 0
      )
    })
  const colorCodeMap = useMemo(() => {
    const map: Record<string, string> = {}
    ;(product.variants ?? []).forEach((v: any) => {
      const colorOpt = v.options?.find(
        (o: any) =>
          o.option?.title === 'Color' || o.option_id?.startsWith('opt_'),
      )
      const colorName = colorOpt?.value?.toLowerCase()
      const hex = v.metadata?.color_code
      if (colorName && hex) map[colorName] = hex
    })
    return map
  }, [product.variants])
  const swatchColor = (value: string) => {
    const key = value.toLowerCase()
    return colorCodeMap[key] ?? key.replace(/\s+/g, '')
  }
  const [stringSelection, setStringSelection] =
    useState<StringSelection | null>(null)
  const [selectedGrip, setSelectedGrip] = useState<RacketGripOption | null>(
    null,
  )
  const [activeTab, setActiveTab] = useState<
    'description' | 'specs' | 'shipping'
  >('description')
  const hasDescription = Boolean(product.description?.trim())
  const hasSpecs = Boolean(product.specs && product.specs.length > 0)
  const availableTabs = (['description', 'specs', 'shipping'] as const).filter(
    (tab) => {
      if (tab === 'description') return hasDescription
      if (tab === 'specs') return hasSpecs
      return true
    },
  )
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs, activeTab])
  useEffect(() => {
    recordRecentlyViewed(product.id)
  }, [product.id])
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const categoryLower = (product.category ?? '').toLowerCase()
  const isShoe = categoryLower.includes('shoe')
  const isApparel =
    categoryLower.includes('top') ||
    categoryLower.includes('bottom') ||
    categoryLower.includes('cloth') ||
    categoryLower.includes('apparel') ||
    categoryLower.includes('sock')
  const showSizeGuideLink = isShoe || isApparel
  const nameLower = (product.name ?? '').toLowerCase()
  const sportLower = (product.sport ?? '').toLowerCase().trim()
  const isRacket =
    (categoryLower.includes('racket') ||
      categoryLower.includes('racquet') ||
      nameLower.includes('racket') ||
      nameLower.includes('racquet')) &&
    sportLower !== 'squash'
  const racketGuideSport =
    sportLower === 'padel'
      ? 'padel'
      : sportLower === 'tennis'
        ? 'tennis'
        : 'badminton'
  const addItem = useCartStore((s) => s.addItem)
  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0
  const displayBadge = product.badge ?? (discount > 0 ? 'SALE' : null)
  const tierDiscountPct = useMemo(() => {
    if (!product.tierPricing || product.tierPricing.length === 0) return 0
    const applicable = product.tierPricing.filter(
      (t: { minQty: number; maxQty?: number; discountPct: number }) =>
        quantity >= t.minQty &&
        (t.maxQty === undefined || quantity <= t.maxQty),
    )
    if (applicable.length === 0) return 0
    return applicable.sort(
      (
        a: {
          minQty: number
        },
        b: {
          minQty: number
        },
      ) => b.minQty - a.minQty,
    )[0].discountPct
  }, [product.tierPricing, quantity])
  const tierUnitPrice = product.price * (1 - tierDiscountPct / 100)
  const handleAddToCart = async () => {
    if (adding || added) return
    const variant = selectedVariant
    if (!variant) {
      toast.error('Product variant not found')
      return
    }
    if (hasMultipleVariants && !selectedVariantId) {
      toast.error('Please choose an option before adding to cart')
      return
    }
    setAdding(true)
    try {
      const racketMetadata = stringSelection
        ? {
            string_upgrade: 'Yes',
            string_choice: `${stringSelection.string.brand} ${stringSelection.string.name}`,
            string_tension: `${stringSelection.tension} lbs`,
          }
        : product.stringUpgradeAvailable
          ? {
              string_upgrade: 'No Thanks',
            }
          : undefined
      const sizeGroup = optionGroups.find((g: any) => /size/i.test(g.title))
      const colorGroup = optionGroups.find((g: any) => /colou?r/i.test(g.title))
      addItem(
        product,
        quantity,
        {
          id: variant.id,
          size: sizeGroup
            ? selectedOptions[sizeGroup.title]
            : optionGroups.length === 0
              ? variant.title
              : undefined,
          color: colorGroup ? selectedOptions[colorGroup.title] : undefined,
        },
        racketMetadata,
      )
      if (selectedGrip) {
        const gripProduct: Product = {
          id: selectedGrip.productId,
          name: selectedGrip.name,
          slug: '',
          description: '',
          brand: selectedGrip.brand,
          sport: product.sport,
          category: '',
          categoryId: '',
          price: selectedGrip.price,
          images: selectedGrip.image ? [selectedGrip.image] : [],
          stock: 1,
          sku: '',
          rating: 0,
          reviewCount: 0,
          inStock: true,
          tags: [],
          specs: [],
        }
        addItem(
          gripProduct,
          quantity,
          {
            id: selectedGrip.variantId,
          },
          {
            linked_product: product.name,
            grip_choice: selectedGrip.name,
          },
        )
      }
      if (stringSelection && stringSelection.string.price > 0) {
        const stringProduct: Product = {
          id: stringSelection.string.productId,
          name: `${stringSelection.string.brand} ${stringSelection.string.name} Stringing`,
          slug: '',
          description: '',
          brand: stringSelection.string.brand,
          sport: product.sport,
          category: '',
          categoryId: '',
          price: stringSelection.string.price,
          images: [],
          stock: 1,
          sku: '',
          rating: 0,
          reviewCount: 0,
          inStock: true,
          tags: [],
          specs: [],
        }
        addItem(
          stringProduct,
          quantity,
          {
            id: stringSelection.string.variantId,
          },
          {
            linked_product: product.name,
            string_choice: `${stringSelection.string.brand} ${stringSelection.string.name}`,
            string_tension: `${stringSelection.tension} lbs`,
          },
        )
      }
      setAdded(true)
      toast.success('Added to cart!')
      setTimeout(() => setAdded(false), 3000)
    } catch (err) {
      toast.error('Could not add to cart. Try again.')
    } finally {
      setAdding(false)
    }
  }
  return (
    <div className='min-h-screen bg-white'>
      {}
      <div className='bg-[#F2F4F7] border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
          <div className='flex items-center gap-2 text-sm font-lato text-gray-500'>
            <Link href='/' className='hover:text-[#E8553A] transition-colors'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <Link
              href='/shop'
              className='hover:text-[#E8553A] transition-colors'
            >
              Shop
            </Link>
            <ChevronRightIcon size={14} />
            <Link
              href={`/shop?sport=${product.sport}`}
              className='hover:text-[#E8553A] transition-colors capitalize'
            >
              {product.sport}
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-[#0A1F44] font-medium truncate max-w-xs'>
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        {}
        <div className='flex flex-col lg:flex-row lg:gap-12 lg:items-start'>
          {}
          <div className='hidden lg:block lg:w-1/2 lg:sticky lg:top-24 space-y-4'>
            <ProductImageZoom
              src={galleryImages[activeImage]}
              alt={product.name}
            >
              {displayBadge && (
                <span
                  className={`absolute top-4 left-4 text-xs font-black px-3 py-1.5 rounded-full font-montserrat ${BADGE_STYLES[displayBadge]}`}
                >
                  {displayBadge}
                </span>
              )}
              {discount > 0 && (
                <span className='absolute top-4 right-4 text-xs font-black px-3 py-1.5 rounded-full bg-[#E8553A] text-white font-montserrat'>
                  -{discount}%
                </span>
              )}
            </ProductImageZoom>
            {galleryImages.length > 1 && (
              <div className='flex gap-3'>
                {galleryImages.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#E8553A]' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className='w-full h-full object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
            <div className='mt-4'>
              {isRacket && racketGuideSport === 'padel' && <PadelRacketGuide />}
              {isRacket && racketGuideSport !== 'padel' && (
                <RacketBuyingGuide sport={racketGuideSport} />
              )}
              {isShoe && <ShoeBuyingGuide sport={product.sport} />}
            </div>
          </div>

          {}
          {}
          <div className='flex flex-col lg:w-1/2'>
            {}
            <div className='order-2 mb-8 lg:hidden space-y-4'>
              <ProductImageZoom
                src={galleryImages[activeImage]}
                alt={product.name}
              >
                {displayBadge && (
                  <span
                    className={`absolute top-4 left-4 text-xs font-black px-3 py-1.5 rounded-full font-montserrat ${BADGE_STYLES[displayBadge]}`}
                  >
                    {displayBadge}
                  </span>
                )}
                {discount > 0 && (
                  <span className='absolute top-4 right-4 text-xs font-black px-3 py-1.5 rounded-full bg-[#E8553A] text-white font-montserrat'>
                    -{discount}%
                  </span>
                )}
              </ProductImageZoom>
              {galleryImages.length > 1 && (
                <div className='flex gap-3'>
                  {galleryImages.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#E8553A]' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${i + 1}`}
                        className='w-full h-full object-cover'
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className='order-12 mt-8 lg:hidden'>
              {isRacket && racketGuideSport === 'padel' && <PadelRacketGuide />}
              {isRacket && racketGuideSport !== 'padel' && (
                <RacketBuyingGuide sport={racketGuideSport} />
              )}
              {isShoe && <ShoeBuyingGuide sport={product.sport} />}
            </div>

            {}
            <div className='order-1'>
              <div className='flex items-center gap-3 mb-3'>
                <span className='text-sm font-bold text-[#E8553A] font-lato uppercase tracking-wider'>
                  {product.brand}
                </span>
                <span className='w-1 h-1 rounded-full bg-gray-300' />
                <span className='text-sm text-gray-400 font-lato capitalize'>
                  {product.sport}
                </span>
              </div>

              <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-4 leading-tight'>
                {product.name}
              </h1>

              <SocialShare
                url={`${SITE_URL}/shop/${product.slug}`}
                title={product.name}
              />

              <div className='flex items-center gap-3 mb-5'>
                <div className='flex items-center gap-1'>
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      size={16}
                      filled={i < Math.floor(product.rating)}
                      className={
                        i < Math.floor(product.rating)
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }
                    />
                  ))}
                </div>
                <span className='font-montserrat font-bold text-[#0A1F44]'>
                  {product.rating}
                </span>
                <span className='text-gray-400 font-lato text-sm'>
                  ({product.reviewCount} reviews)
                </span>
              </div>
            </div>

            {}
            <div className='order-3 lg:order-2 flex items-center gap-4 mb-6 pb-6 border-b border-gray-100'>
              <span className='font-montserrat font-black text-4xl text-[#0A1F44]'>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className='text-xl text-gray-400 line-through font-lato'>
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className='bg-[#E8553A]/10 text-[#E8553A] font-montserrat font-black text-sm px-3 py-1 rounded-full'>
                    Save {discount}%
                  </span>
                </>
              )}
              {stringSelection && (
                <span className='bg-amber-100 text-amber-700 font-montserrat font-bold text-xs px-3 py-1 rounded-full'>
                  incl. stringing
                </span>
              )}
            </div>

            {}
            {product.tierPricing && product.tierPricing.length > 0 && (
              <div className='order-3 lg:order-2 mb-6 pb-6 border-b border-gray-100'>
                <p className='font-montserrat font-bold text-xs text-[#0A1F44] uppercase tracking-wider mb-2.5'>
                  Buy More, Save More
                </p>
                <div className='space-y-1.5'>
                  {[...product.tierPricing]
                    .sort((a, b) => a.minQty - b.minQty)
                    .map((tier, i) => {
                      const isActive =
                        quantity >= tier.minQty &&
                        (tier.maxQty === undefined || quantity <= tier.maxQty)
                      const rangeLabel = tier.maxQty
                        ? `${tier.minQty}–${tier.maxQty} units`
                        : `${tier.minQty}+ units`
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3.5 py-2 rounded-lg border text-sm font-lato transition-colors ${isActive ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-100'}`}
                        >
                          <span
                            className={
                              isActive
                                ? 'font-bold text-[#0A1F44]'
                                : 'text-gray-500'
                            }
                          >
                            {rangeLabel}
                          </span>
                          <span
                            className={`font-montserrat font-black ${isActive ? 'text-[#E8553A]' : 'text-gray-400'}`}
                          >
                            {tier.discountPct}% off
                          </span>
                        </div>
                      )
                    })}
                </div>
                {tierDiscountPct > 0 && (
                  <div className='mt-3 flex items-center justify-between bg-gray-50 rounded-lg px-3.5 py-2.5'>
                    <span className='text-xs text-gray-500 font-lato'>
                      At {quantity} unit{quantity > 1 ? 's' : ''}, estimated
                      price
                    </span>
                    <span className='font-montserrat font-black text-sm text-[#0A1F44]'>
                      {formatPrice(tierUnitPrice)}
                      <span className='text-gray-400 font-normal'>
                        /unit
                      </span> · {formatPrice(tierUnitPrice * quantity)} total
                    </span>
                  </div>
                )}
              </div>
            )}

            {}
            {hasMultipleVariants && optionGroups.length > 0 && (
              <div className='order-4 lg:order-3 mb-6 pb-6 border-b border-gray-100 space-y-5'>
                {optionGroups.map((group: any) => {
                  const isColor = /colou?r/i.test(group.title)
                  return (
                    <div key={group.id}>
                      <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2.5'>
                        {group.title}
                        {selectedOptions[group.title] && (
                          <span className='font-normal text-gray-500'>
                            : {selectedOptions[group.title]}
                          </span>
                        )}
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {group.values.map((value: any) => {
                          const isSelected =
                            selectedOptions[group.title] === value
                          const available = isOptionValueAvailable(
                            group.id,
                            value,
                          )
                          return (
                            <button
                              key={value}
                              type='button'
                              disabled={!available}
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [group.title]: value,
                                }))
                              }
                              title={
                                !available ? `${value} — Out of stock` : value
                              }
                              className={`transition-all font-montserrat font-semibold text-sm ${isColor ? `w-9 h-9 rounded-lg border-2 ${isSelected ? 'border-[#E8553A] ring-2 ring-[#E8553A]/30' : 'border-gray-200 hover:border-[#0A1F44]/40'} ${!available ? 'opacity-30 cursor-not-allowed' : ''}` : `px-4 py-2 rounded-lg border ${isSelected ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]' : available ? 'border-gray-200 text-[#0A1F44] hover:border-[#E8553A]' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}`}
                              style={
                                isColor
                                  ? {
                                      backgroundColor: swatchColor(value),
                                    }
                                  : undefined
                              }
                            >
                              {isColor ? '' : value}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {}
            {hasMultipleVariants && optionGroups.length === 0 && (
              <div className='order-4 lg:order-3 mb-6 pb-6 border-b border-gray-100'>
                <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2.5'>
                  Choose an option
                </p>
                <div className='flex flex-wrap gap-2'>
                  {product.variants!.map((v: any) => {
                    const label = v.title || 'Option'
                    const isSelected = v.id === selectedVariantId
                    const outOfStock =
                      typeof v.inventory_quantity === 'number' &&
                      v.inventory_quantity <= 0
                    return (
                      <button
                        key={v.id}
                        type='button'
                        disabled={outOfStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-4 py-2 rounded-lg border text-sm font-montserrat font-semibold transition-all ${isSelected ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]' : outOfStock ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-[#0A1F44] hover:border-[#E8553A]'}`}
                        title={outOfStock ? `${label} — Out of stock` : label}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {}
            <div className='order-10 lg:order-9 mb-6'>
              <div className='flex border-b border-gray-200 mb-4'>
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-semibold font-montserrat capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-[#E8553A] text-[#E8553A]' : 'border-transparent text-gray-400 hover:text-[#0A1F44]'}`}
                  >
                    {tab === 'specs'
                      ? 'Specifications'
                      : tab === 'shipping'
                        ? 'Shipping & Returns'
                        : 'Description'}
                  </button>
                ))}
              </div>

              {activeTab === 'description' && (
                <div>
                  {}
                  <div
                    className='font-lato text-gray-600 leading-relaxed mb-4 [&_p]:mb-4 [&_h3]:font-montserrat [&_h3]:font-semibold [&_h3]:text-[#0A1F44] [&_h3]:text-base [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1 [&_li]:leading-relaxed [&_a]:text-[#E8553A] [&_a]:underline [&_strong]:font-semibold [&_strong]:text-[#0A1F44]'
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(product.description || ''),
                    }}
                  />
                  <div className='flex flex-wrap gap-2'>
                    {product.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className='px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-lato'
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div>
                  {product.specs && product.specs.length > 0 ? (
                    <div className='rounded-xl overflow-hidden border border-gray-100'>
                      {product.specs.map((spec: any, i: number) => (
                        <div
                          key={spec.label}
                          className={`flex items-center px-4 py-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                        >
                          <span className='w-1/2 text-sm font-semibold text-[#0A1F44] font-lato'>
                            {spec.label}
                          </span>
                          <span className='w-1/2 text-sm text-gray-600 font-lato'>
                            {spec.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-gray-400 font-lato'>
                      No specifications available.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className='space-y-6'>
                  <div>
                    <p className='text-sm font-black text-[#0A1F44] font-montserrat mb-2'>
                      Shipping Policy
                    </p>
                    <div className='space-y-3'>
                      {[
                        'Free shipping on all orders exceeding £80.',
                        'Standard shipping orders are dispatched via Royal Mail.',
                        'Express shipping orders are dispatched via Royal Mail Special Delivery.',
                        'Usual shipping duration for UK customers is 1–3 working days.',
                        'Opted for our racket restringing service? Add an extra day to the shipping time.',
                      ].map((line) => (
                        <div key={line} className='flex gap-3'>
                          <div className='w-1.5 h-1.5 rounded-full bg-[#E8553A] mt-2 shrink-0' />
                          <p className='text-sm text-gray-500 font-lato'>
                            {line}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className='text-sm font-black text-[#0A1F44] font-montserrat mb-2'>
                      Return Policy
                    </p>
                    <div className='space-y-3'>
                      {[
                        'Return any item within a 30-day window, provided it\u2019s in original condition, unused, and with tags intact.',
                        'Return labels can be provided at a subsidised fee if needed.',
                        'Rackets that have been re-strung are NOT eligible for return.',
                        'Rackets with the plastic wrapping removed and/or a grip applied are not eligible for return.',
                      ].map((line) => (
                        <div key={line} className='flex gap-3'>
                          <div className='w-1.5 h-1.5 rounded-full bg-[#E8553A] mt-2 shrink-0' />
                          <p className='text-sm text-gray-500 font-lato'>
                            {line}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Link
                      href='/pages/refund-and-return-policy'
                      className='inline-block mt-2 text-xs font-bold text-[#0A1F44] underline decoration-gray-300 hover:decoration-[#E8553A] hover:text-[#E8553A] transition-colors'
                    >
                      Read our full return/exchange policy
                    </Link>
                  </div>

                  <div>
                    <p className='text-sm font-black text-[#0A1F44] font-montserrat mb-2'>
                      Warranty
                    </p>
                    <div className='flex gap-3'>
                      <div className='w-1.5 h-1.5 rounded-full bg-[#E8553A] mt-2 shrink-0' />
                      <p className='text-sm text-gray-500 font-lato'>
                        All items purchased come with a 1-month warranty. In the
                        event of any product issues, we&apos;ll work with the
                        manufacturer to get it resolved promptly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {}
            <div className='order-3 lg:order-2 flex items-center justify-between gap-2 mb-6'>
              <div className='flex items-center gap-2'>
                {selectedVariantInStock ? (
                  <>
                    <div className='w-2 h-2 rounded-full bg-green-500' />
                    <span className='text-sm text-green-600 font-semibold font-lato'>
                      {selectedVariantStock < 5 ? (
                        <>
                          In Stock{' '}
                          <span className='text-red-500 font-bold'>
                            (Only {selectedVariantStock}{' '}
                            {selectedVariantStock === 1 ? 'unit' : 'units'}{' '}
                            left!)
                          </span>
                        </>
                      ) : (
                        'In Stock'
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <div className='w-2 h-2 rounded-full bg-red-500' />
                    <span className='text-sm text-red-500 font-semibold font-lato'>
                      Out of Stock
                    </span>
                  </>
                )}
              </div>

              {showSizeGuideLink && (
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className='text-xs font-montserrat font-bold text-[#0A1F44] underline decoration-gray-300 hover:decoration-[#E8553A] hover:text-[#E8553A] transition-colors shrink-0'
                >
                  Size Guide
                </button>
              )}
            </div>

            {showSizeGuide && (
              <SizeGuideModal
                initialTab={isShoe ? 'shoes' : 'apparel'}
                onClose={() => setShowSizeGuide(false)}
              />
            )}

            {}
            {product.stringUpgradeAvailable && (
              <div className='order-5 lg:order-4'>
                <StringUpgrade
                  sport={product.sport}
                  upgradeType={product.stringUpgradeType}
                  onStringChange={(sel) => setStringSelection(sel)}
                  onGripChange={(grip) => setSelectedGrip(grip)}
                />
              </div>
            )}

            {}
            {!selectedVariantInStock && (
              <div className='order-6 lg:order-5 mb-6'>
                <p className='text-xs text-gray-500 font-lato mb-2'>
                  Leave your email and we&apos;ll let you know the moment this
                  is back.
                </p>
                <NotifyStockForm
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            )}

            {}
            <div className='order-7 lg:order-6 flex items-center gap-4 mb-6'>
              <div className='flex items-center border border-gray-200 rounded-xl overflow-hidden'>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className='w-11 h-11 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                >
                  <MinusIcon size={16} />
                </button>
                <span className='w-12 text-center font-montserrat font-bold text-[#0A1F44]'>
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(selectedVariantStock, quantity + 1))
                  }
                  className='w-11 h-11 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                >
                  <PlusIcon size={16} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!selectedVariantInStock || adding}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-montserrat font-black text-sm transition-all duration-200 ${!selectedVariantInStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : added ? 'bg-green-500 text-white' : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:shadow-[#E8553A]/30 hover:-translate-y-0.5'}`}
              >
                <CartIcon size={18} />
                {!selectedVariantInStock
                  ? 'Out of Stock'
                  : adding
                    ? 'Adding...'
                    : added
                      ? '✓ Added to Cart'
                      : 'Add to Cart'}
              </button>

              <button
                onClick={() => setWishlisted((w) => !w)}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${wishlisted ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]' : 'border-gray-200 text-gray-400 hover:border-[#E8553A]/40'}`}
              >
                <HeartIcon size={20} filled={wishlisted} />
              </button>
            </div>

            <p className='order-8 lg:order-7 text-xs text-gray-400 font-lato mb-6'>
              SKU: <span className='font-semibold'>{product.sku}</span>
            </p>

            <div className='order-9 lg:order-8 grid grid-cols-3 gap-3 pt-6 border-t border-gray-100'>
              {[
                {
                  icon: <TruckIcon size={18} />,
                  text: 'Free Delivery',
                },
                {
                  icon: <ShieldIcon size={18} />,
                  text: '100% Authentic',
                },
                {
                  icon: <RefreshIcon size={18} />,
                  text: '7-Day Returns',
                },
              ].map((badge) => (
                <div
                  key={badge.text}
                  className='flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center'
                >
                  <span className='text-[#E8553A]'>{badge.icon}</span>
                  <span className='text-xs font-semibold text-[#0A1F44] font-lato'>
                    {badge.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {}
        </div>
        {}

        {}
        <div className='mt-16 pt-8 border-t border-gray-100 max-w-2xl'>
          <h2 className='font-montserrat font-black text-sm text-[#0A1F44] uppercase tracking-wider mb-2'>
            Who we are
          </h2>
          <p className='text-sm text-gray-500 font-lato leading-relaxed'>
            With a team coming from a diverse background, we&apos;re run by
            players who are actively playing at club to county level in
            badminton, tennis and squash. We love to share our knowledge, so
            feel free to give us a ring with any questions!
          </p>
        </div>

        {}
        <div className='mt-16'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='font-montserrat font-black text-2xl text-[#0A1F44]'>
              Customer Reviews
            </h2>
            {product.reviewCount > 0 && (
              <div className='flex items-center gap-1.5'>
                <div className='flex items-center gap-0.5'>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarIcon
                      key={s}
                      size={14}
                      filled={s <= Math.round(product.rating)}
                      className={
                        s <= Math.round(product.rating)
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }
                    />
                  ))}
                </div>
                <span className='text-sm text-gray-500 font-lato'>
                  {product.rating} ({product.reviewCount})
                </span>
              </div>
            )}
          </div>
          <ProductReviews
            productId={product.id}
            initialRating={product.rating}
            initialCount={product.reviewCount}
          />
        </div>

        <CrossSellSuggestions products={crossSellProducts} />

        {related.length > 0 && (
          <div className='mt-20'>
            <ProductGrid
              products={related}
              title='You Might Also Like'
              showSort={false}
              showViewToggle={false}
              columns={4}
            />
          </div>
        )}
      </div>
    </div>
  )
}
