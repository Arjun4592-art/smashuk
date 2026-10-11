'use client'

import { useState } from 'react'
import { isGiftCardCodeAvailable } from '@/lib/api/pos'
import {
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
  GIFT_CARD_PRESETS,
  giftCardAmountError,
  giftCardCodeError,
  normalizeGiftCardCode,
} from '@/lib/pos/gift-card'
import { CURRENCY_SYMBOL } from '@/lib/constants'

interface Props {
  onClose: () => void
  /** Codes already on the current sale, so the same card can't be added twice. */
  codesInCart: string[]
  onAdd: (card: { code: string; amount: number }) => void
}

const inputStyle = {
  border: '1px solid #E1E3E5',
  color: '#202223',
  background: '#FFFFFF',
} as const

/**
 * "Sell gift card" — staff type (or scan) the number printed on a physical
 * card and pick the amount. The card is only added to the sale here; it is
 * activated in Medusa by the order route once the sale is paid.
 */
export default function SellGiftCardModal({
  onClose,
  codesInCart,
  onAdd,
}: Props) {
  const [code, setCode] = useState('')
  const [preset, setPreset] = useState<number | null>(20)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const amount = custom.trim() !== '' ? Number(custom) : (preset ?? 0)
  const normalized = normalizeGiftCardCode(code)

  const submit = async () => {
    const codeProblem = giftCardCodeError(normalized)
    if (codeProblem) return setError(codeProblem)
    const amountProblem = giftCardAmountError(amount)
    if (amountProblem) return setError(amountProblem)
    if (codesInCart.includes(normalized))
      return setError('This card is already on the sale')

    setChecking(true)
    setError('')
    try {
      const free = await isGiftCardCodeAvailable(normalized)
      if (!free) {
        setError(
          `Card ${normalized} is already in use. Check the number, or use a different card.`,
        )
        return
      }
      onAdd({ code: normalized, amount: Math.round(amount * 100) / 100 })
      onClose()
    } catch (err) {
      console.error('[SellGiftCardModal] availability check failed:', err)
      setError('Could not check the card number — try again')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      className='fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl overflow-y-auto'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: '92dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          className='flex items-center justify-between px-5 py-4'
          style={{ borderBottom: '1px solid #E1E3E5' }}
        >
          <h3 className='text-base font-semibold' style={{ color: '#202223' }}>
            Sell gift card
          </h3>
          <button
            onClick={onClose}
            className='text-lg leading-none'
            style={{ color: '#6D7175' }}
            aria-label='Close'
          >
            ×
          </button>
        </div>

        <div className='px-5 py-4 flex flex-col gap-4'>
          <label className='flex flex-col gap-1 text-xs font-medium'>
            <span style={{ color: '#202223' }}>Card number</span>
            <input
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              maxLength={30}
              autoCapitalize='characters'
              autoComplete='off'
              placeholder='Printed on the card, e.g. GC00050'
              className='rounded-lg px-3 py-2.5 text-base sm:text-sm outline-none uppercase'
              style={{
                ...inputStyle,
                borderColor: error ? '#D82C0D' : '#E1E3E5',
              }}
            />
          </label>

          <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-medium' style={{ color: '#202223' }}>
              Amount
            </span>
            <div className='grid grid-cols-4 gap-2'>
              {GIFT_CARD_PRESETS.map((p) => {
                const active = custom.trim() === '' && preset === p
                return (
                  <button
                    key={p}
                    type='button'
                    onClick={() => {
                      setPreset(p)
                      setCustom('')
                      setError('')
                    }}
                    className='rounded-lg py-2.5 text-sm font-semibold'
                    style={{
                      border: `1px solid ${active ? '#008060' : '#E1E3E5'}`,
                      background: active ? '#F2F7F5' : '#FFFFFF',
                      color: active ? '#008060' : '#202223',
                    }}
                  >
                    {CURRENCY_SYMBOL}
                    {p}
                  </button>
                )
              })}
            </div>
            <input
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              inputMode='decimal'
              placeholder={`Other amount (${CURRENCY_SYMBOL}${GIFT_CARD_MIN_AMOUNT}–${CURRENCY_SYMBOL}${GIFT_CARD_MAX_AMOUNT})`}
              className='rounded-lg px-3 py-2.5 text-base sm:text-sm outline-none'
              style={inputStyle}
            />
          </div>

          {error && (
            <p className='text-xs' role='alert' style={{ color: '#D82C0D' }}>
              {error}
            </p>
          )}
          <p className='text-xs' style={{ color: '#8C9196' }}>
            The card becomes spendable only after the sale is paid. Gift cards
            can&apos;t be discounted or paid for with another gift card.
          </p>
        </div>

        <div
          className='flex gap-2 px-5 py-4'
          style={{ borderTop: '1px solid #E1E3E5' }}
        >
          <button
            onClick={onClose}
            className='flex-1 rounded-lg py-2.5 text-sm font-medium'
            style={{ border: '1px solid #E1E3E5', color: '#6D7175' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={checking}
            className='flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60'
            style={{ background: '#008060' }}
          >
            {checking ? 'Checking...' : 'Add to sale'}
          </button>
        </div>
      </div>
    </div>
  )
}
