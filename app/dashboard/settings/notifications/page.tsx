'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
const Icons = {
  bell: (
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
      <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
      <path d='M13.73 21a2 2 0 01-3.46 0' />
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
  orders: (
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
      <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
      <line x1='3' y1='6' x2='21' y2='6' />
      <path d='M16 10a4 4 0 01-8 0' />
    </svg>
  ),
  inventory: (
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
      <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
    </svg>
  ),
  customer: (
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
  payment: (
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
      <rect x='1' y='4' width='22' height='16' rx='2' ry='2' />
      <line x1='1' y1='10' x2='23' y2='10' />
    </svg>
  ),
  report: (
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
      <line x1='18' y1='20' x2='18' y2='10' />
      <line x1='12' y1='20' x2='12' y2='4' />
      <line x1='6' y1='20' x2='6' y2='14' />
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
    active: true,
  },
  {
    label: 'Marketing',
    href: '/dashboard/settings/marketing',
  },
  {
    label: 'Promo Banner',
    href: '/dashboard/settings/promo-banner',
  },
]
interface NotificationSetting {
  id: string
  label: string
  description: string
  email: boolean
  sms: boolean
  push: boolean
  icon: React.ReactNode
}
const NOTIFICATION_GROUPS = [
  {
    group: 'Orders',
    icon: Icons.orders,
    items: [
      {
        id: 'new_order',
        label: 'New Order Placed',
        description: 'When a customer places a new order',
        email: true,
        sms: true,
        push: true,
      },
      {
        id: 'order_cancelled',
        label: 'Order Cancelled',
        description: 'When an order is cancelled by customer',
        email: true,
        sms: false,
        push: true,
      },
      {
        id: 'order_refund',
        label: 'Refund Requested',
        description: 'When a customer requests a refund',
        email: true,
        sms: true,
        push: true,
      },
      {
        id: 'order_shipped',
        label: 'Order Shipped',
        description: 'When an order is marked as shipped',
        email: true,
        sms: false,
        push: false,
      },
    ],
  },
  {
    group: 'Inventory',
    icon: Icons.inventory,
    items: [
      {
        id: 'low_stock',
        label: 'Low Stock Alert',
        description: 'When product stock falls below threshold',
        email: true,
        sms: false,
        push: true,
      },
      {
        id: 'out_of_stock',
        label: 'Out of Stock',
        description: 'When a product runs out of stock',
        email: true,
        sms: true,
        push: true,
      },
      {
        id: 'restock',
        label: 'Restock Reminder',
        description: 'Weekly reminder for items to restock',
        email: true,
        sms: false,
        push: false,
      },
    ],
  },
  {
    group: 'Customers',
    icon: Icons.customer,
    items: [
      {
        id: 'new_customer',
        label: 'New Customer Registered',
        description: 'When a new customer creates an account',
        email: true,
        sms: false,
        push: true,
      },
      {
        id: 'customer_review',
        label: 'New Product Review',
        description: 'When a customer submits a review',
        email: true,
        sms: false,
        push: false,
      },
    ],
  },
  {
    group: 'Payments',
    icon: Icons.payment,
    items: [
      {
        id: 'payment_failed',
        label: 'Payment Failed',
        description: 'When a payment attempt fails',
        email: true,
        sms: true,
        push: true,
      },
      {
        id: 'payment_success',
        label: 'Payment Received',
        description: 'When a payment is successfully processed',
        email: false,
        sms: false,
        push: false,
      },
      {
        id: 'payout',
        label: 'Payout Processed',
        description: 'When a payout is sent to your bank',
        email: true,
        sms: false,
        push: false,
      },
    ],
  },
  {
    group: 'Reports',
    icon: Icons.report,
    items: [
      {
        id: 'daily_report',
        label: 'Daily Sales Report',
        description: 'Summary of daily sales sent every morning',
        email: true,
        sms: false,
        push: false,
      },
      {
        id: 'weekly_report',
        label: 'Weekly Report',
        description: 'Weekly performance summary every Monday',
        email: true,
        sms: false,
        push: false,
      },
    ],
  },
]
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors border-none cursor-pointer shrink-0 ${checked ? 'bg-[#008060]' : 'bg-[#E1E3E5]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'right-0.5' : 'left-0.5'}`}
      />
    </button>
  )
}
export default function NotificationsPage() {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<
    Record<
      string,
      {
        email: boolean
        sms: boolean
        push: boolean
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        email: boolean
        sms: boolean
        push: boolean
      }
    > = {}
    NOTIFICATION_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        initial[item.id] = {
          email: item.email,
          sms: item.sms,
          push: item.push,
        }
      })
    })
    return initial
  })
  const [channels, setChannels] = useState({
    email: user?.email ?? '',
    smsPhone: user?.phone ?? '',
    pushEnabled: true,
  })
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/notification-settings', {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
          }))
        }
        if (data.channels && (data.channels.email || data.channels.smsPhone)) {
          setChannels((prev) => ({
            ...prev,
            ...data.channels,
          }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  const toggle = (id: string, channel: 'email' | 'sms' | 'push') => {
    setSettings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [channel]: !prev[id][channel],
      },
    }))
  }
  const toggleAll = (channel: 'email' | 'sms' | 'push', value: boolean) => {
    setSettings((prev) => {
      const next = {
        ...prev,
      }
      Object.keys(next).forEach((id) => {
        next[id] = {
          ...next[id],
          [channel]: value,
        }
      })
      return next
    })
  }
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          settings,
          channels,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[notifications] save failed:', err)
      toast.error('Failed to save notification settings — please try again')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Notifications
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Control how and when you receive alerts
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className='flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
        >
          {saving ? Icons.spinner : saved ? Icons.check : Icons.save}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
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
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 space-y-4'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
              Notification Channels
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='p-4 border border-[#E1E3E5] rounded-xl'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2 text-[#6D7175]'>
                    {Icons.mail}
                    <span className='text-[13px] font-semibold text-[#202223]'>
                      Email
                    </span>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
                <input
                  type='email'
                  value={channels.email}
                  onChange={(e) =>
                    setChannels((c) => ({
                      ...c,
                      email: e.target.value,
                    }))
                  }
                  className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] outline-none focus:border-[#008060] transition-all'
                />
              </div>
              <div className='p-4 border border-[#E1E3E5] rounded-xl'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2 text-[#6D7175]'>
                    {Icons.phone}
                    <span className='text-[13px] font-semibold text-[#202223]'>
                      SMS
                    </span>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
                <input
                  type='tel'
                  value={channels.smsPhone}
                  onChange={(e) =>
                    setChannels((c) => ({
                      ...c,
                      smsPhone: e.target.value,
                    }))
                  }
                  className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] outline-none focus:border-[#008060] transition-all'
                />
              </div>
              <div className='p-4 border border-[#E1E3E5] rounded-xl'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2 text-[#6D7175]'>
                    {Icons.bell}
                    <span className='text-[13px] font-semibold text-[#202223]'>
                      Push
                    </span>
                  </div>
                  <Toggle
                    checked={channels.pushEnabled}
                    onChange={() =>
                      setChannels((c) => ({
                        ...c,
                        pushEnabled: !c.pushEnabled,
                      }))
                    }
                  />
                </div>
                <p className='text-[11.5px] text-[#6D7175]'>
                  Browser push notifications for real-time alerts
                </p>
              </div>
            </div>
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            {}
            <div className='grid grid-cols-[1fr_80px_80px_80px] gap-4 px-6 py-3 border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
              <div className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                Notification
              </div>
              {(['email', 'sms', 'push'] as const).map((channel) => (
                <div key={channel} className='text-center'>
                  <div className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide mb-1'>
                    {channel}
                  </div>
                  <div className='flex justify-center gap-2'>
                    <button
                      onClick={() => toggleAll(channel, true)}
                      className='text-[10px] text-[#008060] hover:underline bg-transparent border-none cursor-pointer'
                    >
                      All
                    </button>
                    <span className='text-[#E1E3E5]'>|</span>
                    <button
                      onClick={() => toggleAll(channel, false)}
                      className='text-[10px] text-[#6D7175] hover:underline bg-transparent border-none cursor-pointer'
                    >
                      None
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {}
            {NOTIFICATION_GROUPS.map((group) => (
              <div key={group.group}>
                <div className='flex items-center gap-2 px-6 py-2.5 bg-[#F6F6F7] border-b border-[#E1E3E5]'>
                  <span className='text-[#6D7175]'>{group.icon}</span>
                  <span className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    {group.group}
                  </span>
                </div>
                <div className='divide-y divide-[#F1F1F1]'>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className='grid grid-cols-[1fr_80px_80px_80px] gap-4 items-center px-6 py-3.5 hover:bg-[#F6F6F7] transition-colors'
                    >
                      <div>
                        <p className='text-[13px] font-medium text-[#202223]'>
                          {item.label}
                        </p>
                        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                          {item.description}
                        </p>
                      </div>
                      {(['email', 'sms', 'push'] as const).map((channel) => (
                        <div key={channel} className='flex justify-center'>
                          <Toggle
                            checked={settings[item.id]?.[channel] ?? false}
                            onChange={() => toggle(item.id, channel)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 space-y-4'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
              Quiet Hours
            </h2>
            <p className='text-[13px] text-[#6D7175]'>
              Pause non-critical notifications during these hours
            </p>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='flex items-center gap-3'>
                <Toggle checked={true} onChange={() => {}} />
                <span className='text-[13px] text-[#202223]'>
                  Enable quiet hours
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <select className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] cursor-pointer'>
                  {['10:00 PM', '11:00 PM', '12:00 AM'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <span className='text-[13px] text-[#6D7175]'>to</span>
                <select className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] cursor-pointer'>
                  {['6:00 AM', '7:00 AM', '8:00 AM'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
