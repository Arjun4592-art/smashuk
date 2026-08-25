import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { getSurfaceIdentity } from '@/lib/api/auth-cookie';
import { MEDUSA_URL } from '@/lib/api/medusa-service-token';
import { fulfillOrder, markOrderDelivered, shipOrder } from '@/lib/api/medusa-fulfillment';
import { getOrderForReturn, buildReturnLines, refundOrderAmount, appendReturnRecord, updateReturnRecord } from '@/lib/api/medusa-returns';
import { randomUUID } from 'crypto';
export async function GET(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authHeaderRaw = await getAdminAuthHeader(req);
  if (!authHeaderRaw) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const authHeader: string = authHeaderRaw;
  const {
    id
  } = await params;
  try {
    const FIELDS = '*items,*payment_collections.payments,fulfillment_status,' + 'subtotal,total,discount_total,shipping_total,tax_total,' + 'customer.first_name,customer.last_name,customer.phone,' + 'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' + 'shipping_address.province,shipping_address.postal_code,shipping_address.country_code';
    const FALLBACK_FIELDS = '*items,*payment_collections.payments,fulfillment_status,' + 'subtotal,total,discount_total,shipping_total,tax_total';
    async function fetchOrder(fields: string) {
      const url = new URL(`/admin/orders/${id}`, MEDUSA_URL);
      url.searchParams.set('fields', fields);
      const r = await fetch(url.toString(), {
        headers: {
          Authorization: authHeader
        }
      });
      const t = await r.text();
      return {
        ok: r.ok,
        status: r.status,
        text: t
      };
    }
    let {
      ok,
      status,
      text
    } = await fetchOrder(FIELDS);
    if (!ok) {
      console.error(`[order GET] Medusa ${status} for ${id} with full fields:`, text.slice(0, 500));
      ({
        ok,
        status,
        text
      } = await fetchOrder(FALLBACK_FIELDS));
    }
    const res = {
      ok,
      status
    } as {
      ok: boolean;
      status: number;
    };
    if (!res.ok) {
      console.error(`[order GET] Medusa ${res.status} for ${id}:`, text.slice(0, 500));
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.message ?? parsed.error ?? text;
      } catch {}
      return NextResponse.json({
        error: `Medusa error (${res.status}): ${detail.slice(0, 300) || 'empty response'}`
      }, {
        status: res.status
      });
    }
    const parsed = JSON.parse(text);
    if (parsed?.order) {
      parsed.order.payments = (parsed.order.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
    }
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error(`[order GET] unexpected error for ${id}:`, err);
    return NextResponse.json({
      error: err.message || 'Failed to load order — check server logs'
    }, {
      status: 500
    });
  }
}
export async function PATCH(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const {
    id
  } = await params;
  const fetcher = (path: string, init: RequestInit = {}) => fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: authHeader,
      'Content-Type': 'application/json'
    }
  });
  const identity = getSurfaceIdentity(req, 'dashboard');
  const actor = identity?.userId ? {
    staffId: identity.userId,
    surface: 'dashboard' as const
  } : undefined;
  try {
    const body = await req.json();
    const {
      action
    } = body;
    let data: any;
    switch (action) {
      case 'confirm':
        {
          const res = await fetcher(`/admin/orders/${id}/complete`, {
            method: 'POST',
            body: JSON.stringify({})
          });
          data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return NextResponse.json({
              error: data?.message ?? `Failed to confirm order (${res.status})`
            }, {
              status: res.status
            });
          }
          break;
        }
      case 'cancel':
        {
          const res = await fetcher(`/admin/orders/${id}/cancel`, {
            method: 'POST'
          });
          data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return NextResponse.json({
              error: data?.message ?? `Failed to cancel order (${res.status})`
            }, {
              status: res.status
            });
          }
          break;
        }
      case 'archive':
        {
          const res = await fetcher(`/admin/orders/${id}/archive`, {
            method: 'POST'
          });
          data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return NextResponse.json({
              error: data?.message ?? `Failed to archive order (${res.status})`
            }, {
              status: res.status
            });
          }
          break;
        }
      case 'fulfill':
        {
          try {
            data = await fulfillOrder(id, fetcher);
          } catch (fulfillErr: any) {
            return NextResponse.json({
              error: fulfillErr.message ?? 'Failed to fulfill order'
            }, {
              status: 400
            });
          }
          try {
            const orderRes = await fetcher(`/admin/orders/${id}?fields=metadata,*payment_collections.payments`);
            const orderData = await orderRes.json().catch(() => ({}));
            const fullOrder = orderData?.order;
            const isPOS = fullOrder?.metadata?.source === 'pos';
            const payments = (fullOrder?.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
            if (fullOrder && !isPOS) {
              const uncaptured = payments.filter((p: any) => !p.captured_at && p.status !== 'canceled' && p.provider_id === 'pp_system_default');
              for (const payment of uncaptured) {
                const capRes = await fetcher(`/admin/payments/${payment.id}/capture`, {
                  method: 'POST'
                });
                if (!capRes.ok) {
                  console.error(`[order fulfill] capture failed for payment ${payment.id}:`, await capRes.text().catch(() => ''));
                }
              }
            }
          } catch (captureErr) {
            console.error(`[order fulfill] post-fulfill capture step failed for ${id}:`, captureErr);
          }
          break;
        }
      case 'ship':
        {
          try {
            data = await shipOrder(id, fetcher);
          } catch (shipErr: any) {
            return NextResponse.json({
              error: shipErr.message ?? 'Failed to dispatch order'
            }, {
              status: 400
            });
          }
          break;
        }
      case 'deliver':
        {
          try {
            data = await markOrderDelivered(id, fetcher);
          } catch (deliverErr: any) {
            return NextResponse.json({
              error: deliverErr.message ?? 'Failed to mark order as delivered'
            }, {
              status: 400
            });
          }
          break;
        }
      case 'capture':
        {
          const orderRes = await fetcher(`/admin/orders/${id}?fields=*payment_collections.payments`);
          const orderData = await orderRes.json().catch(() => ({}));
          const fullOrder = orderData?.order;
          const payments = (fullOrder?.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
          const uncaptured = payments.filter((p: any) => !p.captured_at && p.status !== 'canceled');
          if (uncaptured.length === 0) {
            return NextResponse.json({
              error: 'No uncaptured payment found on this order.'
            }, {
              status: 400
            });
          }
          for (const payment of uncaptured) {
            const capRes = await fetcher(`/admin/payments/${payment.id}/capture`, {
              method: 'POST'
            });
            const capData = await capRes.json().catch(() => ({}));
            if (!capRes.ok) {
              return NextResponse.json({
                error: capData?.message ?? `Failed to capture payment ${payment.id} (${capRes.status})`
              }, {
                status: capRes.status
              });
            }
          }
          data = {
            captured: true
          };
          break;
        }
      case 'return':
        {
          const {
            items,
            reason,
            note
          } = body as {
            items?: {
              item_id: string;
              quantity: number;
            }[];
            reason?: string;
            note?: string;
          };
          try {
            const order = await getOrderForReturn(id, fetcher);
            const {
              items: builtItems,
              refund_amount
            } = buildReturnLines(order, items ?? []);
            await refundOrderAmount(order, refund_amount, fetcher);
            data = await appendReturnRecord(id, order, {
              id: randomUUID(),
              items: builtItems,
              reason: reason || 'Other',
              note,
              refund_amount,
              status: 'refunded',
              source: 'dashboard',
              requested_at: new Date().toISOString(),
              processed_at: new Date().toISOString()
            }, fetcher, {}, actor);
          } catch (returnErr: any) {
            return NextResponse.json({
              error: returnErr.message ?? 'Failed to process return'
            }, {
              status: 400
            });
          }
          break;
        }
      case 'approve-return':
        {
          const {
            returnId
          } = body as {
            returnId?: string;
          };
          if (!returnId) {
            return NextResponse.json({
              error: 'returnId is required'
            }, {
              status: 400
            });
          }
          try {
            const order = await getOrderForReturn(id, fetcher);
            const record = (order.metadata?.returns ?? []).find((r: any) => r.id === returnId);
            if (!record) {
              return NextResponse.json({
                error: 'Return request not found'
              }, {
                status: 404
              });
            }
            if (record.status !== 'requested') {
              return NextResponse.json({
                error: 'Return already processed'
              }, {
                status: 400
              });
            }
            await refundOrderAmount(order, record.refund_amount, fetcher);
            const result = await updateReturnRecord(id, order, returnId, {
              status: 'refunded',
              processed_at: new Date().toISOString()
            }, fetcher, actor);
            data = result.data;
          } catch (returnErr: any) {
            return NextResponse.json({
              error: returnErr.message ?? 'Failed to approve return'
            }, {
              status: 400
            });
          }
          break;
        }
      case 'reject-return':
        {
          const {
            returnId,
            note
          } = body as {
            returnId?: string;
            note?: string;
          };
          if (!returnId) {
            return NextResponse.json({
              error: 'returnId is required'
            }, {
              status: 400
            });
          }
          try {
            const order = await getOrderForReturn(id, fetcher);
            const result = await updateReturnRecord(id, order, returnId, {
              status: 'rejected',
              note,
              processed_at: new Date().toISOString()
            }, fetcher, actor);
            data = result.data;
          } catch (returnErr: any) {
            return NextResponse.json({
              error: returnErr.message ?? 'Failed to reject return'
            }, {
              status: 400
            });
          }
          break;
        }
      default:
        return NextResponse.json({
          error: `Unknown action: ${action}`
        }, {
          status: 400
        });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`[order PATCH] unexpected error for ${id}:`, err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
