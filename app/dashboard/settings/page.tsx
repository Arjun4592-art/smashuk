'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { TrashIcon, PlusIcon } from '@/components/ui/Icons'
import type { StringCatalogItem } from '@/lib/stringing-catalog-types'

// ─── SVG Icons ───────────────────────────────────────────────────
const Icons = {
  store: (
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
      <path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' />
      <polyline points='9 22 9 12 15 12 15 22' />
    </svg>
  ),
  user: (
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
      <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  ),
  mail: (
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
      <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
      <polyline points='22,6 12,13 2,6' />
    </svg>
  ),
  phone: (
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
      <path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' />
    </svg>
  ),
  globe: (
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
      <line x1='2' y1='12' x2='22' y2='12' />
      <path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' />
    </svg>
  ),
  map: (
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
      <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
      <circle cx='12' cy='10' r='3' />
    </svg>
  ),
  currency: (
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
      <line x1='12' y1='1' x2='12' y2='23' />
      <path d='M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />
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
  lock: (
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
      <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
      <path d='M7 11V7a5 5 0 0110 0v4' />
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
  warning: (
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
      <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
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
}

const SETTINGS_NAV = [
  { label: 'General', href: '/dashboard/settings', active: true },
  { label: 'Billing', href: '/dashboard/settings/billing' },
  { label: 'Shipping', href: '/dashboard/settings/shipping' },
  { label: 'Notifications', href: '/dashboard/settings/notifications' },
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
          <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175]'>
            {icon}
          </span>
        )}
        <input
          type={isPassword ? (showPass ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all ${icon ? 'pl-9 pr-3.5' : 'px-3.5'} ${isPassword ? 'pr-10' : ''}`}
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [storeId, setStoreId] = useState<string | null>(null)
  const [store, setStore] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    currency: 'GBP',
    timezone: 'Europe/London',
    weightUnit: 'kg',
    language: 'en',
  })

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  })

  const [accountId, setAccountId] = useState<string | null>(null)
  const [account, setAccount] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingAccount, setSavingAccount] = useState(false)
  const [seedingStringing, setSeedingStringing] = useState(false)

  // ── Stringing string catalog (which companies/strings are available) ──
  const [stringCatalog, setStringCatalog] = useState<StringCatalogItem[]>([])
  const [stringCatalogLoading, setStringCatalogLoading] = useState(true)
  const [savingStringCatalog, setSavingStringCatalog] = useState(false)
  const [stringCatalogSport, setStringCatalogSport] = useState<
    'badminton' | 'tennis' | 'squash'
  >('badminton')
  const [newString, setNewString] = useState({ brand: '', name: '' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/stringing-catalog', {
          credentials: 'include',
        })
        const data = await res.json()
        if (!cancelled && res.ok) setStringCatalog(data.items ?? [])
      } catch {
        // Leave list empty — the "Add String" form still works and the
        // next successful save will populate everything from scratch.
      } finally {
        if (!cancelled) setStringCatalogLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveStringCatalog = async (next: StringCatalogItem[]) => {
    setStringCatalog(next)
    setSavingStringCatalog(true)
    try {
      const res = await fetch('/api/admin/stringing-catalog', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setStringCatalog(data.items ?? next)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save string catalog')
    } finally {
      setSavingStringCatalog(false)
    }
  }

  const handleAddString = () => {
    const brand = newString.brand.trim()
    const name = newString.name.trim()
    if (!brand || !name) {
      toast.error('Enter both a company/brand and a string name.')
      return
    }
    const duplicate = stringCatalog.some(
      (s) =>
        s.sport === stringCatalogSport &&
        s.brand.toLowerCase() === brand.toLowerCase() &&
        s.name.toLowerCase() === name.toLowerCase(),
    )
    if (duplicate) {
      toast.error('That string is already in the catalog for this sport.')
      return
    }
    const item: StringCatalogItem = {
      id: `${stringCatalogSport}-${Date.now()}`,
      sport: stringCatalogSport,
      brand,
      name,
      available: true,
    }
    saveStringCatalog([...stringCatalog, item])
    setNewString({ brand: '', name: '' })
    toast.success(`Added "${brand} — ${name}" to the catalog.`)
  }

  const handleToggleString = (id: string) => {
    saveStringCatalog(
      stringCatalog.map((s) =>
        s.id === id ? { ...s, available: !s.available } : s,
      ),
    )
  }

  const handleDeleteString = (id: string) => {
    saveStringCatalog(stringCatalog.filter((s) => s.id !== id))
  }

  const handleSeedStringing = async () => {
    setSeedingStringing(true)
    try {
      const res = await fetch('/api/admin/services/seed-stringing', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Setup failed')

      const parts = []
      if (data.created?.length)
        parts.push(`Created: ${data.created.join(', ')}`)
      if (data.skipped?.length)
        parts.push(`Already set up: ${data.skipped.join(', ')}`)
      toast.success(parts.join(' · ') || 'Stringing services are set up.')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to set up stringing services')
    } finally {
      setSeedingStringing(false)
    }
  }

  // ── Load real data from Medusa ────────────────────────────────
  // BUG FIX: this page used to seed `store`/`address`/`account` with
  // hardcoded fake values and never fetched anything. Now it loads the
  // actual store (name + metadata) and the logged-in admin's own user
  // record on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [settingsRes, accountRes] = await Promise.all([
          fetch('/api/admin/general-settings', { credentials: 'include' }),
          fetch('/api/admin/account', { credentials: 'include' }),
        ])

        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (!cancelled) {
            setStoreId(data.storeId)
            setStore((s) => ({ ...s, ...data.store }))
            setAddress((a) => ({ ...a, ...data.address }))
          }
        } else {
          toast.error('Failed to load store settings')
        }

        if (accountRes.ok) {
          const data = await accountRes.json()
          if (!cancelled) {
            setAccountId(data.id)
            setAccount((a) => ({ ...a, name: data.name, email: data.email }))
          }
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load settings')
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
      const res = await fetch('/api/admin/general-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, store, address }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save settings')
      }
      setSaved(true)
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAccount = async () => {
    if (!accountId) return
    setSavingAccount(true)
    try {
      const res = await fetch('/api/admin/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: accountId,
          name: account.name,
          email: account.email,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update account')
      }
      toast.success('Account updated')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update account')
    } finally {
      setSavingAccount(false)
    }
  }

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Settings
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Manage your store configuration
          </p>
        </div>
        <button
          onClick={async () => {
            await Promise.all([handleSave(), handleSaveAccount()])
          }}
          disabled={saving || savingAccount || loading}
          className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
        >
          {saving || savingAccount
            ? Icons.spinner
            : saved
              ? Icons.check
              : Icons.save}
          {saving || savingAccount
            ? 'Saving...'
            : saved
              ? 'Saved!'
              : 'Save Changes'}
        </button>
      </div>

      {loading && (
        <div className='px-4 py-3 bg-[#F2F7F5] border border-[#008060]/20 rounded-lg text-[13px] text-[#008060]'>
          Loading store settings from Medusa…
        </div>
      )}

      <div className='grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-5'>
        {/* Sidebar nav */}
        <div className='bg-white border border-[#E1E3E5] rounded-xl p-2 h-fit'>
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors ${
                item.active
                  ? 'bg-[#F2F7F5] text-[#008060]'
                  : 'text-[#6D7175] hover:bg-[#F6F6F7] hover:text-[#202223]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Main content */}
        <div className='space-y-5'>
          {/* Store Details */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl px-6 py-2'>
            <div className='py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223] flex items-center gap-2'>
                <span className='text-[#6D7175]'>{Icons.store}</span> Store
                Details
              </h2>
            </div>

            <SettingSection
              title='Store Information'
              description='Basic details about your store shown to customers.'
            >
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Store Name'
                  value={store.name}
                  onChange={(v) => setStore((s) => ({ ...s, name: v }))}
                  placeholder='Smash Pro'
                />
                <InputField
                  label='Store Email'
                  value={store.email}
                  onChange={(v) => setStore((s) => ({ ...s, email: v }))}
                  type='email'
                  placeholder='admin@smashpro.co.uk'
                  icon={Icons.mail}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Phone Number'
                  value={store.phone}
                  onChange={(v) => setStore((s) => ({ ...s, phone: v }))}
                  placeholder='+44 20 7946 0958'
                  icon={Icons.phone}
                />
                <InputField
                  label='Website URL'
                  value={store.website}
                  onChange={(v) => setStore((s) => ({ ...s, website: v }))}
                  placeholder='https://smashpro.co.uk'
                  icon={Icons.globe}
                />
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Store Description
                </label>
                <textarea
                  value={store.description}
                  onChange={(e) =>
                    setStore((s) => ({ ...s, description: e.target.value }))
                  }
                  rows={3}
                  placeholder='Describe your store...'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
                />
              </div>
            </SettingSection>

            <SettingSection
              title='Store Address'
              description='Your physical store location used for shipping calculations.'
            >
              <InputField
                label='Address Line 1'
                value={address.line1}
                onChange={(v) => setAddress((a) => ({ ...a, line1: v }))}
                placeholder='Street address'
                icon={Icons.map}
              />
              <InputField
                label='Address Line 2'
                value={address.line2}
                onChange={(v) => setAddress((a) => ({ ...a, line2: v }))}
                placeholder='Apartment, suite, etc.'
              />
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='City'
                  value={address.city}
                  onChange={(v) => setAddress((a) => ({ ...a, city: v }))}
                  placeholder='London'
                />
                <InputField
                  label='County'
                  value={address.state}
                  onChange={(v) => setAddress((a) => ({ ...a, state: v }))}
                  placeholder='Greater London'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Postcode'
                  value={address.pincode}
                  onChange={(v) => setAddress((a) => ({ ...a, pincode: v }))}
                  placeholder='SW1A 1AA'
                />
                <InputField
                  label='Country'
                  value={address.country}
                  onChange={(v) => setAddress((a) => ({ ...a, country: v }))}
                  placeholder='United Kingdom'
                />
              </div>
            </SettingSection>

            <SettingSection
              title='Regional Settings'
              description='Currency, timezone and language preferences.'
            >
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Currency
                  </label>
                  <select
                    value={store.currency}
                    disabled
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#6D7175] bg-[#F6F6F7] outline-none cursor-not-allowed'
                  >
                    <option value='GBP'>GBP — British Pound (£)</option>
                    <option value='USD'>USD — US Dollar ($)</option>
                    <option value='EUR'>EUR — Euro (€)</option>
                  </select>
                  <p className='text-[11px] text-[#8C9196] mt-1'>
                    Set from your store’s default Medusa region — change it in
                    Medusa admin, not here.
                  </p>
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Timezone
                  </label>
                  <select
                    value={store.timezone}
                    onChange={(e) =>
                      setStore((s) => ({ ...s, timezone: e.target.value }))
                    }
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all cursor-pointer'
                  >
                    <option value='Europe/London'>
                      Europe/London (GMT/BST)
                    </option>
                    <option value='UTC'>UTC</option>
                    <option value='America/New_York'>
                      America/New_York (EST)
                    </option>
                    <option value='Asia/Kolkata'>
                      Asia/Kolkata (IST +5:30)
                    </option>
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Weight Unit
                  </label>
                  <select
                    value={store.weightUnit}
                    onChange={(e) =>
                      setStore((s) => ({ ...s, weightUnit: e.target.value }))
                    }
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all cursor-pointer'
                  >
                    <option value='kg'>Kilograms (kg)</option>
                    <option value='g'>Grams (g)</option>
                    <option value='lb'>Pounds (lb)</option>
                  </select>
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Language
                  </label>
                  <select
                    value={store.language}
                    onChange={(e) =>
                      setStore((s) => ({ ...s, language: e.target.value }))
                    }
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all cursor-pointer'
                  >
                    <option value='en'>English</option>
                    <option value='hi'>Hindi</option>
                  </select>
                </div>
              </div>
            </SettingSection>
          </div>

          {/* Store Services */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl px-6 py-2'>
            <div className='py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223] flex items-center gap-2'>
                <span className='text-[#6D7175]'>🛠️</span> Store Services
              </h2>
            </div>

            <SettingSection
              title='Stringing Booking Products'
              description='Creates the 3 bookable stringing services (Badminton £16, Tennis £22, Squash £22) as real Medusa products, so the booking form at /local-store/stringing can add them to cart and take payment via Stripe. Safe to click more than once — existing ones are skipped.'
            >
              <button
                onClick={handleSeedStringing}
                disabled={seedingStringing}
                className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
              >
                {seedingStringing ? Icons.spinner : Icons.check}
                {seedingStringing
                  ? 'Setting Up...'
                  : 'Set Up Stringing Services'}
              </button>
            </SettingSection>

            <SettingSection
              title='Stringing String Catalog'
              description='Which strings (by company) show as available on the /local-store/stringing booking form. Toggle a string off to hide it from customers without deleting it — e.g. temporarily out of stock.'
            >
              <div className='flex gap-2 mb-1'>
                {(['badminton', 'tennis', 'squash'] as const).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setStringCatalogSport(sp)}
                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold capitalize border transition-colors cursor-pointer ${
                      stringCatalogSport === sp
                        ? 'bg-[#008060] border-[#008060] text-white'
                        : 'bg-white border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7]'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>

              {stringCatalogLoading ? (
                <p className='text-[12.5px] text-[#6D7175]'>Loading catalog…</p>
              ) : (
                <>
                  <div className='border border-[#E1E3E5] rounded-lg overflow-hidden'>
                    {stringCatalog.filter((s) => s.sport === stringCatalogSport)
                      .length === 0 ? (
                      <p className='px-4 py-3 text-[12.5px] text-[#8C9196]'>
                        No strings added for {stringCatalogSport} yet.
                      </p>
                    ) : (
                      stringCatalog
                        .filter((s) => s.sport === stringCatalogSport)
                        .sort((a, b) => a.brand.localeCompare(b.brand))
                        .map((s, idx) => (
                          <div
                            key={s.id}
                            className={`flex items-center gap-3 px-4 py-2.5 ${
                              idx !== 0 ? 'border-t border-[#F1F2F3]' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleToggleString(s.id)}
                              disabled={savingStringCatalog}
                              title={
                                s.available
                                  ? 'Available — click to mark unavailable'
                                  : 'Unavailable — click to mark available'
                              }
                              className={`shrink-0 w-9 h-5 rounded-full relative transition-colors cursor-pointer disabled:opacity-50 ${
                                s.available ? 'bg-[#008060]' : 'bg-[#C9CCCF]'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                  s.available ? 'translate-x' : '-translate-x-4'
                                }`}
                              />
                            </button>
                            <div className='flex-1 min-w-0'>
                              <p className='text-[13px] font-medium text-[#202223] truncate'>
                                {s.brand} — {s.name}
                              </p>
                              <p
                                className={`text-[11px] font-medium ${
                                  s.available
                                    ? 'text-[#008060]'
                                    : 'text-[#D82C0D]'
                                }`}
                              >
                                {s.available
                                  ? 'Available'
                                  : 'Currently unavailable'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteString(s.id)}
                              disabled={savingStringCatalog}
                              title='Remove from catalog'
                              className='shrink-0 p-1.5 text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#FBEAE5] rounded-md transition-colors cursor-pointer disabled:opacity-50'
                            >
                              <TrashIcon size={15} />
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  <div className='flex items-end gap-2 pt-1'>
                    <div className='flex-1'>
                      <label className='block text-[11px] font-semibold text-[#6D7175] uppercase tracking-wide mb-1'>
                        Company / Brand
                      </label>
                      <input
                        type='text'
                        value={newString.brand}
                        onChange={(e) =>
                          setNewString((n) => ({ ...n, brand: e.target.value }))
                        }
                        placeholder='e.g. Yonex'
                        className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                      />
                    </div>
                    <div className='flex-1'>
                      <label className='block text-[11px] font-semibold text-[#6D7175] uppercase tracking-wide mb-1'>
                        String Name
                      </label>
                      <input
                        type='text'
                        value={newString.name}
                        onChange={(e) =>
                          setNewString((n) => ({ ...n, name: e.target.value }))
                        }
                        placeholder='e.g. BG 65'
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleAddString()
                        }
                        className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                      />
                    </div>
                    <button
                      onClick={handleAddString}
                      disabled={savingStringCatalog}
                      className='flex items-center gap-1.5 px-4 py-2 bg-[#202223] hover:bg-black text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer shrink-0'
                    >
                      <PlusIcon size={14} />
                      Add
                    </button>
                  </div>
                </>
              )}
            </SettingSection>
          </div>

          {/* Account Settings */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl px-6 py-2'>
            <div className='py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223] flex items-center gap-2'>
                <span className='text-[#6D7175]'>{Icons.user}</span> Account
              </h2>
            </div>

            <SettingSection
              title='Profile'
              description='Update your personal account information.'
            >
              <div className='flex items-center gap-4 mb-2'>
                <div className='w-16 h-16 rounded-full bg-[#008060] flex items-center justify-center text-white text-[22px] font-bold shrink-0'>
                  {(account.name || '?').charAt(0).toUpperCase()}
                </div>
                <button className='px-3 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[12.5px] font-medium text-[#202223] rounded-lg transition-colors cursor-pointer'>
                  Change Photo
                </button>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='Full Name'
                  value={account.name}
                  onChange={(v) => setAccount((a) => ({ ...a, name: v }))}
                  icon={Icons.user}
                />
                <InputField
                  label='Email'
                  value={account.email}
                  onChange={(v) => setAccount((a) => ({ ...a, email: v }))}
                  type='email'
                  icon={Icons.mail}
                />
              </div>
            </SettingSection>

            <SettingSection
              title='Change Password'
              description='Keep your account secure with a strong password.'
            >
              <InputField
                label='Current Password'
                value={account.currentPassword}
                onChange={(v) =>
                  setAccount((a) => ({ ...a, currentPassword: v }))
                }
                type='password'
                placeholder='••••••••'
              />
              <div className='grid grid-cols-2 gap-4'>
                <InputField
                  label='New Password'
                  value={account.newPassword}
                  onChange={(v) =>
                    setAccount((a) => ({ ...a, newPassword: v }))
                  }
                  type='password'
                  placeholder='••••••••'
                  hint='Min 8 characters'
                />
                <InputField
                  label='Confirm Password'
                  value={account.confirmPassword}
                  onChange={(v) =>
                    setAccount((a) => ({ ...a, confirmPassword: v }))
                  }
                  type='password'
                  placeholder='••••••••'
                />
              </div>
              <button
                onClick={() => {
                  if (
                    !account.newPassword ||
                    account.newPassword !== account.confirmPassword
                  ) {
                    toast.error('Enter matching new + confirm passwords first')
                    return
                  }
                  toast.info(
                    "Password changes for dashboard admins need a small Medusa-backend change (an email notification subscriber for the reset-password flow) — that lives in your separate Medusa server codebase, not this Next.js app, so it can't be wired from here. Ask whoever manages your Medusa backend to add it, or reset it directly from the Medusa admin database.",
                    { duration: 10000 },
                  )
                }}
                className='flex items-center gap-2 px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors cursor-pointer'
              >
                {Icons.lock} Update Password
              </button>
            </SettingSection>
          </div>

          {/* Danger Zone */}
          <div className='bg-white border border-[#D82C0D]/20 rounded-xl px-6 py-2'>
            <div className='py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#D82C0D] flex items-center gap-2'>
                <span>{Icons.warning}</span> Danger Zone
              </h2>
            </div>
            <SettingSection
              title='Delete Store'
              description='Permanently delete your store and all associated data. This action cannot be undone.'
            >
              <div className='p-4 bg-[#D82C0D]/5 border border-[#D82C0D]/15 rounded-lg'>
                <p className='text-[13px] text-[#202223] mb-3'>
                  Once you delete your store, there is no going back. All
                  products, orders, customers and data will be permanently
                  removed.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className='px-4 py-2 bg-[#D82C0D] hover:bg-[#be2209] text-white text-[13px] font-semibold rounded-lg transition-colors border-none cursor-pointer'
                >
                  Delete Store
                </button>
              </div>
            </SettingSection>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-100 p-6'>
            <div className='w-12 h-12 bg-[#D82C0D]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#D82C0D]'>
              {Icons.warning}
            </div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] text-center mb-2'>
              Delete Store?
            </h3>
            <p className='text-[13px] text-[#6D7175] text-center leading-relaxed mb-4'>
              This will permanently delete{' '}
              <strong className='text-[#202223]'>
                {store.name || 'your store'}
              </strong>{' '}
              and all its data. This action cannot be undone.
            </p>
            <input
              type='text'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${(store.name || 'your store').toUpperCase()}" to confirm`}
              className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#D82C0D] focus:ring-2 focus:ring-[#D82C0D]/15 transition-all mb-4'
            />
            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Deliberately NOT wired to an actual delete-everything API call.
                  // There's no single safe Medusa endpoint that wipes every
                  // product/order/customer/category — doing that from a UI
                  // button risks a catastrophic, irreversible mistake. Real
                  // store deletion should happen at the hosting/database level.
                  toast.info(
                    'Full store deletion needs to be done at the hosting/database level (not a single API call) — contact whoever manages your Medusa server/database to do this safely.',
                    { duration: 8000 },
                  )
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                disabled={
                  deleteConfirmText !==
                  (store.name || 'your store').toUpperCase()
                }
                className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#be2209] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors border-none cursor-pointer'
              >
                Delete Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
