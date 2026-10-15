'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import { getTensionsForSport } from '@/lib/stringing-options'
import type { Product } from '@/types'
import {
  boxCapacityText,
  FALLBACK_PRICES,
  MAIL_IN_SPORTS,
  TENSION_RANGE,
  computeQuote,
  estimateTurnaround,
  maxRackets,
  tierOfVariantTitle,
  type DeliveryTier,
  type MailInSport,
} from '@/lib/mail-in'

/* ------------------------------------------------------------------ types */

export interface ServiceVariant {
  id: string
  title: string
  price: number
}
export interface ServiceProduct {
  product: Product
  variants: ServiceVariant[]
}
export interface ExtraConfig {
  key: string
  label: string
  hint: string
  service: ServiceProduct
}
interface Props {
  delivery: ServiceProduct | null
  boxKit: ServiceProduct | null
  priority: ServiceProduct | null
  extras: ExtraConfig[]
  missingProducts: string[]
}

interface StringOption {
  id: string
  productId: string
  variantId: string
  brand: string
  name: string
  price: number
}
interface RacketSetup {
  model: string
  stringId: string
  tension: string
}
type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const emptyRacket = (): RacketSetup => ({
  model: '',
  stringId: '',
  tension: '',
})

/* ---------------------------------------------------------------- helpers */

/** Same mapping the racket page uses for /api/store/stringing-options. */
function mapStringOptions(products: any[]): StringOption[] {
  return products
    .map((match): StringOption | null => {
      const variants: any[] = match.variants ?? []
      // A stringing service is a job, not stock: ignore its inventory count.
      const variant =
        variants.find(
          (v) => typeof v.calculated_price?.calculated_amount === 'number',
        ) ?? variants[0]
      if (!variant) return null
      const gbp = (variant.prices ?? []).find(
        (p: any) => p.currency_code === 'gbp',
      )
      const calc = variant.calculated_price?.calculated_amount
      const price: number = typeof calc === 'number' ? calc : (gbp?.amount ?? 0)
      const title: string = (match.title ?? 'Stringing')
        .replace(/smash racket pro/gi, '')
        .trim()
      const metaBrand: string = match.metadata?.brand ?? ''
      const brand =
        (metaBrand && !/smash racket pro/i.test(metaBrand) ? metaBrand : '') ||
        title.split(' ')[0] ||
        ''
      const name =
        brand && title.startsWith(brand)
          ? title.slice(brand.length).trim()
          : title
      return {
        id: String(match.id),
        productId: String(match.id),
        variantId: String(variant.id),
        brand,
        name: name.replace(/stringing/i, '').trim() || title,
        price,
      }
    })
    .filter((o): o is StringOption => o !== null)
    .sort((a, b) =>
      `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`),
    )
}

const money = (n: number) => (n === 0 ? 'Free' : formatCurrency(n))

const inputCls =
  'w-full rounded-xl border border-[#0A1F44]/15 bg-white px-3.5 py-3 text-sm text-[#0A1F44] placeholder:text-gray-400 transition-colors hover:border-[#0A1F44]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8553A] focus-visible:border-[#E8553A] disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:border-[#0A1F44]/15 aria-[invalid=true]:border-red-500'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8553A] focus-visible:ring-offset-2'

/* ------------------------------------------------------------------ icons */

function ShuttleIcon() {
  return (
    <svg
      viewBox='0 0 48 48'
      className='h-8 w-8 sm:h-10 sm:w-10'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <circle cx='24' cy='38' r='6' />
      <path d='M19 33 11 8M29 33l8-25M24 32V6' />
      <path d='M11 8c8-4 18-4 26 0' />
      <path d='M15 20h18' opacity='.55' />
    </svg>
  )
}

function BallIcon() {
  return (
    <svg
      viewBox='0 0 48 48'
      className='h-8 w-8 sm:h-10 sm:w-10'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <circle cx='24' cy='24' r='17' />
      <path d='M9 14c8 3 12 9 12 17M39 34c-8-3-12-9-12-17' />
    </svg>
  )
}

function SquashIcon() {
  return (
    <svg
      viewBox='0 0 48 48'
      className='h-8 w-8 sm:h-10 sm:w-10'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M17 4c-6 0-9 5-9 11s3 11 9 11 9-5 9-11-3-11-9-11Z' />
      <path d='M17 26v6M14 32l-1 12h8l-1-12' />
      <path d='M11 11h12M10 17h14M12 22h10' opacity='.55' />
      <circle cx='37' cy='36' r='5' />
    </svg>
  )
}

