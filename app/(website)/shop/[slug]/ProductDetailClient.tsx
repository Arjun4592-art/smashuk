'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/api/store'
import ProductGrid from '@/components/website/ProductGrid'
import ProductImageZoom from '@/components/website/ProductImageZoom'
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
} from '@/components/ui/Icons'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/website/ProductReviews'
import SizeGuideModal from '@/components/website/SizeGuideModal'
import NotifyStockForm from '@/components/website/NotifyStockForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StringOption {
  id: string
  name: string
  brand: string
  tensionRange: string
  bestFor: string
  color: string
}

// The paid overgrip add-on (matches smashuk.co's "Racket Grips" dropdown —
// NOT the same as handle grip size; this is the overwrap tape). This is
// ALWAYS shown/selectable on smashuk.co — it does NOT live inside the
// "Free String Upgrade" Yes/No toggle, and is not gated by it.
//
// IMPORTANT: this is no longer a hardcoded/guessed list. Every entry here
// is resolved live against the Medusa backend (see GRIP_SEARCH_CANDIDATES
// + resolveGripOptions below) — if a candidate product doesn't actually
// exist in Medusa, it is simply never added to this list and never shown
// in the dropdown. name/price come straight from the matched Medusa
// product/variant, not from a guess, so there's nothing to "confirm" by
// eye against a screenshot anymore.
interface RacketGripOption {
  id: string // stable UI key (from the search candidate)
  name: string // real Medusa product title
  brand: string
  price: number // pounds, from the matched variant's real price — 0 for "No Thanks"
  productId: string
  variantId: string
}

