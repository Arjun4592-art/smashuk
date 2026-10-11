/**
 * Shared rules for physical gift cards sold at the POS.
 *
 * Physical cards carry a pre-printed number (e.g. GC00050). Staff key it in
 * when selling; the card only becomes spendable once the sale is paid for and
 * the order route has issued it in Medusa (see lib/api/pos-gift-card-issue.ts).
 *
 * Used by both the browser (modal validation) and the server (routes), so keep
 * this file free of server-only imports.
 */

/** Quick-pick amounts shown in the "Sell gift card" modal (pounds). */
export const GIFT_CARD_PRESETS = [10, 20, 50, 100] as const

export const GIFT_CARD_MIN_AMOUNT = 5
export const GIFT_CARD_MAX_AMOUNT = 500

/** Prefix on the cart line name so staff/receipts can spot a card sale. */
export const GIFT_CARD_LINE_PREFIX = 'Gift card'

/** Trim + uppercase + strip inner spaces, so "gc 00050" → "GC00050". */
export function normalizeGiftCardCode(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

/** Letters, digits and hyphens, 4–24 chars. Matches GC00050, GC-AB12CD34… */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,23}$/

export function isValidGiftCardCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}

export function giftCardCodeError(code: string): string | null {
  if (!code) return 'Enter the number printed on the card'
  if (!isValidGiftCardCode(code))
    return 'Card number must be 4–24 letters, digits or hyphens'
  return null
}

/** Whole pounds or pounds+pence, within the allowed range. */
export function giftCardAmountError(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount'
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6)
    return 'Use pounds and pence only'
  if (amount < GIFT_CARD_MIN_AMOUNT)
    return `Minimum is £${GIFT_CARD_MIN_AMOUNT}`
  if (amount > GIFT_CARD_MAX_AMOUNT)
    return `Maximum is £${GIFT_CARD_MAX_AMOUNT}`
  return null
}

/** "GC00050" → "****0050" for receipts and cart lines. */
export function maskGiftCardCode(code: string): string {
  return `****${code.slice(-4)}`
}

/** Cart line title for a card sale. */
export function giftCardLineTitle(code: string): string {
  return `${GIFT_CARD_LINE_PREFIX} (${maskGiftCardCode(code)})`
}
