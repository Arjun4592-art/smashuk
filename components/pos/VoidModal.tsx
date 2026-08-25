'use client';

import { usePOSStore } from '@/store/posStore';
interface Props {
  onClose: () => void;
  onConfirm: () => void;
}
export default function VoidModal({
  onClose,
  onConfirm
}: Props) {
  const {
    items,
    total
  } = usePOSStore();
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
            Void sale
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

        <div className='p-5'>
          {}
          <div className='flex flex-col items-center text-center mb-5'>
            <div className='w-14 h-14 rounded-full flex items-center justify-center mb-3' style={{
            background: '#FFF4F4'
          }}>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#D82C0D' strokeWidth='2' strokeLinecap='round'>
                <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
                <line x1='12' y1='9' x2='12' y2='13' />
                <line x1='12' y1='17' x2='12.01' y2='17' />
              </svg>
            </div>
            <h4 className='text-base font-semibold mb-1' style={{
            color: '#202223'
          }}>
              Void this sale?
            </h4>
            <p className='text-sm' style={{
            color: '#6D7175'
          }}>
              This will cancel the current sale and clear all{' '}
              <span className='font-medium' style={{
              color: '#202223'
            }}>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>{' '}
              worth{' '}
              <span className='font-medium' style={{
              color: '#202223'
            }}>
                £{total.toLocaleString('en-GB')}
              </span>
              . This action cannot be undone.
            </p>
          </div>

          {}
          {items.length > 0 && <div className='rounded-lg p-3 mb-4 space-y-1.5' style={{
          background: '#F6F6F7'
        }}>
              {items.slice(0, 3).map(i => <div key={i.product.id} className='flex justify-between text-xs' style={{
            color: '#6D7175'
          }}>
                  <span>
                    {i.product.name} ×{i.quantity}
                  </span>
                  <span>
                    £{(i.product.price * i.quantity).toLocaleString('en-GB')}
                  </span>
                </div>)}
              {items.length > 3 && <p className='text-xs' style={{
            color: '#8C9196'
          }}>
                  +{items.length - 3} more items
                </p>}
            </div>}
        </div>

        <div className='px-5 pb-5 flex gap-2'>
          <button onClick={onClose} className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]' style={{
          borderColor: '#E1E3E5',
          color: '#6D7175'
        }}>
            Keep sale
          </button>
          <button onClick={onConfirm} className='flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors' style={{
          background: '#D82C0D',
          color: '#FFFFFF'
        }}>
            Void sale
          </button>
        </div>
      </div>
    </div>;
}
