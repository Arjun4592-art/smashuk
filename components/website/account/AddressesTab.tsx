'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from '@/lib/api/store'
import { getVatDestination } from '@/lib/vat'
import type { CustomerAddress } from '@/types'
import { PlusIcon } from '@/components/ui/Icons'

export const ADDRESSES_QUERY_KEY = ['customer-addresses']

const LABELS = ['Home', 'Work', 'Other'] as const
type Label = (typeof LABELS)[number]

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i

type FormState = {
  full_name: string
  phone: string
  postal_code: string
  address_1: string
  address_2: string
  city: string
  province: string
  label: Label
  is_default: boolean
}

const EMPTY_FORM: FormState = {
  full_name: '',
  phone: '',
  postal_code: '',
  address_1: '',
  address_2: '',
  city: '',
  province: '',
  label: 'Home',
  is_default: false,
}

type FormErrors = Partial<Record<keyof FormState, string>>

function countryName(code?: string) {
  const c = (code ?? 'gb').toUpperCase()
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(c) ?? c
  } catch {
    return c
  }
}

function formatPostcode(raw: string) {
  const pc = raw.replace(/\s+/g, '').toUpperCase()
  if (pc.length < 5) return raw.toUpperCase()
  return `${pc.slice(0, -3)} ${pc.slice(-3)}`
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/)
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  }
}

function validate(f: FormState): FormErrors {
  const e: FormErrors = {}
  if (!f.full_name.trim()) e.full_name = 'Enter the recipient’s full name'
  const digits = f.phone.replace(/[^\d]/g, '')
  if (!f.phone.trim()) e.phone = 'Enter a phone number for the courier'
  else if (digits.length < 10 || digits.length > 15)
    e.phone = 'Enter a valid phone number (10–15 digits)'
  if (!f.postal_code.trim()) e.postal_code = 'Enter a postcode'
  else if (!UK_POSTCODE.test(f.postal_code.trim()))
    e.postal_code = 'Enter a valid UK postcode, e.g. SW1A 1AA'
  if (!f.address_1.trim()) e.address_1 = 'Enter address line 1'
  if (!f.city.trim()) e.city = 'Enter a town or city'
  return e
}

