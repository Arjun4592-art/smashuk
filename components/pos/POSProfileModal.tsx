'use client';

import { useState } from 'react';
import { usePOSStore } from '@/store/posStore';
interface Props {
  user: any;
  onClose: () => void;
  onLogout: () => void;
}
const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const ROLE_LABELS: Record<string, {
  label: string;
  bg: string;
  color: string;
}> = {
  admin: {
    label: 'Admin',
    bg: '#FFF3CD',
    color: '#B7791F'
  },
  staff: {
    label: 'Staff',
    bg: '#E3F1EB',
    color: '#008060'
  }
};
export default function POSProfileModal({
  user,
  onClose,
  onLogout
}: Props) {
  const {
    staffList,
    updateStaffPin
  } = usePOSStore();
  const staff = staffList.find(s => s.id === user?.id);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  if (!staff) return null;
  const role = ROLE_LABELS[staff.role] ?? ROLE_LABELS.staff;
  const handlePinChange = () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    updateStaffPin(staff.id, newPin);
    setPinSuccess(true);
    setTimeout(() => {
      setShowPinChange(false);
      setPinSuccess(false);
      setNewPin('');
      setConfirmPin('');
    }, 1200);
  };
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
            {showPinChange ? 'Change PIN' : 'My profile'}
          </h3>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]' style={{
          color: '#6D7175'
        }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {!showPinChange ? <>
            {}
            <div className='p-5'>
              <div className='flex flex-col items-center text-center mb-4'>
                <div className='w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3' style={{
              background: '#008060',
              color: '#FFFFFF'
            }}>
                  {staff.initials}
                </div>
                <p className='text-base font-semibold' style={{
              color: '#202223'
            }}>
                  {staff.name}
                </p>
                <span className='mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full' style={{
              background: role.bg,
              color: role.color
            }}>
                  {role.label}
                </span>
                {staff.shift && <p className='text-xs mt-1.5' style={{
              color: '#8C9196'
            }}>
                    {staff.shift} shift
                  </p>}
              </div>

              {}
              {(staff.email || staff.phone) && <div className='rounded-lg p-3 mb-3 space-y-1.5' style={{
            background: '#F6F6F7'
          }}>
                  {staff.email && <div className='flex justify-between text-xs'>
                      <span style={{
                color: '#8C9196'
              }}>Email</span>
                      <span style={{
                color: '#202223'
              }}>{staff.email}</span>
                    </div>}
                  {staff.phone && <div className='flex justify-between text-xs'>
                      <span style={{
                color: '#8C9196'
              }}>Phone</span>
                      <span style={{
                color: '#202223'
              }}>{staff.phone}</span>
                    </div>}
                </div>}

              {}
              <div className='grid grid-cols-2 gap-3 mb-3'>
                <div className='rounded-lg p-3 text-center' style={{
              background: '#F2F7F5'
            }}>
                  <p className='text-base font-semibold' style={{
                color: '#008060'
              }}>
                    {fmt(staff.totalSales)}
                  </p>
                  <p className='text-[11px] mt-0.5' style={{
                color: '#8C9196'
              }}>
                    Total sales
                  </p>
                </div>
                <div className='rounded-lg p-3 text-center' style={{
              background: '#F6F6F7'
            }}>
                  <p className='text-base font-semibold' style={{
                color: '#202223'
              }}>
                    {staff.totalOrders}
                  </p>
                  <p className='text-[11px] mt-0.5' style={{
                color: '#8C9196'
              }}>
                    Orders served
                  </p>
                </div>
              </div>
            </div>

            {}
            <div className='px-5 pb-5 space-y-2'>
              <button onClick={() => setShowPinChange(true)} className='w-full py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[#F6F6F7]' style={{
            borderColor: '#E1E3E5',
            color: '#202223'
          }}>
                Change PIN
              </button>
              <button onClick={onLogout} className='w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#FFF4F4]' style={{
            border: '1px solid #FECACA',
            color: '#D82C0D'
          }}>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                  <path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' />
                  <polyline points='16 17 21 12 16 7' />
                  <line x1='21' y1='12' x2='9' y2='12' />
                </svg>
                Sign out
              </button>
            </div>
          </> : <>
            {}
            <div className='p-5 space-y-4'>
              {pinSuccess ? <div className='flex flex-col items-center text-center py-4'>
                  <div className='w-12 h-12 rounded-full flex items-center justify-center mb-3' style={{
              background: '#F2F7F5'
            }}>
                    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#008060' strokeWidth='2.5' strokeLinecap='round'>
                      <path d='M20 6L9 17l-5-5' />
                    </svg>
                  </div>
                  <p className='text-sm font-medium' style={{
              color: '#008060'
            }}>
                    PIN updated successfully
                  </p>
                </div> : <>
                  <div>
                    <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
                color: '#6D7175'
              }}>
                      New PIN (4 digits)
                    </label>
                    <input autoFocus type='password' value={newPin} onChange={e => {
                setNewPin(e.target.value.slice(0, 4));
                setPinError('');
              }} placeholder='••••' maxLength={4} className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-[#008060]' style={{
                borderColor: pinError ? '#D82C0D' : '#E1E3E5',
                color: '#202223'
              }} />
                  </div>
                  <div>
                    <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
                color: '#6D7175'
              }}>
                      Confirm PIN
                    </label>
                    <input type='password' value={confirmPin} onChange={e => {
                setConfirmPin(e.target.value.slice(0, 4));
                setPinError('');
              }} placeholder='••••' maxLength={4} className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-[#008060]' style={{
                borderColor: pinError ? '#D82C0D' : '#E1E3E5',
                color: '#202223'
              }} />
                  </div>
                  {pinError && <p className='text-xs' style={{
              color: '#D82C0D'
            }}>
                      {pinError}
                    </p>}
                </>}
            </div>

            {!pinSuccess && <div className='px-5 pb-5 flex gap-2'>
                <button onClick={() => {
            setShowPinChange(false);
            setPinError('');
            setNewPin('');
            setConfirmPin('');
          }} className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]' style={{
            borderColor: '#E1E3E5',
            color: '#6D7175'
          }}>
                  Cancel
                </button>
                <button onClick={handlePinChange} className='flex-1 py-2.5 rounded-lg text-sm font-medium' style={{
            background: '#008060',
            color: '#FFFFFF'
          }}>
                  Update PIN
                </button>
              </div>}
          </>}
      </div>
    </div>;
}
