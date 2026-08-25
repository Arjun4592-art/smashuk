import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { fulfillOrder } from '@/lib/api/medusa-fulfillment';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
function toLookupResult(o: any) {
  return {
    id: o.id,
    orderNumber: o.display_id ? `SR-${o.display_id}` : 'SR-—',
    customerName: o.customer ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() || o.email : o.email,
    email: o.email ?? '',
    phone: o.shipping_address?.phone ?? o.metadata?.pickup_contact_phone ?? '',
    total: o.total ?? 0,
    items: (o.items ?? []).map((i: any) => ({
      title: i.title ?? i.product_title ?? 'Item',
      quantity: i.quantity ?? 1
    })),
    isPickup: o.metadata?.fulfillment_type === 'pickup',
    fulfillmentStatus: o.fulfillment_status ?? 'not_fulfilled',
    paymentStatus: o.payment_status ?? 'not_paid',
    source: o.metadata?.source === 'pos' ? 'pos' : 'website',
    createdAt: o.created_at
  };
}
export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({
      error: 'Enter at least 3 characters (order number, email, or phone) to search.'
    }, {
      status: 400
    });
  }
  const fields = 'id,display_id,email,total,fulfillment_status,payment_status,created_at,' + '*customer,*items,*shipping_address,*metadata';
  try {
    const numeric = q.replace(/^SR-?/i, '').trim();
    if (/^\d+$/.test(numeric)) {
      const res = await medusaServiceFetch(`/admin/orders?display_id=${numeric}&fields=${encodeURIComponent(fields)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const order = data.orders?.[0];
        if (order) {
          return NextResponse.json({
            orders: [toLookupResult(order)]
          });
        }
      }
    }
    const res = await medusaServiceFetch(`/admin/orders?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&limit=5`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err.message ?? 'Order lookup failed'
      }, {
        status: res.status
      });
    }
    const data = await res.json();
    const orders = (data.orders ?? []).map(toLookupResult);
    if (orders.length === 0) {
      return NextResponse.json({
        orders: [],
        message: 'No matching order found.'
      });
    }
    return NextResponse.json({
      orders
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message ?? 'Order lookup failed'
    }, {
      status: 500
    });
  }
}
export async function PATCH(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const {
      orderId
    } = await req.json();
    if (!orderId) {
      return NextResponse.json({
        error: 'orderId is required'
      }, {
        status: 400
      });
    }
    const result = await fulfillOrder(orderId, medusaServiceFetch, true);
    let captured = false;
    try {
      const orderRes = await medusaServiceFetch(`/admin/orders/${orderId}?fields=id,*payment_collections.payments`);
      const orderData = await orderRes.json().catch(() => ({}));
      const payments = (orderData?.order?.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
      const uncaptured = payments.filter((p: any) => !p.captured_at && p.status !== 'canceled');
      for (const payment of uncaptured) {
        const capRes = await medusaServiceFetch(`/admin/payments/${payment.id}/capture`, {
          method: 'POST'
        });
        if (capRes.ok) {
          captured = true;
        } else {
          console.warn(`[POS order lookup] capture failed for payment ${payment.id}:`, await capRes.text().catch(() => ''));
        }
      }
    } catch (captureErr) {
      console.warn('[POS order lookup] capture step failed:', captureErr);
    }
    return NextResponse.json({
      ok: true,
      alreadyFulfilled: !!result.alreadyFulfilled,
      captured
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message ?? 'Failed to complete order'
    }, {
      status: 500
    });
  }
}
