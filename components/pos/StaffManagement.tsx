'use client'
import { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// This modal used to run entirely on local mock data (usePOSStore's
// staffList — seeded with fake names like Ramesh/Amit/Suresh). PIN changes
// made here had zero effect on real login, and the dashboard's staff list
// showed something completely different. It now talks to the same
// Medusa-backed /api/admin/staff API the dashboard uses, so both surfaces
// share one source of truth.
//
// Only reachable by POS managers (role 'admin') — see POSMoreDrawer.tsx and
// middleware.ts, which block cashiers from /api/admin/staff entirely.
// ─────────────────────────────────────────────────────────────────────────────

type StaffRole = 'admin' | 'staff'

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: StaffRole
  shift: string
  isActive: boolean
  initials: string
  totalSales: number
  totalOrders: number
}

interface Props {
  onClose: () => void
}

const ROLES: { value: StaffRole; label: string; color: string; bg: string }[] =
  [
    { value: 'admin', label: 'Manager', color: '#B7791F', bg: '#FFF3CD' },
    { value: 'staff', label: 'Cashier', color: '#008060', bg: '#E3F1EB' },
  ]

const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Full day', 'Custom']

const EMPTY_FORM = {
  name: '',
  initials: '',
  email: '',
  phone: '',
  role: 'staff' as StaffRole,
  pin: '',
  shift: 'Morning',
  isActive: true,
}

