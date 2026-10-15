/**
 * Mail-in stringing: config + pure pricing logic.
 *
 * Everything the booking form needs to know that is NOT a Medusa price lives
 * here, so the numbers are edited in one place. Medusa remains the source of
 * truth for what the customer is actually charged: the form shows the Medusa
 * price when the product exists, and falls back to FALLBACK_PRICES only to
 * render the page.
 */

export const MAIL_IN_BOOKING_HREF = '/local-store/stringing/mail-in/book'

export const MAIL_IN_SPORTS = [
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'squash', label: 'Squash' },
] as const
export type MailInSport = (typeof MAIL_IN_SPORTS)[number]['value']

export function isMailInSport(v: unknown): v is MailInSport {
  return MAIL_IN_SPORTS.some((s) => s.value === v)
}

/** Medusa product handles the form depends on. Create these in the dashboard. */
export const MAIL_IN_HANDLES = {
  /**
   * Delivery for ONE box. 3 variants, each priced as the TOTAL for
   * the box (not per racket): "1 racket", "2 rackets", "3+ rackets". The tier
   * is picked from the number of rackets in the box.
   */
  delivery: 'mail-in-delivery',
  /** Reusable Racket Box Kit, one variant. */
  boxKit: 'mail-in-box-kit',
  /** Priority Mail-In upgrade, one variant, flat fee per booking. */
  priority: 'mail-in-priority',
} as const

/**
 * Optional extras. The box cannot take anything else, so only grips and
 * dampeners are offered. An extra with no matching Medusa product is hidden.
 */
export const MAIL_IN_EXTRAS = [
  {
    key: 'replacement-grip',
    handle: 'mail-in-replacement-grip',
    label: 'Replacement grip',
    hint: 'Fitted when we restring.',
  },
  {
    key: 'overgrip',
    handle: 'mail-in-overgrip',
    label: 'Overgrip',
    hint: 'Fitted when we restring.',
  },
  {
    key: 'dampener',
    handle: 'mail-in-dampener',
    label: 'Racket dampener',
    hint: 'Fitted when we restring.',
  },
] as const

export type DeliveryTier = '1' | '2' | '3plus'

/** Used for display only when the Medusa product is missing. */
export const FALLBACK_PRICES = {
  // Flat round-trip shipping per box (same for every tier).
  delivery: { '1': 8.95, '2': 8.95, '3plus': 8.95 } as Record<
    DeliveryTier,
    number
  >,
  boxKit: 8.95,
}

/** How many rackets fit in one box. Shipping is charged per box. */
export const BOX_CAPACITY: Record<MailInSport, number> = {
  badminton: 5,
  tennis: 3,
  squash: 5,
}

/** "up to 5 badminton or squash rackets, or 3 tennis rackets" (built from BOX_CAPACITY). */
export function boxCapacityText(): string {
  const groups = new Map<number, string[]>()
  for (const s of MAIL_IN_SPORTS) {
    const cap = BOX_CAPACITY[s.value]
    groups.set(cap, [...(groups.get(cap) ?? []), s.value])
  }
  const parts = Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([cap, sports]) => `${cap} ${sports.join(' or ')} rackets`)
  return `up to ${parts.join(', or ')}`
}

/** One booking = one box, so the most rackets per booking is the box capacity. */
export function maxRackets(sport: MailInSport | null): number {
  return BOX_CAPACITY[sport ?? 'badminton']
}

/** Tier from the number of rackets in ONE box. */
export function deliveryTier(rackets: number): DeliveryTier {
  if (rackets >= 3) return '3plus'
  return rackets === 2 ? '2' : '1'
}

/** "1 racket" -> '1', "2 rackets" -> '2', "3+ rackets" -> '3plus'. */
export function tierOfVariantTitle(title: string): DeliveryTier | null {
  const n = parseInt(/\d+/.exec(title ?? '')?.[0] ?? '', 10)
  if (!Number.isFinite(n) || n < 1) return null
  return deliveryTier(n)
}

export const TENSION_RANGE: Record<MailInSport, { min: number; max: number }> =
  {
    badminton: { min: 18, max: 35 },
    tennis: { min: 40, max: 70 },
    squash: { min: 20, max: 35 },
  }

/** Working days, from the landing page: 2 to us + 2 stringing + 2 back. */
export const TURNAROUND_DAYS = { haveBox: 6, needBox: 8 } as const

/** Same price lookup the gift-card page uses (amounts are in pounds). */
export function variantAmount(v: any): number {
  const calc = v?.calculated_price?.calculated_amount
  if (typeof calc === 'number') return calc
  const gbp = (v?.prices ?? [])
    .filter((p: any) => p.currency_code === 'gbp')
    .map((p: any) => p.amount)
  if (gbp.length) return Math.min(...gbp)
  return v?.prices?.[0]?.amount ?? 0
}

const pennies = (n: number) => Math.round(n * 100) / 100

export interface QuoteInput {
  /** Rackets in the box. */
  rackets: number
  hasBox: boolean | null
  service: 'standard' | 'priority'
  stringingTotal: number
  extrasTotal: number
  /** Delivery total for the box, by how many rackets are in it. */
  deliveryByTier: Record<DeliveryTier, number>
  boxPrice: number
  priorityFee: number
}

