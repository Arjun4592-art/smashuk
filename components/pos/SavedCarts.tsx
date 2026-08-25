'use client';

import { useState } from 'react';
import { usePOSStore } from '@/store/posStore';
interface Props {
  onClose: () => void;
  onSave: () => void;
}
export default function SavedCarts({
  onClose,
  onSave
}: Props) {
  const {
    savedCarts,
    loadCart,
    deleteSavedCart,
    saveCart,
    items,
    total
  } = usePOSStore();
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const handleSave = () => {
    if (!saveName.trim() || !items.length) return;
    saveCart(saveName.trim());
    setSaveName('');
    setShowSaveForm(false);
    onSave();
  };
  const handleLoad = (id: string) => {
    loadCart(id);
    onClose();
  };
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.4)'
  }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-md rounded-xl overflow-hidden' style={{
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
            Saved carts
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
        {items.length > 0 && <div className='px-5 py-3' style={{
        borderBottom: '1px solid #E1E3E5',
        background: '#F6F6F7'
      }}>
            {!showSaveForm ? <button onClick={() => setShowSaveForm(true)} className='w-full py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[#F2F7F5] hover:border-[#008060]' style={{
          borderColor: '#E1E3E5',
          color: '#008060'
        }}>
                Save current cart (£{total.toLocaleString('en-GB')})
              </button> : <div className='flex gap-2'>
                <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder='Cart name e.g. Rahul - hold' className='flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]' style={{
            borderColor: '#E1E3E5',
            color: '#202223'
          }} />
                <button onClick={handleSave} className='px-4 py-2 rounded-lg text-sm font-medium' style={{
            background: '#008060',
            color: '#FFFFFF'
          }}>
                  Save
                </button>
                <button onClick={() => setShowSaveForm(false)} className='px-3 py-2 rounded-lg text-sm border' style={{
            borderColor: '#E1E3E5',
            color: '#6D7175'
          }}>
                  Cancel
                </button>
              </div>}
          </div>}

        {}
        <div className='overflow-y-auto' style={{
        maxHeight: 320
      }}>
          {savedCarts.length === 0 ? <div className='flex flex-col items-center py-10 gap-2'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#E1E3E5' strokeWidth='1.5'>
                <circle cx='9' cy='21' r='1' />
                <circle cx='20' cy='21' r='1' />
                <path d='M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6' />
              </svg>
              <p className='text-sm' style={{
            color: '#8C9196'
          }}>
                No saved carts
              </p>
            </div> : savedCarts.map(cart => <div key={cart.id} className='flex items-center gap-3 px-5 py-3 hover:bg-[#F6F6F7] transition-colors' style={{
          borderBottom: '1px solid #F6F6F7'
        }}>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium' style={{
              color: '#202223'
            }}>
                    {cart.name}
                  </p>
                  <p className='text-xs' style={{
              color: '#8C9196'
            }}>
                    {cart.items.length} items ·{' '}
                    {new Date(cart.savedAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
                    {cart.customer && ` · ${cart.customer.name}`}
                  </p>
                </div>
                <span className='text-sm font-medium shrink-0' style={{
            color: '#202223'
          }}>
                  £{cart.total.toLocaleString('en-GB')}
                </span>
                <div className='flex gap-1.5 shrink-0'>
                  <button onClick={() => handleLoad(cart.id)} className='px-3 py-1.5 rounded text-xs font-medium transition-colors' style={{
              background: '#008060',
              color: '#FFFFFF'
            }}>
                    Load
                  </button>
                  <button onClick={() => deleteSavedCart(cart.id)} className='w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[#FFF4F4]' style={{
              color: '#8C9196'
            }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                      <polyline points='3 6 5 6 21 6' />
                      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                      <path d='M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                    </svg>
                  </button>
                </div>
              </div>)}
        </div>

        <div className='px-5 py-3' style={{
        borderTop: '1px solid #E1E3E5'
      }}>
          <button onClick={onClose} className='w-full py-2 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]' style={{
          borderColor: '#E1E3E5',
          color: '#6D7175'
        }}>
            Close
          </button>
        </div>
      </div>
    </div>;
}