export default function StaffManagement({ onClose }: Props) {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<'list' | 'add' | 'edit' | 'pin'>('list')
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [search, setSearch] = useState('')

  // ── Load real staff from Medusa ───────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/staff', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load staff')
      setStaffList(data.staff ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    fetchStaff()
  }, [fetchStaff])

  const filtered = staffList.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()),
  )

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setView('add')
  }

  const openEdit = (staff: StaffMember) => {
    setSelected(staff)
    setForm({
      name: staff.name,
      initials: staff.initials,
      email: staff.email ?? '',
      phone: staff.phone ?? '',
      role: staff.role,
      pin: '',
      shift: staff.shift ?? 'Morning',
      isActive: staff.isActive,
    })
    setView('edit')
  }

  const openPin = (staff: StaffMember) => {
    setSelected(staff)
    setNewPin('')
    setConfirmPin('')
    setPinError('')
    setView('pin')
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (view === 'add' && (form.pin.length !== 6 || !/^\d+$/.test(form.pin))) return
    setSaving(true)
    try {
      if (view === 'add') {
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            role: form.role,
            pin: form.pin,
            shift: form.shift,
            isActive: form.isActive,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to add staff')
      } else if (view === 'edit' && selected) {
        const res = await fetch(`/api/admin/staff/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            role: form.role,
            shift: form.shift,
            isActive: form.isActive,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to update staff')
      }
      await fetchStaff()
      setView('list')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePinChange = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be exactly 6 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: newPin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update PIN')
      setView('list')
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Failed to update PIN')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this staff member?')) return
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to remove staff')
      }
      await fetchStaff()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove staff')
    }
  }

  const roleInfo = (role: StaffRole) => ROLES.find((r) => r.value === role)!

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-lg rounded-xl overflow-hidden'
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
          <div className='flex items-center gap-2'>
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className='w-7 h-7 flex items-center justify-center rounded hover:bg-[#F6F6F7]'
                style={{ color: '#6D7175' }}
              >
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                  <polyline points='15 18 9 12 15 6' />
                </svg>
              </button>
            )}
            <h3 className='text-base font-semibold' style={{ color: '#202223' }}>
              {view === 'list'
                ? 'Staff management'
                : view === 'add'
                  ? 'Add staff member'
                  : view === 'edit'
                    ? 'Edit staff member'
                    : 'Change PIN'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]'
            style={{ color: '#6D7175' }}
          >
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {error && (
          <div className='mx-5 mt-3 px-3 py-2 rounded-lg text-xs' style={{ background: '#FFF4F4', color: '#D82C0D' }}>
            {error}
          </div>
        )}

        {/* ── List view ─────────────────────────────────────────────────── */}
        {view === 'list' && (
          <>
            <div className='px-5 pt-4 pb-2 flex gap-2'>
              <div className='flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border' style={{ borderColor: '#E1E3E5' }}>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2' strokeLinecap='round'>
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search staff...'
                  className='flex-1 bg-transparent outline-none text-sm'
                  style={{ color: '#202223' }}
                />
              </div>
              <button
                onClick={openAdd}
                className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium'
                style={{ background: '#008060', color: '#FFFFFF' }}
              >
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                  <line x1='12' y1='5' x2='12' y2='19' />
                  <line x1='5' y1='12' x2='19' y2='12' />
                </svg>
                Add staff
              </button>
            </div>

            <div className='overflow-y-auto' style={{ maxHeight: 400 }}>
              {loading ? (
                <div className='py-8 flex justify-center'>
                  <div className='w-6 h-6 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
                </div>
              ) : filtered.length === 0 ? (
                <p className='text-sm text-center py-8' style={{ color: '#8C9196' }}>
                  No staff found.
                </p>
              ) : (
                filtered.map((staff) => {
                  const role = roleInfo(staff.role)
                  return (
                    <div
                      key={staff.id}
                      className='flex items-center gap-3 px-5 py-3 hover:bg-[#F6F6F7] transition-colors'
                      style={{ borderBottom: '1px solid #F6F6F7' }}
                    >
                      <div
                        className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                        style={{ background: role.bg, color: role.color }}
                      >
                        {staff.initials}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-0.5'>
                          <p className='text-sm font-medium' style={{ color: '#202223' }}>
                            {staff.name}
                          </p>
                          <span className='text-[10px] px-1.5 py-0.5 rounded-full font-medium' style={{ background: role.bg, color: role.color }}>
                            {role.label}
                          </span>
                          {!staff.isActive && (
                            <span className='text-[10px] px-1.5 py-0.5 rounded-full font-medium' style={{ background: '#F6F6F7', color: '#8C9196' }}>
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className='text-xs' style={{ color: '#8C9196' }}>
                          {staff.shift || 'No shift set'} · £{(staff.totalSales ?? 0).toLocaleString('en-GB')} sales
                        </p>
                      </div>

                      <div className='flex items-center gap-1 shrink-0'>
                        <button
                          onClick={() => openPin(staff)}
                          className='px-2 py-1 rounded text-xs border transition-colors hover:border-[#008060] hover:text-[#008060]'
                          style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
                        >
                          PIN
                        </button>
                        <button
                          onClick={() => openEdit(staff)}
                          className='w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[#F6F6F7]'
                          style={{ color: '#6D7175' }}
                        >
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                            <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                            <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemove(staff.id)}
                          className='w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[#FFF4F4]'
                          style={{ color: '#8C9196' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#D82C0D')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#8C9196')}
                        >
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                            <polyline points='3 6 5 6 21 6' />
                            <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className='px-5 py-3' style={{ borderTop: '1px solid #E1E3E5', background: '#F6F6F7' }}>
              <div className='grid grid-cols-3 gap-3 text-center'>
                {[
                  { label: 'Total staff', value: staffList.length },
                  { label: 'Active', value: staffList.filter((s) => s.isActive).length },
                  { label: 'Managers', value: staffList.filter((s) => s.role === 'admin').length },
                ].map((s) => (
                  <div key={s.label}>
                    <p className='text-base font-semibold' style={{ color: '#202223' }}>{s.value}</p>
                    <p className='text-[11px]' style={{ color: '#8C9196' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Add / Edit form ────────────────────────────────────────────── */}
        {(view === 'add' || view === 'edit') && (
          <>
            <div className='p-5 space-y-3 overflow-y-auto' style={{ maxHeight: 440 }}>
              <div className='grid grid-cols-2 gap-3'>
                <div className='col-span-2'>
                  <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                    Full name *
                  </label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder='e.g. Rahul Sharma'
                    className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                    style={{ borderColor: '#E1E3E5', color: '#202223' }}
                  />
                </div>
                {view === 'add' && (
                  <div>
                    <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                      PIN * (6 digits)
                    </label>
                    <input
                      type='password'
                      value={form.pin}
                      onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder='••••••'
                      maxLength={6}
                      className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                      style={{ borderColor: '#E1E3E5', color: '#202223' }}
                    />
                  </div>
                )}
                <div>
                  <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder='+44 7700 900000'
                    className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                    style={{ borderColor: '#E1E3E5', color: '#202223' }}
                  />
                </div>
                <div>
                  <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder='staff@smashuk.co.uk'
                    className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                    style={{ borderColor: '#E1E3E5', color: '#202223' }}
                  />
                </div>
                <div>
                  <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                    className='w-full px-3 py-2 rounded-lg border text-sm outline-none'
                    style={{ borderColor: '#E1E3E5', color: '#202223' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className='text-[10.5px] mt-1' style={{ color: '#8C9196' }}>
                    Only controls POS terminal permissions.
                  </p>
                </div>
                <div>
                  <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                    Shift
                  </label>
                  <select
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className='w-full px-3 py-2 rounded-lg border text-sm outline-none'
                    style={{ borderColor: '#E1E3E5', color: '#202223' }}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className='accent-[#008060]'
                />
                <span className='text-sm' style={{ color: '#6D7175' }}>Staff member is active</span>
              </label>
            </div>

            <div className='px-5 pb-5 flex gap-2' style={{ borderTop: '1px solid #E1E3E5', paddingTop: 12 }}>
              <button
                onClick={() => setView('list')}
                className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || (view === 'add' && form.pin.length !== 6)}
                className='flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50'
                style={{ background: '#008060', color: '#FFFFFF' }}
              >
                {saving ? 'Saving...' : view === 'add' ? 'Add staff member' : 'Save changes'}
              </button>
            </div>
          </>
        )}

        {/* ── Change PIN view ────────────────────────────────────────────── */}
        {view === 'pin' && selected && (
          <>
            <div className='p-5 space-y-3'>
              <div className='flex items-center gap-3 p-3 rounded-lg' style={{ background: '#F6F6F7' }}>
                <div
                  className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold'
                  style={{ background: roleInfo(selected.role).bg, color: roleInfo(selected.role).color }}
                >
                  {selected.initials}
                </div>
                <div>
                  <p className='text-sm font-medium' style={{ color: '#202223' }}>{selected.name}</p>
                  <p className='text-xs' style={{ color: '#8C9196' }}>{roleInfo(selected.role).label}</p>
                </div>
              </div>

              <div>
                <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                  New PIN (6 digits)
                </label>
                <input
                  autoFocus
                  type='password'
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setPinError('')
                  }}
                  placeholder='••••••'
                  maxLength={6}
                  className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                  style={{ borderColor: pinError ? '#D82C0D' : '#E1E3E5', color: '#202223' }}
                />
              </div>
              <div>
                <label className='text-[11px] font-medium uppercase tracking-wide block mb-1' style={{ color: '#6D7175' }}>
                  Confirm PIN
                </label>
                <input
                  type='password'
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setPinError('')
                  }}
                  placeholder='••••••'
                  maxLength={6}
                  className='w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#008060]'
                  style={{ borderColor: pinError ? '#D82C0D' : '#E1E3E5', color: '#202223' }}
                />
              </div>
              {pinError && <p className='text-xs' style={{ color: '#D82C0D' }}>{pinError}</p>}
            </div>

            <div className='px-5 pb-5 flex gap-2' style={{ borderTop: '1px solid #E1E3E5', paddingTop: 12 }}>
              <button
                onClick={() => setView('list')}
                className='flex-1 py-2.5 rounded-lg text-sm border hover:bg-[#F6F6F7]'
                style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePinChange}
                disabled={saving}
                className='flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50'
                style={{ background: '#008060', color: '#FFFFFF' }}
              >
                {saving ? 'Saving...' : 'Update PIN'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
