import 'server-only'
import crypto from 'crypto'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { issueGiftCard } from '@/lib/api/pos-gift-card-issue'
import { notifyOwner, sendMail } from '@/lib/email'
import {
  giftCardPurchaseEmail,
  giftCardRecipientEmail,
  orderNumberOf,
} from '@/lib/email-templates'
import { GIFT_CARD_PRODUCT_HANDLE } from '@/lib/constants'

/**
 * Website gift-card fulfilment.
 *
 * Gift cards are not shipped. Once an order containing a gift-card line has
 * been PAID (cart completed + payment captured) this:
 *   1. creates one real gift card in Medusa per unit bought (same
 *      `issueGiftCard` the POS uses, so it is spendable online and in store),
 *   2. emails the card number + value to the buyer,
 *   3. if the buyer chose "send as a gift", also emails the recipient (on the
 *      chosen date, via Resend scheduling),
 *   4. records what was issued on the order so a retry never double-issues.
 *
 * Never throws - a failure here must not turn a paid order into an error.
 */

// No 0/O/1/I so codes survive being read out or typed from an email.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Codes are derived from (order, line, unit) with an HMAC, not random: a retry
 * of the same order regenerates the SAME code, which is what lets
 * `issueGiftCard` recognise it as already issued instead of minting a second
 * card. Without the secret the codes can't be predicted from the order id.
 */
function giftCardCode(
  orderId: string,
  itemId: string,
  unit: number,
  attempt: number,
): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to mint gift cards')
  const h = crypto
    .createHmac('sha256', secret)
    .update(`gift-card:${orderId}:${itemId}:${unit}:${attempt}`)
    .digest()
  let s = ''
  for (let i = 0; i < 12; i++) s += ALPHABET[h[i] % ALPHABET.length]
  return `GC-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`
}

const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// Resend can schedule at most ~30 days ahead; the gift-card page caps the
// date picker to match. Anything today/past/invalid is sent straight away.
function scheduleFor(sendDate: unknown): string | undefined {
  if (typeof sendDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sendDate))
    return undefined
  const at = new Date(`${sendDate}T08:00:00Z`)
  return Number.isNaN(at.getTime()) || at.getTime() <= Date.now()
    ? undefined
    : at.toISOString()
}

export interface GiftCardFulfilment {
  code: string
  value: number
  ok: boolean
  error?: string
}

export async function fulfillGiftCardsForOrder(
  orderRef: { id?: string } | null | undefined,
): Promise<GiftCardFulfilment[]> {
  const orderId = orderRef?.id
  if (!orderId) return []
  const results: GiftCardFulfilment[] = []
  try {
    const orderRes = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,display_id,email,currency_code,total,metadata,customer.first_name,customer.last_name,shipping_address.first_name,shipping_address.last_name,*items`,
    )
    if (!orderRes.ok) {
      console.error(
        `[gift-cards] could not load order ${orderId} (${orderRes.status})`,
      )
      return []
    }
    const { order } = await orderRes.json()
    const lines: any[] = (order?.items ?? []).filter(
      (i: any) =>
        (i?.product_handle ?? i?.variant?.product?.handle) ===
        GIFT_CARD_PRODUCT_HANDLE,
    )
    if (lines.length === 0) return []

    // Already fully processed (e.g. the complete call was repeated).
    if (String(order.metadata?.gift_cards_emailed) === 'true') return []

    const orderNumber = orderNumberOf(order)
    const buyerName =
      [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      [
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'A friend'

    let allEmailed = true

    for (const line of lines) {
      const value = Math.round(Number(line.unit_price) * 100) / 100
      const qty = Math.max(1, Number(line.quantity) || 1)
      const meta = line.metadata ?? {}
      const recipientEmail =
        meta.isGift && isEmail(meta.recipientEmail)
          ? String(meta.recipientEmail).trim()
          : undefined
      const scheduledAt = scheduleFor(meta.sendDate)

      for (let unit = 0; unit < qty; unit++) {
        // A different order's card could (very unlikely) already own the code.
        let issued: Awaited<ReturnType<typeof issueGiftCard>> | null = null
        let code = ''
        for (let attempt = 0; attempt < 3; attempt++) {
          code = giftCardCode(order.id, String(line.id), unit, attempt)
          issued = await issueGiftCard({
            code,
            value,
            orderId: order.id,
            cashier: 'website',
          })
          if (issued.ok || issued.reason !== 'code_in_use') break
        }
        if (!issued || !issued.ok) {
          const error = issued && !issued.ok ? issued.error : 'unknown error'
          console.error(
            `[gift-cards] NOT issued for order ${orderId} line ${line.id}:`,
            error,
          )
          results.push({ code, value, ok: false, error })
          allEmailed = false
          continue
        }
        results.push({ code, value, ok: true })

        // 1) buyer: card number + details (the part that must always happen)
        const buyerMail = giftCardPurchaseEmail({
          code,
          amount: value,
          orderNumber,
          recipientEmail,
          sendDate: scheduledAt
            ? new Date(scheduledAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : undefined,
        })
        if (order.email) {
          const r = await sendMail({ to: order.email, ...buyerMail })
          if (!r.sent) {
            allEmailed = false
            console.error(
              `[gift-cards] buyer email failed for order ${orderId}:`,
              r.error,
            )
          }
        } else {
          allEmailed = false
        }

        // 2) recipient, if this was bought as a gift
        if (recipientEmail) {
          const giftMail = giftCardRecipientEmail({
            code,
            amount: value,
            senderName: buyerName,
            message: meta.giftMessage,
          })
          const r = await sendMail({
            to: recipientEmail,
            ...giftMail,
            ...(scheduledAt ? { scheduledAt } : {}),
          })
          if (!r.sent) {
            allEmailed = false
            console.error(
              `[gift-cards] recipient email failed for order ${orderId}:`,
              r.error,
            )
          }
        }
      }
    }

    // Record the outcome on the order (flat string values only - Medusa
    // metadata can't hold arrays). Same key the POS uses for sold cards.
    await medusaServiceFetch(`/admin/orders/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          gift_cards_sold: JSON.stringify(results),
          gift_cards_emailed: String(
            allEmailed && results.length > 0 && results.every((r) => r.ok),
          ),
        },
      }),
    }).catch((err) =>
      console.error('[gift-cards] could not save order metadata:', err),
    )

    // Anything that failed needs a human: tell the owner, with the order.
    const failed = results.filter((r) => !r.ok)
    if (failed.length > 0 || !allEmailed) {
      const detail = failed.length
        ? failed.map((f) => `${f.value}: ${f.error}`).join('; ')
        : 'one or more emails could not be sent'
      await notifyOwner({
        subject: `Gift card needs attention — order ${orderNumber}`,
        html: `<p>A paid website order (${orderNumber}) contains gift cards that were not fully delivered: ${detail}.</p><p>Re-issue from POS (Sell gift card / manual issue) or resend the email to ${order.email ?? 'the customer'}.</p>`,
        text: `Paid website order ${orderNumber} has gift cards that were not fully delivered: ${detail}.`,
      }).catch(() => {})
    }
  } catch (err) {
    console.error(`[gift-cards] fulfilment failed for order ${orderId}:`, err)
  }
  return results
}
