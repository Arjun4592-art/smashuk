'use client'
import { useState } from 'react'
import { usePOSStore } from '@/store/posStore'

interface Props {
  onClose: () => void
  onSave?: () => void
}

const emptyAddress = {
  first_name: '',
  last_name: '',
  address_1: '',
  address_2: '',
  city: '',
  province: '',
  postal_code: '',
  country_code: 'gb',
  phone: '',
}

type Step = 'choose' | 'address'

export default function FulfillmentModal({ onClose, onSave }: Props) {
  const {
    fulfillmentType,
    shippingAddress,
    setFulfillmentType,
    setShippingAddress,
  } = usePOSStore()
  const [step, setStep] = useState<Step>('choose')
  const [type, setType] = useState(fulfillmentType)
  const [addr, setAddr] = useState(shippingAddress ?? emptyAddress)

  const addressValid =
    !!addr.first_name && !!addr.address_1 && !!addr.city && !!addr.postal_code

  // Step 1 — user picks pickup or ship
  const handleChoose = (chosen: 'pickup' | 'ship') => {
    setType(chosen)
    if (chosen === 'pickup') {
      // Pickup — no address needed, save and proceed
      setFulfillmentType('pickup')
      onClose()
      onSave?.()
    } else {
      // Ship — move to address step
      setStep('address')
    }
  }

  // Step 2 — user fills shipping address, then proceed
  const handleSaveAddress = () => {
    if (!addressValid) return
    setFulfillmentType('ship')
    setShippingAddress(addr)
    onClose()
    onSave?.()
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
          {step === 'address' && (
            <button
              onClick={() => setStep('choose')}
              className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7] mr-1'
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
                <path d='M15 18l-6-6 6-6' />
              </svg>
            </button>
          )}
          <h3
            className='text-base font-semibold flex-1'
            style={{ color: '#202223' }}
          >
            {step === 'choose'
              ? 'How is the customer getting this?'
              : 'Shipping address'}
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

        {/* Step 1 — Choose */}
        {step === 'choose' && (
          <div className='p-5 grid grid-cols-2 gap-3'>
            <button
              onClick={() => handleChoose('pickup')}
              className='flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 text-sm font-semibold transition-all'
              style={{
                borderColor: type === 'pickup' ? '#008060' : '#E1E3E5',
                color: '#202223',
                background: type === 'pickup' ? '#F0FBF7' : '#FAFAFA',
              }}
            >
              <span className='text-2xl'>🛍️</span>
              Take Now
              <span
                className='text-[11px] font-normal'
                style={{ color: '#8C9196' }}
              >
                Picks up in store
              </span>
            </button>
            <button
              onClick={() => handleChoose('ship')}
              className='flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 text-sm font-semibold transition-all'
              style={{
                borderColor: type === 'ship' ? '#008060' : '#E1E3E5',
                color: '#202223',
                background: type === 'ship' ? '#F0FBF7' : '#FAFAFA',
              }}
            >
              <span className='text-2xl'>📦</span>
              Ship to Customer
              <span
                className='text-[11px] font-normal'
                style={{ color: '#8C9196' }}
              >
                Deliver to address
              </span>
            </button>
          </div>
        )}

        {/* Step 2 — Shipping address */}
        {step === 'address' && (
          <div className='p-5 space-y-2.5 max-h-[70vh] overflow-y-auto'>
            <div className='grid grid-cols-2 gap-2'>
              <input
                placeholder='First name *'
                value={addr.first_name}
                onChange={(e) =>
                  setAddr((a) => ({ ...a, first_name: e.target.value }))
                }
                className='px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                style={{ borderColor: '#E1E3E5' }}
              />
              <input
                placeholder='Last name'
                value={addr.last_name}
                onChange={(e) =>
                  setAddr((a) => ({ ...a, last_name: e.target.value }))
                }
                className='px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                style={{ borderColor: '#E1E3E5' }}
              />
            </div>
            <input
              placeholder='Address line 1 *'
              value={addr.address_1}
              onChange={(e) =>
                setAddr((a) => ({ ...a, address_1: e.target.value }))
              }
              className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
              style={{ borderColor: '#E1E3E5' }}
            />
            <input
              placeholder='Address line 2'
              value={addr.address_2}
              onChange={(e) =>
                setAddr((a) => ({ ...a, address_2: e.target.value }))
              }
              className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
              style={{ borderColor: '#E1E3E5' }}
            />
            <div className='grid grid-cols-2 gap-2'>
              <input
                placeholder='City *'
                value={addr.city}
                onChange={(e) =>
                  setAddr((a) => ({ ...a, city: e.target.value }))
                }
                className='px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                style={{ borderColor: '#E1E3E5' }}
              />
              <input
                placeholder='Postcode *'
                value={addr.postal_code}
                onChange={(e) =>
                  setAddr((a) => ({ ...a, postal_code: e.target.value }))
                }
                className='px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                style={{ borderColor: '#E1E3E5' }}
              />
            </div>
            <input
              placeholder='Phone (optional)'
              value={addr.phone}
              onChange={(e) =>
                setAddr((a) => ({ ...a, phone: e.target.value }))
              }
              className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
              style={{ borderColor: '#E1E3E5' }}
            />

            <div className='flex gap-2 pt-1'>
              <button
                onClick={() => setStep('choose')}
                className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]'
                style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
              >
                Back
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={!addressValid}
                className='flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors'
                style={{ background: '#008060', color: '#FFFFFF' }}
              >
                Continue to pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
