'use client';

import { useState } from 'react';
interface LookupOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  total: number;
  items: {
    title: string;
    quantity: number;
  }[];
  isPickup: boolean;
  fulfillmentStatus: string;
  paymentStatus: string;
  source: 'pos' | 'website';
  createdAt: string;
}
interface Props {
  onClose: () => void;
}
export default function OrderLookupModal({
  onClose
}: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LookupOrder[] | null>(null);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const handleSearch = async () => {
    if (query.trim().length < 3) {
      setError('Enter at least 3 characters — order number, phone, or email.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`/api/pos/orders/lookup?q=${encodeURIComponent(query.trim())}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lookup failed');
      setResults(data.orders ?? []);
      if ((data.orders ?? []).length === 0) {
        setError(data.message ?? 'No matching order found.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };
  const handleAction = async (order: LookupOrder, action: 'pickup' | 'dispatch') => {
    setActioningId(order.id);
    setError('');
    try {
      let res: Response;
      if (action === 'pickup') {
        res = await fetch('/api/pos/orders/lookup', {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: order.id
          })
        });
      } else {
        res = await fetch(`/api/pos/orders/${order.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'dispatch'
          })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setResults(prev => (prev ?? []).map(o => o.id === order.id ? {
        ...o,
        fulfillmentStatus: action === 'pickup' ? 'delivered' : 'fulfilled',
        paymentStatus: data.captured ? 'captured' : o.paymentStatus
      } : o));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioningId(null);
    }
  };
  function getAction(o: LookupOrder): 'pickup' | 'dispatch' | 'done' {
    const s = o.fulfillmentStatus;
    if (o.isPickup) {
      if (s === 'delivered' || s === 'partially_delivered') return 'done';
      return 'pickup';
    } else {
      if (s === 'not_fulfilled' || s === 'requires_action' || !s) return 'dispatch';
      return 'done';
    }
  }
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.4)'
  }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md rounded-xl overflow-hidden max-h-[85vh] flex flex-col' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
        {}
        <div className='flex items-center justify-between px-5 py-4' style={{
        borderBottom: '1px solid #E1E3E5'
      }}>
          <h3 className='text-base font-semibold' style={{
          color: '#202223'
        }}>
            🔍 Look up an order
          </h3>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]' style={{
          color: '#6D7175'
        }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {}
        <div className='p-5 space-y-3'>
          <p className='text-[12px]' style={{
          color: '#6D7175'
        }}>
            Find ANY customer&apos;s order — placed on the website or rung up by
            any staff member — by order number, phone, or email. Useful for
            verifying an in-store pickup.
          </p>
          <div className='flex gap-2'>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder='SR-1042, phone, or email' autoFocus className='flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-[#008060]' style={{
            borderColor: '#E1E3E5'
          }} />
            <button onClick={handleSearch} disabled={loading} className='px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50' style={{
            background: '#008060',
            color: '#FFFFFF'
          }}>
              {loading ? '...' : 'Search'}
            </button>
          </div>
          {error && <p className='text-[12.5px]' style={{
          color: '#D82C0D'
        }}>
              {error}
            </p>}
        </div>

        {}
        {results && results.length > 0 && <div className='px-5 pb-5 space-y-3 overflow-y-auto'>
            {results.map(o => {
          const action = getAction(o);
          return <div key={o.id} className='p-3.5 rounded-lg border space-y-2' style={{
            borderColor: '#E1E3E5',
            background: '#FAFAFA'
          }}>
                  {}
                  <div className='flex items-center justify-between'>
                    <span className='text-[13px] font-semibold' style={{
                color: '#202223'
              }}>
                      {o.orderNumber}
                    </span>
                    {o.isPickup ? <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold' style={{
                background: '#FFF4E4',
                color: '#946200'
              }}>
                        🏬 Store Pickup
                      </span> : <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold' style={{
                background: '#EEF2FF',
                color: '#3B5BDB'
              }}>
                        🚚 Home Delivery
                      </span>}
                  </div>

                  {}
                  <p className='text-[12.5px]' style={{
              color: '#202223'
            }}>
                    {o.customerName}
                    {o.phone && ` · ${o.phone}`}
                  </p>

                  {}
                  <p className='text-[11.5px]' style={{
              color: '#8C9196'
            }}>
                    {o.items.map(i => `${i.quantity}× ${i.title}`).join(', ')}
                  </p>

                  {}
                  <div className='flex items-center justify-between pt-1'>
                    <span className='text-[10.5px] font-medium px-2 py-0.5 rounded-full' style={{
                background: o.paymentStatus === 'captured' ? '#E3F1EB' : '#FFF3CD',
                color: o.paymentStatus === 'captured' ? '#008060' : '#B7791F'
              }}>
                      {o.paymentStatus === 'captured' ? 'Paid' : o.paymentStatus.replace(/_/g, ' ')}
                    </span>
                    <span className='text-[13px] font-bold' style={{
                color: '#202223'
              }}>
                      £{o.total.toFixed(2)}
                    </span>
                  </div>

                  {}
                  {action === 'done' ? <p className='text-[11px] font-medium pt-1' style={{
              color: '#008060'
            }}>
                      ✓{' '}
                      {o.isPickup ? 'Customer collected' : 'Already dispatched'}
                    </p> : action === 'pickup' ? <button onClick={() => handleAction(o, 'pickup')} disabled={actioningId === o.id} className='w-full mt-1 py-2.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5' style={{
              background: '#008060',
              color: '#FFFFFF'
            }}>
                      {actioningId === o.id ? 'Completing…' : '✓ Confirm Pickup — Hand Over to Customer'}
                    </button> : <button onClick={() => handleAction(o, 'dispatch')} disabled={actioningId === o.id} className='w-full mt-1 py-2.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5' style={{
              background: '#2C6ECB',
              color: '#FFFFFF'
            }}>
                      {actioningId === o.id ? 'Updating…' : '📦 Mark as Dispatched'}
                    </button>}
                </div>;
        })}
          </div>}
      </div>
    </div>;
}
