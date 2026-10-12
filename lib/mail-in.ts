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
  delivery: { '1': 12.95, '2': 8.95, '3plus': 5.95 } as Record<
    DeliveryTier,
    number
  >,
  boxKit: 11.95,
}

/** How many rackets fit in one box. Shipping is charged per box. */
export const BOX_CAPACITY: Record<MailInSport, number> = {
  badminton: 5,
  tennis: 3,
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
