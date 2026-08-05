// app/api/dashboard/notifications/route.ts
// Real notifications from Medusa — new orders, low stock, new customers

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const LOW_STOCK_THRESHOLD = 5

export async function GET(req: NextRequest) {
  try {
    const auth = await getAdminAuthHeader(req)
    if (!auth) {
      return NextResponse.json({ notifications: [] }, { status: 401 })
    }

    const h = { Authorization: auth, 'Content-Type': 'application/json' }
    const notifications: any[] = []
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // last 24h

    // ── 1. New orders in last 24h ──────────────────────────────────────────────
    const ordersRes = await fetch(
      `${MEDUSA_URL}/admin/orders?limit=10&order=-created_at`,
      { headers: h },
    ).catch(() => null)

    if (ordersRes?.ok) {
      const { orders } = await ordersRes.json()
      const newOrders = (orders ?? []).filter(
        (o: any) => new Date(o.created_at) > new Date(since),
      )
      newOrders.forEach((o: any) => {
        const amount = (o.total ?? 0).toLocaleString('en-GB', {
          style: 'currency', currency: 'GBP',
        })
        notifications.push({
          id: `order-${o.id}`,
          type: 'order',
          text: `New order ${o.display_id ? `#${o.display_id}` : o.id.slice(0, 8)} — ${amount}`,
          time: relativeTime(o.created_at),
          unread: true,
          link: `/dashboard/orders?id=${o.id}`,
        })
      })
    }

    // ── 2. Low stock warnings ──────────────────────────────────────────────────
    const productsRes = await fetch(
      `${MEDUSA_URL}/admin/products?limit=100&fields=*variants,*variants.inventory_items`,
      { headers: h },
    ).catch(() => null)

    if (productsRes?.ok) {
      const { products } = await productsRes.json()
      for (const p of products ?? []) {
        for (const v of p.variants ?? []) {
          const stock = v.inventory_quantity ?? 0
          if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
            notifications.push({
              id: `stock-${v.id}`,
              type: 'stock',
              text: `Low stock: ${p.title} (${stock} left)`,
              time: 'Now',
              unread: stock <= 2, // critical = unread
              link: '/dashboard/inventory',
            })
          } else if (stock === 0) {
            notifications.push({
              id: `outofstock-${v.id}`,
              type: 'stock',
              text: `Out of stock: ${p.title}`,
              time: 'Now',
              unread: true,
              link: '/dashboard/inventory',
            })
          }
        }
      }
    }

    // ── 3. New customers in last 24h ───────────────────────────────────────────
    const customersRes = await fetch(
      `${MEDUSA_URL}/admin/customers?limit=5&order=-created_at`,
      { headers: h },
    ).catch(() => null)

    if (customersRes?.ok) {
      const { customers } = await customersRes.json()
      const newCustomers = (customers ?? []).filter(
        (c: any) => new Date(c.created_at) > new Date(since),
      )
      newCustomers.forEach((c: any) => {
        const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email
        notifications.push({
          id: `customer-${c.id}`,
          type: 'customer',
          text: `New customer: ${name}`,
          time: relativeTime(c.created_at),
          unread: false,
          link: '/dashboard/customers',
        })
      })
    }

    // Sort: unread first, then by newest
    notifications.sort((a, b) => {
      if (a.unread && !b.unread) return -1
      if (!a.unread && b.unread) return 1
      return 0
    })

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      unread: notifications.filter((n) => n.unread).length,
    })
  } catch (err: any) {
    console.error('[notifications]', err)
    return NextResponse.json({ notifications: [], unread: 0 })
  }
}

// Kept for API compatibility, but unused — read-state is tracked entirely
// client-side (localStorage, see components/dashboard/Topbar.tsx), since
// notification IDs are deterministic and recomputed fresh on every GET.
export async function POST(req: NextRequest) {
  return NextResponse.json({ success: true })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
