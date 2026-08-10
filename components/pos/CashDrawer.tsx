'use client'
import { useState, useEffect } from 'react'
import { usePOSStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  onClose: () => void
}

type View = 'main' | 'open' | 'movement' | 'close'

export default function CashDrawer({ onClose }: Props) {
  const {
    cashDrawer,
    cashDrawerSyncError,
    openCashDrawer,
    closeCashDrawer,
    addCashMovement,
    syncCashDrawerFromServer,
  } = usePOSStore()
  const authUser = useAuthStore((s) => s.user)
  const [view, setView] = useState<View>('main')
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [movementReason, setMovementReason] = useState('')

  // Recover an already-open till from Medusa (store.metadata) if this
  // device/browser has no local session — e.g. a fresh install, or
  // localStorage was cleared mid-shift. Never overwrites a session the
  // cashier already has open locally (see syncCashDrawerFromServer).
  useEffect(() => {
    syncCashDrawerFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpen = () => {
    const amount = parseInt(openingCash) || 0
    // BUG FIX: was reading sessionStorage.getItem('pos_user'), a key that
    // is never written anywhere — always fell back to the literal 'Staff'.
    // See app/pos/terminal/billing/page.tsx for the matching fix.
    openCashDrawer(amount, authUser?.name || 'Staff')
    setView('main')
    setOpeningCash('')
  }

  const handleAddMovement = () => {
    if (!movementAmount || !movementReason.trim()) return
    addCashMovement(
      parseInt(movementAmount),
      movementType,
      movementReason.trim(),
    )
    setMovementAmount('')
    setMovementReason('')
    setView('main')
  }

  const handleClose = () => {
    const amount = parseInt(closingCash) || 0
    closeCashDrawer(amount)
    setView('main')
    setClosingCash('')
  }

  const totalIn =
    cashDrawer?.movements
      .filter((m) => m.type === 'in')
      .reduce((s, m) => s + m.amount, 0) ?? 0
  const totalOut =
    cashDrawer?.movements
      .filter((m) => m.type === 'out')
      .reduce((s, m) => s + m.amount, 0) ?? 0

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-sm rounded-xl overflow-hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className='flex items-center justify-between px-5 py-4'
          style={{ borderBottom: '1px solid #E1E3E5' }}
        >
          <h3 className='text-base font-semibold' style={{ color: '#202223' }}>
            Cash drawer
          </h3>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]'
            style={{ color: '#6D7175' }}
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='p-5'>
          {cashDrawerSyncError && (
            <div
              className='rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-2'
              style={{
                background: '#FEF3F2',
                color: '#D82C0D',
                border: '1px solid #FDA29B',
              }}
            >
              <span>
                ⚠️ Not synced to server: {cashDrawerSyncError}. This
                device&apos;s till data is still saved locally.
              </span>
            </div>
          )}
          {/* Main view */}
          {view === 'main' && (
            <>
              {!cashDrawer ? (
                <div className='text-center py-4'>
                  <p className='text-sm mb-4' style={{ color: '#6D7175' }}>
                    No active cash drawer session.
                  </p>
                  <button
                    onClick={() => setView('open')}
                    className='w-full py-2.5 rounded-lg text-sm font-medium'
                    style={{ background: '#008060', color: '#FFFFFF' }}
                  >
                    Open cash drawer
                  </button>
                </div>
              ) : (
                <>
                  {/* Status */}
                  <div
                    className='rounded-lg p-4 mb-4'
                    style={{
                      background: '#F2F7F5',
                      border: '1px solid #008060',
                    }}
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <p
                        className='text-sm font-semibold'
                        style={{ color: '#008060' }}
                      >
                        Drawer open
                      </p>
                      <p className='text-xs' style={{ color: '#6D7175' }}>
                        Since{' '}
                        {new Date(cashDrawer.openedAt).toLocaleTimeString(
                          'en-GB',
                          { hour: '2-digit', minute: '2-digit' },
                        )}
                      </p>
                    </div>
                    <div className='grid grid-cols-3 gap-2 text-center'>
                      {[
                        { label: 'Opening', value: cashDrawer.openingCash },
                        { label: 'Cash in', value: totalIn },
                        { label: 'Cash out', value: totalOut },
                      ].map((s) => (
                        <div key={s.label}>
                          <p
                            className='text-base font-semibold'
                            style={{ color: '#202223' }}
                          >
                            £{s.value.toLocaleString('en-GB')}
                          </p>
                          <p
                            className='text-[11px]'
                            style={{ color: '#8C9196' }}
                          >
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Movements history */}
                  {cashDrawer.movements.length > 0 && (
                    <div
                      className='mb-4 rounded-lg overflow-hidden'
                      style={{ border: '1px solid #E1E3E5' }}
                    >
                      {cashDrawer.movements.slice(-3).map((m) => (
                        <div
                          key={m.id}
                          className='flex items-center justify-between px-3 py-2'
                          style={{ borderBottom: '1px solid #F6F6F7' }}
                        >
                          <div>
                            <p
                              className='text-xs font-medium'
                              style={{ color: '#202223' }}
                            >
                              {m.reason}
                            </p>
                            <p
                              className='text-[11px]'
                              style={{ color: '#8C9196' }}
                            >
                              {new Date(m.time).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span
                            className='text-sm font-semibold'
                            style={{
                              color: m.type === 'in' ? '#008060' : '#D82C0D',
                            }}
                          >
                            {m.type === 'in' ? '+' : '-'}£
                            {m.amount.toLocaleString('en-GB')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className='space-y-2'>
                    <button
                      onClick={() => setView('movement')}
                      className='w-full py-2 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]'
                      style={{ borderColor: '#E1E3E5', color: '#202223' }}
                    >
                      Add cash movement
                    </button>
                    <button
                      onClick={() => setView('close')}
                      className='w-full py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[#FFF4F4]'
                      style={{ borderColor: '#D82C0D', color: '#D82C0D' }}
                    >
                      Close drawer
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Open drawer form */}
          {view === 'open' && (
            <div className='space-y-4'>
              <div>
                <label
                  className='text-[11px] font-medium uppercase tracking-wide block mb-1.5'
                  style={{ color: '#6D7175' }}
                >
                  Opening cash amount
                </label>
                <div
                  className='flex items-center gap-2 px-3 py-2.5 rounded-lg border'
                  style={{ borderColor: '#E1E3E5' }}
                >
                  <span style={{ color: '#6D7175' }}>£</span>
                  <input
                    autoFocus
                    type='number'
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder='e.g. 5000'
                    className='flex-1 bg-transparent outline-none text-sm'
                    style={{ color: '#202223' }}
                  />
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => setView('main')}
                  className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                  style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
                >
                  Back
                </button>
                <button
                  onClick={handleOpen}
                  className='flex-1 py-2.5 rounded-lg text-sm font-medium'
                  style={{ background: '#008060', color: '#FFFFFF' }}
                >
                  Open drawer
                </button>
              </div>
            </div>
          )}

          {/* Add movement form */}
          {view === 'movement' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-2'>
                {(['in', 'out'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMovementType(t)}
                    className='py-2 rounded-lg text-sm font-medium border transition-all'
                    style={{
                      background:
                        movementType === t
                          ? t === 'in'
                            ? '#F2F7F5'
                            : '#FFF4F4'
                          : '#FFFFFF',
                      borderColor:
                        movementType === t
                          ? t === 'in'
                            ? '#008060'
                            : '#D82C0D'
                          : '#E1E3E5',
                      color:
                        movementType === t
                          ? t === 'in'
                            ? '#008060'
                            : '#D82C0D'
                          : '#6D7175',
                    }}
                  >
                    {t === 'in' ? '+ Cash in' : '- Cash out'}
                  </button>
                ))}
              </div>
              <div>
                <label
                  className='text-[11px] font-medium uppercase tracking-wide block mb-1.5'
                  style={{ color: '#6D7175' }}
                >
                  Amount
                </label>
                <div
                  className='flex items-center gap-2 px-3 py-2.5 rounded-lg border'
                  style={{ borderColor: '#E1E3E5' }}
                >
                  <span style={{ color: '#6D7175' }}>£</span>
                  <input
                    type='number'
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder='0'
                    className='flex-1 bg-transparent outline-none text-sm'
                    style={{ color: '#202223' }}
                  />
                </div>
              </div>
              <div>
                <label
                  className='text-[11px] font-medium uppercase tracking-wide block mb-1.5'
                  style={{ color: '#6D7175' }}
                >
                  Reason
                </label>
                <input
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder='e.g. Petty cash, float added...'
                  className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none'
                  style={{ borderColor: '#E1E3E5', color: '#202223' }}
                />
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => setView('main')}
                  className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                  style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
                >
                  Back
                </button>
                <button
                  onClick={handleAddMovement}
                  className='flex-1 py-2.5 rounded-lg text-sm font-medium'
                  style={{ background: '#008060', color: '#FFFFFF' }}
                >
                  Add movement
                </button>
              </div>
            </div>
          )}

          {/* Close drawer form */}
          {view === 'close' && (
            <div className='space-y-4'>
              <div className='rounded-lg p-3' style={{ background: '#F6F6F7' }}>
                <div
                  className='flex justify-between text-xs mb-1'
                  style={{ color: '#6D7175' }}
                >
                  <span>Opening cash</span>
                  <span>
                    £{cashDrawer?.openingCash.toLocaleString('en-GB')}
                  </span>
                </div>
                <div
                  className='flex justify-between text-xs mb-1'
                  style={{ color: '#008060' }}
                >
                  <span>Cash in</span>
                  <span>+£{totalIn.toLocaleString('en-GB')}</span>
                </div>
                <div
                  className='flex justify-between text-xs'
                  style={{ color: '#D82C0D' }}
                >
                  <span>Cash out</span>
                  <span>-£{totalOut.toLocaleString('en-GB')}</span>
                </div>
              </div>
              <div>
                <label
                  className='text-[11px] font-medium uppercase tracking-wide block mb-1.5'
                  style={{ color: '#6D7175' }}
                >
                  Counted closing cash
                </label>
                <div
                  className='flex items-center gap-2 px-3 py-2.5 rounded-lg border'
                  style={{ borderColor: '#E1E3E5' }}
                >
                  <span style={{ color: '#6D7175' }}>£</span>
                  <input
                    type='number'
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder='Enter counted amount'
                    className='flex-1 bg-transparent outline-none text-sm'
                    style={{ color: '#202223' }}
                  />
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => setView('main')}
                  className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                  style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
                >
                  Back
                </button>
                <button
                  onClick={handleClose}
                  className='flex-1 py-2.5 rounded-lg text-sm font-medium'
                  style={{ background: '#D82C0D', color: '#FFFFFF' }}
                >
                  Close drawer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
