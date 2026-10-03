import { useState, useMemo } from 'react'
import { CURRENCY_SYMBOL } from '@/lib/constants'
// 'card_terminal' = paid on the shop's separate card terminal (card machine).
// Nothing is charged from here; it only records how the sale was paid.
type PayMethod = 'cash' | 'card_terminal' | 'split'
export interface SplitPayment {
  method: 'cash' | 'card_terminal'
  amount: number
  /** Legacy (Stripe reader) — no longer set by this modal. */
  stripePaymentIntentId?: string
  stripePaymentAmount?: number
}
export interface PaymentResult {
  method: PayMethod
  splits?: SplitPayment[]
  stripePaymentIntentId?: string
  stripePaymentAmount?: number
}
interface Props {
  total: number
  onConfirm: (result: PaymentResult) => void | Promise<void>
  onClose: () => void
}
const fmt = (n: number) => CURRENCY_SYMBOL + (Number(n) || 0).toFixed(2)
const METHODS: {
  id: PayMethod
  label: string
  sub: string
  icon: React.ReactNode
}[] = [
  {
    id: 'cash',
    label: 'Cash',
    sub: 'Pay with cash',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <rect x='2' y='6' width='20' height='12' rx='2' />
        <circle cx='12' cy='12' r='3' />
        <path d='M6 12h.01M18 12h.01' />
      </svg>
    ),
  },
  {
    id: 'card_terminal',
    label: 'Card terminal',
    sub: 'Card machine (in store)',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <rect x='5' y='2' width='14' height='20' rx='2' />
        <rect x='8' y='5' width='8' height='4' rx='1' />
        <path d='M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01' />
      </svg>
    ),
  },
  {
    id: 'split',
    label: 'Split',
    sub: 'Multiple methods',
    icon: (
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <path d='M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5M3 12h18' />
      </svg>
    ),
  },
]
const SPLIT_METHODS: {
  id: 'cash' | 'card_terminal'
  label: string
}[] = [
  {
    id: 'cash',
    label: 'Cash',
  },
  {
    id: 'card_terminal',
    label: 'Card terminal',
  },
]
export default function PaymentModal({ total, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<PayMethod>('cash')
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [activeSplits, setActiveSplits] = useState<
    ('cash' | 'card_terminal')[]
  >(['cash', 'card_terminal'])
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: String(Math.round(total / 2)),
    card_terminal: String(total - Math.round(total / 2)),
  })
  const totalRounded = Math.round(total)
  const splitSum = useMemo(() => {
    return activeSplits.reduce(
      (sum, m) => sum + (parseInt(splitAmounts[m]) || 0),
      0,
    )
  }, [activeSplits, splitAmounts])
  const remaining = totalRounded - splitSum
  const splitValid = remaining === 0 && activeSplits.length >= 2
  const toggleSplitMethod = (id: 'cash' | 'card_terminal') => {
    setActiveSplits((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev
        const next = prev.filter((m) => m !== id)
        rebalance(next)
        return next
      } else {
        if (prev.length >= 3) return prev
        const next = [...prev, id]
        rebalance(next)
        return next
      }
    })
  }
  const rebalance = (methods: ('cash' | 'card_terminal')[]) => {
    const share = Math.floor(totalRounded / methods.length)
    const remainder = totalRounded - share * methods.length
    setSplitAmounts((prev) => {
      const next = {
        ...prev,
      }
      methods.forEach((m, i) => {
        next[m] = String(share + (i === methods.length - 1 ? remainder : 0))
      })
      return next
    })
  }
  const handleSplitAmountChange = (
    id: 'cash' | 'card_terminal',
    value: string,
  ) => {
    setSplitAmounts((prev) => ({
      ...prev,
      [id]: value,
    }))
  }
  const handleConfirm = async () => {
    if (selected === 'split') {
      if (!splitValid) return
      const splits: SplitPayment[] = activeSplits.map((m) => ({
        method: m,
        amount: parseInt(splitAmounts[m]) || 0,
      }))
      setProcessing(true)
      setStatusMsg('Recording sale…')
      await onConfirm({
        method: 'split',
        splits,
      })
      setProcessing(false)
      return
    }
    // Cash and Card terminal only record how the sale was paid — nothing is
    // charged from here (the card machine is operated separately).
    setProcessing(true)
    setStatusMsg('Recording sale…')
    await onConfirm({
      method: selected,
    })
    setProcessing(false)
  }
  const confirmDisabled = (selected === 'split' && !splitValid) || processing
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-sm rounded-xl overflow-hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {}
        <div
          className='flex items-center justify-between px-5 py-4 shrink-0'
          style={{
            borderBottom: '1px solid #E1E3E5',
          }}
        >
          <div>
            <h3
              className='text-base font-semibold'
              style={{
                color: '#202223',
              }}
            >
              Select payment method
            </h3>
            <p
              className='text-sm mt-0.5'
              style={{
                color: '#6D7175',
              }}
            >
              Total:{' '}
              <span
                className='font-semibold'
                style={{
                  color: '#202223',
                }}
              >
                {fmt(total)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#F6F6F7]'
            style={{
              color: '#6D7175',
            }}
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

        {}
        <div className='overflow-y-auto flex-1'>
          {}
          <div className='p-4 grid grid-cols-2 gap-2'>
            {METHODS.map((m) => {
              const isActive = selected === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  disabled={processing}
                  className='flex flex-col items-start gap-2 p-3 rounded-lg border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{
                    background: isActive ? '#F2F7F5' : '#FFFFFF',
                    borderColor: isActive ? '#008060' : '#E1E3E5',
                    color: isActive ? '#008060' : '#6D7175',
                  }}
                >
                  {m.icon}
                  <div>
                    <p
                      className='text-sm font-medium'
                      style={{
                        color: isActive ? '#008060' : '#202223',
                      }}
                    >
                      {m.label}
                    </p>
                    <p
                      className='text-[11px]'
                      style={{
                        color: '#8C9196',
                      }}
                    >
                      {m.sub}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {processing && (
            <div className='px-4 pb-2'>
              <div
                className='flex items-center gap-2 px-3 py-2 rounded-lg text-xs'
                style={{
                  background: '#F2F7F5',
                  color: '#008060',
                }}
              >
                <div className='w-3 h-3 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
                {statusMsg || 'Processing…'}
              </div>
            </div>
          )}

          {}
          {selected === 'split' && (
            <div className='px-4 pb-4 space-y-3'>
              <p
                className='text-xs font-medium uppercase tracking-wide'
                style={{
                  color: '#6D7175',
                }}
              >
                Split between (2-3 methods)
              </p>

              {}
              <div className='flex gap-2'>
                {SPLIT_METHODS.map((m) => {
                  const active = activeSplits.includes(m.id)
                  const disabled = !active && activeSplits.length >= 3
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleSplitMethod(m.id)}
                      disabled={disabled}
                      className='flex-1 py-2 rounded-lg text-xs font-medium border transition-all'
                      style={{
                        background: active ? '#F2F7F5' : '#FFFFFF',
                        borderColor: active ? '#008060' : '#E1E3E5',
                        color: active
                          ? '#008060'
                          : disabled
                            ? '#C9CCCF'
                            : '#6D7175',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {}
              <div className='space-y-2'>
                {activeSplits.map((m) => {
                  const methodInfo = SPLIT_METHODS.find((sm) => sm.id === m)!
                  return (
                    <div key={m}>
                      <label
                        className='text-[11px] font-medium uppercase tracking-wide block mb-1'
                        style={{
                          color: '#6D7175',
                        }}
                      >
                        {methodInfo.label} amount
                      </label>
                      <div
                        className='flex items-center gap-2 px-3 py-2 rounded-lg border'
                        style={{
                          borderColor: '#E1E3E5',
                        }}
                      >
                        <span
                          className='text-sm'
                          style={{
                            color: '#6D7175',
                          }}
                        >
                          {CURRENCY_SYMBOL}
                        </span>
                        <input
                          type='number'
                          min={0}
                          value={splitAmounts[m]}
                          onChange={(e) =>
                            handleSplitAmountChange(m, e.target.value)
                          }
                          className='flex-1 bg-transparent outline-none text-sm font-medium'
                          style={{
                            color: '#202223',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {}
              <button
                onClick={() => rebalance(activeSplits)}
                className='text-xs font-medium transition-colors'
                style={{
                  color: '#008060',
                }}
              >
                Split equally
              </button>

              {}
              <div
                className='flex items-center justify-between p-3 rounded-lg text-sm'
                style={{
                  background: splitValid
                    ? '#F2F7F5'
                    : remaining > 0
                      ? '#FFFBEB'
                      : '#FFF4F4',
                  border: `1px solid ${splitValid ? '#008060' : remaining > 0 ? '#FDE68A' : '#FECACA'}`,
                }}
              >
                <span
                  style={{
                    color: splitValid
                      ? '#008060'
                      : remaining > 0
                        ? '#B7791F'
                        : '#D82C0D',
                  }}
                >
                  {splitValid
                    ? 'Amounts match total ✓'
                    : remaining > 0
                      ? `${fmt(remaining)} remaining`
                      : `${fmt(Math.abs(remaining))} over total`}
                </span>
                <span
                  className='font-semibold'
                  style={{
                    color: '#202223',
                  }}
                >
                  {fmt(splitSum)} / {fmt(totalRounded)}
                </span>
              </div>
            </div>
          )}
        </div>

        {}
        <div
          className='px-4 pb-4 pt-2 flex gap-2 shrink-0'
          style={{
            borderTop: '1px solid #E1E3E5',
          }}
        >
          <button
            onClick={onClose}
            disabled={processing}
            className='flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[#F6F6F7] disabled:opacity-50'
            style={{
              borderColor: '#E1E3E5',
              color: '#6D7175',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className='py-2.5 px-6 rounded-lg text-sm font-semibold transition-colors'
            style={{
              flex: 2,
              background: confirmDisabled ? '#E1E3E5' : '#008060',
              color: confirmDisabled ? '#8C9196' : '#FFFFFF',
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {processing ? 'Processing…' : `Confirm ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
