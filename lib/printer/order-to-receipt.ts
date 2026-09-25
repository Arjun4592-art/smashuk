// Turns a full Medusa admin order (what `getOrder()` in lib/api/dashboard.ts
// returns — used by the dashboard order page and the POS order page) into the
// ReceiptData shape the printers understand. This is what makes it possible to
// (re)print a receipt for ANY existing order, not only the sale that was just
// completed on the POS.

import {
  CURRENCY_SYMBOL,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  CONTACT_PHONE,
  VAT_RATE,
  SITE_LOGO,
  SITE_URL,
} from '@/lib/constants'
import type { ReceiptData } from './escpos'

const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}

function providerToLabel(id?: string | null): string {
  if (!id) return 'Payment'
  const parts = id.replace(/^pp_/, '').split('_')
  const raw = parts.length > 1 && parts[0] === parts[1] ? parts[0] : parts[0]
  const pretty = raw.charAt(0).toUpperCase() + raw.slice(1)
  return pretty === 'Stripe' ? 'Card' : pretty
}

const num = (v: unknown): number => Number(v) || 0

export function medusaOrderToReceiptData(order: any): ReceiptData {
  const created = order.created_at ? new Date(order.created_at) : new Date()
  const items: any[] = order.items ?? []
  const meta = order.metadata ?? {}
  const addr = order.shipping_address
  const isShipOrder = meta.fulfillment_type !== 'pickup' && !!addr?.address_1

  const metaMethod: string | undefined = meta.payment_method
  const payMethodLabel = metaMethod
    ? (PAY_LABELS[metaMethod] ?? metaMethod)
    : providerToLabel(order.payments?.[0]?.provider_id)

  // Same "SR-<number>" format the POS order list uses.
  const displayId = order.display_id
    ? `SR-${order.display_id}`
    : String(order.id ?? '').slice(-6)

  return {
    storeName: STORE_DISPLAY_NAME,
    addressLine1: STORE_ADDRESS_LINE1,
    addressLine2: STORE_ADDRESS_LINE2,
    phone: CONTACT_PHONE,
    orderId: String(displayId),
    dateStr: created.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    timeStr: created.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cashier: meta.cashier || (meta.source === 'pos' ? 'Staff' : 'Online'),
    items: items.map((i) => ({
      name: i.title ?? i.product_title ?? 'Item',
      variantTitle:
        i.variant_title && i.variant_title !== 'Default'
          ? i.variant_title
          : null,
      quantity: num(i.quantity) || 1,
      lineTotal: num(i.unit_price) * (num(i.quantity) || 1),
    })),
    subtotal: num(order.subtotal),
    discountAmount: num(order.discount_total),
    discountLabel: 'Discount',
    shippingAmount: num(order.shipping_total),
    giftCardAmount: num(order.gift_card_total),
    tax: num(order.tax_total),
    vatPct: Math.round(VAT_RATE * 100),
    total: num(order.total),
    rounding: 0,
    payMethodLabel,
    change: 0,
    splitPayments: Array.isArray(order.splitPayments)
      ? order.splitPayments.map((s: any) => ({
          label: PAY_LABELS[s.method] ?? String(s.method ?? 'Payment'),
          amount: num(s.amount),
        }))
      : null,
    shipTo: isShipOrder
      ? {
          name: `${addr.first_name ?? ''} ${addr.last_name ?? ''}`.trim(),
          address1: [addr.address_1, addr.address_2].filter(Boolean).join(', '),
          cityPostcode: `${addr.city ?? ''} ${addr.postal_code ?? ''}`.trim(),
        }
      : null,
    orderNote: meta.note || null,
    currencySymbol: CURRENCY_SYMBOL,
    logoUrl: SITE_LOGO,
    // Signed server-side by the order GET route (see
    // app/api/admin/orders/[id]/route.ts) and attached as order.trackingToken.
    trackingUrl: order.trackingToken
      ? `${SITE_URL}/track/${encodeURIComponent(order.id)}?t=${encodeURIComponent(order.trackingToken)}`
      : null,
  }
}
