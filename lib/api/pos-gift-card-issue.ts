import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  giftCardAmountError,
  giftCardCodeError,
  normalizeGiftCardCode,
} from '@/lib/pos/gift-card'

/** Server-only: creates/activates a physical gift card in Medusa. */

const FIELDS =
  'id,status,code,value,currency_code,reference,reference_id,note,expires_at,created_at'

export interface IssueGiftCardInput {
  code: string
  /** Pounds. */
  value: number
  /** Medusa order id (or POS receipt id) — used for the audit note and so a
   * retry for the same order is a no-op instead of a duplicate-code error. */
  orderId: string
  cashier?: string
}

export type IssueGiftCardResult =
  | { ok: true; code: string; value: number; alreadyIssued: boolean }
  | {
      ok: false
      code: string
      status: number
      reason: 'invalid' | 'code_in_use' | 'backend_error'
      error: string
    }

async function readJson(res: Response): Promise<any> {
  const text = await res.text().catch(() => '')
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

/**
 * Exact-match lookup. Medusa's `q` is a fuzzy search, so ask for a page of
 * candidates and pick the exact code ourselves — otherwise GC00050 could be
 * shadowed by GC000501 and look "free" when it isn't.
 */
export async function findGiftCardByCode(code: string): Promise<any | null> {
  const res = await medusaServiceFetch(
    `/admin/gift-cards?q=${encodeURIComponent(code)}&fields=${encodeURIComponent(FIELDS)}&limit=25`,
  )
  const data = await readJson(res)
  if (!res.ok) {
    throw new Error(data.message ?? `Gift card lookup failed (${res.status})`)
  }
  const cards: any[] = data.gift_cards ?? []
  return cards.find((c) => String(c.code ?? '').toUpperCase() === code) ?? null
}

export async function issueGiftCard(
  input: IssueGiftCardInput,
): Promise<IssueGiftCardResult> {
  const code = normalizeGiftCardCode(input.code)
  const value = Math.round(Number(input.value) * 100) / 100

  const invalid = giftCardCodeError(code) ?? giftCardAmountError(value)
  if (invalid) {
    return { ok: false, code, status: 400, reason: 'invalid', error: invalid }
  }

  const note = `POS sale — order ${input.orderId}${input.cashier ? ` — ${input.cashier}` : ''}`

  try {
    const existing = await findGiftCardByCode(code)
    if (existing) {
      // Same order retrying (network blip, double submit): treat as success.
      if (
        existing.reference_id === input.orderId &&
        Number(existing.value) === value
      ) {
        return { ok: true, code, value, alreadyIssued: true }
      }
      return {
        ok: false,
        code,
        status: 409,
        reason: 'code_in_use',
        error: `Card number ${code} is already in the system`,
      }
    }

    // `reference` is free text in the loyalty plugin's create schema, and
    // `reference_id` ties the card to the sale for idempotent retries. Creating
    // the card also credits its backing store-credit account, so it is
    // spendable straight away (online and at the POS).
    const res = await medusaServiceFetch(
      `/admin/gift-cards?fields=${encodeURIComponent(FIELDS)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          code,
          value,
          currency_code: 'gbp',
          reference: 'pos_sale',
          reference_id: input.orderId,
          note,
        }),
      },
    )
    const data = await readJson(res)
    if (!res.ok) {
      return {
        ok: false,
        code,
        status: res.status,
        reason: 'backend_error',
        error: data.message ?? `Could not create gift card (${res.status})`,
      }
    }
    return { ok: true, code, value, alreadyIssued: false }
  } catch (err: unknown) {
    return {
      ok: false,
      code,
      status: 500,
      reason: 'backend_error',
      error: err instanceof Error ? err.message : 'Gift card issue failed',
    }
  }
}
