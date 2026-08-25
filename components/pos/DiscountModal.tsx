'use client';

import { useState } from 'react';
import { usePOSStore } from '@/store/posStore';
import { validateCoupon } from '@/lib/api/pos';
interface Props {
  onClose: () => void;
}
type DiscountType = 'percent' | 'fixed' | 'coupon';
export default function DiscountModal({
  onClose
}: Props) {
  const {
    subtotal,
    customDiscount,
    couponCode,
    couponDiscount,
    applyPercentageDiscount,
    applyFixedDiscount,
    applyCoupon,
    removeCoupon,
    setCustomDiscount
  } = usePOSStore();
  const [type, setType] = useState<DiscountType>('percent');
  const [percentVal, setPercent] = useState('');
  const [fixedVal, setFixed] = useState('');
  const [couponVal, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const handleApply = async () => {
    if (type === 'percent') {
      const v = Math.min(100, Math.max(0, parseInt(percentVal) || 0));
      applyPercentageDiscount(v);
      onClose();
    } else if (type === 'fixed') {
      const v = Math.max(0, parseInt(fixedVal) || 0);
      applyFixedDiscount(v);
      onClose();
    } else {
      const code = couponVal.trim().toUpperCase();
      if (!code) {
        setCouponError('Enter a coupon code');
        return;
      }
      setCheckingCoupon(true);
      setCouponError('');
      try {
        const result = await validateCoupon(code);
        if (!result.valid || !result.type || result.value == null) {
          setCouponError('Invalid coupon code');
          return;
        }
        const discountAmt = result.type === 'percentage' ? Math.round(subtotal * result.value / 100) : Math.round(result.value);
        applyCoupon(code, discountAmt);
        onClose();
      } catch (err) {
        console.error('[DiscountModal] coupon validation failed:', err);
        setCouponError('Could not validate coupon — please try again');
      } finally {
        setCheckingCoupon(false);
      }
    }
  };
  const handleRemoveDiscount = () => {
    setCustomDiscount(0);
    removeCoupon();
    onClose();
  };
  const hasDiscount = customDiscount > 0 || !!couponCode;
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.4)'
  }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-sm rounded-xl overflow-hidden' style={{
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
            Add discount
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

        <div className='p-5 space-y-4'>
          {}
          {hasDiscount && <div className='flex items-center justify-between p-3 rounded-lg' style={{
          background: '#F2F7F5',
          border: '1px solid #008060'
        }}>
              <div>
                <p className='text-sm font-medium' style={{
              color: '#008060'
            }}>
                  {couponCode ? `Coupon: ${couponCode}` : `Discount applied`}
                </p>
                <p className='text-xs' style={{
              color: '#6D7175'
            }}>
                  -£{(customDiscount + couponDiscount).toLocaleString('en-GB')}{' '}
                  off
                </p>
              </div>
              <button onClick={handleRemoveDiscount} className='text-xs px-2 py-1 rounded hover:bg-[#FFF4F4] transition-colors' style={{
            color: '#D82C0D'
          }}>
                Remove
              </button>
            </div>}

          {}
          <div className='grid grid-cols-3 gap-1 p-1 rounded-lg' style={{
          background: '#F6F6F7'
        }}>
            {(['percent', 'fixed', 'coupon'] as DiscountType[]).map(t => <button key={t} onClick={() => setType(t)} className='py-1.5 rounded-md text-xs font-medium transition-all' style={{
            background: type === t ? '#FFFFFF' : 'transparent',
            color: type === t ? '#202223' : '#6D7175',
            boxShadow: type === t ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
          }}>
                {t === 'percent' ? 'Percentage' : t === 'fixed' ? 'Fixed amount' : 'Coupon code'}
              </button>)}
          </div>

          {}
          {type === 'percent' && <div>
              <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
            color: '#6D7175'
          }}>
                Discount percentage
              </label>
              <div className='flex items-center gap-2 px-3 py-2.5 rounded-lg border' style={{
            borderColor: '#E1E3E5'
          }}>
                <input autoFocus type='number' min={0} max={100} value={percentVal} onChange={e => setPercent(e.target.value)} placeholder='e.g. 10' className='flex-1 bg-transparent outline-none text-sm' style={{
              color: '#202223'
            }} />
                <span className='text-sm font-medium' style={{
              color: '#6D7175'
            }}>
                  %
                </span>
              </div>
              {percentVal && <p className='text-xs mt-1' style={{
            color: '#008060'
          }}>
                  = £
                  {Math.round(subtotal * (parseInt(percentVal) || 0) / 100).toLocaleString('en-GB')}{' '}
                  off
                </p>}
            </div>}

          {}
          {type === 'fixed' && <div>
              <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
            color: '#6D7175'
          }}>
                Discount amount
              </label>
              <div className='flex items-center gap-2 px-3 py-2.5 rounded-lg border' style={{
            borderColor: '#E1E3E5'
          }}>
                <span className='text-sm' style={{
              color: '#6D7175'
            }}>
                  £
                </span>
                <input autoFocus type='number' min={0} value={fixedVal} onChange={e => setFixed(e.target.value)} placeholder='e.g. 500' className='flex-1 bg-transparent outline-none text-sm' style={{
              color: '#202223'
            }} />
              </div>
            </div>}

          {}
          {type === 'coupon' && <div>
              <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
            color: '#6D7175'
          }}>
                Coupon code
              </label>
              <input autoFocus value={couponVal} onChange={e => {
            setCoupon(e.target.value);
            setCouponError('');
          }} placeholder='e.g. SPORT15' className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none uppercase' style={{
            borderColor: couponError ? '#D82C0D' : '#E1E3E5',
            color: '#202223'
          }} />
              {couponError && <p className='text-xs mt-1' style={{
            color: '#D82C0D'
          }}>
                  {couponError}
                </p>}
              <p className='text-xs mt-2' style={{
            color: '#8C9196'
          }}>
                Enter a valid promo code — it will be checked against active
                promotions in the backend.
              </p>
            </div>}
        </div>

        {}
        <div className='px-5 pb-5 flex gap-2'>
          <button onClick={onClose} className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]' style={{
          borderColor: '#E1E3E5',
          color: '#6D7175'
        }}>
            Cancel
          </button>
          <button onClick={handleApply} disabled={checkingCoupon} className='flex-2 py-2.5 px-6 rounded-lg text-sm font-semibold transition-colors' style={{
          background: '#008060',
          color: '#FFFFFF',
          flex: 2,
          opacity: checkingCoupon ? 0.7 : 1,
          cursor: checkingCoupon ? 'not-allowed' : 'pointer'
        }}>
            {checkingCoupon ? 'Checking...' : 'Apply discount'}
          </button>
        </div>
      </div>
    </div>;
}