export interface Quote {
  tier: DeliveryTier
  delivery: number
  box: number
  priority: number
  stringing: number
  extras: number
  total: number
}

export function computeQuote(i: QuoteInput): Quote {
  const tier = deliveryTier(i.rackets)
  // The tier price IS the delivery total for the box. It is never multiplied
  // by the number of rackets.
  const delivery = i.deliveryByTier[tier]
  const box = i.hasBox === false ? i.boxPrice : 0
  const priority = i.service === 'priority' ? i.priorityFee : 0
  const stringing = pennies(i.stringingTotal)
  const extras = pennies(i.extrasTotal)
  return {
    tier,
    delivery,
    box,
    priority,
    stringing,
    extras,
    total: pennies(stringing + delivery + box + priority + extras),
  }
}

export function estimateTurnaround(
  hasBox: boolean | null,
  service: 'standard' | 'priority',
): string {
  if (service === 'priority')
    return 'Faster than standard. We confirm the exact timing after you book.'
  if (hasBox === null)
    return `Around ${TURNAROUND_DAYS.haveBox} working days (${TURNAROUND_DAYS.needBox} if we send you a box)`
  const d = hasBox ? TURNAROUND_DAYS.haveBox : TURNAROUND_DAYS.needBox
  return `Around ${d} working days`
}

/* ------------------------------------------------------------------ */
/* Grouping: one booking = ONE row everywhere (cart, checkout, orders). */
/* ------------------------------------------------------------------ */

export type MailInPart =
  'stringing' | 'delivery' | 'box-kit' | 'priority' | 'extra'

/** True for a cart/order line that belongs to a mail-in booking. */
export function isMailInMeta(metadata?: Record<string, any> | null): boolean {
  const v = metadata?.mail_in
  return v === true || v === 'true'
}

/** Anything with line-item metadata (cart item, Medusa order line, ...). */
export interface MailInLineLike {
  metadata?: Record<string, any> | null
}

export interface MailInRacketLine<T extends MailInLineLike> {
  line: T
  n: number
  model: string
  string: string
  tension: string
  /** Line total in pounds. */
  amount: number
}

export interface MailInBookingGroup<T extends MailInLineLike> {
  /** metadata.mail_in_booking, or a synthetic id for old orders. */
  id: string
  sport: string | null
  hasBox: boolean
  priority: boolean
  rackets: MailInRacketLine<T>[]
  delivery: { line: T; amount: number; label: string } | null
  boxKit: { line: T; amount: number } | null
  priorityLine: { line: T; amount: number } | null
  extras: { line: T; amount: number; label: string; qty: number }[]
  lines: T[]
  total: number
}

const EXTRA_LABELS: Record<string, string> = Object.fromEntries(
  MAIL_IN_EXTRAS.map((e) => [e.key, e.label]),
)

/**
 * Splits lines into mail-in bookings (one group per booking id) and the rest.
 * `amountOf` returns the line total in pounds, `qtyOf` its quantity and
 * `titleOf` its product title (used when metadata has no label).
 */
export function groupMailInLines<T extends MailInLineLike>(
  lines: T[],
  amountOf: (l: T) => number,
  qtyOf: (l: T) => number,
  titleOf: (l: T) => string,
): { bookings: MailInBookingGroup<T>[]; others: T[] } {
  const byId = new Map<string, MailInBookingGroup<T>>()
  const others: T[] = []
  for (const line of lines) {
    const m = line.metadata ?? {}
    if (!isMailInMeta(m)) {
      others.push(line)
      continue
    }
    const id = String(m.mail_in_booking ?? 'booking')
    let g = byId.get(id)
    if (!g) {
      g = {
        id,
        sport: null,
        hasBox: true,
        priority: false,
        rackets: [],
        delivery: null,
        boxKit: null,
        priorityLine: null,
        extras: [],
        lines: [],
        total: 0,
      }
      byId.set(id, g)
    }
    const amount = pennies(amountOf(line))
    g.lines.push(line)
    g.total = pennies(g.total + amount)
    g.sport = g.sport ?? (m.mail_in_sport ? String(m.mail_in_sport) : null)
    switch (m.mail_in_part as MailInPart) {
      case 'stringing':
        g.rackets.push({
          line,
          n: Number(m.racket_number) || g.rackets.length + 1,
          model: String(m.racket_model ?? ''),
          string: String(m.string_choice ?? titleOf(line)),
          tension: String(m.string_tension ?? ''),
          amount,
        })
        break
      case 'delivery':
        g.delivery = { line, amount, label: titleOf(line) }
        break
      case 'box-kit':
        g.boxKit = { line, amount }
        g.hasBox = false
        break
      case 'priority':
        g.priorityLine = { line, amount }
        g.priority = true
        break
      case 'extra':
        g.extras.push({
          line,
          amount,
          qty: qtyOf(line),
          label: EXTRA_LABELS[String(m.mail_in_extra)] ?? titleOf(line),
        })
        break
    }
  }
  const bookings = [...byId.values()]
  for (const b of bookings) b.rackets.sort((a, c) => a.n - c.n)
  return { bookings, others }
}

/** "1 racket" / "3 rackets". */
export const racketsLabel = (n: number) =>
  n === 1 ? '1 racket' : `${n} rackets`
