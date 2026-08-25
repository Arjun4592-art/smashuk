'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

const Icons = {
  megaphone: (
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
      <path d='M3 11l18-5v12L3 14v-3z' />
      <path d='M11.6 16.8a3 3 0 11-5.8-1.6' />
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
  check: (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  ),
  eye: (
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
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  ),
  eyeOff: (
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
      <path d='M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24' />
      <line x1='1' y1='1' x2='23' y2='23' />
    </svg>
  ),
  google: (
    <svg width='16' height='16' viewBox='0 0 24 24'>
      <path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.19 3.32v2.77h3.55c2.08-1.92 3.28-4.74 3.28-8.1z'
      />
      <path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77c-.98.66-2.23 1.06-3.73 1.06-2.87 0-5.3-1.94-6.17-4.53H2.18v2.85A11 11 0 0012 23z'
      />
      <path
        fill='#FBBC05'
        d='M5.83 14.1a6.6 6.6 0 010-4.2V7.05H2.18a11 11 0 000 9.9l3.65-2.85z'
      />
      <path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.05l3.65 2.85C6.7 7.32 9.13 5.38 12 5.38z'
      />
    </svg>
  ),
  facebook: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#1877F2'>
      <path d='M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z' />
    </svg>
  ),
  gtm: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#4285F4'>
      <path d='M18.68 11.42L12.58.42a1 1 0 00-1.74 0l-3.02 5.4 6.85 12.2 4.01-2.99a1.5 1.5 0 00.6-1.2v-1.4a1.5 1.5 0 00-.6-1.01z' />
      <path
        fillOpacity='.6'
        d='M6.36 6.75L2.32 13.9a1 1 0 000 1l6.1 8.68a1 1 0 001.63.05l3.24-4.56z'
      />
    </svg>
  ),
  tiktok: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#000'>
      <path d='M16.6 5.82a4.28 4.28 0 01-3.32-3.82h-3.24v14.4a2.6 2.6 0 11-2.6-2.6c.24 0 .48.03.7.09V10.6a5.86 5.86 0 00-.7-.04A5.83 5.83 0 100 16.4a5.83 5.83 0 009.66 4.4 5.83 5.83 0 001.66-4.1V9.35a7.55 7.55 0 004.4 1.4V7.5a4.28 4.28 0 01-3.12-1.68z' />
    </svg>
  ),
  pinterest: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#E60023'>
      <path d='M12 0C5.4 0 0 5.4 0 12c0 5.06 3.14 9.38 7.58 11.14-.1-.94-.2-2.4.04-3.44.22-.94 1.42-6 1.42-6s-.36-.72-.36-1.8c0-1.68.98-2.94 2.2-2.94 1.04 0 1.54.78 1.54 1.72 0 1.04-.66 2.6-1 4.04-.28 1.2.6 2.18 1.78 2.18 2.14 0 3.78-2.26 3.78-5.52 0-2.88-2.08-4.9-5.04-4.9-3.44 0-5.46 2.58-5.46 5.24 0 1.04.4 2.16.9 2.76.1.12.11.22.08.34l-.34 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.44-2.9-2.44-4.66 0-3.8 2.76-7.28 7.96-7.28 4.18 0 7.44 2.98 7.44 6.96 0 4.16-2.62 7.5-6.26 7.5-1.22 0-2.38-.64-2.76-1.38l-.76 2.86c-.28 1.06-1.02 2.38-1.52 3.18A12 12 0 1012 0z' />
    </svg>
  ),
  snapchat: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#FFFC00'>
      <circle cx='12' cy='12' r='11' stroke='#000' strokeWidth='1' />
    </svg>
  ),
  microsoft: (
    <svg width='16' height='16' viewBox='0 0 24 24'>
      <path fill='#F25022' d='M1 1h10v10H1z' />
      <path fill='#7FBA00' d='M13 1h10v10H13z' />
      <path fill='#00A4EF' d='M1 13h10v10H1z' />
      <path fill='#FFB900' d='M13 13h10v10H13z' />
    </svg>
  ),
  linkedin: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='#0A66C2'>
      <path d='M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z' />
    </svg>
  ),
  clarity: (
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
      <circle cx='12' cy='12' r='10' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  ),
}

const SETTINGS_NAV = [
  {
    label: 'General',
    href: '/dashboard/settings',
  },
  {
    label: 'Billing',
    href: '/dashboard/settings/billing',
  },
  {
    label: 'Shipping',
    href: '/dashboard/settings/shipping',
  },
  {
    label: 'Notifications',
    href: '/dashboard/settings/notifications',
  },
  {
    label: 'Marketing',
    href: '/dashboard/settings/marketing',
    active: true,
  },
]

