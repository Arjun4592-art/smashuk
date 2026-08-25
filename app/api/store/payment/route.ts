import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
async function getCustomerToken() {
  const cs = await cookies();
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value;
  return t?.startsWith('nextauth:') ? undefined : t;
}
function storeHeaders(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUB_KEY
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
async function safeJson(res: Response, label: string) {
  try {
    return await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    console.error(`[/api/store/payment] ${label} returned non-JSON (${res.status}):`, text.slice(0, 300));
    return {
      error: `${label} failed (${res.status}) — Medusa backend may be unreachable or misconfigured.`
    };
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      cartId
    } = body;
    const token = await getCustomerToken();
    const h = storeHeaders(token);
    if (action === 'get-method') {
      const {
        paymentIntentId
      } = body;
      if (!paymentIntentId) {
        return NextResponse.json({
          error: 'paymentIntentId required'
        }, {
          status: 400
        });
      }
      try {
        const {
          requireStripe
        } = await import('@/lib/stripe-server');
        const pi = await requireStripe().paymentIntents.retrieve(paymentIntentId, {
          expand: ['payment_method']
        });
        const pm = pi.payment_method;
        const type = typeof pm === 'object' && pm ? pm.type : undefined;
        return NextResponse.json({
          payment_method: type ?? 'card'
        });
      } catch (err: any) {
        console.error('[/api/store/payment] get-method failed:', err);
        return NextResponse.json({
          payment_method: 'card'
        });
      }
    }
    if (action === 'create-collection') {
      const res = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          cart_id: cartId
        })
      });
      const data = await safeJson(res, 'create-collection');
      if (!res.ok) console.error('[/api/store/payment] create-collection failed:', data);
      return NextResponse.json(data, {
        status: res.status
      });
    }
    if (action === 'create-session') {
      const {
        collectionId,
        providerId
      } = body;
      const res = await fetch(`${MEDUSA_URL}/store/payment-collections/${collectionId}/payment-sessions`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          provider_id: providerId ?? 'pp_stripe_stripe'
        })
      });
      const data = await safeJson(res, 'create-session');
      if (!res.ok) {
        console.error(`[/api/store/payment] create-session failed for provider "${providerId}":`, data);
      }
      return NextResponse.json(data, {
        status: res.status
      });
    }
    if (action === 'complete') {
      const {
        metadata
      } = body;
      if (metadata) {
        await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            metadata
          })
        }).catch(err => console.error('[payment] metadata update failed:', err));
      }
      const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/complete`, {
        method: 'POST',
        headers: h
      });
      const data = await safeJson(res, 'complete');
      if (!res.ok) {
        console.error('[/api/store/payment] cart complete failed:', data);
        return NextResponse.json(data, {
          status: res.status
        });
      }
      try {
        const order = data.order ?? data.cart;
        const orderId = order?.id;
        if (orderId) {
          const {
            medusaServiceFetch
          } = await import('@/lib/api/medusa-service-token');
          const orderRes = await medusaServiceFetch(`/admin/orders/${orderId}?fields=*payment_collections.payments`);
          if (orderRes.ok) {
            const {
              order: fullOrder
            } = await orderRes.json();
            const payments = (fullOrder?.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
            const uncaptured = payments.filter((p: any) => !p.captured_at && p.status !== 'canceled' && p.provider_id !== 'pp_system_default');
            for (const payment of uncaptured) {
              const capRes = await medusaServiceFetch(`/admin/payments/${payment.id}/capture`, {
                method: 'POST'
              });
              if (!capRes.ok) {
                console.error(`[/api/store/payment] capture failed for payment ${payment.id}:`, await capRes.text().catch(() => ''));
              }
            }
          }
        }
      } catch (captureErr) {
        console.error('[/api/store/payment] post-complete capture step failed:', captureErr);
      }
      try {
        const order = data.order ?? data.cart;
        if (order?.id) {
          const {
            medusaServiceFetch
          } = await import('@/lib/api/medusa-service-token');
          const orderRes = await medusaServiceFetch(`/admin/orders/${order.id}?fields=id,currency_code,*items,*shipping_methods,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`);
          if (orderRes.ok) {
            const {
              order: fullOrder
            } = await orderRes.json();
            const {
              generateInvoiceForOrder
            } = await import('@/lib/invoice-service');
            await generateInvoiceForOrder({
              ...fullOrder,
              channel: 'website'
            });
          }
        }
      } catch (invoiceErr) {
        console.error('[/api/store/payment] invoice generation failed:', invoiceErr);
      }
      return NextResponse.json(data, {
        status: res.status
      });
    }
    return NextResponse.json({
      error: 'Unknown action'
    }, {
      status: 400
    });
  } catch (err: any) {
    console.error('[/api/store/payment]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
