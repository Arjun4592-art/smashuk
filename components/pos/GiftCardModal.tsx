'use client'
import { useState } from 'react'
import { usePOSStore } from '@/store/posStore'
import { validateGiftCard } from '@/lib/api/pos'
import { CURRENCY_SYMBOL } from '@/lib/constants'

interface Props {
  onClose: () => void
}

const fmt = (n: number) =>
  CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-GB')

export default function GiftCardModal({ onClose }: Props) {
  const { total, giftCardCode, giftCardAmount, applyGiftCard, removeGiftCard } =
    usePOSStore()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Enter a gift card code')
      return
    }
    setChecking(true)
    setError('')
    try {
      const result = await validateGiftCard(trimmed)
      if (!result.valid || result.balance == null) {
        setError(
          result.reason === 'already_redeemed'
            ? 'This gift card has already been fully redeemed'
            : result.reason === 'expired'
              ? 'This gift card has expired'
              : 'Invalid gift card code',
        )
        return
      }
      if (result.balance <= 0) {
        setError('This gift card has no remaining balance')
        return
      }
      applyGiftCard(result.code ?? trimmed, result.balance)
      onClose()
    } catch (err) {
      console.error('[GiftCardModal] validation failed:', err)
      setError('Could not validate gift card — please try again')
    } finally {
      setChecking(false)
    }
  }

  const handleRemove = () => {
    removeGiftCard()
    onClose()
  }

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
            Redeem gift card
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

        <div className='p-5 space-y-4'>
          {/* Already applied */}
          {giftCardCode && (
            <div
              className='flex items-center justify-between p-3 rounded-lg'
              style={{ background: '#F2F7F5', border: '1px solid #008060' }}
            >
              <div>
                <p className='text-sm font-medium' style={{ color: '#008060' }}>
                  Gift card: {giftCardCode}
                </p>
                <p className='text-xs' style={{ color: '#6D7175' }}>
                  -{fmt(giftCardAmount)} applied
                </p>
              </div>
              <button
                onClick={handleRemove}
                className='text-xs px-2 py-1 rounded hover:bg-[#FFF4F4] transition-colors'
                style={{ color: '#D82C0D' }}
              >
                Remove
              </button>
            </div>
          )}

          {/* Code input */}
          <div>
            <label
              className='text-[11px] font-medium uppercase tracking-wide block mb-1.5'
              style={{ color: '#6D7175' }}
            >
              Gift card code
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply()
              }}
              placeholder='e.g. GC-XXXXXXXX'
              className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none uppercase'
              style={{
                borderColor: error ? '#D82C0D' : '#E1E3E5',
                color: '#202223',
              }}
            />
            {error && (
              <p className='text-xs mt-1' style={{ color: '#D82C0D' }}>
                {error}
              </p>
            )}
            <p className='text-xs mt-2' style={{ color: '#8C9196' }}>
              Checked against the card's real remaining balance. If it's worth
              less than {fmt(total)}, only that amount is redeemed and the rest
              of the sale is still paid by cash/card at the next step.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='px-5 pb-5 flex gap-2'>
          <button
            onClick={onClose}
            className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]'
            style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={checking}
            className='py-2.5 px-6 rounded-lg text-sm font-semibold transition-colors'
            style={{
              background: '#008060',
              color: '#FFFFFF',
              flex: 2,
              opacity: checking ? 0.7 : 1,
              cursor: checking ? 'not-allowed' : 'pointer',
            }}
          >
            {checking ? 'Checking...' : 'Apply gift card'}
          </button>
        </div>
      </div>
    </div>
  )
}
