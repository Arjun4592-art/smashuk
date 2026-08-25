'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
const Icons = {
  truck: (
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
      <rect x='1' y='3' width='15' height='13' />
      <polygon points='16 8 20 8 23 11 23 16 16 16 16 8' />
      <circle cx='5.5' cy='18.5' r='2.5' />
      <circle cx='18.5' cy='18.5' r='2.5' />
    </svg>
  ),
  plus: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <line x1='12' y1='5' x2='12' y2='19' />
      <line x1='5' y1='12' x2='19' y2='12' />
    </svg>
  ),
  edit: (
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
      <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>
  ),
  trash: (
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
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
      <path d='M10 11v6M14 11v6' />
      <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
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
  close: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <line x1='18' y1='6' x2='6' y2='18' />
      <line x1='6' y1='6' x2='18' y2='18' />
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
    active: true,
  },
  {
    label: 'Notifications',
    href: '/dashboard/settings/notifications',
  },
  {
    label: 'Marketing',
    href: '/dashboard/settings/marketing',
  },
]
const COUNTRY_OPTIONS = [
  {
    code: 'gb',
    label: 'United Kingdom',
  },
  {
    code: 'ie',
    label: 'Ireland',
  },
  {
    code: 'fr',
    label: 'France',
  },
  {
    code: 'de',
    label: 'Germany',
  },
  {
    code: 'es',
    label: 'Spain',
  },
  {
    code: 'it',
    label: 'Italy',
  },
  {
    code: 'nl',
    label: 'Netherlands',
  },
  {
    code: 'be',
    label: 'Belgium',
  },
  {
    code: 'pt',
    label: 'Portugal',
  },
  {
    code: 'dk',
    label: 'Denmark',
  },
  {
    code: 'se',
    label: 'Sweden',
  },
  {
    code: 'no',
    label: 'Norway',
  },
  {
    code: 'us',
    label: 'United States',
  },
  {
    code: 'ca',
    label: 'Canada',
  },
  {
    code: 'au',
    label: 'Australia',
  },
]
interface RateOption {
  id: string
  name: string
  price_type: 'flat' | 'calculated'
  amount: number | null
  hasPrice: boolean
  shipping_profile_id: string
  is_pickup: boolean
  provider_id?: string
  provider_label?: string
  provider_mismatch?: boolean
}
interface RealZone {
  id: string
  name: string
  fulfillment_set_name: string | null
  options: RateOption[]
}
interface FulfillmentSet {
  id: string
  name: string
  service_zones: {
    id: string
    name: string
  }[]
}
export default function ShippingPage() {
  const [zones, setZones] = useState<RealZone[]>([])
  const [fulfillmentSets, setFulfillmentSets] = useState<FulfillmentSet[]>([])
  const [shippingProfiles, setShippingProfiles] = useState<
    {
      id: string
      name: string
      type: string
    }[]
  >([])
  const [loadingZones, setLoadingZones] = useState(true)
  const [zonesError, setZonesError] = useState<string | null>(null)
  const [royalMailProviderId, setRoyalMailProviderId] = useState<string | null>(
    null,
  )
  const [fixingRateId, setFixingRateId] = useState<string | null>(null)
  const [rateModalZoneId, setRateModalZoneId] = useState<string | null>(null)
  const [rateName, setRateName] = useState('')
  const [ratePrice, setRatePrice] = useState('')
  const [rateIsPickup, setRateIsPickup] = useState(false)
  const [savingRate, setSavingRate] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneCountries, setNewZoneCountries] = useState<string[]>([])
  const [savingZone, setSavingZone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('80')
  const [defaultWeight, setDefaultWeight] = useState('500')
  const [packagingFee, setPackagingFee] = useState('0')
  const [codSettings, setCodSettings] = useState<Record<string, boolean>>({
    cod: true,
    codFee: false,
    codLimit: true,
  })
  const loadZones = useCallback(async () => {
    setLoadingZones(true)
    setZonesError(null)
    try {
      const [zoneRes, optionsRes] = await Promise.all([
        fetch('/api/admin/shipping-zones'),
        fetch('/api/admin/shipping-options'),
      ])
      const zoneData = await zoneRes.json()
      const optionsData = await optionsRes.json()
      if (!zoneRes.ok)
        throw new Error(zoneData.error ?? 'Failed to load shipping zones')
      if (!optionsRes.ok)
        throw new Error(optionsData.error ?? 'Failed to load shipping options')
      const sets: FulfillmentSet[] = (zoneData.locations ?? []).flatMap(
        (loc: any) => loc.fulfillment_sets ?? [],
      )
      setFulfillmentSets(sets)
      setShippingProfiles(zoneData.shipping_profiles ?? [])
      setRoyalMailProviderId(optionsData.royal_mail_provider_id ?? null)
      const optionZonesById = new Map<string, RealZone>(
        (optionsData.zones ?? []).map((z: any) => [z.id, z]),
      )
      const merged: RealZone[] = sets.flatMap((set) =>
        set.service_zones.map((sz) => {
          const withRates = optionZonesById.get(sz.id)
          return {
            id: sz.id,
            name: sz.name,
            fulfillment_set_name: set.name,
            options: withRates?.options ?? [],
          }
        }),
      )
      setZones(merged)
    } catch (err: any) {
      setZonesError(err.message ?? 'Could not load shipping zones')
    } finally {
      setLoadingZones(false)
    }
  }, [])
  useEffect(() => {
    loadZones()
    fetch('/api/admin/shipping-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.freeShippingThreshold)
          setFreeShippingThreshold(data.freeShippingThreshold)
        if (data.defaultWeight) setDefaultWeight(data.defaultWeight)
        if (data.packagingFee !== undefined) setPackagingFee(data.packagingFee)
        if (data.codSettings) setCodSettings(data.codSettings)
      })
      .catch(() => {})
  }, [loadZones])
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/shipping-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          freeShippingThreshold,
          defaultWeight,
          packagingFee,
          codSettings,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save shipping settings')
    } finally {
      setSaving(false)
    }
  }
  const openRateModal = (zoneId: string) => {
    setRateModalZoneId(zoneId)
    setRateName('')
    setRatePrice('')
    setRateIsPickup(false)
  }
  const handleAddRate = async () => {
    if (!rateModalZoneId || !rateName.trim() || ratePrice === '') return
    const profile =
      shippingProfiles.find((p) => p.type === 'default') ?? shippingProfiles[0]
    if (!profile) {
      toast.error(
        'No shipping profile found for this store yet — set one up in Medusa Admin first.',
      )
      return
    }
    setSavingRate(true)
    try {
      const res = await fetch('/api/admin/shipping-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: rateName.trim(),
          amount: Number(ratePrice),
          service_zone_id: rateModalZoneId,
          shipping_profile_id: profile.id,
          is_pickup: rateIsPickup,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add rate')
      toast.success(`"${rateName.trim()}" added — live at checkout now`)
      setRateModalZoneId(null)
      await loadZones()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add rate')
    } finally {
      setSavingRate(false)
    }
  }
  const handleEditRate = async (rate: RateOption) => {
    const newName = window.prompt('Rate name', rate.name)
    if (newName === null) return
    const newPrice = window.prompt(
      'Price (£, 0 for free)',
      String(rate.amount ?? 0),
    )
    if (newPrice === null) return
    try {
      const res = await fetch(`/api/admin/shipping-options/${rate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          amount: Number(newPrice) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update rate')
      toast.success('Rate updated')
      await loadZones()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update rate')
    }
  }
  const handleDeleteRate = async (rate: RateOption) => {
    if (
      !window.confirm(
        `Remove "${rate.name}"? This removes it from checkout immediately.`,
      )
    )
      return
    try {
      const res = await fetch(`/api/admin/shipping-options/${rate.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete rate')
      toast.success('Rate removed')
      await loadZones()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete rate')
    }
  }
  const handleFixProvider = async (rate: RateOption) => {
    if (!royalMailProviderId) {
      toast.error(
        "Backend hasn't registered a Royal Mail provider yet — check medusa-config.ts / restart the backend first.",
      )
      return
    }
    setFixingRateId(rate.id)
    try {
      const res = await fetch(`/api/admin/shipping-options/${rate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider_id: royalMailProviderId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update provider')
      toast.success(`"${rate.name}" is now wired to Royal Mail Click & Drop`)
      await loadZones()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to fix provider')
    } finally {
      setFixingRateId(null)
    }
  }
  const handleAddZone = async () => {
    if (!newZoneName.trim() || newZoneCountries.length === 0) return
    const set = fulfillmentSets[0]
    if (!set) {
      toast.error(
        'No shipping fulfillment set found for this store yet — set one up in Medusa Admin first.',
      )
      return
    }
    setSavingZone(true)
    try {
      const res = await fetch('/api/admin/shipping-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newZoneName.trim(),
          fulfillment_set_id: set.id,
          country_codes: newZoneCountries,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add zone')
      toast.success(`Zone "${newZoneName.trim()}" created`)
      setShowZoneModal(false)
      setNewZoneName('')
      setNewZoneCountries([])
      await loadZones()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add zone')
    } finally {
      setSavingZone(false)
    }
  }
  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Shipping
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Configure shipping zones and rates — these are real checkout
            options, not a draft
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
        >
          {saving ? Icons.spinner : saved ? Icons.check : Icons.save}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save General Settings'}
        </button>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-5'>
        {}
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
          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 space-y-5'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223] flex items-center gap-2'>
              <span className='text-[#6D7175]'>{Icons.truck}</span> General
              Shipping Settings
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Free Shipping Threshold (£)
                </label>
                <div className='relative'>
                  <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175] text-[13px]'>
                    £
                  </span>
                  <input
                    type='number'
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
                <p className='text-[11.5px] text-[#6D7175] mt-1'>
                  Orders above this get free shipping
                </p>
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Default Package Weight (g)
                </label>
                <input
                  type='number'
                  value={defaultWeight}
                  onChange={(e) => setDefaultWeight(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
                <p className='text-[11.5px] text-[#6D7175] mt-1'>
                  Used when product weight is not set
                </p>
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Packaging Fee (£)
                </label>
                <div className='relative'>
                  <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175] text-[13px]'>
                    £
                  </span>
                  <input
                    type='number'
                    value={packagingFee}
                    onChange={(e) => setPackagingFee(e.target.value)}
                    className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
                <p className='text-[11.5px] text-[#6D7175] mt-1'>
                  Added to every order
                </p>
              </div>
            </div>
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
                Shipping Zones
              </h2>
              <button
                onClick={() => setShowZoneModal(true)}
                disabled={loadingZones || fulfillmentSets.length === 0}
                className='flex items-center gap-1.5 px-3 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[12.5px] font-medium text-[#202223] rounded-lg transition-colors cursor-pointer disabled:opacity-50'
              >
                {Icons.plus} Add Zone
              </button>
            </div>

            {loadingZones ? (
              <div className='p-6 text-[13px] text-[#6D7175] flex items-center gap-2'>
                {Icons.spinner} Loading zones from your store...
              </div>
            ) : zonesError ? (
              <div className='p-6 text-[13px] text-[#D82C0D]'>{zonesError}</div>
            ) : zones.length === 0 ? (
              <div className='p-6 text-[13px] text-[#6D7175]'>
                No shipping zones found yet. Set up a stock location and
                fulfillment set in Medusa Admin, then use "Add Zone" here.
              </div>
            ) : (
              <div className='divide-y divide-[#E1E3E5]'>
                {zones.map((zone) => (
                  <div key={zone.id} className='p-6'>
                    <div className='flex items-center justify-between mb-4'>
                      <div>
                        <h3 className='font-sora text-[14px] font-semibold text-[#202223]'>
                          {zone.name}
                        </h3>
                        {zone.fulfillment_set_name && (
                          <p className='text-[12px] text-[#6D7175] mt-0.5'>
                            {zone.fulfillment_set_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {}
                    <div className='space-y-2'>
                      {zone.options.length === 0 && (
                        <p className='text-[12.5px] text-[#6D7175]'>
                          No rates in this zone yet.
                        </p>
                      )}
                      {zone.options.map((rate) => (
                        <div
                          key={rate.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${rate.provider_mismatch || (rate.price_type !== 'calculated' && !rate.hasPrice) ? 'bg-[#FFF4F4] border-[#FED3D1]' : 'bg-[#F6F6F7] border-[#E1E3E5]'}`}
                        >
                          <div>
                            <p className='text-[13px] font-medium text-[#202223] flex items-center gap-1.5'>
                              {rate.is_pickup && (
                                <span title='Store pickup'>🏬</span>
                              )}
                              {rate.name}
                              {rate.provider_label && (
                                <span
                                  className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded ${rate.provider_mismatch ? 'bg-[#FED3D1] text-[#D82C0D]' : 'bg-[#E3F1DF] text-[#008060]'}`}
                                >
                                  {rate.provider_label}
                                </span>
                              )}
                            </p>
                            {rate.price_type === 'calculated' && (
                              <p className='text-[11.5px] text-[#6D7175]'>
                                Calculated at checkout
                              </p>
                            )}
                            {rate.price_type !== 'calculated' &&
                              !rate.hasPrice && (
                                <p className='text-[11.5px] text-[#D82C0D] font-medium'>
                                  ⚠ No GBP price set — checkout will fail on
                                  this rate. Click edit to fix.
                                </p>
                              )}
                            {rate.provider_mismatch && (
                              <p className='text-[11.5px] text-[#D82C0D] font-medium'>
                                ⚠ Wired to the wrong fulfillment provider —
                                orders marked "Fulfilled" on this rate won't
                                reach Royal Mail's Click & Drop dashboard.
                              </p>
                            )}
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[13px] font-semibold text-[#202223]'>
                              {rate.price_type === 'calculated'
                                ? '—'
                                : !rate.hasPrice
                                  ? 'No price'
                                  : rate.amount === 0
                                    ? 'FREE'
                                    : `£${rate.amount}`}
                            </span>
                            {rate.provider_mismatch && (
                              <button
                                onClick={() => handleFixProvider(rate)}
                                disabled={fixingRateId === rate.id}
                                className='text-[11.5px] font-semibold text-[#D82C0D] border border-[#D82C0D] rounded px-2 py-1 bg-transparent cursor-pointer hover:bg-[#FED3D1] disabled:opacity-50'
                              >
                                {fixingRateId === rate.id
                                  ? 'Fixing…'
                                  : 'Fix provider'}
                              </button>
                            )}
                            <button
                              onClick={() => handleEditRate(rate)}
                              className='w-6 h-6 flex items-center justify-center text-[#6D7175] hover:text-[#202223] bg-transparent border-none cursor-pointer'
                            >
                              {Icons.edit}
                            </button>
                            <button
                              onClick={() => handleDeleteRate(rate)}
                              className='w-6 h-6 flex items-center justify-center text-[#6D7175] hover:text-[#D82C0D] bg-transparent border-none cursor-pointer'
                            >
                              {Icons.trash}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => openRateModal(zone.id)}
                        className='flex items-center gap-1.5 text-[12.5px] text-[#008060] hover:text-[#006e52] bg-transparent border-none cursor-pointer transition-colors mt-1'
                      >
                        {Icons.plus} Add rate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 space-y-4'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
              Cash on Delivery (COD)
            </h2>
            <div className='space-y-3'>
              {[
                {
                  label: 'Enable COD',
                  desc: 'Allow customers to pay on delivery',
                  key: 'cod',
                },
                {
                  label: 'COD fee',
                  desc: 'Charge extra for COD orders',
                  key: 'codFee',
                },
                {
                  label: 'COD availability',
                  desc: 'Only for orders below £5,000',
                  key: 'codLimit',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className='flex items-center justify-between p-3 border border-[#E1E3E5] rounded-lg'
                >
                  <div>
                    <p className='text-[13px] font-medium text-[#202223]'>
                      {item.label}
                    </p>
                    <p className='text-[11.5px] text-[#6D7175]'>{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setCodSettings((s) => ({
                        ...s,
                        [item.key]: !s[item.key],
                      }))
                    }
                    className='relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer'
                    style={{
                      background: codSettings[item.key] ? '#008060' : '#C9CCCF',
                    }}
                  >
                    <span
                      className='absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all'
                      style={{
                        left: codSettings[item.key] ? '22px' : '2px',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {}
      {rateModalZoneId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            onClick={() => setRateModalZoneId(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-100 overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Add Shipping Rate
              </h2>
              <button
                onClick={() => setRateModalZoneId(null)}
                className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'
              >
                {Icons.close}
              </button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Rate Name
                </label>
                <input
                  type='text'
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                  placeholder='e.g. Royal Mail Tracked 24'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Price (£, 0 for free)
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={ratePrice}
                  onChange={(e) => setRatePrice(e.target.value)}
                  placeholder='4.99'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
              <label className='flex items-start gap-2.5 p-3 border border-[#E1E3E5] rounded-lg cursor-pointer hover:bg-[#F6F6F7] transition-colors'>
                <input
                  type='checkbox'
                  checked={rateIsPickup}
                  onChange={(e) => setRateIsPickup(e.target.checked)}
                  className='accent-[#008060] w-3.5 h-3.5 mt-0.5'
                />
                <span>
                  <span className='block text-[13px] font-medium text-[#202223]'>
                    🏬 This is a store pickup rate
                  </span>
                  <span className='block text-[11.5px] text-[#6D7175] mt-0.5'>
                    Marks it "in-store only" so it shows up correctly at
                    checkout as a collection option, not home delivery.
                  </span>
                </span>
              </label>
            </div>
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E1E3E5] bg-[#F6F6F7]/50'>
              <button
                onClick={() => setRateModalZoneId(null)}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleAddRate}
                disabled={!rateName.trim() || ratePrice === '' || savingRate}
                className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50'
              >
                {savingRate && Icons.spinner}
                {savingRate ? 'Adding...' : 'Add Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showZoneModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            onClick={() => setShowZoneModal(false)}
          />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-120 overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Add Shipping Zone
              </h2>
              <button
                onClick={() => setShowZoneModal(false)}
                className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'
              >
                {Icons.close}
              </button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Zone Name
                </label>
                <input
                  type='text'
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder='e.g. Europe'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-2'>
                  Countries
                </label>
                <div className='grid grid-cols-3 gap-2 max-h-50 overflow-y-auto'>
                  {COUNTRY_OPTIONS.map((country) => (
                    <label
                      key={country.code}
                      className='flex items-center gap-2 cursor-pointer text-[12.5px] text-[#202223] p-2 border border-[#E1E3E5] rounded-lg hover:bg-[#F6F6F7] transition-colors'
                    >
                      <input
                        type='checkbox'
                        checked={newZoneCountries.includes(country.code)}
                        onChange={(e) =>
                          setNewZoneCountries((prev) =>
                            e.target.checked
                              ? [...prev, country.code]
                              : prev.filter((c) => c !== country.code),
                          )
                        }
                        className='accent-[#008060] w-3.5 h-3.5'
                      />
                      {country.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E1E3E5] bg-[#F6F6F7]/50'>
              <button
                onClick={() => setShowZoneModal(false)}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleAddZone}
                disabled={
                  !newZoneName.trim() ||
                  newZoneCountries.length === 0 ||
                  savingZone
                }
                className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50'
              >
                {savingZone && Icons.spinner}
                {savingZone ? 'Adding...' : 'Add Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