// String Selection/Tension ARE gated by the free-string-upgrade toggle
// (they only make sense if the racket is actually being strung).
interface StringSelection {
  string: StringOption
  tension: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// String catalogues, keyed by product.sport (lowercased). Each product's
// dropdown only shows strings relevant to its sport — matches smashuk.co
// (badminton rackets show Yonex/Victor/Li-Ning strings, tennis rackets show
// Babolat/HEAD/Wilson, squash rackets show squash-specific strings).
const STRING_OPTIONS_BY_SPORT: Record<string, StringOption[]> = {
  badminton: [
    {
      id: 'yonex-bg65',
      name: 'BG 65',
      brand: 'Yonex',
      tensionRange: '18–28 lbs',
      bestFor: 'Durability & All-Round',
      color: '#E8553A',
    },
    {
      id: 'yonex-bg65ti',
      name: 'BG 65Ti',
      brand: 'Yonex',
      tensionRange: '18–28 lbs',
      bestFor: 'Repulsion & Control',
      color: '#0A1F44',
    },
    {
      id: 'yonex-bg66-ultimax',
      name: 'BG 66 Ultimax',
      brand: 'Yonex',
      tensionRange: '19–29 lbs',
      bestFor: 'Speed & Feel',
      color: '#6366f1',
    },
    {
      id: 'yonex-bg80',
      name: 'BG 80',
      brand: 'Yonex',
      tensionRange: '19–29 lbs',
      bestFor: 'Power',
      color: '#16a34a',
    },
    {
      id: 'yonex-bg80-power',
      name: 'BG 80 Power',
      brand: 'Yonex',
      tensionRange: '19–29 lbs',
      bestFor: 'Extra Power',
      color: '#dc2626',
    },
    {
      id: 'yonex-nanogy-98',
      name: 'Nanogy 98',
      brand: 'Yonex',
      tensionRange: '18–28 lbs',
      bestFor: 'Control & Feel',
      color: '#7c3aed',
    },
    {
      id: 'yonex-aerobite',
      name: 'Aerobite',
      brand: 'Yonex',
      tensionRange: '19–28 lbs',
      bestFor: 'Hybrid Spin & Power',
      color: '#0891b2',
    },
    {
      id: 'yonex-aerobite-boost',
      name: 'Aerobite Boost',
      brand: 'Yonex',
      tensionRange: '19–28 lbs',
      bestFor: 'Hybrid Extra Power',
      color: '#0e7490',
    },
    {
      id: 'yonex-exbolt-63',
      name: 'Exbolt 63',
      brand: 'Yonex',
      tensionRange: '19–29 lbs',
      bestFor: 'Flat Shots & Control',
      color: '#1d4ed8',
    },
    {
      id: 'yonex-exbolt-65',
      name: 'Exbolt 65',
      brand: 'Yonex',
      tensionRange: '19–29 lbs',
      bestFor: 'Repulsion & Durability',
      color: '#2563eb',
    },
    {
      id: 'li-ning-no1',
      name: 'No.1',
      brand: 'Li-Ning',
      tensionRange: '18–28 lbs',
      bestFor: 'All-Round Feel',
      color: '#b91c1c',
    },
    {
      id: 'victor-vbs70',
      name: 'VBS 70',
      brand: 'Victor',
      tensionRange: '19–29 lbs',
      bestFor: 'Power & Repulsion',
      color: '#ca8a04',
    },
    {
      id: 'victor-vbs68-control',
      name: 'VBS 68 Control',
      brand: 'Victor',
      tensionRange: '19–29 lbs',
      bestFor: 'Control',
      color: '#a16207',
    },
    {
      id: 'victor-vbs68-power',
      name: 'VBS 68 Power',
      brand: 'Victor',
      tensionRange: '19–29 lbs',
      bestFor: 'Power',
      color: '#854d0e',
    },
    {
      id: 'victor-vbs66-nano',
      name: 'VBS 66 Nano',
      brand: 'Victor',
      tensionRange: '20–30 lbs',
      bestFor: 'Thin Gauge & Feel',
      color: '#78350f',
    },
  ],
  tennis: [
    {
      id: 'babolat-spiraltek',
      name: 'Spiraltek',
      brand: 'Babolat',
      tensionRange: '50–55 lbs',
      bestFor: 'Power & Durability',
      color: '#E8553A',
    },
    {
      id: 'babolat-vs-touch',
      name: 'VS Touch',
      brand: 'Babolat',
      tensionRange: '48–58 lbs',
      bestFor: 'Feel & Control',
      color: '#0A1F44',
    },
    {
      id: 'head-velocity',
      name: 'Velocity MLT',
      brand: 'HEAD',
      tensionRange: '45–60 lbs',
      bestFor: 'Comfort & Power',
      color: '#6366f1',
    },
    {
      id: 'wilson-nxt',
      name: 'NXT Power',
      brand: 'Wilson',
      tensionRange: '50–60 lbs',
      bestFor: 'Spin & Touch',
      color: '#16a34a',
    },
  ],
  squash: [
    {
      id: 'ashaway-supernick-xl',
      name: 'SuperNick XL',
      brand: 'Ashaway',
      tensionRange: '19–24 lbs',
      bestFor: 'Feel & Control',
      color: '#E8553A',
    },
    {
      id: 'tecnifibre-305',
      name: '305 Slick',
      brand: 'Tecnifibre',
      tensionRange: '19–24 lbs',
      bestFor: 'Touch & Spin',
      color: '#0A1F44',
    },
    {
      id: 'head-powerkill-slick',
      name: 'PowerKill Slick',
      brand: 'HEAD',
      tensionRange: '19–24 lbs',
      bestFor: 'Power & Durability',
      color: '#6366f1',
    },
    {
      id: 'dunlop-silk',
      name: 'Silk',
      brand: 'Dunlop',
      tensionRange: '19–24 lbs',
      bestFor: 'Classic Feel',
      color: '#16a34a',
    },
  ],
}

// Fallback if a product's sport isn't one of the keys above.
const DEFAULT_STRING_OPTIONS = STRING_OPTIONS_BY_SPORT.tennis

function getStringOptionsForSport(sport?: string): StringOption[] {
  if (!sport) return DEFAULT_STRING_OPTIONS
  return (
    STRING_OPTIONS_BY_SPORT[sport.toLowerCase().trim()] ??
    DEFAULT_STRING_OPTIONS
  )
}

// The paid "Racket Grips" add-on (overgrip tape). Instead of a hardcoded,
// partly-guessed list, this is now a set of SEARCH CANDIDATES — real
// product names confirmed against smashuk.co's own grip collection pages
// (smashuk.co/collections/*-grips), used to look each one up against THIS
// store's Medusa backend. A candidate only ever reaches the dropdown if a
// matching product is actually found in Medusa (see resolveGripOptions
// below) — "not set up in the backend yet" now means "doesn't show up",
// not "shows up and fails at checkout".
const GRIP_SEARCH_CANDIDATES: { id: string; brand: string; query: string }[] = [
  { id: 'babolat-my-overgrip', brand: 'Babolat', query: 'Babolat MY Overgrip' },
  { id: 'yonex-pu-overgrip', brand: 'Yonex', query: 'Yonex PU Overgrip' },
  {
    id: 'victor-fishbone-replacement-grip',
    brand: 'Victor',
    query: 'Victor Fishbone Replacement Grip',
  },
  {
    id: 'yonex-super-grap-pure',
    brand: 'Yonex',
    query: 'Yonex Super Grap Pure AC108',
  },
  {
    id: 'babolat-syntec-x1-white',
    brand: 'Babolat',
    query: 'Babolat Syntec X1 Replacement Grip White',
  },
  {
    id: 'babolat-syntec-x1-black-yellow',
    brand: 'Babolat',
    query: 'Babolat Syntec X1 Replacement Grip Black Yellow',
  },
  {
    id: 'babolat-vs-original-overgrip-3pack',
    brand: 'Babolat',
    query: 'Babolat VS Original Feel Overgrip 3 Pack',
  },
  {
    id: 'babolat-pro-response-overgrip-3pack',
    brand: 'Babolat',
    query: 'Babolat Pro Response Overgrip 3 Pack',
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

// Looks up each candidate against THIS store's Medusa backend (via the
// existing /api/store/products proxy) and keeps only the ones that
// actually resolve to a real product + purchasable variant with a GBP
// price. Runs all lookups in parallel — one product page load does one
// batch of requests, not one request per candidate at add-to-cart time.
async function resolveGripOptions(): Promise<RacketGripOption[]> {
  const results = await Promise.all(
    GRIP_SEARCH_CANDIDATES.map(async (candidate) => {
      try {
        const res = await fetch(
          `/api/store/products?q=${encodeURIComponent(candidate.query)}&limit=3`,
        )
        if (!res.ok) return null
        const data = await res.json()
        const products: any[] = data.products ?? []
        // Prefer a product whose brand metadata/title actually matches —
        // guards against the search returning an unrelated item as its
        // top hit.
        const match =
          products.find((p: any) =>
            (p.title ?? '')
              .toLowerCase()
              .includes(candidate.brand.toLowerCase()),
          ) ?? products[0]
        if (!match) return null

        const variant = match.variants?.[0]
        if (!variant) return null // no purchasable variant — skip it

        const gbp = (variant.prices ?? []).find(
          (pr: any) => pr.currency_code === 'gbp',
        )
        const priceAmount =
          variant.calculated_price?.calculated_amount ?? gbp?.amount
        if (priceAmount === undefined) return null // no real price — skip it

        const resolved: RacketGripOption = {
          id: candidate.id,
          name: match.title ?? candidate.query,
          brand: candidate.brand,
          price: priceAmount,
          productId: match.id,
          variantId: variant.id,
        }
        return resolved
      } catch {
        return null
      }
    }),
  )
  return results.filter((r): r is RacketGripOption => r !== null)
}

// String tension is a dropdown of whole numbers, not a slider — range
// varies by sport (badminton strings tension much lower than tennis/squash).
const TENSION_RANGE_BY_SPORT: Record<string, { min: number; max: number }> = {
  badminton: { min: 18, max: 30 },
  tennis: { min: 44, max: 62 },
  squash: { min: 19, max: 24 },
}
const DEFAULT_TENSION_RANGE = TENSION_RANGE_BY_SPORT.tennis

function getTensionRangeForSport(sport?: string) {
  if (!sport) return DEFAULT_TENSION_RANGE
  return (
    TENSION_RANGE_BY_SPORT[sport.toLowerCase().trim()] ?? DEFAULT_TENSION_RANGE
  )
}

// ─── StringUpgrade Component ──────────────────────────────────────────────────
//
// IMPORTANT STRUCTURE NOTE (fixed per smashuk.co reference):
// "Free String Upgrade" (Yes/No) and "Racket Grips" are two INDEPENDENT
// fields on smashuk.co. Racket Grips is ALWAYS visible and selectable,
// regardless of whether String Upgrade is Yes or No — it is NOT nested
// inside the Yes-only collapsible panel. Only "String Selection" and
// "String Tension" are gated behind the Yes toggle, because those two only
// make sense once you've said yes to stringing.
//
// Previously this component nested Racket Grips inside the same
// max-h-0/collapse block as String Selection/Tension, so the grip dropdown
// never rendered until the customer selected "Yes" for the free upgrade —
// that's now fixed below: Racket Grips renders in its own block, outside
// the `enabled` conditional, right after the toggle.

function StringUpgrade({
  sport,
  onStringChange,
  onGripChange,
}: {
  sport?: string
  onStringChange?: (sel: StringSelection | null) => void
  onGripChange?: (grip: RacketGripOption | null) => void
}) {
  const STRING_OPTIONS = getStringOptionsForSport(sport)
  const { min: tensionMin, max: tensionMax } = getTensionRangeForSport(sport)
  const [enabled, setEnabled] = useState(false)
  const [selectedString, setSelectedString] = useState<StringOption>(
    STRING_OPTIONS[0],
  )
  const [tension, setTension] = useState(
    Math.round((tensionMin + tensionMax) / 2),
  )
  const [gripId, setGripId] = useState<string>('none')

  // Racket Grips options are fetched from Medusa on mount, not hardcoded —
  // a candidate only appears here if it's actually a real, purchasable
  // product in the backend right now. While this is loading, the dropdown
  // shows just "No Thanks"; if a product gets removed/unpublished in
  // Medusa later, it simply stops appearing next time the page loads.
  const [gripOptions, setGripOptions] = useState<RacketGripOption[]>([])
  const [gripsLoading, setGripsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    resolveGripOptions()
      .then((options) => {
        if (!cancelled) setGripOptions(options)
      })
      .finally(() => {
        if (!cancelled) setGripsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const allGripOptions = [NO_GRIP_OPTION, ...gripOptions]
  const selectedGrip =
    allGripOptions.find((g) => g.id === gripId) ?? NO_GRIP_OPTION

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    onStringChange?.(next ? { string: selectedString, tension } : null)
  }

  const updateString = (opt: StringOption) => {
    setSelectedString(opt)
    if (enabled) onStringChange?.({ string: opt, tension })
  }

  const updateTension = (val: number) => {
    setTension(val)
    if (enabled) onStringChange?.({ string: selectedString, tension: val })
  }

  // Racket Grips (overgrip) is independent of the free-string-upgrade
  // toggle — it's its own dropdown on smashuk.co and carries a real
  // charge, so it's always available, not just when "Free String
  // Upgrade" is Yes. The selected option is already a real, resolved
  // Medusa product/variant by this point — no lookup needed later.
  const updateGrip = (id: string) => {
    setGripId(id)
    const grip = allGripOptions.find((g) => g.id === id) ?? null
    onGripChange?.(grip && grip.id !== 'none' ? grip : null)
  }

  return (
    <div className='mb-6 space-y-4'>
      {/* Free String Upgrade toggle + Racket Grips side by side (per
          request) — Racket Grips stays fully independent of the toggle's
          on/off state, it's just laid out next to it now instead of
          stacked below it. */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
        <div>
          <button
            type='button'
            onClick={toggle}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${enabled ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
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
                  Free String Upgrade
                  <span className='ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-lato'>
                    +1 Day
                  </span>
                </p>
                <p className='text-xs text-gray-400 font-lato'>
                  {enabled
                    ? `${selectedString.brand} ${selectedString.name} · ${tension} lbs — free`
                    : 'Get your racket professionally strung before dispatch, free'}
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

        {/* Racket Grips — ALWAYS visible/selectable, independent of the Free
          String Upgrade toggle above (matches smashuk.co: the dropdown
          shows even when String Upgrade is untouched/"No Thanks"). Options
          are only ever ones actually found in the Medusa backend — nothing
          here is guessed or hardcoded. */}
        <div>
          <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider mb-2.5'>
            Racket Grips
            {selectedGrip.price > 0 && (
              <span className='ml-1.5 text-[#E8553A] normal-case tracking-normal'>
                (+ £{selectedGrip.price.toFixed(2)} GBP)
              </span>
            )}
          </p>
          <div className='relative'>
            <select
              value={gripId}
              onChange={(e) => updateGrip(e.target.value)}
              disabled={gripsLoading}
              className='w-full appearance-none px-3.5 py-3 pr-9 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-montserrat font-bold text-[#0A1F44] focus:outline-none focus:border-[#E8553A] transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60'
            >
              {gripsLoading ? (
                <option value='none'>Checking available grips…</option>
              ) : (
                allGripOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {g.price > 0 ? ` (+£${g.price.toFixed(2)} GBP)` : ''}
                  </option>
                ))
              )}
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

      {/* Gated behind "Yes" — String Selection + Tension only, exactly like
          smashuk.co. Full width, sits below the toggle/grips row above
          rather than tucked under just the toggle, since it now needs to
          span both columns. */}
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
                value={selectedString.id}
                onChange={(e) => {
                  const opt = STRING_OPTIONS.find(
                    (o) => o.id === e.target.value,
                  )
                  if (opt) updateString(opt)
                }}
                className='w-full appearance-none px-3.5 py-3 pr-9 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-montserrat font-bold text-[#0A1F44] focus:outline-none focus:border-[#E8553A] transition-colors cursor-pointer'
              >
                {STRING_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.brand} {opt.name}
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
            <p className='text-[11px] text-gray-400 font-lato mt-1.5'>
              {selectedString.bestFor} · Recommended tension{' '}
              {selectedString.tensionRange}
            </p>
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
                  { length: tensionMax - tensionMin + 1 },
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
              <span className='font-semibold text-green-600'>Free</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  product: any
  related: any[]
}

const BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-[#0A1F44] text-white',
  SALE: 'bg-[#E8553A] text-white',
  BESTSELLER: 'bg-amber-500 text-white',
  LIMITED: 'bg-purple-600 text-white',
}

export default function ProductDetailClient({ product, related }: Props) {
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  // BUG FIX: this product page previously had no way to choose between
  // variants at all — Add to Cart always grabbed product.variants[0], no
  // matter how many sizes/colors the dashboard's product-edit page let a
  // store owner create for this product. Defaults to the first variant so
  // single-variant products (the common case for rackets) behave exactly
  // as before; multi-variant products now get an actual picker below.
  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >(product.variants?.[0]?.id)
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1
  const selectedVariant =
    product.variants?.find((v: any) => v.id === selectedVariantId) ??
    product.variants?.[0]
  // Split in two, matching the fixed StringUpgrade component: string
  // selection/tension (free, only when upgrade = Yes) and the grip add-on
  // (paid, always available) are independent selections now.
  const [stringSelection, setStringSelection] =
    useState<StringSelection | null>(null)
  // Holds the FULL resolved grip (real Medusa productId/variantId/price),
  // not just an id — it was already confirmed to exist in the backend at
  // selection time (see resolveGripOptions in StringUpgrade), so
  // add-to-cart below can use it directly with no further lookup.
  const [selectedGrip, setSelectedGrip] = useState<RacketGripOption | null>(
    null,
  )
  const [activeTab, setActiveTab] = useState<
    'description' | 'specs' | 'shipping'
  >('description')
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Shoes and apparel are the categories that actually need a size chart
  // (rackets/bags/shuttlecocks don't) — matches smashuk.co's per-category
  // size guide behaviour.
  const categoryLower = (product.category ?? '').toLowerCase()
  const isShoe = categoryLower.includes('shoe')
  const isApparel =
    categoryLower.includes('top') ||
    categoryLower.includes('bottom') ||
    categoryLower.includes('cloth') ||
    categoryLower.includes('apparel') ||
    categoryLower.includes('sock')
  const showSizeGuideLink = isShoe || isApparel

  const { addItem } = useCart()

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0
  // Same fallback as ProductCard.tsx / QuickViewModal.tsx — show SALE
  // automatically when the product is genuinely discounted, not only when
  // an explicit metadata.badge is set.
  const displayBadge = product.badge ?? (discount > 0 ? 'SALE' : null)

  const handleAddToCart = async () => {
    if (adding || added) return

    // Check variant first — use whichever variant the customer picked (see
    // selectedVariantId above), not always the first one.
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
      // The racket itself. String choice/tension are FREE on smashuk.co
      // ("Free String Upgrade (+1 Day)") — no money attached, so a
      // metadata note is enough; there's nothing to charge here.
      const racketMetadata = stringSelection
        ? {
            string_upgrade: 'Yes',
            string_choice: `${stringSelection.string.brand} ${stringSelection.string.name}`,
            string_tension: `${stringSelection.tension} lbs`,
          }
        : product.stringUpgradeAvailable
          ? { string_upgrade: 'No Thanks' }
          : undefined

      await addItem.mutateAsync({
        variantId: variant.id,
        quantity,
        metadata: racketMetadata,
      })

      // Racket Grips (overgrip) is the one thing here that actually costs
      // money, so — unlike the free string upgrade above — it needs its
      // own real Medusa line item with a real price; metadata alone never
      // charges the customer. `selectedGrip` was already resolved against
      // Medusa when the dropdown loaded (see resolveGripOptions in
      // StringUpgrade) — its variantId is a real, existing variant, so we
      // add it directly with no lookup/search needed here anymore.
      if (selectedGrip) {
        try {
          await addItem.mutateAsync({
            variantId: selectedGrip.variantId,
            quantity, // one grip per racket ordered
            metadata: {
              linked_product: product.name,
              grip_choice: selectedGrip.name,
            },
          })
        } catch (gripErr) {
          console.error('Failed to add racket grip line item:', gripErr)
          toast.error(
            'Racket added, but the grip add-on couldn’t be added — please contact us.',
          )
        }
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
      {/* Breadcrumb */}
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
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
          {/* Images */}
          <div className='space-y-4'>
            <ProductImageZoom
              src={product.images[activeImage]}
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
            {product.images.length > 1 && (
              <div className='flex gap-3'>
                {product.images.map((img: string, i: number) => (
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

          {/* Product Info */}
          <div>
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

            {/* Price — GBP */}
            <div className='flex items-center gap-4 mb-6 pb-6 border-b border-gray-100'>
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

            {/* Variant picker — size/color (only rendered when the product
                actually has more than one purchasable variant; the dashboard's
                product-edit page supports creating these, so this must exist
                for the customer to ever get the one they actually want). */}
            {hasMultipleVariants && (
              <div className='mb-6 pb-6 border-b border-gray-100'>
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
                        className={`px-4 py-2 rounded-lg border text-sm font-montserrat font-semibold transition-all ${
                          isSelected
                            ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]'
                            : outOfStock
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                              : 'border-gray-200 text-[#0A1F44] hover:border-[#E8553A]'
                        }`}
                      >
                        {label}
                        {outOfStock ? ' (Out of stock)' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className='mb-6'>
              <div className='flex border-b border-gray-200 mb-4'>
                {(['description', 'specs', 'shipping'] as const).map((tab) => (
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
                  <p className='font-lato text-gray-600 leading-relaxed mb-4'>
                    {product.description}
                  </p>
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
                <div className='space-y-4'>
                  {[
                    {
                      title: 'Free Delivery',
                      desc: 'Free shipping on all orders above £50. Standard delivery in 2–4 business days.',
                    },
                    {
                      title: '7-Day Returns',
                      desc: 'Not satisfied? Return within 7 days of delivery for a full refund. Items must be unused and in original packaging.',
                    },
                    {
                      title: '100% Authentic',
                      desc: 'All products sourced directly from official brand distributors. Authenticity guaranteed.',
                    },
                  ].map((item) => (
                    <div key={item.title} className='flex gap-3'>
                      <div className='w-1.5 h-1.5 rounded-full bg-[#E8553A] mt-2 shrink-0' />
                      <div>
                        <p className='text-sm font-semibold text-[#0A1F44] font-montserrat mb-0.5'>
                          {item.title}
                        </p>
                        <p className='text-sm text-gray-500 font-lato'>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock */}
            <div className='flex items-center justify-between gap-2 mb-6'>
              <div className='flex items-center gap-2'>
                {product.inStock ? (
                  <>
                    <div className='w-2 h-2 rounded-full bg-green-500' />
                    <span className='text-sm text-green-600 font-semibold font-lato'>
                      In Stock — {product.stock}{' '}
                      {product.stock === 1 ? 'unit' : 'units'} available
                      {product.stock <= 10 && product.stock > 0 && (
                        <span className='text-red-500 font-bold'>
                          {' '}
                          (Only {product.stock} left!)
                        </span>
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

            {/* Only racket products offer this (matches smashuk.co — not
                every product has it, e.g. shoes/bags/clothing don't) */}
            {product.stringUpgradeAvailable && (
              <StringUpgrade
                sport={product.sport}
                onStringChange={(sel) => setStringSelection(sel)}
                onGripChange={(grip) => setSelectedGrip(grip)}
              />
            )}

            {/* Notify me — shown instead of the qty/cart controls when the
                product is out of stock, matches standard ecommerce UX */}
            {!product.inStock && (
              <div className='mb-6'>
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

            {/* Quantity + Actions */}
            <div className='flex items-center gap-4 mb-6'>
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
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  className='w-11 h-11 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                >
                  <PlusIcon size={16} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || adding}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-montserrat font-black text-sm transition-all duration-200 ${
                  !product.inStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : added
                      ? 'bg-green-500 text-white'
                      : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:shadow-[#E8553A]/30 hover:-translate-y-0.5'
                }`}
              >
                <CartIcon size={18} />
                {!product.inStock
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

            <p className='text-xs text-gray-400 font-lato mb-6'>
              SKU: <span className='font-semibold'>{product.sku}</span>
            </p>

            <div className='grid grid-cols-3 gap-3 pt-6 border-t border-gray-100'>
              {[
                { icon: <TruckIcon size={18} />, text: 'Free Delivery' },
                { icon: <ShieldIcon size={18} />, text: '100% Authentic' },
                { icon: <RefreshIcon size={18} />, text: '7-Day Returns' },
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
        </div>

        {/* Customer Reviews Section */}
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
