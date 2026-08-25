'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getOrder, updateOrderStatus, processOrderReturn, approveOrderReturn, rejectOrderReturn } from '@/lib/api/dashboard';
import ReturnOrderModal from '@/components/dashboard/ReturnOrderModal';
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#FFC453]/20 text-[#916A00]',
  completed: 'bg-[#008060]/10 text-[#008060]',
  archived: 'bg-[#6D7175]/10 text-[#6D7175]',
  canceled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  requires_action: 'bg-[#FFC453]/20 text-[#916A00]'
};
const PAYMENT_STYLES: Record<string, string> = {
  captured: 'bg-[#008060]/10 text-[#008060]',
  awaiting: 'bg-[#FFC453]/20 text-[#916A00]',
  not_paid: 'bg-[#FFC453]/20 text-[#916A00]',
  refunded: 'bg-[#6D7175]/10 text-[#6D7175]',
  canceled: 'bg-[#D82C0D]/10 text-[#D82C0D]'
};
const FULFILLMENT_STYLES: Record<string, string> = {
  fulfilled: 'bg-[#008060]/10 text-[#008060]',
  partially_fulfilled: 'bg-[#FFC453]/20 text-[#916A00]',
  shipped: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  partially_shipped: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  delivered: 'bg-[#008060]/10 text-[#008060]',
  partially_delivered: 'bg-[#FFC453]/20 text-[#916A00]',
  canceled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  not_fulfilled: 'bg-[#FFC453]/20 text-[#916A00]'
};
const ITEM_METADATA_SKIP = new Set(['source', 'isGift']);
function fmt(amount: number, currency = 'GBP') {
  const symbol = currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' ';
  return symbol + amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function prettifyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export default function OrderDetailPage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'confirm' | 'cancel' | 'archive' | 'fulfill' | 'capture' | 'ship' | 'deliver'>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnActionLoading, setReturnActionLoading] = useState('');
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);
  const actionLabels = {
    confirm: 'complete',
    cancel: 'cancel',
    archive: 'archive',
    fulfill: 'fulfill',
    capture: 'capture payment for',
    ship: 'dispatch',
    deliver: 'mark as delivered'
  } as const;
  const handleAction = async (action: 'confirm' | 'cancel' | 'archive' | 'fulfill' | 'capture' | 'ship' | 'deliver') => {
    setActionLoading(action);
    try {
      await updateOrderStatus(id, action);
      toast.success(action === 'fulfill' ? 'Order marked as fulfilled' : action === 'capture' ? 'Payment captured' : action === 'ship' ? 'Order dispatched' : action === 'deliver' ? 'Order marked as delivered' : `Order ${actionLabels[action]}d`);
      await fetchOrder();
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${actionLabels[action]} order`);
    } finally {
      setActionLoading('');
    }
  };
  const requestAction = (action: 'confirm' | 'cancel' | 'archive' | 'fulfill' | 'capture' | 'ship' | 'deliver') => {
    setConfirmAction(action);
  };
  const remainingReturnQty: Record<string, number> = {};
  for (const item of order?.items ?? []) {
    remainingReturnQty[item.id] = item.quantity;
  }
  for (const record of order?.metadata?.returns ?? []) {
    if (record.status === 'rejected') continue;
    for (const line of record.items) {
      remainingReturnQty[line.item_id] = (remainingReturnQty[line.item_id] ?? 0) - line.quantity;
    }
  }
  const handleProcessReturn = async (items: {
    item_id: string;
    quantity: number;
  }[], reason: string) => {
    await processOrderReturn(id, items, reason);
    toast.success('Return processed and refund issued');
    setShowReturnModal(false);
    await fetchOrder();
  };
  const handleApproveReturn = async (returnId: string) => {
    setReturnActionLoading(returnId);
    try {
      await approveOrderReturn(id, returnId);
      toast.success('Return approved and refunded');
      await fetchOrder();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to approve return');
    } finally {
      setReturnActionLoading('');
    }
  };
  const handleRejectReturn = async (returnId: string) => {
    setReturnActionLoading(returnId);
    try {
      await rejectOrderReturn(id, returnId);
      toast.success('Return request rejected');
      await fetchOrder();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to reject return');
    } finally {
      setReturnActionLoading('');
    }
  };
  if (loading) {
    return <div className='p-6 flex justify-center py-24'>
        <div className='w-8 h-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
      </div>;
  }
  if (error || !order) {
    return <div className='p-6'>
        <Link href='/dashboard/orders' className='text-[13px] text-[#008060] hover:underline'>
          ← Back to Orders
        </Link>
        <div className='mt-6 p-6 bg-[#FFF4F4] rounded-xl text-[#D82C0D] text-sm'>
          {error || 'Order not found'}
        </div>
      </div>;
  }
  const currency = order.currency_code ?? 'gbp';
  const customerName = `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() || order.email || 'Guest';
  const isPOS = order.metadata?.source === 'pos';
  const isPickup = order.metadata?.fulfillment_type === 'pickup';
  const isReadyToDispatch = order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled';
  const isShipped = order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped';
  return <div className='p-6 max-w-5xl mx-auto'>
      {}
      <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6'>
        <div>
          <Link href='/dashboard/orders' className='text-[13px] text-[#008060] hover:underline mb-2 inline-block'>
            ← Back to Orders
          </Link>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='font-sora text-[22px] font-semibold text-[#202223] mr-1'>
              Order #{order.display_id ?? order.id.slice(-6)}
            </h1>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${PAYMENT_STYLES[order.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.payment_status?.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${FULFILLMENT_STYLES[order.fulfillment_status] ?? 'bg-gray-100 text-gray-600'}`}>
              {(order.fulfillment_status ?? 'not_fulfilled').replace(/_/g, ' ')}
            </span>
            {isPOS && <span className='px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2C6ECB]/10 text-[#2C6ECB] whitespace-nowrap'>
                🖥️ POS
              </span>}
          </div>
          <p className='text-[13px] text-[#8C9196] mt-1'>
            {order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : ''}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2 lg:justify-end shrink-0'>
          {order.status === 'pending' && <button onClick={() => requestAction('confirm')} disabled={!!actionLoading} className='px-3.5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
              {actionLoading === 'confirm' ? 'Completing…' : 'Mark Complete'}
            </button>}
          {(order.fulfillment_status === 'not_fulfilled' || order.fulfillment_status === 'partially_fulfilled' || !order.fulfillment_status) && order.status !== 'canceled' && <button onClick={() => requestAction('fulfill')} disabled={!!actionLoading} className='px-3.5 py-2 bg-[#2C6ECB] hover:bg-[#1a4f9e] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
                {actionLoading === 'fulfill' ? 'Fulfilling…' : 'Mark as Fulfilled'}
              </button>}
          {!isPickup && isReadyToDispatch && order.status !== 'canceled' && <button onClick={() => requestAction('ship')} disabled={!!actionLoading} className='px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
              {actionLoading === 'ship' ? 'Dispatching…' : 'Dispatch Order'}
            </button>}
          {(isPickup && isReadyToDispatch || isShipped) && <button onClick={() => requestAction('deliver')} disabled={!!actionLoading} className='px-3.5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
              {actionLoading === 'deliver' ? 'Updating…' : isPickup ? 'Mark as Picked Up' : 'Mark as Delivered'}
            </button>}
          {order.status !== 'canceled' && order.status !== 'archived' && <button onClick={() => requestAction('cancel')} disabled={!!actionLoading} className='px-3.5 py-2 border border-[#D82C0D] text-[#D82C0D] hover:bg-[#FFF4F4] text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
              {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
            </button>}
          {order.status !== 'archived' && <button onClick={() => requestAction('archive')} disabled={!!actionLoading} className='px-3.5 py-2 border border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7] text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap'>
              {actionLoading === 'archive' ? 'Archiving…' : 'Archive'}
            </button>}
          {order.payment_status !== 'not_paid' && Object.values(remainingReturnQty).some(qty => qty > 0) && <button onClick={() => setShowReturnModal(true)} className='px-3.5 py-2 border border-[#008060] text-[#008060] hover:bg-[#F2F7F5] text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap'>
                Process Return
              </button>}
        </div>
      </div>

      {}
      {confirmAction && <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4' onClick={() => setConfirmAction(null)}>
          <div className='bg-white rounded-xl shadow-lg w-full max-w-sm p-5' onClick={e => e.stopPropagation()}>
            <h3 className='text-[15px] font-semibold text-[#202223] mb-1.5'>
              {confirmAction === 'capture' ? 'Confirm payment received' : confirmAction === 'ship' ? 'Dispatch this order?' : confirmAction === 'deliver' ? isPickup ? 'Mark order as picked up?' : 'Mark order as delivered?' : `${actionLabels[confirmAction][0].toUpperCase()}${actionLabels[confirmAction].slice(1)} order?`}
            </h3>
            <p className='text-[13px] text-[#6D7175] mb-5'>
              {confirmAction === 'capture' ? 'Confirm the cash/card payment for this order has been received.' : confirmAction === 'ship' ? "Confirm this order has been handed to the courier/left the store. This marks it 'Dispatched' for the customer." : confirmAction === 'deliver' ? isPickup ? 'Confirm the customer has collected this order in-store.' : 'Confirm the customer has actually received this order.' : `Are you sure you want to ${actionLabels[confirmAction]} this order? This action can't be undone from here.`}
            </p>
            <div className='flex justify-end gap-2'>
              <button onClick={() => setConfirmAction(null)} className='px-3.5 py-2 border border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7] text-[13px] font-medium rounded-lg transition-colors'>
                Go back
              </button>
              <button onClick={() => {
            const action = confirmAction;
            setConfirmAction(null);
            handleAction(action);
          }} className={`px-3.5 py-2 text-white text-[13px] font-medium rounded-lg transition-colors ${confirmAction === 'cancel' ? 'bg-[#D82C0D] hover:bg-[#b8250b]' : 'bg-[#008060] hover:bg-[#006e52]'}`}>
                {confirmAction === 'cancel' ? 'Cancel order' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-5'>
        {}
        <div className='lg:col-span-2 space-y-5'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            <div className='px-5 py-3.5 border-b border-[#E1E3E5]'>
              <h2 className='text-[14px] font-semibold text-[#202223]'>
                Items ({order.items?.length ?? 0})
              </h2>
            </div>
            <div className='divide-y divide-[#F1F1F1]'>
              {(order.items ?? []).map((item: any) => {
              const notes = Object.entries(item.metadata ?? {}).filter(([k, v]) => !ITEM_METADATA_SKIP.has(k) && v !== undefined && v !== null && v !== '');
              return <div key={item.id} className='px-5 py-4 flex items-start gap-3.5'>
                    <div className='w-14 h-14 rounded-lg bg-[#F6F6F7] border border-[#E1E3E5] flex items-center justify-center overflow-hidden shrink-0'>
                      {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className='w-full h-full object-cover' onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }} /> : null}
                      <span className={`text-[9.5px] text-[#8C9196] text-center leading-tight px-1 ${item.thumbnail ? 'hidden' : ''}`}>
                        No image
                      </span>
                    </div>
                    <div className='flex-1 min-w-0 flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='text-[13.5px] font-medium text-[#202223] leading-snug'>
                          {item.title}
                        </p>
                        {item.variant_title && item.variant_title !== 'Default' && <p className='text-[12px] text-[#8C9196] mt-0.5'>
                              {item.variant_title}
                            </p>}
                        <p className='text-[12px] text-[#8C9196] mt-0.5'>
                          Qty {item.quantity} × {fmt(item.unit_price, currency)}
                        </p>

                        {notes.length > 0 && <div className='flex flex-wrap gap-1.5 mt-2'>
                            {notes.map(([k, v]) => <span key={k} className='text-[10.5px] px-2 py-1 rounded-md bg-[#F2F7F5] text-[#008060] font-medium'>
                                {prettifyLabel(k)}: {String(v)}
                              </span>)}
                          </div>}
                      </div>
                      <p className='text-[13.5px] font-semibold text-[#202223] shrink-0 whitespace-nowrap'>
                        {fmt(item.unit_price * item.quantity, currency)}
                      </p>
                    </div>
                  </div>;
            })}
            </div>

            {}
            <div className='px-5 py-4 bg-[#FAFAFA] border-t border-[#E1E3E5] space-y-1.5'>
              <div className='flex justify-between text-[13px] text-[#6D7175]'>
                <span>Subtotal</span>
                <span>{fmt(order.subtotal ?? 0, currency)}</span>
              </div>
              {order.discount_total > 0 && <div className='flex justify-between text-[13px] text-[#D82C0D]'>
                  <span>Discount</span>
                  <span>-{fmt(order.discount_total, currency)}</span>
                </div>}
              {order.shipping_total > 0 && <div className='flex justify-between text-[13px] text-[#6D7175]'>
                  <span>Shipping</span>
                  <span>{fmt(order.shipping_total, currency)}</span>
                </div>}
              {order.tax_total > 0 && <div className='flex justify-between text-[13px] text-[#6D7175]'>
                  <span>Tax</span>
                  <span>{fmt(order.tax_total, currency)}</span>
                </div>}
              <div className='flex justify-between text-[15px] font-semibold text-[#202223] pt-1.5 border-t border-[#E1E3E5]'>
                <span>Total</span>
                <span>{fmt(order.total ?? 0, currency)}</span>
              </div>
            </div>
          </div>

          {}
          {order.metadata && Object.keys(order.metadata).length > 0 && <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <h2 className='text-[14px] font-semibold text-[#202223] mb-3'>
                Order Notes
              </h2>
              <div className='grid grid-cols-2 gap-3'>
                {Object.entries(order.metadata).filter(([k, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => <div key={k}>
                      <p className='text-[11px] text-[#8C9196] uppercase tracking-wide'>
                        {prettifyLabel(k)}
                      </p>
                      <p className='text-[13px] text-[#202223]'>{String(v)}</p>
                    </div>)}
              </div>
            </div>}
          {}
          {(order.metadata?.returns?.length ?? 0) > 0 && <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <h2 className='text-[14px] font-semibold text-[#202223] mb-3'>
                Returns
              </h2>
              <div className='space-y-3'>
                {[...order.metadata.returns].reverse().map((r: any) => <div key={r.id} className='p-3 rounded-lg border border-[#E1E3E5]'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize ${r.status === 'refunded' ? 'bg-[#008060]/10 text-[#008060]' : r.status === 'rejected' ? 'bg-[#D82C0D]/10 text-[#D82C0D]' : 'bg-[#FFC453]/20 text-[#916A00]'}`}>
                        {r.status}
                      </span>
                      <span className='text-[11px] text-[#8C9196] capitalize'>
                        {r.source}
                      </span>
                    </div>
                    <p className='text-[12.5px] text-[#202223] mb-0.5'>
                      {r.items.map((i: any) => `${i.quantity}× ${i.title}`).join(', ')}
                    </p>
                    <p className='text-[11.5px] text-[#8C9196]'>
                      {r.reason} · {fmt(r.refund_amount, order.currency_code)}
                    </p>
                    {r.status === 'requested' && <div className='flex gap-2 mt-2'>
                        <button onClick={() => handleApproveReturn(r.id)} disabled={!!returnActionLoading} className='px-3 py-1.5 bg-[#008060] hover:bg-[#006e52] text-white text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50'>
                          {returnActionLoading === r.id ? 'Refunding…' : 'Approve & Refund'}
                        </button>
                        <button onClick={() => handleRejectReturn(r.id)} disabled={!!returnActionLoading} className='px-3 py-1.5 border border-[#D82C0D] text-[#D82C0D] hover:bg-[#FFF4F4] text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50'>
                          Reject
                        </button>
                      </div>}
                  </div>)}
              </div>
            </div>}
        </div>

        {}
        <div className='space-y-5'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <h2 className='text-[14px] font-semibold text-[#202223] mb-3'>
              Customer
            </h2>
            <p className='text-[13.5px] font-medium text-[#202223]'>
              {customerName}
            </p>
            <p className='text-[12.5px] text-[#8C9196]'>{order.email}</p>
            {order.customer?.phone && <p className='text-[12.5px] text-[#8C9196]'>
                {order.customer.phone}
              </p>}
          </div>

          {order.shipping_address && <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <h2 className='text-[14px] font-semibold text-[#202223] mb-3'>
                Shipping Address
              </h2>
              <p className='text-[13px] text-[#202223] leading-relaxed'>
                {order.shipping_address.address_1}
                {order.shipping_address.address_2 ? `, ${order.shipping_address.address_2}` : ''}
                <br />
                {order.shipping_address.city}, {order.shipping_address.province}{' '}
                {order.shipping_address.postal_code}
                <br />
                {order.shipping_address.country_code?.toUpperCase()}
              </p>
            </div>}

          {order.payments?.length > 0 && <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <h2 className='text-[14px] font-semibold text-[#202223] mb-3'>
                Payment
              </h2>
              {order.payments.map((p: any) => <div key={p.id} className='flex items-center justify-between text-[13px] text-[#202223] mb-1.5'>
                  <span>
                    <span className='capitalize'>
                      {p.provider_id?.replace('pp_', '').replace('_', ' ')}
                    </span>
                    {' — '}
                    {fmt(p.amount, currency)}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.captured_at ? 'bg-[#008060]/10 text-[#008060]' : 'bg-[#FFC453]/20 text-[#916A00]'}`}>
                    {p.captured_at ? 'Captured' : 'Authorized'}
                  </span>
                </div>)}
              {}
              {order.payments.some((p: any) => !p.captured_at) && <button onClick={() => handleAction('capture')} disabled={!!actionLoading} className='mt-3 w-full px-3.5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50'>
                  {actionLoading === 'capture' ? 'Capturing…' : 'Capture Payment'}
                </button>}
            </div>}
        </div>
      </div>

      {showReturnModal && <ReturnOrderModal order={order} remainingQty={remainingReturnQty} onSubmit={handleProcessReturn} onClose={() => setShowReturnModal(false)} />}
    </div>;
}
