'use client';

import { useMemo, useState } from 'react';
const RETURN_REASONS = ['Defective product', 'Wrong item received', 'Changed mind', 'Size issue', 'Damaged packaging', 'Other'];
function fmt(amount: number, currency = 'GBP') {
  const symbol = currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' ';
  return symbol + amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
interface Props {
  order: any;
  remainingQty: Record<string, number>;
  onSubmit: (items: {
    item_id: string;
    quantity: number;
  }[], reason: string) => Promise<void>;
  onClose: () => void;
}
export default function ReturnOrderModal({
  order,
  remainingQty,
  onSubmit,
  onClose
}: Props) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const currency = order.currency_code ?? 'gbp';
  const returnableItems = useMemo(() => (order.items ?? []).filter((i: any) => (remainingQty[i.id] ?? 0) > 0), [order.items, remainingQty]);
  const refundTotal = returnableItems.reduce((sum: number, i: any) => sum + i.unit_price * (qtys[i.id] ?? 0), 0);
  const handleSubmit = async () => {
    const items = Object.entries(qtys).filter(([, qty]) => qty > 0).map(([item_id, quantity]) => ({
      item_id,
      quantity
    }));
    if (items.length === 0) {
      setError('Select at least one item to return');
      return;
    }
    if (!reason) {
      setError('Pick a reason');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(items, reason);
    } catch (err: any) {
      setError(err.message ?? 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4' onClick={onClose}>
      <div className='bg-white rounded-xl shadow-lg w-full max-w-md p-5 max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
        <h3 className='text-[15px] font-semibold text-[#202223] mb-4'>Process return</h3>

        {returnableItems.length === 0 ? <p className='text-[13px] text-[#6D7175]'>Every item on this order has already been returned.</p> : <div className='space-y-3 mb-4'>
            {returnableItems.map((item: any) => {
          const max = remainingQty[item.id] ?? 0;
          const qty = qtys[item.id] ?? 0;
          return <div key={item.id} className='p-3 rounded-lg border border-[#E1E3E5]'>
                  <div className='flex items-center justify-between mb-2'>
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>{item.title}</p>
                      <p className='text-[11.5px] text-[#8C9196]'>
                        {fmt(item.unit_price, currency)} · up to {max} returnable
                      </p>
                    </div>
                    <div className='flex items-center rounded border border-[#E1E3E5] overflow-hidden'>
                      <button onClick={() => setQtys(p => ({
                  ...p,
                  [item.id]: Math.max(0, qty - 1)
                }))} className='w-7 h-7 flex items-center justify-center hover:bg-[#F6F6F7] text-[#6D7175]'>
                        −
                      </button>
                      <span className='w-8 h-7 flex items-center justify-center text-[12px] font-medium border-x border-[#E1E3E5] text-[#202223]'>
                        {qty}
                      </span>
                      <button onClick={() => setQtys(p => ({
                  ...p,
                  [item.id]: Math.min(max, qty + 1)
                }))} className='w-7 h-7 flex items-center justify-center hover:bg-[#F6F6F7] text-[#6D7175]'>
                        +
                      </button>
                    </div>
                  </div>
                </div>;
        })}

            <select value={reason} onChange={e => setReason(e.target.value)} className='w-full px-3 py-2 rounded-lg border border-[#E1E3E5] text-[13px] outline-none text-[#202223]'>
              <option value=''>Select reason...</option>
              {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>

            {refundTotal > 0 && <div className='p-3 rounded-lg bg-[#F2F7F5] flex justify-between text-[13px] font-medium text-[#202223]'>
                <span>Refund total</span>
                <span className='text-[#008060]'>{fmt(refundTotal, currency)}</span>
              </div>}
          </div>}

        {error && <p className='text-[12.5px] text-[#D82C0D] mb-3'>{error}</p>}

        <div className='flex gap-2'>
          <button onClick={onClose} disabled={submitting} className='flex-1 px-3.5 py-2 border border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7] text-[13px] font-medium rounded-lg transition-colors'>
            Cancel
          </button>
          {returnableItems.length > 0 && <button onClick={handleSubmit} disabled={submitting || refundTotal === 0 || !reason} className='flex-1 px-3.5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50'>
              {submitting ? 'Processing…' : `Refund ${fmt(refundTotal, currency)}`}
            </button>}
        </div>
      </div>
    </div>;
}