export default function AddressesTab() {
  const queryClient = useQueryClient()
  const {
    data: addresses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAddresses,
    retry: false,
  })

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null)

  const sorted = useMemo(
    () =>
      [...addresses].sort(
        (a, b) =>
          Number(!!b.is_default_shipping) - Number(!!a.is_default_shipping),
      ),
    [addresses],
  )

  const modalOpen = showForm || !!deleteTarget
  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setShowForm(false)
        setDeleteTarget(null)
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modalOpen, saving])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY })

  const openAdd = () => {
    setEditingId(null)
    setErrors({})
    setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 })
    setShowForm(true)
  }

  const openEdit = (addr: CustomerAddress) => {
    setEditingId(addr.id)
    setErrors({})
    const label = LABELS.find((l) => l === addr.address_name) ?? 'Other'
    setForm({
      full_name: `${addr.first_name ?? ''} ${addr.last_name ?? ''}`.trim(),
      phone: addr.phone ?? '',
      postal_code: addr.postal_code ?? '',
      address_1: addr.address_1 ?? '',
      address_2: addr.address_2 ?? '',
      city: addr.city ?? '',
      province: addr.province ?? '',
      label: addr.address_name ? label : 'Home',
      is_default: !!addr.is_default_shipping,
    })
    setShowForm(true)
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const postal_code = formatPostcode(form.postal_code.trim())
    const payload = {
      ...splitName(form.full_name),
      phone: form.phone.trim(),
      address_1: form.address_1.trim(),
      address_2: form.address_2.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code,
      // Same rule as checkout: Jersey / Guernsey postcodes are not "gb".
      country_code: getVatDestination(postal_code).countryCode,
      address_name: form.label,
      ...(form.is_default
        ? { is_default_shipping: true, is_default_billing: true }
        : {}),
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateAddress(editingId, payload)
        toast.success('Address updated')
      } else {
        await addAddress(payload as Omit<CustomerAddress, 'id'>)
        toast.success('Address saved')
      }
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (addr: CustomerAddress) => {
    setBusyId(addr.id)
    try {
      await updateAddress(addr.id, {
        is_default_shipping: true,
        is_default_billing: true,
      })
      toast.success('Default address updated')
      await refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update default address')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await deleteAddress(deleteTarget.id)
      toast.success('Address removed')
      setDeleteTarget(null)
      await refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove address')
    } finally {
      setBusyId(null)
    }
  }

  const inputClass = (hasError?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors font-lato ${
      hasError
        ? 'border-red-400 focus:border-red-500'
        : 'border-gray-200 focus:border-[#E8553A]'
    }`
  const labelClass =
    'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'

  const sessionProblem =
    (error as Error | null)?.message === 'Unauthorized' ||
    (error as Error | null)?.message === 'Failed to load addresses'

  return (
    <div className='bg-white rounded-2xl border border-gray-100 p-6'>
      <div className='mb-5'>
        <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
          Your Addresses
        </h2>
        <p className='text-sm text-gray-400 font-lato mt-1'>
          Save your delivery addresses for faster checkout. Your default address
          is pre-filled at checkout.
        </p>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {[0, 1].map((i) => (
            <div
              key={i}
              className='h-44 rounded-xl bg-gray-100 animate-pulse'
            />
          ))}
        </div>
      ) : error ? (
        <div className='text-center py-10'>
          <p className='font-montserrat font-bold text-[#0A1F44] mb-1'>
            We couldn&apos;t load your addresses
          </p>
          <p className='text-sm text-gray-500 font-lato mb-4'>
            {sessionProblem
              ? 'Your session needs refreshing. Please sign out and sign in again.'
              : 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className='bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2 rounded-full text-sm hover:bg-[#D4441F] transition-colors'
          >
            Try again
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {/* Add-new tile, like Amazon */}
          <button
            onClick={openAdd}
            className='min-h-44 border-2 border-dashed border-gray-200 hover:border-[#E8553A] hover:bg-[#E8553A]/5 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#E8553A] transition-colors'
          >
            <PlusIcon size={28} />
            <span className='font-montserrat font-bold text-sm'>
              Add address
            </span>
          </button>

          {sorted.map((addr) => {
            const isDefault = !!addr.is_default_shipping
            return (
              <div
                key={addr.id}
                className={`rounded-xl border flex flex-col overflow-hidden ${
                  isDefault ? 'border-[#E8553A]/40' : 'border-gray-100'
                }`}
              >
                {isDefault && (
                  <div className='bg-[#E8553A]/10 text-[#E8553A] text-[11px] font-montserrat font-bold uppercase tracking-wider px-4 py-1.5'>
                    Default
                  </div>
                )}
                <div className='p-4 flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <p className='font-montserrat font-bold text-sm text-[#0A1F44]'>
                      {addr.first_name} {addr.last_name}
                    </p>
                    {addr.address_name && (
                      <span className='text-[10px] font-montserrat font-bold uppercase tracking-wider bg-[#0A1F44]/5 text-[#0A1F44] rounded px-1.5 py-0.5'>
                        {addr.address_name}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                    {addr.address_1}
                    {addr.address_2 ? `, ${addr.address_2}` : ''}
                    <br />
                    {[addr.city, addr.province].filter(Boolean).join(', ')}
                    <br />
                    {addr.postal_code}
                    <br />
                    {countryName(addr.country_code)}
                    {addr.phone ? (
                      <>
                        <br />
                        Phone: {addr.phone}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className='flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-xs font-semibold font-lato'>
                  <button
                    onClick={() => openEdit(addr)}
                    className='text-[#E8553A] hover:underline'
                  >
                    Edit
                  </button>
                  <span className='text-gray-200'>|</span>
                  <button
                    onClick={() => setDeleteTarget(addr)}
                    className='text-red-500 hover:underline'
                  >
                    Remove
                  </button>
                  {!isDefault && (
                    <>
                      <span className='text-gray-200'>|</span>
                      <button
                        onClick={() => handleSetDefault(addr)}
                        disabled={busyId === addr.id}
                        className='text-[#0A1F44] hover:underline disabled:text-gray-300'
                      >
                        {busyId === addr.id ? 'Saving…' : 'Set as default'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div
          className='fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setShowForm(false)
          }}
        >
          <form
            onSubmit={handleSave}
            noValidate
            className='bg-white w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6'
          >
            <div className='flex items-center justify-between mb-5'>
              <h3 className='font-montserrat font-black text-lg text-[#0A1F44]'>
                {editingId ? 'Edit address' : 'Add a new address'}
              </h3>
              <button
                type='button'
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label='Close'
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'
              >
                ✕
              </button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='sm:col-span-2'>
                <label className={labelClass}>Full name *</label>
                <input
                  type='text'
                  autoComplete='name'
                  value={form.full_name}
                  onChange={(e) => setField('full_name', e.target.value)}
                  className={inputClass(errors.full_name)}
                />
                {errors.full_name && (
                  <p className='text-xs text-red-500 mt-1'>
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Phone number *</label>
                <input
                  type='tel'
                  autoComplete='tel'
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass(errors.phone)}
                />
                {errors.phone && (
                  <p className='text-xs text-red-500 mt-1'>{errors.phone}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Postcode *</label>
                <input
                  type='text'
                  autoComplete='postal-code'
                  value={form.postal_code}
                  onChange={(e) =>
                    setField('postal_code', e.target.value.toUpperCase())
                  }
                  className={inputClass(errors.postal_code)}
                />
                {errors.postal_code && (
                  <p className='text-xs text-red-500 mt-1'>
                    {errors.postal_code}
                  </p>
                )}
              </div>

              <div className='sm:col-span-2'>
                <label className={labelClass}>Address line 1 *</label>
                <input
                  type='text'
                  autoComplete='address-line1'
                  placeholder='House number and street name'
                  value={form.address_1}
                  onChange={(e) => setField('address_1', e.target.value)}
                  className={inputClass(errors.address_1)}
                />
                {errors.address_1 && (
                  <p className='text-xs text-red-500 mt-1'>
                    {errors.address_1}
                  </p>
                )}
              </div>

              <div className='sm:col-span-2'>
                <label className={labelClass}>Address line 2 (optional)</label>
                <input
                  type='text'
                  autoComplete='address-line2'
                  placeholder='Flat, building, landmark'
                  value={form.address_2}
                  onChange={(e) => setField('address_2', e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div>
                <label className={labelClass}>Town / City *</label>
                <input
                  type='text'
                  autoComplete='address-level2'
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className={inputClass(errors.city)}
                />
                {errors.city && (
                  <p className='text-xs text-red-500 mt-1'>{errors.city}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>County (optional)</label>
                <input
                  type='text'
                  autoComplete='address-level1'
                  value={form.province}
                  onChange={(e) => setField('province', e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className='sm:col-span-2'>
                <label className={labelClass}>Address type</label>
                <div className='flex gap-2'>
                  {LABELS.map((l) => (
                    <button
                      key={l}
                      type='button'
                      onClick={() => setField('label', l)}
                      className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold border transition-colors ${
                        form.label === l
                          ? 'bg-[#0A1F44] text-white border-[#0A1F44]'
                          : 'bg-white text-[#0A1F44] border-gray-200 hover:border-[#0A1F44]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <label className='sm:col-span-2 flex items-center gap-2 text-sm font-lato text-[#0A1F44] cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.is_default}
                  // The first address, or one that is already the default, can't
                  // be un-defaulted here: pick another address as default instead.
                  disabled={
                    addresses.length === 0 ||
                    !!addresses.find((a) => a.id === editingId)
                      ?.is_default_shipping
                  }
                  onChange={(e) => setField('is_default', e.target.checked)}
                  className='w-4 h-4 accent-[#E8553A]'
                />
                Make this my default address
              </label>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                type='submit'
                disabled={saving}
                className='bg-[#E8553A] hover:bg-[#D4441F] disabled:bg-gray-300 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'
              >
                {saving
                  ? 'Saving…'
                  : editingId
                    ? 'Update address'
                    : 'Save address'}
              </button>
              <button
                type='button'
                onClick={() => setShowForm(false)}
                disabled={saving}
                className='text-sm font-semibold text-gray-500 hover:text-gray-700 font-lato'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Remove confirmation */}
      {deleteTarget && (
        <div
          className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && busyId !== deleteTarget.id)
              setDeleteTarget(null)
          }}
        >
          <div className='bg-white w-full max-w-sm rounded-2xl p-6'>
            <h3 className='font-montserrat font-black text-lg text-[#0A1F44] mb-2'>
              Remove this address?
            </h3>
            <p className='text-sm text-gray-500 font-lato mb-5'>
              {deleteTarget.first_name} {deleteTarget.last_name},{' '}
              {deleteTarget.address_1}, {deleteTarget.postal_code}
            </p>
            <div className='flex gap-3'>
              <button
                onClick={handleDelete}
                disabled={busyId === deleteTarget.id}
                className='bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-montserrat font-bold px-5 py-2.5 rounded-full text-sm transition-colors'
              >
                {busyId === deleteTarget.id ? 'Removing…' : 'Remove'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={busyId === deleteTarget.id}
                className='text-sm font-semibold text-gray-500 hover:text-gray-700 font-lato'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
