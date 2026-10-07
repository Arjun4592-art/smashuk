'use client'

import { useState } from 'react'

interface Props {
  onClose: () => void
  onAdd: (item: { name: string; price: number; quantity: number }) => void
}

/**
 * "Custom sale" — sell something that isn't registered in the catalogue.
 * The price entered is the VAT-inclusive price the customer pays, same as
 * every other price in the POS.
 */
export default function CustomItemModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')

  const priceNum = Number(price)
  const qtyNum = Math.floor(Number(quantity))
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    Number.isFinite(qtyNum) &&
    qtyNum >= 1

  const submit = () => {
    if (!valid) return
    onAdd({
      name: name.trim(),
      price: Math.round(priceNum * 100) / 100,
      quantity: qtyNum,
    })
    onClose()
  }

  const inputStyle = {
    border: '1px solid #E1E3E5',
    color: '#202223',
    background: '#FFFFFF',
  } as const

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
        <div
          className='flex items-center justify-between px-5 py-4'
          style={{ borderBottom: '1px solid #E1E3E5' }}
        >
          <h3 className='text-base font-semibold' style={{ color: '#202223' }}>
            Custom sale
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

        <div className='px-5 py-4 flex flex-col gap-3'>
          <p className='text-xs' style={{ color: '#6D7175' }}>
            For items that are not registered in the system. Enter the price
            the customer pays (VAT included).
          </p>

          <label className='flex flex-col gap-1 text-xs font-medium'>
            <span style={{ color: '#202223' }}>Item name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder='e.g. Racket repair'
              className='rounded-lg px-3 py-2 text-sm outline-none'
              style={inputStyle}
            />
          </label>

          <div className='flex gap-3'>
            <label className='flex flex-1 flex-col gap-1 text-xs font-medium'>
              <span style={{ color: '#202223' }}>Price (£)</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode='decimal'
                placeholder='0.00'
                className='rounded-lg px-3 py-2 text-sm outline-none'
                style={inputStyle}
              />
            </label>
            <label className='flex w-24 flex-col gap-1 text-xs font-medium'>
              <span style={{ color: '#202223' }}>Qty</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode='numeric'
                className='rounded-lg px-3 py-2 text-sm outline-none'
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </label>
          </div>
        </div>

        <div
          className='flex gap-2 px-5 py-4'
          style={{ borderTop: '1px solid #E1E3E5' }}
        >
          <button
            onClick={onClose}
            className='flex-1 rounded-lg py-2 text-sm font-medium'
            style={{ border: '1px solid #E1E3E5', color: '#6D7175' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            className='flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40'
            style={{ background: '#008060' }}
          >
            Add to sale
          </button>
        </div>
      </div>
    </div>
  )
}