function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 py-6 border-b border-[#E1E3E5] last:border-0'>
      <div>
        <h3 className='font-sora text-[14px] font-semibold text-[#202223]'>
          {title}
        </h3>
        {description && (
          <p className='text-[12.5px] text-[#6D7175] mt-1 leading-relaxed'>
            {description}
          </p>
        )}
      </div>
      <div className='space-y-4'>{children}</div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  icon?: React.ReactNode
}) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
        {label}
      </label>
      <div className='relative'>
        {icon && (
          <span className='absolute left-3.5 top-1/2 -translate-y-1/2'>
            {icon}
          </span>
        )}
        <input
          type={isPassword ? (showPass ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all font-mono ${icon ? 'pl-9 pr-3.5' : 'px-3.5'} ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPass(!showPass)}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9196] hover:text-[#6D7175] bg-transparent border-none cursor-pointer'
          >
            {showPass ? Icons.eyeOff : Icons.eye}
          </button>
        )}
      </div>
      {hint && <p className='text-[11.5px] text-[#6D7175] mt-1'>{hint}</p>}
    </div>
  )
}

interface Marketing {
  gaMeasurementId: string
  googleAdsId: string
  googleAdsConversionLabel: string
  facebookPixelId: string
  facebookAccessToken: string
  gtmId: string
  tiktokPixelId: string
  pinterestTagId: string
  snapchatPixelId: string
  microsoftUetId: string
  linkedinPartnerId: string
  clarityId: string
  hotjarId: string
  trackingEnabled: boolean
}

const EMPTY_MARKETING: Marketing = {
  gaMeasurementId: '',
  googleAdsId: '',
  googleAdsConversionLabel: '',
  facebookPixelId: '',
  facebookAccessToken: '',
  gtmId: '',
  tiktokPixelId: '',
  pinterestTagId: '',
  snapchatPixelId: '',
  microsoftUetId: '',
  linkedinPartnerId: '',
  clarityId: '',
  hotjarId: '',
  trackingEnabled: true,
}

