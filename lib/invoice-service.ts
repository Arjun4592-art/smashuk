import 'server-only'
import { generateInvoicePdf, InvoiceData } from './invoice-pdf'
import {
  medusaServiceFetch,
  getMedusaServiceToken,
  MEDUSA_URL,
} from './api/medusa-service-token'
const BUSINESS_DETAILS = {
  name: process.env.BUSINESS_LEGAL_NAME || 'SmashRocker Pro Ltd',
  addressLines: (process.env.BUSINESS_ADDRESS_LINES || '')
    .split('|')
    .filter(Boolean),
  vatRegistered: process.env.BUSINESS_VAT_REGISTERED === 'true',
  vatNumber: process.env.BUSINESS_VAT_NUMBER || undefined,
}
export type OrderForInvoice = {
  id: string
  display_id?: number | string | null
  created_at?: string
  currency_code: string
  metadata?: {
    cashier?: string
    payment_method?: string
    source?: string
  } | null
  payment_collections?: Array<{
    payments?: Array<{
      provider_id?: string
    }> | null
  }> | null
  customer?: {
    first_name?: string
    last_name?: string
  } | null
  shipping_address?: {
    address_1?: string
    address_2?: string
    city?: string
    postal_code?: string
    country_code?: string
  } | null
  items: Array<{
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number
  }>
  shipping_methods?: Array<{
    amount?: number
  }> | null
  channel: 'website' | 'pos'
}
async function uploadPdfToMedusa(
  pdfBuffer: Buffer,
  filename: string,
): Promise<string> {
  const token = await getMedusaServiceToken()
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: 'application/pdf',
  })
  formData.append('files', blob, filename)
  const res = await fetch(`${MEDUSA_URL}/admin/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
function derivePaymentMethod(order: OrderForInvoice): string {
  const posMethod = order.metadata?.payment_method
  if (posMethod) {
    return posMethod.charAt(0).toUpperCase() + posMethod.slice(1).toLowerCase()
  }
  const providerId =
    (order.payment_collections ?? [])
      .flatMap((pc) => pc.payments ?? [])
      .find(Boolean)?.provider_id ?? ''
  if (!providerId || providerId === 'pp_system_default') return 'Cash'
  if (providerId.includes('stripe')) return 'Card'
  if (providerId.includes('paypal')) return 'PayPal'
  return providerId.replace(/^pp_/, '').replace(/_/g, ' ')
}
export async function generateInvoiceForOrder(
  order: OrderForInvoice,
  {
    regenerate = false,
  }: {
    regenerate?: boolean
  } = {},
): Promise<{
  invoiceNumber: string
  url: string
  alreadyExisted: boolean
}> {
  let numberRes = await medusaServiceFetch('/admin/invoicing', {
    method: 'POST',
    body: JSON.stringify({
      order_id: order.id,
      channel: order.channel,
    }),
  })
  let numberData = await numberRes.json().catch(() => ({}))
  if (!numberRes.ok && numberRes.status === 422) {
    console.warn(
      `[invoicing] POST returned 422 (already exists) for order ${order.id} — fetching existing record`,
    )
    const getRes = await medusaServiceFetch(
      `/admin/invoicing?order_id=${encodeURIComponent(order.id)}`,
      {
        method: 'GET',
      },
    )
    const getData = await getRes.json().catch(() => ({}))
    if (!getRes.ok) {
      throw new Error(
        `[invoicing] Failed to fetch existing invoice after 422: ${getData?.error ?? getRes.status}`,
      )
    }
    const existing = getData?.invoice ?? getData?.invoices?.[0] ?? getData
    if (!existing?.invoice_number) {
      throw new Error(
        `[invoicing] 422 fallback GET returned no invoice_number for order ${order.id}`,
      )
    }
    numberData = {
      ...existing,
      is_new: false,
    }
    numberRes = {
      ok: true,
      status: 200,
    } as Response
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
    return {
      invoiceNumber,
      url: existingUrl,
      alreadyExisted: true,
    }
  }
  const shippingExVat = (order.shipping_methods ?? []).reduce(
    (sum, m) => sum + (m.amount ?? 0),
    0,
  )
  const orderNumber = order.display_id ? `SR-${order.display_id}` : order.id
  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate: new Date().toISOString().slice(0, 10),
    supplyDate: new Date().toISOString().slice(0, 10),
    orderReference: orderNumber,
    placedAt: order.created_at
      ? new Date(order.created_at).toISOString().slice(0, 10)
      : undefined,
    paymentMethod: derivePaymentMethod(order),
    staffName:
      order.channel === 'pos'
        ? order.metadata?.cashier || undefined
        : undefined,
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
      description: item.variant_title
        ? `${item.title} — ${item.variant_title}`
        : item.title,
      quantity: item.quantity,
      unitPriceExVat: item.unit_price,
      vatRatePercent: 20,
    })),
    shippingExVat: shippingExVat || undefined,
  }
  const pdfBuffer = await generateInvoicePdf(invoiceData)
  const url = await uploadPdfToMedusa(pdfBuffer, `${invoiceNumber}.pdf`)
  const patchRes = await medusaServiceFetch('/admin/invoicing', {
    method: 'PATCH',
    body: JSON.stringify({
      order_id: order.id,
      pdf_url: url,
    }),
  })
  if (!patchRes.ok) {
    const patchData = await patchRes.json().catch(() => ({}))
    console.error(
      '[invoicing] Failed to attach pdf_url to invoice record:',
      patchData,
    )
  }
  return {
    invoiceNumber,
    url,
    alreadyExisted: false,
  }
}
