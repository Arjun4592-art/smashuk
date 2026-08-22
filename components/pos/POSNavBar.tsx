'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { usePOSStore } from '@/store/posStore'
import {
  CartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  PackageIcon,
  CheckCircleIcon,
  AlertIcon,
  InfoIcon,
  ListIcon,
  BoltIcon,
} from '@/components/ui/Icons'
import POSProfileModal from '@/components/pos/POSProfileModal'
import { SITE_LOGO, SITE_NAME } from '@/lib/constants'

type Tab =
  | 'billing'
  | 'orders'
  | 'products'
  | 'analytics'
  | 'customers'
  | 'settings'

interface Props {
  user: any
  tab: Tab
  setTab: (t: Tab) => void
  itemCount: number
  onLogout: () => void
  onCashDrawer: () => void
  cashDrawerOpen: boolean
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'billing',
    label: 'Billing',
    icon: <CartIcon size={14} />,
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <ListIcon size={14} />,
  },
  {
    id: 'products',
    label: 'Products',
    icon: <PackageIcon size={14} />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BoltIcon size={14} />,
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: <UserIcon size={14} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg
        width='14'
        height='14'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      >
        <circle cx='12' cy='12' r='3' />
        <path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' />
      </svg>
    ),
  },
]

interface Notification {
  id: string
  type: 'warning' | 'success' | 'info'
  title: string
  message: string
  read: boolean
}

const LOW_STOCK_THRESHOLD = 5

const DEFAULT_SETTINGS = {
  soundOnScan: true,
  autoPrintReceipt: false,
  showStockCount: true,
  taxInclusivePricing: false,
}

const SETTING_LABELS: Record<keyof typeof DEFAULT_SETTINGS, string> = {
  soundOnScan: 'Sound on scan',
  autoPrintReceipt: 'Auto-print receipt',
  showStockCount: 'Show stock count',
  taxInclusivePricing: 'Tax inclusive pricing',
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  const styles = {
    warning: { color: '#B7791F', bg: '#FFF3CD' },
    success: { color: '#008060', bg: '#E3F1EB' },
    info: { color: '#2C6ECB', bg: '#E8F0FD' },
  }
  const s = styles[type]
  return (
    <div
      className='w-8 h-8 rounded-lg flex items-center justify-center shrink-0'
      style={{ background: s.bg, color: s.color }}
    >
      {type === 'warning' && <AlertIcon size={14} />}
      {type === 'success' && <CheckCircleIcon size={14} />}
      {type === 'info' && <InfoIcon size={14} />}
    </div>
  )
}

function IconBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className='w-8 h-8 flex items-center justify-center rounded-lg border transition-colors'
      style={{
        background: active ? '#F2F7F5' : '#FFFFFF',
        borderColor: active ? '#008060' : '#E1E3E5',
        color: active ? '#008060' : '#6D7175',
      }}
    >
      {children}
    </button>
  )
}

