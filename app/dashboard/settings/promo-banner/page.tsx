'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

const Icons = {
  tag: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M20.59 13.41L11 3.83V3H3v8l9.83 9.83a2 2 0 002.83 0l4.93-4.93a2 2 0 000-2.83z' />
      <line x1='7' y1='7' x2='7.01' y2='7' />
    </svg>
  ),
  save: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' />
      <polyline points='17 21 17 13 7 13 7 21' />
      <polyline points='7 3 7 8 15 8' />
    </svg>
  ),
  spinner: (
    <svg className='animate-spin w-4 h-4' viewBox='0 0 24 24' fill='none'>
      <circle
        className='opacity-25'
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 018-8v8H4z'
      />
    </svg>
  ),
}

const SETTINGS_NAV = [
  { label: 'General', href: '/dashboard/settings' },
  { label: 'Billing', href: '/dashboard/settings/billing' },
  { label: 'Shipping', href: '/dashboard/settings/shipping' },
  { label: 'Notifications', href: '/dashboard/settings/notifications' },
  { label: 'Marketing', href: '/dashboard/settings/marketing' },
  {
    label: 'Promo Banner',
    href: '/dashboard/settings/promo-banner',
    active: true,
  },
]

interface PromoBanner {
  enabled: boolean
  eyebrow: string
  heading: string
  subtext: string
  code: string
  discountLabel: string
  ctaText: string
  ctaLink: string
}

const EMPTY_BANNER: PromoBanner = {
  enabled: true,
  eyebrow: '',
  heading: '',
  subtext: '',
  code: '',
  discountLabel: '',
  ctaText: '',
  ctaLink: '',
}

export default function PromoBannerSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [banner, setBanner] = useState<PromoBanner>(EMPTY_BANNER)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/promo-banner', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setStoreId(data.storeId)
            setBanner((b) => ({ ...b, ...data.promoBanner }))
          }
        } else {
          toast.error('Failed to load promo banner')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load promo banner')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const update = (key: keyof PromoBanner, value: string | boolean) => {
    setBanner((b) => ({ ...b, [key]: value }))
  }

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Store not loaded yet')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/promo-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, promoBanner: banner }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save promo banner')
      }
      toast.success('Promo banner saved — live on your homepage now')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save promo banner')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Promo Banner
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Control the sale banner on your homepage — headline, code and link —
            without touching code.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
        >
          {saving ? Icons.spinner : Icons.save}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6'>
        <nav className='flex lg:flex-col gap-1 overflow-x-auto'>
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                item.active
                  ? 'bg-[#008060]/10 text-[#008060]'
                  : 'text-[#6D7175] hover:bg-[#F6F6F7]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 space-y-5'>
          {loading ? (
            <p className='text-[13px] text-[#6D7175]'>Loading...</p>
          ) : (
            <>
              <div className='flex items-center justify-between p-3 border border-[#E1E3E5] rounded-lg'>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    Show banner
                  </p>
                  <p className='text-[11.5px] text-[#6D7175]'>
                    Hide this to remove the sale banner from the homepage
                    entirely.
                  </p>
                </div>
                <button
                  onClick={() => update('enabled', !banner.enabled)}
                  className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${
                    banner.enabled ? 'bg-[#008060]' : 'bg-[#8C9196]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      banner.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Eyebrow text
                </label>
                <input
                  type='text'
                  value={banner.eyebrow}
                  onChange={(e) => update('eyebrow', e.target.value)}
                  placeholder='Limited Time Offer'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>

              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Headline{' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    (must match the actual discount amount)
                  </span>
                </label>
                <input
                  type='text'
                  value={banner.heading}
                  onChange={(e) => update('heading', e.target.value)}
                  placeholder='UP TO 10% OFF'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[15px] font-bold text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>

              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Subtext
                </label>
                <input
                  type='text'
                  value={banner.subtext}
                  onChange={(e) => update('subtext', e.target.value)}
                  placeholder='On selected sports equipment'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Discount code{' '}
                    <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                      (must match the code in Medusa promotions)
                    </span>
                  </label>
                  <input
                    type='text'
                    value={banner.code}
                    onChange={(e) =>
                      update('code', e.target.value.toUpperCase())
                    }
                    placeholder='SMASH10'
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Discount label{' '}
                    <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                      (shown in the top announcement bar)
                    </span>
                  </label>
                  <input
                    type='text'
                    value={banner.discountLabel}
                    onChange={(e) => update('discountLabel', e.target.value)}
                    placeholder='10% off'
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Button text
                  </label>
                  <input
                    type='text'
                    value={banner.ctaText}
                    onChange={(e) => update('ctaText', e.target.value)}
                    placeholder='Shop Sale Now →'
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Button link
                  </label>
                  <input
                    type='text'
                    value={banner.ctaLink}
                    onChange={(e) => update('ctaLink', e.target.value)}
                    placeholder='/shop?badge=SALE'
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
              </div>

              {}
              <div className='p-4 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl'>
                <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide mb-3'>
                  Preview
                </p>
                <div className='bg-[#0A1F44] rounded-lg px-4 py-2.5 mb-3'>
                  <p className='text-white text-[11.5px]'>
                    🚚 Free shipping on orders above £50 &nbsp;·&nbsp; Use code{' '}
                    <span className='text-[#E8553A] font-bold'>
                      {banner.code || 'SMASH10'}
                    </span>{' '}
                    for {banner.discountLabel || '10% off'}
                  </p>
                </div>
                <div className='bg-[#E8553A] rounded-lg p-5'>
                  <p className='text-white/80 text-[11px] uppercase tracking-widest mb-1.5'>
                    {banner.eyebrow || 'Limited Time Offer'}
                  </p>
                  <p className='text-white font-black text-2xl mb-1.5'>
                    {banner.heading || 'UP TO 10% OFF'}
                  </p>
                  <p className='text-white/80 text-[13px] mb-3'>
                    {banner.subtext || 'On selected sports equipment'}
                  </p>
                  {banner.code && (
                    <span className='inline-block bg-white text-[#E8553A] font-black px-3 py-1 rounded-full text-[12px]'>
                      {banner.code}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