function Tick() {
  return (
    <svg viewBox='0 0 16 16' className='h-4 w-4' fill='none' aria-hidden>
      <path
        d='m3.5 8.5 3 3 6-7'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

/* ------------------------------------------------------------- primitives */

/** One numbered section of the form. The rail on the left fills in as the
 *  section is completed. */
function Section({
  n,
  title,
  hint,
  done,
  invalid,
  optional,
  last,
  children,
}: {
  n: number
  title: string
  hint?: string
  done: boolean
  invalid?: boolean
  optional?: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <fieldset
      data-invalid={invalid ? 'true' : undefined}
      className={`relative min-w-0 pl-12 sm:pl-14 ${last ? '' : 'pb-10'}`}
    >
      {!last && (
        <span
          aria-hidden
          className={`absolute left-[15px] sm:left-[17px] top-10 bottom-1 w-0.5 rounded-full transition-colors ${
            done ? 'bg-[#E8553A]/50' : 'bg-[#0A1F44]/10'
          }`}
        />
      )}
      <span
        aria-hidden
        className={`absolute left-0 top-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full font-montserrat text-sm font-bold transition-colors ${
          invalid
            ? 'bg-red-500 text-white'
            : done
              ? 'bg-[#E8553A] text-white'
              : 'bg-[#0A1F44] text-white'
        }`}
      >
        {done && !invalid ? <Tick /> : n}
      </span>
      <legend className='sr-only'>{title}</legend>
      <div aria-hidden className='mb-4 pt-0.5'>
        <h2 className='font-montserrat font-bold text-[#0A1F44] text-lg sm:text-xl leading-tight'>
          {title}
          {optional && (
            <span className='ml-2 text-xs font-medium text-gray-400'>
              Optional
            </span>
          )}
        </h2>
        {hint && <p className='text-sm text-gray-500 mt-1'>{hint}</p>}
      </div>
      {children}
    </fieldset>
  )
}

function Tile({
  type = 'radio',
  name,
  checked,
  disabled,
  onChange,
  title,
  detail,
  price,
  icon,
}: {
  type?: 'radio' | 'checkbox'
  name: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
  title: string
  detail?: string
  price?: string
  icon?: React.ReactNode
}) {
  return (
    <label
      className={`relative flex items-start gap-3 rounded-2xl border-2 p-3.5 sm:p-4 ${price ? '' : 'pr-9'} transition-all ${
        disabled
          ? 'cursor-not-allowed border-dashed border-[#0A1F44]/15 bg-gray-50 text-gray-400'
          : 'cursor-pointer border-[#0A1F44]/10 bg-white hover:border-[#0A1F44]/30 has-[:checked]:border-[#E8553A] has-[:checked]:bg-[#E8553A]/[0.06] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#E8553A] has-[:focus-visible]:ring-offset-2'
      }`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className='peer sr-only'
      />
      {icon && (
        <span
          className={`shrink-0 transition-colors ${
            disabled
              ? 'text-gray-300'
              : checked
                ? 'text-[#E8553A]'
                : 'text-[#0A1F44]'
          }`}
        >
          {icon}
        </span>
      )}
      <span className='flex-1 min-w-0'>
        <span
          className='block font-montserrat font-bold text-sm text-[#0A1F44] data-[off=true]:text-gray-400'
          data-off={disabled}
        >
          {title}
        </span>
        {detail && (
          <span className='block text-[13px] leading-snug text-gray-500 mt-1'>
            {detail}
          </span>
        )}
      </span>
      {price && (
        <span className='font-montserrat text-sm font-bold text-[#0A1F44]'>
          {price}
        </span>
      )}
      <span
        aria-hidden
        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#E8553A] text-white transition-all ${
          checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        } ${price ? 'hidden' : ''}`}
      >
        <Tick />
      </span>
    </label>
  )
}

function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className='inline-flex items-center gap-3 cursor-pointer text-sm font-bold text-[#0A1F44]'>
      <input
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className='peer sr-only'
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-[#0A1F44]/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-[#E8553A] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#E8553A] peer-focus-visible:ring-offset-2"
      />
      {children}
    </label>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  label: string
}) {
  const btn = `h-9 w-9 rounded-full border border-[#0A1F44]/20 bg-white text-[#0A1F44] font-bold hover:border-[#E8553A] hover:text-[#E8553A] disabled:opacity-30 disabled:hover:border-[#0A1F44]/20 disabled:hover:text-[#0A1F44] ${focusRing}`
  return (
    <div className='inline-flex items-center gap-3'>
      <button
        type='button'
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        &minus;
      </button>
      <span
        className='w-6 text-center font-bold text-[#0A1F44]'
        aria-live='polite'
      >
        {value}
      </span>
      <button
        type='button'
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

const FieldError = ({ children }: { children: React.ReactNode }) => (
  <p role='alert' className='text-red-600 text-xs mt-1.5'>
    {children}
  </p>
)

/* -------------------------------------------------------------- component */

export default function MailInBookingClient({
  delivery,
  boxKit,
  priority,
  extras,
  missingProducts,
}: Props) {
  const router = useRouter()

  // Step 1-6 state
  const [sport, setSport] = useState<MailInSport | null>(null)
  const [count, setCount] = useState(1)
  const [rackets, setRackets] = useState<RacketSetup[]>([emptyRacket()])
  const [sameSetup, setSameSetup] = useState(false)
  const [hasBox, setHasBox] = useState<boolean | null>(null)
  const [service, setService] = useState<'standard' | 'priority'>('standard')
  const [extraQty, setExtraQty] = useState<Record<string, number>>({})

  const [options, setOptions] = useState<StringOption[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /* ---- Medusa-derived prices ---- */
  const deliveryVariants = useMemo(() => {
    const out: Partial<Record<DeliveryTier, ServiceVariant>> = {}
    for (const v of delivery?.variants ?? []) {
      const t = tierOfVariantTitle(v.title)
      if (t && !out[t]) out[t] = v
    }
    return out
  }, [delivery])

  // Each price is the delivery TOTAL for one box with that many rackets.
  const deliveryByTier: Record<DeliveryTier, number> = {
    '1': deliveryVariants['1']?.price ?? FALLBACK_PRICES.delivery['1'],
    '2': deliveryVariants['2']?.price ?? FALLBACK_PRICES.delivery['2'],
    '3plus':
      deliveryVariants['3plus']?.price ?? FALLBACK_PRICES.delivery['3plus'],
  }
  const boxPrice = boxKit?.variants[0]?.price ?? FALLBACK_PRICES.boxKit
  const priorityFee = priority?.variants[0]?.price ?? null

  const deliveryTiersOk =
    !!deliveryVariants['1'] &&
    !!deliveryVariants['2'] &&
    !!deliveryVariants['3plus']
  const bookingReady = !!delivery && deliveryTiersOk && !!boxKit

  /* ---- one booking = one box ---- */
  const racketLimit = maxRackets(sport)

  /* ---- load strings for the chosen sport ---- */
  useEffect(() => {
    if (!sport) {
      setOptions([])
      setLoadState('idle')
      return
    }
    let cancelled = false
    setLoadState('loading')
    fetch(`/api/store/stringing-options?sport=${sport}`, { cache: 'no-store' })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((d) => {
        if (cancelled) return
        setOptions(mapStringOptions(d.products ?? []))
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [sport])

  /* ---- handlers ---- */
  function chooseSport(next: MailInSport) {
    if (next === sport) return
    setSport(next)
    // A tennis box holds fewer rackets than a badminton one.
    if (count > maxRackets(next)) changeCount(maxRackets(next))
    // Strings and tension ranges differ per sport, so those picks are reset.
    setRackets((rs) => rs.map((r) => ({ ...r, stringId: '', tension: '' })))
  }

  function changeCount(n: number) {
    const next = Math.min(maxRackets(sport), Math.max(1, n))
    setCount(next)
    setRackets((rs) =>
      next > rs.length
        ? [...rs, ...Array.from({ length: next - rs.length }, emptyRacket)]
        : rs.slice(0, next),
    )
    if (next === 1) setSameSetup(false)
  }

  function updateRacket(i: number, patch: Partial<RacketSetup>) {
    setRackets((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  /** Racket i as it will actually be strung (same-setup copies racket 1). */
  const effective: RacketSetup[] = rackets.map((r, i) =>
    sameSetup && i > 0
      ? { ...r, stringId: rackets[0].stringId, tension: rackets[0].tension }
      : r,
  )

  /* ---- validation ---- */
  const racketErrors = effective.map((r, i) => ({
    model: r.model.trim() ? '' : 'Enter the racket model.',
    string: r.stringId ? '' : 'Choose a string.',
    tension: r.tension ? '' : 'Choose a tension.',
    // same-setup rackets inherit racket 1's string/tension, so only racket 1
    // shows those two errors
    hidden: sameSetup && i > 0,
  }))
  const sportError = sport ? '' : 'Choose your sport.'
  const boxError = hasBox === null ? 'Tell us whether you have a box.' : ''
  const racketsInvalid = racketErrors.some(
    (e) => e.model || (!e.hidden && (e.string || e.tension)),
  )
  const hasErrors = !!sportError || !!boxError || racketsInvalid

  /* ---- quote ---- */
  const stringingTotal = effective.reduce(
    (s, r) => s + (options.find((o) => o.id === r.stringId)?.price ?? 0),
    0,
  )
  const extrasTotal = extras.reduce(
    (s, e) => s + (extraQty[e.key] ?? 0) * (e.service.variants[0]?.price ?? 0),
    0,
  )
  const quote = computeQuote({
    rackets: count,
    hasBox,
    service,
    stringingTotal,
    extrasTotal,
    deliveryByTier,
    boxPrice,
    priorityFee: priorityFee ?? 0,
  })

  /* ---- submit: hand everything to the existing Medusa cart ---- */
  async function handleSubmit() {
    setTouched(true)
    if (!bookingReady) {
      toast.error('Online booking is unavailable right now. Please contact us.')
      return
    }
    if (hasErrors || !sport) {
      toast.error('Please complete the highlighted fields.')
      setTimeout(() => {
        document
          .querySelector<HTMLElement>(
            '[data-invalid="true"], [aria-invalid="true"]',
          )
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      const bookingId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID().slice(0, 8)
          : String(Date.now())
      const base = {
        mail_in: true,
        mail_in_booking: bookingId,
        mail_in_sport: sport,
        mail_in_service: service,
        mail_in_has_box: hasBox ? 'Yes' : 'No',
      }

      type BookingLine = {
        product: Product
        quantity: number
        variant: { id: string; size?: string }
        metadata: Record<string, any>
      }
      const lines: BookingLine[] = []

      // One stringing line per racket, carrying model + string + tension.
      // The string comes from the same "stringing-options" list the racket
      // page uses for its String Selection.
      effective.forEach((r, i) => {
        const opt = options.find((o) => o.id === r.stringId)
        if (!opt) return
        const model = r.model.trim()
        const stub: Product = {
          id: opt.productId,
          name: `${opt.brand} ${opt.name} Stringing`,
          slug: '',
          description: '',
          brand: opt.brand,
          sport,
          category: '',
          categoryId: '',
          price: opt.price,
          images: [],
          stock: 1,
          sku: '',
          rating: 0,
          reviewCount: 0,
          inStock: true,
          tags: [],
          specs: [],
        }
        lines.push({
          product: stub,
          quantity: 1,
          variant: { id: opt.variantId },
          metadata: {
            ...base,
            mail_in_part: 'stringing',
            racket_number: i + 1,
            racket_model: model,
            string_choice: `${opt.brand} ${opt.name}`,
            string_tension: `${r.tension} lbs`,
            linked_config: `mail-in:${bookingId}:${i + 1}`,
          },
        })
      })

      // One box, one delivery charge: the variant for the number of rackets
      // in the box, quantity 1 (the price is the total for the box).
      const dv = deliveryVariants[quote.tier]!
      lines.push({
        product: { ...delivery!.product, price: dv.price },
        quantity: 1,
        variant: { id: dv.id, size: dv.title },
        metadata: { ...base, mail_in_part: 'delivery', mail_in_rackets: count },
      })
      if (hasBox === false) {
        const bv = boxKit!.variants[0]
        lines.push({
          product: { ...boxKit!.product, price: bv.price },
          quantity: 1,
          variant: { id: bv.id, size: bv.title },
          metadata: { ...base, mail_in_part: 'box-kit' },
        })
      }
      if (service === 'priority' && priority) {
        const pv = priority.variants[0]
        lines.push({
          product: { ...priority.product, price: pv.price },
          quantity: 1,
          variant: { id: pv.id, size: pv.title },
          metadata: { ...base, mail_in_part: 'priority' },
        })
      }
      for (const e of extras) {
        const qty = extraQty[e.key] ?? 0
        if (qty < 1) continue
        const ev = e.service.variants[0]
        lines.push({
          product: { ...e.service.product, price: ev.price },
          quantity: qty,
          variant: { id: ev.id, size: ev.title },
          metadata: { ...base, mail_in_part: 'extra', mail_in_extra: e.key },
        })
      }

      // Stringing is a service, not stock: stop Medusa refusing a service
      // that has no inventory count (see the route for details).
      await fetch('/api/store/mail-in/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.product.id,
            variantId: l.variant.id,
          })),
        }),
      }).catch(() => {})

      // All lines go into the cart together, one after another. If any of
      // them is refused nothing is kept and the error is shown.
      await useCartStore.getState().addMailInBooking(lines)

      toast.success('Booking added to your cart.')
      router.push('/cart')
    } catch (err) {
      console.error('[mail-in] booking failed', err)
      toast.error(
        err instanceof Error && err.message
          ? `Could not add your booking: ${err.message}`
          : 'Could not add your booking to the cart. Please try again.',
      )
      setSubmitting(false)
    }
  }

  const tensionHint = sport
    ? getTensionsForSport(sport)
        .map((t) => `${t.level.split(' / ')[0]} ${t.range}`)
        .join(' · ')
    : ''
  const tensionOptions = sport
    ? Array.from(
        { length: TENSION_RANGE[sport].max - TENSION_RANGE[sport].min + 1 },
        (_, i) => TENSION_RANGE[sport].min + i,
      )
    : []
  const brands = Array.from(new Set(options.map((o) => o.brand)))

  const racketsDone = !!sport && !racketsInvalid
  const countLabel = (n: number) => (n === 1 ? '1 racket' : `${n} rackets`)

  /* ----------------------------------------------------------------- JSX */
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
      className='grid lg:grid-cols-[minmax(0,1fr)_390px] gap-8 items-start'
    >
      <div className='min-w-0 space-y-6'>
        {!bookingReady && (
          <div
            role='status'
            className='rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900'
          >
            Online booking is temporarily unavailable. Please{' '}
            <Link href='/contact' className='underline font-bold'>
              contact us
            </Link>{' '}
            and we will book your restring for you.
            {process.env.NODE_ENV !== 'production' && (
              <p className='mt-2 font-mono text-xs'>
                Dev: missing in Medusa:{' '}
                {[
                  ...missingProducts,
                  ...(delivery && !deliveryTiersOk
                    ? [
                        'mail-in-delivery variants "1 racket" / "2 rackets" / "3+ rackets"',
                      ]
                    : []),
                ].join(', ') || 'nothing'}
              </p>
            )}
          </div>
        )}

        <div className='rounded-3xl bg-white p-5 sm:p-8 shadow-[0_20px_50px_-20px_rgba(10,31,68,0.25)] ring-1 ring-[#0A1F44]/5'>
          {/* STEP 1 */}
          <Section
            n={1}
            title='Choose your sport'
            done={!!sport}
            invalid={touched && !!sportError}
          >
            <div className='grid sm:grid-cols-3 gap-3'>
              {MAIL_IN_SPORTS.map((s) => (
                <Tile
                  key={s.value}
                  name='sport'
                  checked={sport === s.value}
                  onChange={() => chooseSport(s.value)}
                  title={s.label}
                  icon={
                    s.value === 'badminton' ? (
                      <ShuttleIcon />
                    ) : s.value === 'squash' ? (
                      <SquashIcon />
                    ) : (
                      <BallIcon />
                    )
                  }
                />
              ))}
            </div>
            {touched && sportError && <FieldError>{sportError}</FieldError>}
          </Section>

          {/* STEP 2 */}
          <Section
            n={2}
            title='How many rackets?'
            hint={`One box holds ${boxCapacityText()}. Shipping is a flat ${formatCurrency(deliveryByTier['1'])} per box, there and back.`}
            done
          >
            <Stepper
              value={count}
              min={1}
              max={racketLimit}
              onChange={changeCount}
              label='number of rackets'
            />

            <div
              className='mt-5 rounded-xl border-2 border-[#E8553A] bg-[#E8553A]/[0.06] px-4 py-3 text-center'
              aria-hidden
            >
              <p className='text-xs text-gray-500'>Round-trip shipping</p>
              <p className='font-montserrat font-bold text-base text-[#E8553A]'>
                {formatCurrency(quote.delivery)}
              </p>
              <p className='text-[11px] text-gray-400'>
                flat fee per box, up to {racketLimit} rackets
              </p>
            </div>
            <p className='mt-4 text-sm text-[#0A1F44]'>
              Round-trip shipping for {countLabel(count)} in one box:{' '}
              <strong>{formatCurrency(quote.delivery)}</strong>
              {sport
                ? `. A ${sport} box holds up to ${racketLimit}. Need to send more? Make a second booking (another ${formatCurrency(deliveryByTier['1'])}).`
                : '. Choose your sport above to see how many fit in a box.'}
            </p>
          </Section>

          {/* STEP 3 */}
          <Section
            n={3}
            title='Racket, string and tension'
            done={racketsDone}
            invalid={touched && racketsInvalid}
          >
            {!sport && (
              <div className='mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#F5F3EF] px-4 py-3 text-sm text-gray-600'>
                <span>Pick your sport to see strings and tensions:</span>
                {MAIL_IN_SPORTS.map((s) => (
                  <button
                    key={s.value}
                    type='button'
                    onClick={() => chooseSport(s.value)}
                    className={`rounded-full border border-[#0A1F44]/20 bg-white px-4 py-1.5 font-montserrat text-xs font-bold text-[#0A1F44] transition-colors hover:border-[#E8553A] hover:text-[#E8553A] ${focusRing}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {sport && loadState === 'loading' && (
              <p className='text-sm text-gray-500 mb-3'>
                Loading strings&hellip;
              </p>
            )}
            {sport && loadState === 'error' && (
              <p role='alert' className='text-sm text-red-600 mb-3'>
                We could not load the strings. Refresh the page or{' '}
                <Link href='/contact' className='underline'>
                  contact us
                </Link>
                .
              </p>
            )}
            {sport && loadState === 'ready' && options.length === 0 && (
              <p className='text-sm text-gray-500 mb-3'>
                No stringing options are available for {sport} right now.
              </p>
            )}

            {count > 1 && (
              <div className='mb-4'>
                <Switch checked={sameSetup} onChange={setSameSetup}>
                  Use same setup for all rackets
                </Switch>
              </div>
            )}

            <div className='space-y-4'>
              {rackets.map((r, i) => {
                const err = racketErrors[i]
                const inherited = sameSetup && i > 0
                return (
                  <div
                    key={i}
                    className='rounded-2xl border border-[#0A1F44]/10 bg-[#F5F3EF]/70 p-4'
                  >
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-3'>
                      {count > 1 ? `Racket ${i + 1}` : 'Your racket'}
                    </p>
                    <div className='grid sm:grid-cols-3 gap-3'>
                      <div>
                        <label
                          htmlFor={`model-${i}`}
                          className='block text-xs font-bold text-gray-600 mb-1'
                        >
                          Racket model
                        </label>
                        <input
                          id={`model-${i}`}
                          type='text'
                          value={r.model}
                          maxLength={80}
                          placeholder={
                            sport === 'tennis'
                              ? 'e.g. Babolat Pure Drive'
                              : sport === 'squash'
                                ? 'e.g. Tecnifibre Carboflex 125'
                                : 'e.g. Yonex Astrox 99'
                          }
                          onChange={(e) =>
                            updateRacket(i, { model: e.target.value })
                          }
                          aria-invalid={touched && !!err.model}
                          className={inputCls}
                        />
                        {touched && err.model && (
                          <FieldError>{err.model}</FieldError>
                        )}
                      </div>

                      {inherited ? (
                        <p className='sm:col-span-2 self-end text-sm text-gray-500 pb-3'>
                          Same string and tension as racket 1.
                        </p>
                      ) : (
                        <>
                          <div>
                            <label
                              htmlFor={`string-${i}`}
                              className='block text-xs font-bold text-gray-600 mb-1'
                            >
                              String
                            </label>
                            <select
                              id={`string-${i}`}
                              value={r.stringId}
                              disabled={!sport || options.length === 0}
                              onChange={(e) =>
                                updateRacket(i, { stringId: e.target.value })
                              }
                              aria-invalid={touched && !!err.string}
                              className={inputCls}
                            >
                              <option value=''>
                                {!sport
                                  ? 'Choose sport first'
                                  : loadState === 'loading'
                                    ? 'Loading strings…'
                                    : options.length === 0
                                      ? 'No strings yet'
                                      : 'Select string'}
                              </option>
                              {brands.map((b) => (
                                <optgroup key={b} label={b}>
                                  {options
                                    .filter((o) => o.brand === b)
                                    .map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.name} ({money(o.price)})
                                      </option>
                                    ))}
                                </optgroup>
                              ))}
                            </select>
                            {touched && err.string && (
                              <FieldError>{err.string}</FieldError>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor={`tension-${i}`}
                              className='block text-xs font-bold text-gray-600 mb-1'
                            >
                              Tension
                            </label>
                            <select
                              id={`tension-${i}`}
                              value={r.tension}
                              disabled={!sport}
                              onChange={(e) =>
                                updateRacket(i, { tension: e.target.value })
                              }
                              aria-invalid={touched && !!err.tension}
                              className={inputCls}
                            >
                              <option value=''>
                                {sport
                                  ? 'Select tension'
                                  : 'Choose sport first'}
                              </option>
                              {tensionOptions.map((t) => (
                                <option key={t} value={t}>
                                  {t} lbs
                                </option>
                              ))}
                            </select>
                            {touched && err.tension && (
                              <FieldError>{err.tension}</FieldError>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {tensionHint && (
              <p className='mt-4 text-xs text-gray-500'>
                Not sure about tension? Typical ranges: {tensionHint}.
              </p>
            )}
          </Section>

          {/* STEP 4 */}
          <Section
            n={4}
            title='Do you have a suitable racket box?'
            done={hasBox !== null}
            invalid={touched && !!boxError}
          >
            <div className='grid sm:grid-cols-2 gap-3'>
              <Tile
                name='box'
                checked={hasBox === true}
                onChange={() => setHasBox(true)}
                title='Yes'
                detail='I will use my own box.'
              />
              <Tile
                name='box'
                checked={hasBox === false}
                onChange={() => setHasBox(false)}
                title={`No. Add Box Kit ${formatCurrency(boxPrice)}`}
                detail='A reusable box is sent to you. Keep it for your next restring.'
              />
            </div>
            {touched && boxError && <FieldError>{boxError}</FieldError>}
          </Section>

          {/* STEP 5 */}
          <Section n={5} title='Standard or priority?' done>
            <div className='grid sm:grid-cols-2 gap-3'>
              <Tile
                name='service'
                checked={service === 'standard'}
                onChange={() => setService('standard')}
                title='Standard'
                detail='About 2 working days of stringing once we receive your racket.'
              />
              <Tile
                name='service'
                checked={service === 'priority'}
                disabled={priorityFee === null}
                onChange={() => setService('priority')}
                title='Priority'
                detail={
                  priorityFee === null
                    ? 'Coming soon.'
                    : 'Priority stringing and faster delivery.'
                }
                price={
                  priorityFee === null
                    ? undefined
                    : `+${formatCurrency(priorityFee)}`
                }
              />
            </div>
          </Section>

          {/* STEP 6 */}
          <Section
            n={6}
            title='Optional extras'
            done={quote.extras > 0}
            optional
            last
          >
            <div className='space-y-3'>
              {extras.map((e) => {
                const qty = extraQty[e.key] ?? 0
                const price = e.service.variants[0]?.price ?? 0
                return (
                  <div
                    key={e.key}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors ${
                      qty > 0
                        ? 'border-[#E8553A] bg-[#E8553A]/[0.06]'
                        : 'border-[#0A1F44]/10'
                    }`}
                  >
                    <Switch
                      checked={qty > 0}
                      onChange={(on) =>
                        setExtraQty((q) => ({ ...q, [e.key]: on ? 1 : 0 }))
                      }
                    >
                      <span>
                        <span className='block font-montserrat'>
                          {e.label}{' '}
                          <span className='font-normal text-gray-500'>
                            {money(price)} each
                          </span>
                        </span>
                        <span className='block text-[13px] font-normal text-gray-500'>
                          {e.hint}
                        </span>
                      </span>
                    </Switch>
                    {qty > 0 && (
                      <Stepper
                        value={qty}
                        min={1}
                        max={20}
                        label={e.label.toLowerCase()}
                        onChange={(n) =>
                          setExtraQty((q) => ({ ...q, [e.key]: n }))
                        }
                      />
                    )}
                  </div>
                )
              })}

              <p className='text-[13px] text-gray-500'>
                Your rackets travel in the box, so we can only add grips and
                dampeners to a mail-in booking.
              </p>
            </div>
          </Section>
        </div>
      </div>

      {/* ORDER SUMMARY: styled as a parcel slip */}
      <aside
        aria-labelledby='summary-title'
        className='lg:sticky lg:top-28 rounded-3xl bg-white text-[#0A1F44] shadow-[0_24px_60px_-20px_rgba(10,31,68,0.35)] ring-1 ring-[#0A1F44]/5'
      >
        <div className='rounded-t-3xl bg-[#E8553A] px-6 py-4 text-white'>
          <h2
            id='summary-title'
            style={{ color: '#fff' }}
            className='font-montserrat font-bold text-2xl'
          >
            Order summary
          </h2>
          <p className='text-xs text-white/85'>
            {sport
              ? MAIL_IN_SPORTS.find((s) => s.value === sport)?.label
              : 'Mail-in'}{' '}
            stringing, {countLabel(count)}
          </p>
        </div>

        <dl className='space-y-4 px-6 pt-5 text-sm'>
          <div>
            <dt className='flex justify-between font-bold'>
              <span>Stringing</span>
              <span>{formatCurrency(quote.stringing)}</span>
            </dt>
            <dd className='mt-1.5 space-y-1 text-gray-500'>
              {effective.map((r, i) => {
                const opt = options.find((o) => o.id === r.stringId)
                return (
                  <p key={i} className='flex justify-between gap-3'>
                    <span>
                      {count > 1 ? `Racket ${i + 1}: ` : ''}
                      {opt
                        ? `${opt.brand} ${opt.name}${r.tension ? ` at ${r.tension} lbs` : ''}`
                        : 'Choose a string'}
                    </span>
                    {opt && <span>{money(opt.price)}</span>}
                  </p>
                )
              })}
            </dd>
          </div>

          <div>
            <dt className='flex justify-between font-bold'>
              <span>Delivery</span>
              <span>{formatCurrency(quote.delivery)}</span>
            </dt>
            <dd className='mt-1.5 text-gray-500'>
              One box with {countLabel(count)}
            </dd>
          </div>

          {hasBox === false && (
            <div>
              <dt className='flex justify-between font-bold'>
                <span>Reusable Racket Box Kit</span>
                <span>{formatCurrency(quote.box)}</span>
              </dt>
            </div>
          )}

          {service === 'priority' && (
            <div>
              <dt className='flex justify-between font-bold'>
                <span>Priority service</span>
                <span>{formatCurrency(quote.priority)}</span>
              </dt>
            </div>
          )}

          {quote.extras > 0 && (
            <div>
              <dt className='flex justify-between font-bold'>
                <span>Extras</span>
                <span>{formatCurrency(quote.extras)}</span>
              </dt>
              <dd className='mt-1.5 text-gray-500'>
                {extras
                  .filter((e) => (extraQty[e.key] ?? 0) > 0)
                  .map((e) => `${extraQty[e.key]} × ${e.label.toLowerCase()}`)
                  .join(', ')}
              </dd>
            </div>
          )}
        </dl>

        {/* perforation */}
        <div
          aria-hidden
          className='relative my-5 h-0 border-t-2 border-dashed border-[#0A1F44]/15'
        >
          <span className='absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#F5F3EF]' />
          <span className='absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#F5F3EF]' />
        </div>

        <div className='px-6 pb-6'>
          <div className='flex items-baseline justify-between'>
            <span className='font-bold'>Total</span>
            <span className='font-montserrat font-black text-4xl'>
              {formatCurrency(quote.total)}
            </span>
          </div>

          <p className='mt-4 text-sm text-gray-600'>
            <span className='font-bold text-[#0A1F44]'>
              Estimated turnaround:{' '}
            </span>
            {estimateTurnaround(hasBox, service)}
          </p>
          <p className='mt-1 text-xs text-gray-400'>
            Estimates vary with weekends, public holidays and courier
            performance.
          </p>

          {touched && hasErrors && (
            <p
              role='alert'
              className='mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700'
            >
              A few details are missing. The highlighted steps need your
              attention.
            </p>
          )}

          <button
            type='submit'
            disabled={submitting}
            className={`ls-btn-shine mt-5 w-full rounded-full bg-[#E8553A] px-8 py-4 font-montserrat text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#D4441F] disabled:opacity-60 ${focusRing}`}
          >
            {submitting ? 'Adding to cart…' : 'Complete booking'}
          </button>
          <p className='mt-3 text-center text-xs text-gray-400'>
            Nothing is charged until you check out.
          </p>
        </div>
      </aside>
    </form>
  )
}
