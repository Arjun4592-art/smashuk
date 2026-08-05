'use client'
import { useState, useEffect } from 'react'
import { usePOSStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'

interface StaffMember {
  id: string
  name: string
  role: 'admin' | 'staff'
  isActive: boolean
}

type TerminalSettingKey =
  | 'soundOnScan'
  | 'autoPrintReceipt'
  | 'showStockCount'
  | 'taxInclusivePricing'

const SETTING_LABELS: Record<
  TerminalSettingKey,
  { label: string; desc: string; icon: string }
> = {
  soundOnScan: {
    label: 'Sound on scan',
    desc: 'Play a beep when a product is added',
    icon: '🔊',
  },
  autoPrintReceipt: {
    label: 'Auto-print receipt',
    desc: 'Automatically print after each sale',
    icon: '🖨️',
  },
  showStockCount: {
    label: 'Show stock count',
    desc: 'Display remaining stock on product cards',
    icon: '📦',
  },
  taxInclusivePricing: {
    label: 'Tax inclusive pricing',
    desc: 'Prices already include VAT',
    icon: '🧾',
  },
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className='w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0 focus:outline-none'
      style={{ background: value ? '#008060' : '#D1D5DB' }}
      aria-checked={value}
      role='switch'
    >
      <span
        className='absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200'
        style={{ left: value ? 'calc(100% - 20px)' : '4px' }}
      />
    </button>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className='rounded-xl overflow-hidden bg-white border border-gray-200'>
      <div className='px-5 py-3.5 border-b border-gray-100 bg-gray-50'>
        <p className='text-sm font-semibold text-gray-800'>{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const {
    completedOrders,
    clearSalesHistory,
    taxRatePercent,
    currencyCode,
    currencySymbol,
    soundOnScan,
    autoPrintReceipt,
    showStockCount,
    taxInclusivePricing,
    updateTerminalSetting,
  } = usePOSStore()
  const [mounted, setMounted] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const authUser = useAuthStore((s) => s.user)
  const isAdmin = authUser?.role === 'admin'

  const [staffList, setStaffList] = useState<StaffMember[]>([])
  // BUG FIX: was initialized to `true` unconditionally, which meant a
  // non-admin cashier saw the staff list spinner forever (the effect below
  // short-circuits and never flips it to false for them). Default it off
  // and let the effect turn it on only when it's actually about to fetch.
  const [staffLoading, setStaffLoading] = useState(isAdmin)
  const [staffError, setStaffError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Staff summary is admin-only — don't even hit the endpoint for staff
    // accounts, since it 401s and there's nothing to show them anyway.
    // Nothing to set here: staffLoading already starts `false` for
    // non-admins (see useState(isAdmin) above), so no setState is needed
    // in the effect body — avoids the cascading-render lint warning from
    // calling setState synchronously inside an effect.
    if (!isAdmin) return

    async function fetchStaff() {
      setStaffLoading(true)
      setStaffError('')
      try {
        const res = await fetch('/api/admin/staff', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load staff')
        setStaffList(data.staff ?? [])
      } catch (err: unknown) {
        setStaffError(err instanceof Error ? err.message : 'Could not load staff')
      } finally {
        setStaffLoading(false)
      }
    }
    fetchStaff()
  }, [isAdmin])

  const settings = {
    soundOnScan,
    autoPrintReceipt,
    showStockCount,
    taxInclusivePricing,
  }

  const toggle = (key: TerminalSettingKey) =>
    updateTerminalSetting(key, !settings[key])

  const totalStaff = staffList.length
  const activeStaff = staffList.filter((s) => s.isActive).length
  const adminStaff = staffList.filter((s) => s.role === 'admin').length

  return (
    <div
      className='flex-1 min-h-0 overflow-y-auto p-4 sm:p-6'
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <h1 className='text-xl font-semibold text-gray-900 mb-5'>Settings</h1>

      {/* 2-column grid on desktop, 1-column on mobile */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
        {/* LEFT COLUMN */}
        <div className='space-y-4'>
          {/* POS Preferences */}
          <SectionCard title='POS Preferences'>
            {(
              Object.entries(settings) as [
                TerminalSettingKey,
                boolean,
              ][]
            ).map(([key, val], i, arr) => (
              <div
                key={key}
                className='flex items-center justify-between px-5 py-3.5'
                style={{
                  borderBottom:
                    i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <span className='text-lg shrink-0'>
                    {SETTING_LABELS[key].icon}
                  </span>
                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-gray-800'>
                      {SETTING_LABELS[key].label}
                    </p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      {SETTING_LABELS[key].desc}
                    </p>
                  </div>
                </div>
                <Toggle value={val} onChange={() => toggle(key)} />
              </div>
            ))}
          </SectionCard>

          {/* Local Sales Data */}
          <div className='rounded-xl overflow-hidden bg-white border border-amber-200'>
            <div className='px-5 py-3.5 border-b border-amber-100 bg-amber-50'>
              <p className='text-sm font-semibold text-gray-800'>
                Local sales data
              </p>
              <p className='text-xs text-gray-500 mt-0.5'>
                {completedOrders.length} completed sale
                {completedOrders.length === 1 ? '' : 's'} recorded on this
                device
              </p>
            </div>
            <div className='px-5 py-4'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <p className='text-sm font-medium text-gray-800'>
                    Clear sales history
                  </p>
                  <p className='text-xs text-gray-500 mt-1 leading-relaxed'>
                    Wipes this device&apos;s Analytics history. Does not touch
                    orders synced to Medusa.
                  </p>
                </div>
                {confirmClear ? (
                  <div className='flex items-center gap-2 shrink-0'>
                    <button
                      onClick={() => {
                        clearSalesHistory()
                        setConfirmClear(false)
                      }}
                      className='px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors'
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className='px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    disabled={completedOrders.length === 0}
                    className='px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-red-600 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className='space-y-4'>
          {/* Store Information */}
          <SectionCard title='Store information'>
            <div className='p-5 grid grid-cols-2 gap-4'>
              {[
                { label: 'Store name', value: 'SmashUK' },
                { label: 'VAT rate', value: `${Math.round(taxRatePercent)}%` },
                {
                  label: 'Currency',
                  value: `${currencyCode} (${currencySymbol})`,
                },
                { label: 'Region', value: 'United Kingdom' },
              ].map(({ label, value }) => (
                <div key={label} className='bg-gray-50 rounded-lg px-4 py-3'>
                  <p className='text-[11px] font-medium text-gray-400 uppercase tracking-wide'>
                    {label}
                  </p>
                  <p className='text-sm font-semibold text-gray-800 mt-1'>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Staff Summary — admin only */}
          {isAdmin && (
            <SectionCard title='Staff'>
              {staffLoading ? (
                <div className='grid grid-cols-3 gap-3 p-5'>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className='rounded-lg bg-gray-100 animate-pulse h-16'
                    />
                  ))}
                </div>
              ) : staffError ? (
                <div className='px-5 py-4'>
                  <p className='text-xs text-red-500'>{staffError}</p>
                </div>
              ) : (
                <div className='p-5 grid grid-cols-3 gap-3'>
                  {[
                    {
                      label: 'Total',
                      value: totalStaff,
                      color: 'text-gray-800',
                    },
                    {
                      label: 'Active',
                      value: activeStaff,
                      color: 'text-green-700',
                    },
                    {
                      label: 'Admins',
                      value: adminStaff,
                      color: 'text-blue-700',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className='bg-gray-50 rounded-xl p-3 text-center'
                    >
                      <p className={`text-2xl font-bold ${s.color}`}>
                        {s.value}
                      </p>
                      <p className='text-[11px] text-gray-400 mt-0.5 font-medium'>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className='px-5 pb-4'>
                <a
                  href='/dashboard/staff'
                  className='text-xs text-[#008060] font-semibold hover:underline'
                >
                  Manage staff in dashboard →
                </a>
              </div>
            </SectionCard>
          )}

          {/* About */}
          <SectionCard title='About'>
            <div className='px-5 py-4 space-y-3'>
              {[
                { label: 'Application', value: 'SmashUK POS' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Platform', value: 'Next.js + Medusa v2' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className='flex items-center justify-between text-sm'
                >
                  <span className='text-gray-500'>{label}</span>
                  <span className='font-medium text-gray-800'>{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
