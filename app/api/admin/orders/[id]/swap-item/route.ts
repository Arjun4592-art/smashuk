import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'
import { generateInvoiceForOrder } from '@/lib/invoice-service'
import { sendOrderConfirmationEmail } from '@/lib/api/order-notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const fetcher = (path: string, init: RequestInit = {}) =>
    fetch(`${MEDUSA_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
  const json = (res: Response) => res.json().catch(() => ({}))

  let editId: string | null = null
  let confirmed = false
  try {
    const body = await req.json()
    const { item_id, variant_id, keep_price, notify_customer } = body
    if (!item_id || !variant_id) {
      return NextResponse.json(
        { error: 'item_id and variant_id are required' },
        { status: 400 },
      )
    }

    const ORDER_FIELDS =
      'id,display_id,email,created_at,currency_code,metadata,status,total,' +
      '*items,*shipping_methods,*payment_collections.payments,*summary,' +
      'customer.first_name,customer.last_name,' +
      'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' +
      'shipping_address.postal_code,shipping_address.country_code'

    const beforeRes = await fetcher(
      `/admin/orders/${id}?fields=${ORDER_FIELDS}`,
    )
    const beforeData = await json(beforeRes)
    const before = beforeData?.order
    if (!beforeRes.ok || !before) {
      return NextResponse.json(
        { error: beforeData?.message ?? 'Could not load the order' },
        { status: beforeRes.status || 500 },
      )
    }
    if (before.status === 'canceled' || before.status === 'archived') {
      return NextResponse.json(
        { error: `A ${before.status} order cannot be edited.` },
        { status: 400 },
      )
    }
    const oldItem = (before.items ?? []).find((i: any) => i.id === item_id)
    if (!oldItem) {
      return NextResponse.json(
        { error: 'That item is not on this order.' },
        { status: 404 },
      )
    }
    const quantity = Math.max(
      1,
      Math.floor(Number(body.quantity) || oldItem.quantity),
    )

    await fetcher(`/admin/order-edits/${id}`, { method: 'DELETE' }).catch(
      () => {},
    )

    const createRes = await fetcher('/admin/order-edits', {
      method: 'POST',
      body: JSON.stringify({
        order_id: id,
        description: `Item replaced: ${oldItem.title}`,
      }),
    })
    const createData = await json(createRes)
    if (!createRes.ok) {
      return NextResponse.json(
        {
          error:
            createData?.message ??
            `Could not start an order edit (${createRes.status})`,
        },
        { status: createRes.status },
      )
    }
    editId = createData?.order_change?.id ?? createData?.order_edit?.id ?? null
    if (!editId) {
      return NextResponse.json(
        { error: 'Medusa did not return an order edit id.' },
        { status: 502 },
      )
    }

    const removeRes = await fetcher(
      `/admin/order-edits/${id}/items/item/${item_id}`,
      { method: 'POST', body: JSON.stringify({ quantity: 0 }) },
    )
    if (!removeRes.ok) {
      const d = await json(removeRes)
      throw new Error(
        d?.message ?? `Could not remove the old item (${removeRes.status})`,
      )
    }

    const newLine: Record<string, unknown> = { variant_id, quantity }
    if (keep_price) newLine.unit_price = oldItem.unit_price
    const addRes = await fetcher(`/admin/order-edits/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ items: [newLine] }),
    })
    if (!addRes.ok) {
      const d = await json(addRes)
      throw new Error(
        d?.message ?? `Could not add the new item (${addRes.status})`,
      )
    }

    const reqRes = await fetcher(`/admin/order-edits/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    if (!reqRes.ok) {
      const d = await json(reqRes)
      throw new Error(
        d?.message ?? `Could not request the edit (${reqRes.status})`,
      )
    }
    const confRes = await fetcher(`/admin/order-edits/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    if (!confRes.ok) {
      const d = await json(confRes)
      throw new Error(
        d?.message ?? `Could not confirm the edit (${confRes.status})`,
      )
    }
    confirmed = true

    const afterRes = await fetcher(`/admin/orders/${id}?fields=${ORDER_FIELDS}`)
    const after = (await json(afterRes))?.order ?? before
    const payments = (after.payment_collections ?? []).flatMap(
      (pc: any) => pc.payments ?? [],
    )
    const paid = payments
      .filter((p: any) => p.captured_at && !p.canceled_at)
      .reduce(
        (s: number, p: any) =>
          s + (Number(p.amount) - Number(p.refunded_amount ?? 0)),
        0,
      )
    const pendingDifference =
      typeof after.summary?.pending_difference === 'number'
        ? after.summary.pending_difference
        : typeof after.total === 'number'
          ? after.total - paid
          : 0
    const difference = Math.round(pendingDifference * 100) / 100

    const newItem = (after.items ?? []).find(
      (i: any) => i.variant_id === variant_id,
    )
    const swaps = Array.isArray(after.metadata?.item_swaps)
      ? after.metadata.item_swaps
      : []
    await fetcher(`/admin/orders/${id}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          ...(after.metadata ?? {}),
          item_swaps: [
            ...swaps,
            {
              at: new Date().toISOString(),
              from: {
                title: oldItem.title,
                quantity: oldItem.quantity,
                unit_price: oldItem.unit_price,
              },
              to: {
                title: newItem?.title ?? variant_id,
                quantity,
                unit_price: newItem?.unit_price,
              },
              difference,
            },
          ],
        },
      }),
    }).catch(() => {})

    let invoice: { invoiceNumber?: string; url?: string } | null = null
    try {
      const channel: 'website' | 'pos' =
        after.metadata?.source === 'pos' ? 'pos' : 'website'
      invoice = await generateInvoiceForOrder(
        { ...after, channel },
        { regenerate: true },
      )
    } catch (invErr) {
      console.error(
        `[swap-item] invoice regeneration failed for ${id}:`,
        invErr,
      )
    }
    if (notify_customer && after.email) {
      await sendOrderConfirmationEmail(after)
    }

    return NextResponse.json({
      swapped: true,
      difference,
      invoice,
      order: after,
    })
  } catch (err: any) {
    console.error(`[swap-item] failed for order ${id}:`, err)
    if (editId && !confirmed) {
      await fetcher(`/admin/order-edits/${id}`, { method: 'DELETE' }).catch(
        () => {},
      )
    }
    return NextResponse.json(
      { error: err?.message ?? 'Failed to replace the item' },
      { status: 500 },
    )
  }
}
