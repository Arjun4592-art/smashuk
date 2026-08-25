import { useState } from 'react';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import type { CartDisplayItem } from '@/types';
interface Props {
  items: CartDisplayItem[];
  discountAmount: number;
  gst: number;
  total: number;
  subtotal: number;
  giftCardCode?: string | null;
  giftCardAmount?: number;
  amountDue?: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onDiscountPercentChange: (percent: number) => void;
  onCharge: () => void;
  onClear: () => void;
}
const fmt = (n: number) => CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-GB');
export default function BillingCart({
  items,
  discountAmount,
  gst,
  total,
  subtotal,
  giftCardCode,
  giftCardAmount = 0,
  amountDue,
  onIncrease,
  onDecrease,
  onRemove,
  onDiscountPercentChange,
  onCharge,
  onClear
}: Props) {
  const due = amountDue ?? total;
  const [percentInput, setPercentInput] = useState('');
  return <div className='flex flex-col h-full' style={{
    background: '#FFFFFF',
    borderLeft: '1px solid #E1E3E5'
  }}>
      {}
      <div className='flex items-center justify-between px-4 py-3 flex-shrink-0' style={{
      borderBottom: '1px solid #E1E3E5'
    }}>
        <div className='flex items-center gap-2'>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#202223' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='9' cy='21' r='1' />
            <circle cx='20' cy='21' r='1' />
            <path d='M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6' />
          </svg>
          <span className='text-sm font-semibold' style={{
          color: '#202223'
        }}>
            Current sale
          </span>
          {items.length > 0 && <span className='text-xs font-medium px-1.5 py-0.5 rounded-full' style={{
          background: '#008060',
          color: '#FFFFFF'
        }}>
              {items.reduce((a, i) => a + i.quantity, 0)}
            </span>}
        </div>

        {items.length > 0 && <button onClick={onClear} className='flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-[#FFF4F4]' style={{
        color: '#D82C0D'
      }}>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <polyline points='3 6 5 6 21 6' />
              <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
              <path d='M10 11v6M14 11v6' />
              <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
            </svg>
            Clear
          </button>}
      </div>

      {}
      <div className='flex-1 min-h-0 overflow-y-auto px-3 py-2'>
        {items.length === 0 ? <div className='flex flex-col items-center justify-center h-32 gap-2'>
            <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#E1E3E5' strokeWidth='1.5'>
              <circle cx='9' cy='21' r='1' />
              <circle cx='20' cy='21' r='1' />
              <path d='M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6' />
            </svg>
            <p className='text-sm' style={{
          color: '#8C9196'
        }}>
              Tap products to add
            </p>
          </div> : <div className='space-y-0.5'>
            {items.map(item => <div key={item.id} className='flex items-center gap-2 py-2.5' style={{
          borderBottom: '1px solid #F6F6F7'
        }}>
                {}
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-medium truncate' style={{
              color: '#202223'
            }}>
                    {item.name}
                  </p>
                  <p className='text-[11px]' style={{
              color: '#8C9196'
            }}>
                    {fmt(item.price)} each
                  </p>
                </div>

                {}
                <div className='flex items-center rounded overflow-hidden shrink-0' style={{
            border: '1px solid #E1E3E5'
          }}>
                  <button onClick={() => onDecrease(item.id)} className='w-6 h-6 flex items-center justify-center transition-colors hover:bg-[#F6F6F7]' style={{
              color: '#6D7175'
            }}>
                    <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='5' y1='12' x2='19' y2='12' />
                    </svg>
                  </button>
                  <span className='w-7 h-6 flex items-center justify-center text-xs font-semibold' style={{
              borderLeft: '1px solid #E1E3E5',
              borderRight: '1px solid #E1E3E5',
              color: '#202223'
            }}>
                    {item.quantity}
                  </span>
                  <button onClick={() => onIncrease(item.id)} className='w-6 h-6 flex items-center justify-center transition-colors hover:bg-[#F6F6F7]' style={{
              color: '#6D7175'
            }}>
                    <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='12' y1='5' x2='12' y2='19' />
                      <line x1='5' y1='12' x2='19' y2='12' />
                    </svg>
                  </button>
                </div>

                {}
                <div className='text-xs font-semibold shrink-0 min-w-[52px] text-right' style={{
            color: '#202223'
          }}>
                  {fmt(item.price * item.quantity)}
                </div>

                {}
                <button onClick={() => onRemove(item.id)} className='shrink-0 p-1 rounded transition-colors hover:bg-[#FFF4F4]' style={{
            color: '#8C9196'
          }} onMouseEnter={e => e.currentTarget.style.color = '#D82C0D'} onMouseLeave={e => e.currentTarget.style.color = '#8C9196'}>
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                    <line x1='18' y1='6' x2='6' y2='18' />
                    <line x1='6' y1='6' x2='18' y2='18' />
                  </svg>
                </button>
              </div>)}
          </div>}
      </div>

      {}
      <div className='shrink-0 px-4 py-3 space-y-3' style={{
      borderTop: '1px solid #E1E3E5'
    }}>
        {}
        <div className='flex gap-2'>
          <div className='flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border' style={{
          borderColor: '#E1E3E5'
        }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2' strokeLinecap='round'>
              <path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' />
              <line x1='7' y1='7' x2='7.01' y2='7' />
            </svg>
            <input type='number' min={0} max={100} value={percentInput} onChange={e => {
            const raw = e.target.value;
            setPercentInput(raw);
            const percent = Math.min(100, Math.max(0, parseInt(raw) || 0));
            onDiscountPercentChange(percent);
          }} placeholder='Discount %' className='flex-1 bg-transparent outline-none text-sm' style={{
            color: '#202223'
          }} />
          </div>
        </div>

        {}
        <div className='space-y-1.5'>
          <div className='flex justify-between text-xs' style={{
          color: '#6D7175'
        }}>
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {discountAmount > 0 && <div className='flex justify-between text-xs' style={{
          color: '#008060'
        }}>
              {}
              <span>Discount</span>
              <span>-{fmt(discountAmount)}</span>
            </div>}
          <div className='flex justify-between text-xs' style={{
          color: '#6D7175'
        }}>
            <span>VAT (20%)</span>
            <span>{fmt(gst)}</span>
          </div>
          <div className='flex justify-between pt-2 mt-1' style={{
          borderTop: '1px solid #E1E3E5'
        }}>
            <span className='text-sm font-semibold' style={{
            color: '#202223'
          }}>
              Total
            </span>
            <span className='text-base font-bold' style={{
            color: '#202223'
          }}>
              {fmt(total)}
            </span>
          </div>
          {giftCardAmount > 0 && <>
              <div className='flex justify-between text-xs' style={{
            color: '#008060'
          }}>
                <span>Gift card{giftCardCode ? ` (${giftCardCode})` : ''}</span>
                <span>-{fmt(giftCardAmount)}</span>
              </div>
              <div className='flex justify-between pt-1'>
                <span className='text-sm font-semibold' style={{
              color: '#202223'
            }}>
                  Amount due
                </span>
                <span className='text-base font-bold' style={{
              color: '#202223'
            }}>
                  {fmt(due)}
                </span>
              </div>
            </>}
        </div>

        {}
        <button onClick={onCharge} disabled={items.length === 0} className='w-full py-3 rounded-lg text-sm font-semibold transition-all' style={{
        background: items.length > 0 ? '#008060' : '#E1E3E5',
        color: items.length > 0 ? '#FFFFFF' : '#8C9196',
        cursor: items.length > 0 ? 'pointer' : 'not-allowed'
      }}>
          {items.length > 0 ? `Charge ${fmt(due)}` : 'Add items to charge'}
        </button>
      </div>
    </div>;
}
