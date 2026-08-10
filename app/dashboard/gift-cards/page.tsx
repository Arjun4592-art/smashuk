'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// Manages individually-issued gift card codes (manual issue, e.g. a
// goodwill/refund gift card, plus ones auto-created when a customer buys
// the sellable Gift Card product). Denominations for that sellable
// product are just its variants — edit those from
// app/dashboard/products/[id] like any other product, no separate UI
// needed for that part.

interface GiftCard {
  id: string
  status: 'pending' | 'redeemed'
  code: string
  value: number
  currency_code: string
  expires_at: string | null
  reference: string | null
  note: string | null
  created_at: string
}

function authHeaders() {
  return { 'Content-Type': 'application/json' }
}

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

const emptyForm = {
  value: '',
  code: '',
  expires_at: '',
  note: '',
}

// ─── Icons ───────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}
function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M18 6L6 18M6 6l12 12' />
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
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
        d='M4 12a8 8 0 0 1 8-8v8H4z'
      />
    </svg>
  )
}
function GiftIcon() {
  return (
    <svg
      width='32'
      height='32'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#C4C8CC'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='3' y='8' width='18' height='4' />
      <path d='M12 8v13M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7' />
      <path d='M7.5 8a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 1 1 0 5' />
    </svg>
  )
}

function StatusPill({ status }: { status: GiftCard['status'] }) {
  const isRedeemed = status === 'redeemed'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        isRedeemed ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'
      }`}
    >
      {isRedeemed ? 'Redeemed' : 'Active'}
    </span>
  )
}

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'redeemed'
  >('all')

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/gift-cards?${params}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load gift cards')
      setGiftCards(data.gift_cards ?? [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load gift cards')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 300) // debounce search
    return () => clearTimeout(t)
  }, [load])

  const handleCreate = async () => {
    if (!form.value || Number(form.value) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          value: Number(form.value),
          code: form.code || undefined,
          expires_at: form.expires_at || undefined,
          note: form.note || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to issue gift card')
      toast.success(`Gift card ${data.gift_card?.code ?? ''} issued`)
      setShowModal(false)
      setForm(emptyForm)
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to issue gift card')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = giftCards.filter((g) => g.status === 'pending').length
  const activeValue = giftCards
    .filter((g) => g.status === 'pending')
    .reduce((s, g) => s + g.value, 0)

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-[#0A1F44]'>Gift Cards</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Manually issued gift cards, plus ones customers bought at
            /gift-cards. Denominations for the sellable product are edited on
            its Product page.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className='flex items-center gap-2 bg-[#0A1F44] hover:bg-[#E8553A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors'
        >
          <PlusIcon /> Issue Gift Card
        </button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-3 gap-4 mb-6'>
        <div className='bg-white border border-[#E1E3E5] rounded-2xl p-4'>
          <p className='text-xs text-gray-500'>Active gift cards</p>
          <p className='text-2xl font-bold text-[#0A1F44] mt-1'>
            {activeCount}
          </p>
        </div>
        <div className='bg-white border border-[#E1E3E5] rounded-2xl p-4'>
          <p className='text-xs text-gray-500'>Active value outstanding</p>
          <p className='text-2xl font-bold text-[#0A1F44] mt-1'>
            {formatGBP(activeValue)}
          </p>
        </div>
        <div className='bg-white border border-[#E1E3E5] rounded-2xl p-4'>
          <p className='text-xs text-gray-500'>Total gift cards</p>
          <p className='text-2xl font-bold text-[#0A1F44] mt-1'>
            {giftCards.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex gap-3 mb-4'>
        <input
          type='text'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by code…'
          className='flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A]'
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A]'
        >
          <option value='all'>All statuses</option>
          <option value='pending'>Active</option>
          <option value='redeemed'>Redeemed</option>
        </select>
      </div>

      {/* Table */}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden'>
        {loading ? (
          <div className='p-12 flex justify-center'>
            <SpinnerIcon />
          </div>
        ) : giftCards.length === 0 ? (
          <div className='p-12 flex flex-col items-center gap-3 text-center'>
            <GiftIcon />
            <p className='text-gray-500 text-sm'>No gift cards yet</p>
          </div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-[#E1E3E5] text-left text-xs text-gray-500 uppercase'>
                <th className='px-4 py-3'>Code</th>
                <th className='px-4 py-3'>Value</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>Source</th>
                <th className='px-4 py-3'>Note</th>
                <th className='px-4 py-3'>Issued</th>
              </tr>
            </thead>
            <tbody>
              {giftCards.map((gc) => (
                <tr
                  key={gc.id}
                  className='border-b border-gray-50 hover:bg-gray-50/50'
                >
                  <td className='px-4 py-3 font-mono font-semibold text-[#0A1F44]'>
                    {gc.code}
                  </td>
                  <td className='px-4 py-3 font-semibold'>
                    {formatGBP(gc.value)}
                  </td>
                  <td className='px-4 py-3'>
                    <StatusPill status={gc.status} />
                  </td>
                  <td className='px-4 py-3 text-gray-500'>
                    {gc.reference === 'order' ? 'Purchased' : 'Manual issue'}
                  </td>
                  <td className='px-4 py-3 text-gray-500'>{gc.note ?? '—'}</td>
                  <td className='px-4 py-3 text-gray-500'>
                    {new Date(gc.created_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Issue modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-bold text-[#0A1F44]'>
                Issue Gift Card
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <CloseIcon />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='text-xs font-semibold text-gray-500 uppercase'>
                  Amount (£)
                </label>
                <input
                  type='number'
                  min='1'
                  step='0.01'
                  value={form.value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value: e.target.value }))
                  }
                  placeholder='50.00'
                  className='w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A]'
                />
              </div>
              <div>
                <label className='text-xs font-semibold text-gray-500 uppercase'>
                  Code (optional — auto-generated if left blank)
                </label>
                <input
                  type='text'
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder='e.g. THANKYOU25'
                  className='w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] font-mono'
                />
              </div>
              <div>
                <label className='text-xs font-semibold text-gray-500 uppercase'>
                  Expires (optional)
                </label>
                <input
                  type='date'
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expires_at: e.target.value }))
                  }
                  className='w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A]'
                />
              </div>
              <div>
                <label className='text-xs font-semibold text-gray-500 uppercase'>
                  Note (optional — internal only)
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder='e.g. Goodwill gesture — delayed order #482'
                  rows={2}
                  className='w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] resize-none'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setShowModal(false)}
                className='flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className='flex-1 bg-[#0A1F44] hover:bg-[#E8553A] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2'
              >
                {saving && <SpinnerIcon />}
                {saving ? 'Issuing…' : 'Issue Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
