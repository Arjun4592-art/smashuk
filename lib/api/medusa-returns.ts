import 'server-only';
import { logStaffActivity } from './staff-activity';
export type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;
export interface ReturnActor {
  staffId: string;
  staffName?: string;
  surface: 'dashboard' | 'pos';
}
export interface ReturnLineInput {
  item_id: string;
  quantity: number;
}
export interface ReturnRecord {
  id: string;
  items: {
    item_id: string;
    title: string;
    quantity: number;
    unit_price: number;
  }[];
  reason: string;
  note?: string;
  refund_amount: number;
  status: 'requested' | 'refunded' | 'rejected';
  source: 'customer' | 'dashboard' | 'pos';
  requested_at: string;
  processed_at?: string;
}
async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}
export async function getOrderForReturn(orderId: string, fetcher: Fetcher) {
  const res = await fetcher(`/admin/orders/${orderId}?fields=*items,*payment_collections.payments,metadata,currency_code`);
  if (!res.ok) {
    const err = await readJson(res);
    throw new Error(err.message ?? `Order not found (${res.status})`);
  }
  const data = await readJson(res);
  const order = data.order;
  if (!order) throw new Error('Order not found');
  order.payments = (order.payment_collections ?? []).flatMap((pc: any) => pc.payments ?? []);
  return order;
}
export function getReturnRecords(order: any): ReturnRecord[] {
  return Array.isArray(order.metadata?.returns) ? order.metadata.returns : [];
}
export function getRemainingReturnableQty(order: any): Record<string, number> {
  const remaining: Record<string, number> = {};
  for (const item of order.items ?? []) {
    remaining[item.id] = item.quantity;
  }
  for (const record of getReturnRecords(order)) {
    if (record.status === 'rejected') continue;
    for (const line of record.items) {
      remaining[line.item_id] = (remaining[line.item_id] ?? 0) - line.quantity;
    }
  }
  return remaining;
}
export function buildReturnLines(order: any, lines: ReturnLineInput[]) {
  const remaining = getRemainingReturnableQty(order);
  const itemsById = new Map((order.items ?? []).map((i: any) => [i.id, i]));
  const built: ReturnRecord['items'] = [];
  let refund_amount = 0;
  for (const line of lines) {
    if (!line.item_id || !line.quantity || line.quantity <= 0) continue;
    const item: any = itemsById.get(line.item_id);
    if (!item) throw new Error(`Line item ${line.item_id} not found on this order`);
    const canReturn = remaining[line.item_id] ?? 0;
    if (line.quantity > canReturn) {
      throw new Error(`Only ${canReturn} of "${item.title}" left to return (requested ${line.quantity})`);
    }
    built.push({
      item_id: item.id,
      title: item.title,
      quantity: line.quantity,
      unit_price: item.unit_price
    });
    refund_amount += item.unit_price * line.quantity;
  }
  if (built.length === 0) {
    throw new Error('No valid items selected to return');
  }
  return {
    items: built,
    refund_amount: Math.round(refund_amount)
  };
}
export async function refundOrderAmount(order: any, amount: number, fetcher: Fetcher) {
  if (amount <= 0) return;
  const refundable = (order.payments ?? []).filter((p: any) => p.captured_at && p.status !== 'canceled');
  const totalRefundable = refundable.reduce((sum: number, p: any) => sum + (p.amount - (p.refunded_amount ?? p.amount_refunded ?? 0)), 0);
  if (amount > totalRefundable) {
    throw new Error(`Refund amount exceeds what's left to refund on this order (max ${totalRefundable}).`);
  }
  let remaining = amount;
  for (const payment of refundable) {
    if (remaining <= 0) break;
    const availableOnPayment = payment.amount - (payment.refunded_amount ?? payment.amount_refunded ?? 0);
    if (availableOnPayment <= 0) continue;
    const toRefund = Math.min(availableOnPayment, remaining);
    const res = await fetcher(`/admin/payments/${payment.id}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amount: toRefund
      })
    });
    if (!res.ok) {
      const err = await readJson(res);
      throw new Error(err.message ?? `Refund failed on payment ${payment.id} (${res.status})`);
    }
    remaining -= toRefund;
  }
  if (remaining > 0) {
    throw new Error('Could not refund the full amount across available payments.');
  }
}
export async function appendReturnRecord(orderId: string, order: any, record: ReturnRecord, fetcher: Fetcher, extraMetadata: Record<string, unknown> = {}, actor?: ReturnActor) {
  const existingMetadata = order.metadata ?? {};
  const returns = getReturnRecords(order);
  const res = await fetcher(`/admin/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        ...existingMetadata,
        ...extraMetadata,
        returns: [...returns, record]
      }
    })
  });
  if (!res.ok) {
    const err = await readJson(res);
    throw new Error(err.message ?? 'Failed to save return record');
  }
  if (actor) {
    logStaffActivity({
      staffId: actor.staffId,
      staffName: actor.staffName,
      action: 'return',
      surface: actor.surface,
      detail: `Order ${orderId} — ${record.status}`
    });
  }
  return readJson(res);
}
export async function updateReturnRecord(orderId: string, order: any, returnId: string, patch: Partial<ReturnRecord>, fetcher: Fetcher, actor?: ReturnActor) {
  const existingMetadata = order.metadata ?? {};
  const returns = getReturnRecords(order);
  const idx = returns.findIndex(r => r.id === returnId);
  if (idx === -1) throw new Error('Return request not found');
  const updated = {
    ...returns[idx],
    ...patch
  };
  const nextReturns = [...returns];
  nextReturns[idx] = updated;
  const res = await fetcher(`/admin/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        ...existingMetadata,
        returns: nextReturns
      }
    })
  });
  if (!res.ok) {
    const err = await readJson(res);
    throw new Error(err.message ?? 'Failed to update return record');
  }
  if (actor) {
    logStaffActivity({
      staffId: actor.staffId,
      staffName: actor.staffName,
      action: 'return',
      surface: actor.surface,
      detail: `Order ${orderId} — ${updated.status}`
    });
  }
  return {
    data: await readJson(res),
    record: updated
  };
}