function Dropdown({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className='absolute top-full mt-2 rounded-xl overflow-hidden z-50'
      style={{
        background: '#FFFFFF',
        border: '1px solid #E1E3E5',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        minWidth: 240,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function POSNavBar({
  user,
  tab,
  setTab,
  itemCount,
  onLogout,
  onCashDrawer,
  cashDrawerOpen,
}: Props) {
  const [time, setTime] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStaff, setShowStaff] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const products = usePOSStore((s) => s.products)
  const completedOrders = usePOSStore((s) => s.completedOrders)

  // Real notifications, derived on every render from live POS data instead
  // of a hardcoded mock list:
  //  - low stock: any product at or below LOW_STOCK_THRESHOLD units
  //  - order completed: the most recent sales rung up on this device
  // IDs are stable (product id / order id based) so read-state survives
  // across re-renders even though the list itself is recomputed each time.
  const notifications: Notification[] = useMemo(() => {
    const lowStock: Notification[] = (products ?? [])
      .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        id: `stock-${p.id}`,
        type: 'warning',
        title: 'Low stock alert',
        message: `${p.name} — only ${p.stock} left`,
        read: readIds.has(`stock-${p.id}`),
      }))

    const recentOrders: Notification[] = (completedOrders ?? [])
      .slice(0, 5)
      .map((o: any) => ({
        id: `order-${o.id}`,
        type: 'success',
        title: 'Order completed',
        message: `${o.id} · £${(o.total ?? 0).toFixed(2)}`,
        read: readIds.has(`order-${o.id}`),
      }))

    return [...recentOrders, ...lowStock]
  }, [products, completedOrders, readIds])

  const notifRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    update()
    const t = setInterval(update, 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotif(false)
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      )
        setShowSettings(false)
      if (staffRef.current && !staffRef.current.contains(e.target as Node))
        setShowStaff(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const closeAll = () => {
    setShowNotif(false)
    setShowSettings(false)
    setShowStaff(false)
  }
  const markAllRead = () =>
    setReadIds((prev) => new Set([...prev, ...notifications.map((n) => n.id)]))
  const toggleSetting = (key: keyof typeof DEFAULT_SETTINGS) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <header
      className='shrink-0 relative z-40'
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E1E3E5' }}
    >
      <div className='flex items-center justify-between px-4 h-12'>
        {/* ── Left: Logo + laptop inline tabs ─────────────────────────── */}
        <div className='flex items-center gap-3 h-full'>
          {/* Logo */}
          <div className='flex items-center gap-2 shrink-0'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_LOGO} alt={SITE_NAME} className='h-5 w-auto' />
            <span
              className='text-sm font-semibold hidden sm:block'
              style={{ color: '#202223' }}
            >
              POS
            </span>
          </div>

          {/* Laptop: inline tabs (lg+) */}
          <div className='hidden lg:flex items-center h-full ml-2 overflow-x-auto'>
            <div
              className='w-px h-5 mr-2 shrink-0'
              style={{ background: '#E1E3E5' }}
            />
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className='relative flex items-center gap-1.5 px-2.5 h-full text-xs font-medium transition-colors shrink-0 whitespace-nowrap'
                style={{
                  color: tab === t.id ? '#008060' : '#6D7175',
                  borderBottom:
                    tab === t.id
                      ? '2px solid #008060'
                      : '2px solid transparent',
                }}
              >
                {t.icon}
                {t.label}
                {t.id === 'billing' && itemCount > 0 && (
                  <span
                    className='ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold'
                    style={{ background: '#008060', color: '#FFFFFF' }}
                  >
                    {itemCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: actions ────────────────────────────────────────────── */}
        <div className='flex items-center gap-2'>
          {/* Time — laptop only */}
          <span
            className='hidden lg:block text-xs mr-1'
            style={{ color: '#8C9196' }}
          >
            {time}
          </span>

          {/* Cash drawer — laptop only */}
          <button
            onClick={onCashDrawer}
            className='hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors'
            style={{
              background: cashDrawerOpen ? '#F2F7F5' : '#FFFFFF',
              borderColor: cashDrawerOpen ? '#008060' : '#E1E3E5',
              color: cashDrawerOpen ? '#008060' : '#6D7175',
            }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
            >
              <rect x='2' y='7' width='20' height='14' rx='2' />
              <path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' />
              <line x1='12' y1='12' x2='12' y2='16' />
              <line x1='10' y1='14' x2='14' y2='14' />
            </svg>
            {cashDrawerOpen ? 'Drawer open' : 'Open drawer'}
          </button>

          {/* ── Notifications ──────────────────────────────────────────── */}
          <div ref={notifRef} className='relative'>
            <IconBtn
              title='Notifications'
              onClick={() => {
                closeAll()
                setShowNotif((v) => !v)
              }}
              active={showNotif}
            >
              <div className='relative'>
                <svg
                  width='15'
                  height='15'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                >
                  <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
                  <path d='M13.73 21a2 2 0 01-3.46 0' />
                </svg>
                {unreadCount > 0 && (
                  <span
                    className='absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold'
                    style={{ background: '#D82C0D', color: '#fff' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
            </IconBtn>

            {showNotif && (
              <Dropdown style={{ right: 0, width: 288 }}>
                <div
                  className='flex items-center justify-between px-4 py-3'
                  style={{ borderBottom: '1px solid #E1E3E5' }}
                >
                  <span
                    className='text-sm font-semibold'
                    style={{ color: '#202223' }}
                  >
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className='text-xs'
                      style={{ color: '#008060' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div
                    className='py-8 text-center text-sm'
                    style={{ color: '#8C9196' }}
                  >
                    No notifications
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      className='flex items-start gap-3 px-4 py-3'
                      style={{
                        borderBottom:
                          i < notifications.length - 1
                            ? '1px solid #F6F6F7'
                            : 'none',
                        background: n.read ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <NotifIcon type={n.type} />
                      <div className='flex-1 min-w-0'>
                        <p
                          className='text-xs font-medium'
                          style={{ color: '#202223' }}
                        >
                          {n.title}
                        </p>
                        <p
                          className='text-xs mt-0.5'
                          style={{ color: '#8C9196' }}
                        >
                          {n.message}
                        </p>
                      </div>
                      {!n.read && (
                        <div
                          className='w-2 h-2 rounded-full mt-1 shrink-0'
                          style={{ background: '#008060' }}
                        />
                      )}
                    </div>
                  ))
                )}
              </Dropdown>
            )}
          </div>

          {/* ── Settings ───────────────────────────────────────────────── */}
          <div ref={settingsRef} className='relative'>
            <IconBtn
              title='Settings'
              onClick={() => {
                closeAll()
                setShowSettings((v) => !v)
              }}
              active={showSettings}
            >
              <svg
                width='15'
                height='15'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <circle cx='12' cy='12' r='3' />
                <path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' />
              </svg>
            </IconBtn>

            {showSettings && (
              <Dropdown style={{ right: 0, width: 240 }}>
                <div
                  className='px-4 py-3'
                  style={{ borderBottom: '1px solid #E1E3E5' }}
                >
                  <span
                    className='text-sm font-semibold'
                    style={{ color: '#202223' }}
                  >
                    Settings
                  </span>
                </div>
                {(
                  Object.entries(settings) as [
                    keyof typeof DEFAULT_SETTINGS,
                    boolean,
                  ][]
                ).map(([key, val], i, arr) => (
                  <div
                    key={key}
                    className='flex items-center justify-between px-4 py-3'
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid #F6F6F7' : 'none',
                    }}
                  >
                    <span className='text-sm' style={{ color: '#202223' }}>
                      {SETTING_LABELS[key]}
                    </span>
                    <button
                      onClick={() => toggleSetting(key)}
                      className='w-9 h-5 rounded-full transition-colors relative shrink-0'
                      style={{ background: val ? '#008060' : '#E1E3E5' }}
                    >
                      <span
                        className='absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200'
                        style={{ left: val ? 'calc(100% - 18px)' : '2px' }}
                      />
                    </button>
                  </div>
                ))}
              </Dropdown>
            )}
          </div>

          {/* ── Staff pill + dropdown ───────────────────────────────────── */}
          <div ref={staffRef} className='relative'>
            <button
              onClick={() => {
                closeAll()
                setShowStaff((v) => !v)
              }}
              className='flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors'
              style={{
                background: showStaff ? '#F2F7F5' : '#F6F6F7',
                borderColor: showStaff ? '#008060' : '#E1E3E5',
              }}
            >
              <div
                className='w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0'
                style={{ background: '#008060', color: '#FFFFFF' }}
              >
                {user?.initials || 'S'}
              </div>
              <span
                className='text-xs font-medium hidden sm:block max-w-[80px] truncate'
                style={{ color: '#202223' }}
              >
                {user?.name || 'Staff'}
              </span>
              <ChevronDownIcon size={12} className='text-[#8C9196]' />
            </button>

            {showStaff && (
              <Dropdown style={{ right: 0, width: 220 }}>
                {/* Current user — click to view profile */}
                <button
                  onClick={() => {
                    setShowStaff(false)
                    setShowProfile(true)
                  }}
                  className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#EAF4EF] transition-colors'
                  style={{
                    background: '#F2F7F5',
                    borderBottom: '1px solid #E1E3E5',
                  }}
                >
                  <div
                    className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                    style={{ background: '#008060', color: '#fff' }}
                  >
                    {user?.initials || 'S'}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p
                      className='text-sm font-semibold truncate'
                      style={{ color: '#008060' }}
                    >
                      {user?.name || 'Staff'}
                    </p>
                    <p
                      className='text-xs capitalize'
                      style={{ color: '#6D7175' }}
                    >
                      {user?.role || 'Cashier'}
                    </p>
                  </div>
                  <ChevronRightIcon
                    size={12}
                    className='text-[#8C9196] shrink-0'
                  />
                </button>

                <div style={{ borderTop: '1px solid #E1E3E5' }}>
                  <button
                    onClick={onLogout}
                    className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FFF4F4] transition-colors'
                  >
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='#D82C0D'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    >
                      <path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' />
                      <polyline points='16 17 21 12 16 7' />
                      <line x1='21' y1='12' x2='9' y2='12' />
                    </svg>
                    <span
                      className='text-sm font-medium'
                      style={{ color: '#D82C0D' }}
                    >
                      Sign out
                    </span>
                  </button>
                </div>
              </Dropdown>
            )}
          </div>
        </div>
      </div>

      {showProfile && (
        <POSProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={onLogout}
        />
      )}
    </header>
  )
}
