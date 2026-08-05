// lib/invoice-service.ts
//
// SERVER-ONLY. Central invoice generation — called from BOTH:
//  - app/api/store/payment/route.ts  ('complete' action, right after the
//    website's own post-checkout capture — see note there on why this
//    project doesn't actually depend on the Stripe webhook for capture)
//  - app/api/pos/orders/route.ts     (right after POS auto-capture)
//  - app/api/admin/orders/[id]/resend-invoice/route.ts (dashboard button)
//
// Single source of truth so all three call the same logic. Idempotency
// lives server-side in the backend's /admin/invoicing route (DB-backed),
// so calling this twice for the same order is safe — it returns the
// existing invoice instead of minting a second one, UNLESS `regenerate`
// is passed (used by the resend button to redo the PDF without changing
// the invoice number).
import 'server-only'
import { generateInvoicePdf, InvoiceData } from './invoice-pdf'
import {
  medusaServiceFetch,
  getMedusaServiceToken,
  MEDUSA_URL,
} from './api/medusa-service-token'

// --- Business details — PENDING client confirmation (VAT status/number) ---
const BUSINESS_DETAILS = {
  name: process.env.BUSINESS_LEGAL_NAME || 'SmashRocker Pro Ltd',
  addressLines: (process.env.BUSINESS_ADDRESS_LINES || '')
    .split('|')
    .filter(Boolean),
  vatRegistered: process.env.BUSINESS_VAT_REGISTERED === 'true', // PENDING — leave false until confirmed
  vatNumber: process.env.BUSINESS_VAT_NUMBER || undefined, // PENDING
}

export type OrderForInvoice = {
  id: string
  currency_code: string
  customer?: { first_name?: string; last_name?: string } | null
  shipping_address?: {
    address_1?: string
    address_2?: string
    city?: string
    postal_code?: string
    country_code?: string
  } | null
  items: Array<{
    title: string
    quantity: number
    unit_price: number // decimal (e.g. 19.99) — see lib/invoice-pdf.tsx note
  }>
  shipping_methods?: Array<{ amount?: number }> | null
  channel: 'website' | 'pos'
}

async function uploadPdfToMedusa(
  pdfBuffer: Buffer,
  filename: string,
): Promise<string> {
  // /admin/uploads expects multipart form-data — medusaServiceFetch always
  // forces Content-Type: application/json, so this needs its own raw fetch
  // with a real token instead (fetch sets the multipart boundary itself
  // when the body is FormData; we must NOT set Content-Type manually).
  const token = await getMedusaServiceToken()

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: 'application/pdf',
  })
  formData.append('files', blob, filename)

  const res = await fetch(`${MEDUSA_URL}/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `[invoicing] Upload to Medusa failed (${res.status}): ${data?.message ?? 'unknown error'}`,
    )
  }

  const url = data?.files?.[0]?.url
  if (!url) {
    throw new Error('[invoicing] Medusa upload response missing file url')
  }
  return url
}

export async function generateInvoiceForOrder(
  order: OrderForInvoice,
  { regenerate = false }: { regenerate?: boolean } = {},
): Promise<{ invoiceNumber: string; url: string; alreadyExisted: boolean }> {
  // 1) Allocate/lookup the invoice number (idempotent — backend-guarded)
  let numberRes = await medusaServiceFetch('/admin/invoicing', {
    method: 'POST',
    body: JSON.stringify({ order_id: order.id, channel: order.channel }),
  })
  let numberData = await numberRes.json().catch(() => ({}))

  // The Medusa invoicing plugin may return 422 when an invoice for this order
  // already exists (unique constraint) instead of returning the existing record.
  // Treat this as an idempotent hit — fetch the existing invoice via GET.
  if (!numberRes.ok && numberRes.status === 422) {
    console.warn(
      `[invoicing] POST returned 422 (already exists) for order ${order.id} — fetching existing record`,
    )
    const getRes = await medusaServiceFetch(
      `/admin/invoicing?order_id=${encodeURIComponent(order.id)}`,
      { method: 'GET' },
    )
    const getData = await getRes.json().catch(() => ({}))
    if (!getRes.ok) {
      throw new Error(
        `[invoicing] Failed to fetch existing invoice after 422: ${getData?.error ?? getRes.status}`,
      )
    }
    // Backend may return { invoice: {...} } or { invoices: [...] } — normalise both
    const existing = getData?.invoice ?? getData?.invoices?.[0] ?? getData
    if (!existing?.invoice_number) {
      throw new Error(
        `[invoicing] 422 fallback GET returned no invoice_number for order ${order.id}`,
      )
    }
    numberData = { ...existing, is_new: false }
    numberRes = { ok: true, status: 200 } as Response
  } else if (!numberRes.ok) {
    throw new Error(
      `[invoicing] Failed to allocate invoice number: ${numberData?.error ?? numberRes.status}`,
    )
  }

  const {
    invoice_number: invoiceNumber,
    pdf_url: existingUrl,
    is_new: isNew,
  } = numberData

  if (!isNew && existingUrl && !regenerate) {
    return { invoiceNumber, url: existingUrl, alreadyExisted: true }
  }

  // 2) Build the PDF
  const shippingExVat = (order.shipping_methods ?? []).reduce(
    (sum, m) => sum + (m.amount ?? 0),
    0,
  )

  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate: new Date().toISOString().slice(0, 10),
    supplyDate: new Date().toISOString().slice(0, 10),
    orderReference: order.id,
    currency: order.currency_code.toUpperCase(),
    business: BUSINESS_DETAILS,
    customer: {
      name:
        `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() ||
        'Customer',
      addressLines: [
        order.shipping_address?.address_1,
        order.shipping_address?.address_2,
        order.shipping_address?.city,
        order.shipping_address?.postal_code,
        order.shipping_address?.country_code?.toUpperCase(),
      ].filter(Boolean) as string[],
    },
    lineItems: order.items.map((item) => ({
      description: item.title,
      quantity: item.quantity,
      unitPriceExVat: item.unit_price,
      vatRatePercent: 20, // standard UK rate — adjust per-line if zero-rated products exist
    })),
    shippingExVat: shippingExVat || undefined,
  }

  const pdfBuffer = await generateInvoicePdf(invoiceData)

  // 3) Upload to Medusa's own file storage (same place product images go)
  const url = await uploadPdfToMedusa(pdfBuffer, `${invoiceNumber}.pdf`)

  // 4) Attach the URL to the invoice record
  const patchRes = await medusaServiceFetch('/admin/invoicing', {
    method: 'PATCH',
    body: JSON.stringify({ order_id: order.id, pdf_url: url }),
  })
  if (!patchRes.ok) {
    const patchData = await patchRes.json().catch(() => ({}))
    console.error(
      '[invoicing] Failed to attach pdf_url to invoice record:',
      patchData,
    )
    // Non-fatal — the PDF exists and was returned to the caller either way.
  }

  return { invoiceNumber, url, alreadyExisted: false }
}
