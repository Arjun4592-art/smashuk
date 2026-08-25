import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { getRemainingReturnableQty } from '@/lib/api/medusa-returns';
import { fulfillOrder } from '@/lib/api/medusa-fulfillment';
import { requireStripe } from '@/lib/stripe-server';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
function toPosOrderRecord(o: any) {
  const items = (o.items ?? []).map((i: any) => ({
    product: {
      id: i.variant_id ?? i.id,
      lineItemId: i.id as string,
      name: i.product_title ?? i.title ?? 'Item',
      brand: i.metadata?.brand ?? '',
      price: i.unit_price ?? 0
    },
    quantity: i.quantity ?? 1
  }));
  const customerName = (o.customer ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() : '') || o.metadata?.customer_name || '';
  const customerPhone = o.metadata?.customer_phone || o.shipping_address?.phone || '';
  return {
    medusaOrderId: o.id as string,
    id: o.display_id ? `SR-${o.display_id}` : o.id as string,
    items,
    customer: customerName ? {
      name: customerName,
      phone: customerPhone
    } : null,
    subtotal: o.subtotal ?? 0,
    discountTotal: o.discount_total ?? 0,
    tax: o.tax_total ?? 0,
    total: o.total ?? 0,
    paymentMethod: o.metadata?.payment_method || 'cash',
    note: o.metadata?.note || '',
    cashier: o.metadata?.cashier || '',
    completedAt: o.created_at,
    isPickup: o.metadata?.fulfillment_type === 'pickup',
    fulfillmentStatus: o.fulfillment_status ?? 'not_fulfilled',
    returned: Boolean(o.metadata?.returned) || Array.isArray(o.items) && o.items.length > 0 && Object.values(getRemainingReturnableQty(o)).every(qty => qty <= 0)
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
  const {
    searchParams
  } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 150), 300);
  const fields = 'id,display_id,email,subtotal,discount_total,tax_total,total,status,' + 'fulfillment_status,payment_status,created_at,*items,*customer,' + '*shipping_address,+metadata';
  try {
    const res = await medusaServiceFetch(`/admin/orders?limit=${limit}&order=-created_at&fields=${encodeURIComponent(fields)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err.message ?? 'Failed to load orders'
      }, {
        status: res.status
      });
    }
    const data = await res.json();
    const orders = (data.orders ?? []).map(toPosOrderRecord);
    return NextResponse.json({
      orders
    });
  } catch (err: any) {
    console.error('[API] POS orders GET error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
async function storeFetch(path: string, init: RequestInit = {}) {
  return fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY
    }
  });
}
async function safeJson(res: Response, label: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[POS orders] ${label} non-JSON (${res.status}):`, text.slice(0, 300));
    throw new Error(`${label} failed (${res.status}): ${text.slice(0, 200) || 'empty response'}`);
  }
}
function stepError(label: string, status: number, data: any): string {
  const raw = data?.message ?? data?.error?.message ?? data?.error ?? JSON.stringify(data).slice(0, 200);
  return `[${label}] (HTTP ${status}) ${raw}`;
}
export async function POST(request: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  if (!PUBLISHABLE_KEY) {
    return NextResponse.json({
      error: 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is missing in .env.local'
    }, {
      status: 500
    });
  }
  try {
    const body = await request.json();
    const {
      items,
      region_id,
      customer_id,
      customer_email,
      customer_name,
      customer_phone,
      payment_method,
      note,
      cashier,
      stripe_payment_intent_id,
      stripe_payment_amount,
      fulfillment_type,
      shipping_address,
      gift_card_code
    } = body;
    const fulfillmentType: 'pickup' | 'ship' = fulfillment_type === 'ship' ? 'ship' : 'pickup';
    if (fulfillmentType === 'ship') {
      const required = ['first_name', 'address_1', 'city', 'postal_code', 'country_code'];
      const missing = required.filter(k => !shipping_address?.[k]);
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Shipping address missing: ${missing.join(', ')}`
        }, {
          status: 400
        });
      }
    }
    if (!region_id) {
      return NextResponse.json({
        error: 'region_id is required'
      }, {
        status: 400
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        error: 'At least one item is required'
      }, {
        status: 400
      });
    }
    async function resolveUniqueEmail(candidate: string, ownerId: string): Promise<string> {
      try {
        const checkRes = await medusaServiceFetch(`/admin/customers?email=${encodeURIComponent(candidate)}&limit=1`);
        if (checkRes.ok) {
          const checkData = await safeJson(checkRes, 'email collision check');
          const owner = checkData?.customers?.[0];
          if (owner && owner.id !== ownerId) {
            const unique = candidate.replace('@', `-${ownerId.slice(-8)}@`);
            const setRes = await medusaServiceFetch(`/admin/customers/${ownerId}`, {
              method: 'POST',
              body: JSON.stringify({
                email: unique
              })
            });
            if (!setRes.ok) {
              console.warn('[POS orders] could not persist de-duplicated email onto customer', ownerId);
            }
            return unique;
          }
        }
      } catch (checkErr) {
        console.warn('[POS orders] email collision check failed (non-fatal):', checkErr);
      }
      return candidate;
    }
    let cartEmail = customer_email as string | undefined;
    if (!cartEmail && customer_id && !String(customer_id).startsWith('local-')) {
      try {
        const custRes = await medusaServiceFetch(`/admin/customers/${customer_id}`);
        if (custRes.ok) {
          const custData = await safeJson(custRes, 'customer lookup');
          cartEmail = custData?.customer?.email || undefined;
        }
      } catch (lookupErr) {
        console.warn('[POS orders] customer email lookup failed:', lookupErr);
      }
      if (!cartEmail) {
        cartEmail = await resolveUniqueEmail(`pos-${customer_id}@smashuk.co.uk`.toLowerCase(), customer_id);
        try {
          const setEmailRes = await medusaServiceFetch(`/admin/customers/${customer_id}`, {
            method: 'POST',
            body: JSON.stringify({
              email: cartEmail
            })
          });
          if (!setEmailRes.ok) {
            console.warn('[POS orders] could not persist synthetic email onto customer', customer_id);
          }
        } catch (setEmailErr) {
          console.warn('[POS orders] set customer email threw:', setEmailErr);
        }
      } else {
        cartEmail = await resolveUniqueEmail(cartEmail.toLowerCase(), customer_id);
      }
    }
    if (!cartEmail) {
      cartEmail = (customer_email || 'walkin@smashuk.co.uk').toLowerCase();
    }
    const cartRes = await storeFetch('/store/carts', {
      method: 'POST',
      body: JSON.stringify({
        region_id,
        email: cartEmail
      })
    });
    const cartData = await safeJson(cartRes, 'cart create');
    if (!cartRes.ok) {
      console.error('[POS orders] cart create failed:', cartRes.status, cartData);
      return NextResponse.json({
        error: stepError('cart create', cartRes.status, cartData)
      }, {
        status: cartRes.status
      });
    }
    const cartId = cartData.cart.id;
    for (const item of items) {
      const lineRes = await storeFetch(`/store/carts/${cartId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          variant_id: item.variant_id,
          quantity: item.quantity
        })
      });
      if (!lineRes.ok) {
        const lineData = await safeJson(lineRes, 'add line item');
        console.error('[POS orders] add line item failed:', item.variant_id, lineRes.status, lineData);
        return NextResponse.json({
          error: stepError(`add item ${item.variant_id}`, lineRes.status, lineData)
        }, {
          status: lineRes.status
        });
      }
    }
    let giftCardApplied = false;
    if (gift_card_code) {
      const gcRes = await storeFetch(`/store/carts/${cartId}/gift-cards`, {
        method: 'POST',
        body: JSON.stringify({
          code: String(gift_card_code).toUpperCase()
        })
      });
      if (!gcRes.ok) {
        const gcData = await safeJson(gcRes, 'gift card apply');
        console.error('[POS orders] gift card apply failed:', gcRes.status, gcData);
        return NextResponse.json({
          error: stepError('gift card', gcRes.status, gcData)
        }, {
          status: gcRes.status
        });
      }
      giftCardApplied = true;
    }
    if (fulfillmentType === 'ship' && shipping_address) {
      const addrRes = await storeFetch(`/store/carts/${cartId}`, {
        method: 'POST',
        body: JSON.stringify({
          shipping_address
        })
      });
      if (!addrRes.ok) {
        const addrData = await safeJson(addrRes, 'shipping address add');
        console.error('[POS orders] shipping address add failed:', addrRes.status, addrData);
        return NextResponse.json({
          error: stepError('shipping address', addrRes.status, addrData)
        }, {
          status: addrRes.status
        });
      }
    }
    const shippingOptsRes = await storeFetch(`/store/shipping-options?cart_id=${cartId}`);
    if (shippingOptsRes.ok) {
      const shippingOptsData = await safeJson(shippingOptsRes, 'shipping options fetch');
      const options = shippingOptsData.shipping_options ?? [];
      const chosen = fulfillmentType === 'ship' ? options.find((o: any) => !/pickup|store|pos/i.test(o.name ?? '')) ?? options[0] : options.find((o: any) => /pickup|store|pos/i.test(o.name ?? '')) ?? options[0];
      if (chosen) {
        const smRes = await storeFetch(`/store/carts/${cartId}/shipping-methods`, {
          method: 'POST',
          body: JSON.stringify({
            option_id: chosen.id
          })
        });
        if (!smRes.ok) {
          const smData = await safeJson(smRes, 'shipping method add');
          console.warn('[POS orders] shipping method add failed:', smData);
        }
      } else if (fulfillmentType === 'ship') {
        return NextResponse.json({
          error: 'No shipping option is configured in Medusa for this region.'
        }, {
          status: 400
        });
      }
    }
    const involvesCardPayment = payment_method === 'card' || payment_method === 'split';
    if (involvesCardPayment && stripe_payment_intent_id) {
      const cartCheckRes = await storeFetch(`/store/carts/${cartId}`);
      const cartCheckData = await safeJson(cartCheckRes, 'cart total check');
      const cartTotal = Math.round(cartCheckData?.cart?.total ?? 0);
      try {
        const stripeClient = requireStripe();
        const intent = await stripeClient.paymentIntents.retrieve(stripe_payment_intent_id);
        if (intent.status !== 'succeeded') {
          return NextResponse.json({
            error: `Card payment was not completed (Stripe status: ${intent.status}). Sale not recorded — no money was taken.`
          }, {
            status: 402
          });
        }
        const verifiedAmount = intent.amount_received ?? intent.amount;
        const claimedAmount = Math.round(stripe_payment_amount ?? 0);
        if (Math.abs(verifiedAmount - claimedAmount) > 1) {
          return NextResponse.json({
            error: 'Card payment amount could not be verified. Sale not recorded.'
          }, {
            status: 402
          });
        }
        if (payment_method === 'card' && verifiedAmount + 1 < cartTotal) {
          return NextResponse.json({
            error: `Card payment (${verifiedAmount}) does not cover the order total (${cartTotal}). Sale not recorded.`
          }, {
            status: 402
          });
        }
        if (payment_method === 'split' && verifiedAmount > cartTotal + 1) {
          return NextResponse.json({
            error: 'Card portion exceeds the order total. Sale not recorded.'
          }, {
            status: 402
          });
        }
      } catch (stripeErr: any) {
        console.error('[POS orders] Stripe payment verification failed:', stripeErr);
        return NextResponse.json({
          error: `Could not verify card payment with Stripe: ${stripeErr.message}`
        }, {
          status: 402
        });
      }
    } else if (payment_method === 'card') {
      return NextResponse.json({
        error: 'No verified card payment found for this sale. Sale not recorded.'
      }, {
        status: 402
      });
    }
    const pcRes = await storeFetch('/store/payment-collections', {
      method: 'POST',
      body: JSON.stringify({
        cart_id: cartId
      })
    });
    const pcData = await safeJson(pcRes, 'payment collection create');
    if (!pcRes.ok) {
      console.error('[POS orders] payment collection create failed:', pcRes.status, pcData);
      return NextResponse.json({
        error: stepError('payment collection', pcRes.status, pcData)
      }, {
        status: pcRes.status
      });
    }
    const paymentCollectionId = pcData.payment_collection.id;
    const psRes = await storeFetch(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
      method: 'POST',
      body: JSON.stringify({
        provider_id: 'pp_system_default'
      })
    });
    const psData = await safeJson(psRes, 'payment session create');
    if (!psRes.ok) {
      console.error('[POS orders] payment session create failed:', psRes.status, psData);
      return NextResponse.json({
        error: stepError('payment session', psRes.status, psData) + ' — check that a payment provider (e.g. "System default") is enabled for this region in Medusa → Settings → Regions.'
      }, {
        status: psRes.status
      });
    }
    const completeRes = await storeFetch(`/store/carts/${cartId}/complete`, {
      method: 'POST'
    });
    const completeData = await safeJson(completeRes, 'cart complete');
    if (!completeRes.ok || completeData.type === 'cart') {
      console.error('[POS orders] cart complete failed:', completeRes.status, completeData);
      return NextResponse.json({
        error: stepError('complete order', completeRes.ok ? 400 : completeRes.status, completeData.error ?? completeData)
      }, {
        status: completeRes.ok ? 400 : completeRes.status
      });
    }
    const order = completeData.order;
    const metadataPayload = {
      source: 'pos',
      cashier: cashier ?? '',
      customer_name: customer_name ?? '',
      customer_phone: customer_phone ?? '',
      payment_method: payment_method ?? '',
      note: note ?? '',
      stripe_payment_intent_id: stripe_payment_intent_id ?? '',
      fulfillment_type: fulfillmentType,
      ...(giftCardApplied ? {
        gift_card_code: String(gift_card_code).toUpperCase()
      } : {}),
      ...(fulfillmentType === 'ship' && shipping_address ? {
        shipping_address_summary: [shipping_address.address_1, shipping_address.city, shipping_address.postal_code].filter(Boolean).join(', ')
      } : {})
    };
    try {
      const metaRes = await medusaServiceFetch(`/admin/orders/${order.id}`, {
        method: 'POST',
        body: JSON.stringify({
          metadata: metadataPayload
        })
      });
      if (!metaRes.ok) {
        const metaErrData = await safeJson(metaRes, 'metadata attach').catch(() => null);
        console.error('[POS orders] metadata attach FAILED (order still created, but source/cashier will be wrong):', metaRes.status, metaErrData);
      }
    } catch (metaErr) {
      console.error('[POS orders] metadata attach threw:', metaErr);
    }
    if (customer_id && !String(customer_id).startsWith('local-')) {
      try {
        const custRes = await medusaServiceFetch(`/admin/orders/${order.id}`, {
          method: 'POST',
          body: JSON.stringify({
            customer_id
          })
        });
        if (!custRes.ok) {
          console.warn('[POS orders] direct customer_id reassign not supported on this Medusa version (expected on v2) — order is already linked correctly via cart email.');
        }
      } catch (custErr) {
        console.warn('[POS orders] customer_id attach threw (non-fatal):', custErr);
      }
    }
    let captured = false;
    try {
      const orderRes = await medusaServiceFetch(`/admin/orders/${order.id}?fields=id,*payment_collections.payments`);
      const orderData = await safeJson(orderRes, 'order fetch for capture');
      const payments = (orderData?.order?.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
      const uncaptured = payments.filter((p: any) => !p.captured_at && p.status !== 'canceled');
      for (const payment of uncaptured) {
        const capRes = await medusaServiceFetch(`/admin/payments/${payment.id}/capture`, {
          method: 'POST'
        });
        if (capRes.ok) {
          captured = true;
        } else {
          console.warn(`[POS orders] capture failed for payment ${payment.id}:`, await capRes.text().catch(() => ''));
        }
      }
    } catch (captureErr) {
      console.warn('[POS orders] auto-capture failed:', captureErr);
    }
    try {
      const invoiceOrderRes = await medusaServiceFetch(`/admin/orders/${order.id}?fields=id,currency_code,*items,*shipping_methods,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`);
      if (invoiceOrderRes.ok) {
        const {
          order: fullOrderForInvoice
        } = await invoiceOrderRes.json();
        const {
          generateInvoiceForOrder
        } = await import('@/lib/invoice-service');
        await generateInvoiceForOrder({
          ...fullOrderForInvoice,
          channel: 'pos'
        });
      }
    } catch (invoiceErr) {
      console.warn('[POS orders] invoice generation failed:', invoiceErr);
    }
    const isCashPickup = fulfillmentType === 'pickup' && payment_method === 'cash';
    let fulfilled = false;
    if (fulfillmentType === 'pickup') {
      try {
        await fulfillOrder(order.id, medusaServiceFetch, isCashPickup);
        fulfilled = true;
      } catch (fulfillErr) {
        console.warn('[POS orders] auto-fulfill failed:', fulfillErr);
      }
    }
    return NextResponse.json({
      order,
      fulfilled,
      captured
    });
  } catch (err: any) {
    console.error('[POS] Orders route error:', err);
    return NextResponse.json({
      error: err?.message || 'Unexpected error creating the order — check the server terminal for details.'
    }, {
      status: 500
    });
  }
}
