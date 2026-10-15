import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'

export type MailInStage =
  | 'ship_box'
  | 'awaiting_rackets'
  | 'ready_to_dispatch'
  | 'returning'
  | 'completed'
  | 'cancelled'

const isMailInLine = (i: any) =>
  i?.metadata?.mail_in === true || i?.metadata?.mail_in === 'true'

const FIELDS =
  'id,display_id,email,created_at,status,fulfillment_status,payment_status,metadata,currency_code,total,' +
  '*items,items.metadata,*fulfillments,' +
  'shipping_address.first_name,shipping_address.last_name,shipping_address.city,shipping_address.postal_code'

// Medusa can't filter orders by line-item metadata, so scan the most recent
// orders and keep the mail-in ones.
const PAGE = 100
const MAX_PAGES = 5

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const rows: any[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('/admin/orders', MEDUSA_URL)
      url.searchParams.set('limit', String(PAGE))
      url.searchParams.set('offset', String(page * PAGE))
      url.searchParams.set('order', '-created_at')
      url.searchParams.set('fields', FIELDS)
      const res = await fetch(url.toString(), {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return NextResponse.json(
          { error: err?.message ?? `Backend returned ${res.status}` },
          { status: res.status },
        )
      }
      const data = await res.json()
      const orders: any[] = data.orders ?? []
      for (const o of orders) {
        const lines = (o.items ?? []).filter(isMailInLine)
        if (lines.length === 0) continue
        rows.push(toRow(o, lines))
      }
      if (orders.length < PAGE) break
    }
    return NextResponse.json({ orders: rows })
  } catch (err: any) {
    console.error('[API] mail-in-orders GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function toRow(o: any, lines: any[]) {
  const meta = o.metadata ?? {}
  const boxLine = lines.find((l) => l.metadata?.mail_in_part === 'box-kit')
  const needsBox = Boolean(boxLine)
  const boxShipped = Boolean(meta.mail_in_box?.shipped_at)
  const boxFid: string | undefined = meta.mail_in_box?.fulfillment_id
  const active = (o.fulfillments ?? []).filter((f: any) => !f.canceled_at)
  const returnLeg = active.filter((f: any) => f.id !== boxFid)
  const cancelled =
    o.status === 'canceled' || o.fulfillment_status === 'canceled'

  let stage: MailInStage
  if (cancelled) stage = 'cancelled'
  else if (needsBox && !boxShipped) stage = 'ship_box'
  else if (returnLeg.length === 0) stage = 'awaiting_rackets'
  else if (returnLeg.every((f: any) => f.delivered_at)) stage = 'completed'
  else if (returnLeg.every((f: any) => f.shipped_at || f.delivered_at))
    stage = 'returning'
  else stage = 'ready_to_dispatch'

  const hasP2g = (f: any) => Boolean(f?.data?.parcel2go_order_id)
  const stringing = lines.filter(
    (l) => l.metadata?.mail_in_part === 'stringing',
  )
  const sport =
    stringing[0]?.metadata?.mail_in_sport ?? lines[0]?.metadata?.mail_in_sport
  const addr = o.shipping_address
  return {
    id: o.id,
    display_id: o.display_id,
    email: o.email ?? null,
    name: [addr?.first_name, addr?.last_name].filter(Boolean).join(' ') || null,
    city: addr?.city ?? null,
    created_at: o.created_at,
    stage,
    needs_box: needsBox,
    box_shipped: boxShipped,
    sport: sport ?? null,
    rackets:
      stringing.length ||
      Number(
        lines.find((l) => l.metadata?.mail_in_part === 'delivery')?.metadata
          ?.mail_in_rackets,
      ) ||
      0,
    priority: lines.some((l) => l.metadata?.mail_in_part === 'priority'),
    payment_status: o.payment_status ?? null,
    total: Number(o.total ?? 0),
    currency_code: o.currency_code ?? null,
    inbound_label_status: meta.mail_in_label?.status ?? null,
    inbound_label_error: meta.mail_in_label?.error ?? null,
    labels: {
      box: boxShipped && active.some((f: any) => f.id === boxFid && hasP2g(f)),
      inbound: Boolean(meta.mail_in_label?.parcel2go_order_id),
      return: returnLeg.some(hasP2g),
    },
    tracking: {
      box: meta.mail_in_box?.tracking_number ?? null,
      inbound: meta.mail_in_label?.tracking_number ?? null,
    },
  }
}