export default function MarketingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [marketing, setMarketing] = useState<Marketing>(EMPTY_MARKETING)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/marketing-settings', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setStoreId(data.storeId)
            setMarketing((m) => ({
              ...m,
              ...data.marketing,
            }))
          }
        } else {
          toast.error('Failed to load marketing settings')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load marketing settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Store not loaded yet')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/marketing-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          storeId,
          marketing,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save marketing settings')
      }
      setSaved(true)
      toast.success('Marketing settings saved — live on your storefront now')
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save marketing settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Marketing &amp; Tracking
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Connect Google Analytics, Google Ads and Facebook Pixel — paste your
            keys below and they go live on your storefront automatically.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
        >
          {saving ? Icons.spinner : saved ? Icons.check : Icons.save}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {loading && (
        <div className='px-4 py-3 bg-[#F2F7F5] border border-[#008060]/20 rounded-lg text-[13px] text-[#008060]'>
          Loading marketing settings…
        </div>
      )}

      <div className='grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-5'>
        <div className='bg-white border border-[#E1E3E5] rounded-xl p-2 h-fit'>
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors ${item.active ? 'bg-[#F2F7F5] text-[#008060]' : 'text-[#6D7175] hover:bg-[#F6F6F7] hover:text-[#202223]'}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className='space-y-5'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl px-6 py-2'>
            <div className='py-4 border-b border-[#E1E3E5] flex items-center justify-between'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223] flex items-center gap-2'>
                <span className='text-[#6D7175]'>{Icons.megaphone}</span>{' '}
                Tracking Pixels
              </h2>
              <label className='flex items-center gap-2 text-[12.5px] font-medium text-[#202223] cursor-pointer select-none'>
                <span
                  onClick={() =>
                    setMarketing((m) => ({
                      ...m,
                      trackingEnabled: !m.trackingEnabled,
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${marketing.trackingEnabled ? 'bg-[#008060]' : 'bg-[#E1E3E5]'}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${marketing.trackingEnabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`}
                  />
                </span>
                {marketing.trackingEnabled ? 'Enabled' : 'Disabled'}
              </label>
            </div>

            <SettingSection
              title='Google Analytics (GA4)'
              description='Paste your GA4 Measurement ID — pageviews and cart/checkout events start flowing automatically, site-wide.'
            >
              <InputField
                label='GA4 Measurement ID'
                value={marketing.gaMeasurementId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    gaMeasurementId: v,
                  }))
                }
                placeholder='G-XXXXXXXXXX'
                icon={Icons.google}
              />
            </SettingSection>

            <SettingSection
              title='Google Ads'
              description='Paste your Google Ads Conversion ID and label to track purchases as conversions.'
            >
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Conversion ID'
                  value={marketing.googleAdsId}
                  onChange={(v) =>
                    setMarketing((m) => ({
                      ...m,
                      googleAdsId: v,
                    }))
                  }
                  placeholder='AW-XXXXXXXXX'
                  icon={Icons.google}
                />
                <InputField
                  label='Conversion Label'
                  value={marketing.googleAdsConversionLabel}
                  onChange={(v) =>
                    setMarketing((m) => ({
                      ...m,
                      googleAdsConversionLabel: v,
                    }))
                  }
                  placeholder='AbCdEfGhIjK123'
                  hint="Found under Google Ads > Goals > Conversions > your action > 'Tag setup'"
                />
              </div>
            </SettingSection>

            <SettingSection
              title='Facebook / Meta Pixel'
              description='Paste your Pixel ID to track PageView, AddToCart, InitiateCheckout and Purchase events.'
            >
              <InputField
                label='Pixel ID'
                value={marketing.facebookPixelId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    facebookPixelId: v,
                  }))
                }
                placeholder='1234567890123456'
                icon={Icons.facebook}
              />
              <InputField
                label='Conversions API Access Token (optional)'
                value={marketing.facebookAccessToken}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    facebookAccessToken: v,
                  }))
                }
                type='password'
                placeholder='EAAxxxxxxxxxxxx'
                hint='Only needed for server-side (Conversions API) tracking — kept private, never sent to the browser.'
              />
            </SettingSection>

            <SettingSection
              title='Google Tag Manager'
              description='If you manage tags through GTM, paste your container ID — it loads before everything else so your GTM tags stay in control.'
            >
              <InputField
                label='GTM Container ID'
                value={marketing.gtmId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    gtmId: v,
                  }))
                }
                placeholder='GTM-XXXXXXX'
                icon={Icons.gtm}
              />
            </SettingSection>

            <SettingSection
              title='TikTok Pixel'
              description='Paste your TikTok Pixel ID to track pageviews and shopping events for TikTok Ads.'
            >
              <InputField
                label='Pixel ID'
                value={marketing.tiktokPixelId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    tiktokPixelId: v,
                  }))
                }
                placeholder='C4A1B2C3D4E5F6G7H8I9'
                icon={Icons.tiktok}
              />
            </SettingSection>

            <SettingSection
              title='Pinterest Tag'
              description='Paste your Pinterest Tag ID to track pageviews and conversions from Pinterest Ads.'
            >
              <InputField
                label='Tag ID'
                value={marketing.pinterestTagId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    pinterestTagId: v,
                  }))
                }
                placeholder='2612345678901'
                icon={Icons.pinterest}
              />
            </SettingSection>

            <SettingSection
              title='Snapchat Pixel'
              description='Paste your Snap Pixel ID to track pageviews and conversions from Snapchat Ads.'
            >
              <InputField
                label='Pixel ID'
                value={marketing.snapchatPixelId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    snapchatPixelId: v,
                  }))
                }
                placeholder='a1b2c3d4-e5f6-7890-abcd-ef1234567890'
                icon={Icons.snapchat}
              />
            </SettingSection>

            <SettingSection
              title='Microsoft Ads (UET Tag)'
              description='Paste your UET Tag ID to track conversions from Bing/Microsoft Ads.'
            >
              <InputField
                label='UET Tag ID'
                value={marketing.microsoftUetId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    microsoftUetId: v,
                  }))
                }
                placeholder='12345678'
                icon={Icons.microsoft}
              />
            </SettingSection>

            <SettingSection
              title='LinkedIn Insight Tag'
              description='Paste your LinkedIn Partner ID to track conversions from LinkedIn Ads.'
            >
              <InputField
                label='Partner ID'
                value={marketing.linkedinPartnerId}
                onChange={(v) =>
                  setMarketing((m) => ({
                    ...m,
                    linkedinPartnerId: v,
                  }))
                }
                placeholder='1234567'
                icon={Icons.linkedin}
              />
            </SettingSection>

            <SettingSection
              title='Microsoft Clarity / Hotjar'
              description='Heatmaps and session recordings, not ad tracking — but usually set up alongside the rest. Fill in either or both.'
            >
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Clarity Project ID'
                  value={marketing.clarityId}
                  onChange={(v) =>
                    setMarketing((m) => ({
                      ...m,
                      clarityId: v,
                    }))
                  }
                  placeholder='abcd1234ef'
                  icon={Icons.clarity}
                />
                <InputField
                  label='Hotjar Site ID'
                  value={marketing.hotjarId}
                  onChange={(v) =>
                    setMarketing((m) => ({
                      ...m,
                      hotjarId: v,
                    }))
                  }
                  placeholder='1234567'
                  icon={Icons.clarity}
                />
              </div>
            </SettingSection>
          </div>

          <div className='bg-white border border-[#E1E3E5] rounded-xl px-6 py-5'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-2'>
              How this works
            </h3>
            <ul className='text-[12.5px] text-[#6D7175] leading-relaxed list-disc pl-4 space-y-1'>
              <li>
                Save a key here and it&apos;s live on your storefront within a
                few minutes — no code changes or redeploy needed.
              </li>
              <li>
                Leave a field blank to skip that pixel; only the ones you fill
                in get loaded.
              </li>
              <li>
                Turn the toggle off any time to pause all tracking without
                deleting your saved keys.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
