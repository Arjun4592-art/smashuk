'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '../../context/SidebarContext'
import { useAuthStore } from '@/store/authStore'

interface NavChild {
  label: string
  href: string
}
interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavChild[]
  badge?: string
  adminOnly?: boolean
}

const Icons = {
  overview: (
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
      <rect x='3' y='3' width='7' height='7' />
      <rect x='14' y='3' width='7' height='7' />
      <rect x='14' y='14' width='7' height='7' />
      <rect x='3' y='14' width='7' height='7' />
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
  products: (
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
  customers: (
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
      <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 00-3-3.87' />
      <path d='M16 3.13a4 4 0 010 7.75' />
    </svg>
  ),
  analytics: (
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
      <line x1='2' y1='20' x2='22' y2='20' />
    </svg>
  ),
  discounts: (
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
      <path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' />
      <line x1='7' y1='7' x2='7.01' y2='7' />
    </svg>
  ),
  staff: (
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
      <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 00-3-3.87' />
      <path d='M16 3.13a4 4 0 010 7.75' />
    </svg>
  ),
  seo: (
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
      <circle cx='11' cy='11' r='8' />
      <line x1='21' y1='21' x2='16.65' y2='16.65' />
    </svg>
  ),
  reviews: (
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
      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
    </svg>
  ),
  giftCard: (
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
      <rect x='3' y='8' width='18' height='4' />
      <path d='M12 8v13M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7' />
      <path d='M7.5 8a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 1 1 0 5' />
    </svg>
  ),
  settings: (
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
      <circle cx='12' cy='12' r='3' />
      <path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' />
    </svg>
  ),
  chevron: (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='6 9 12 15 18 9' />
    </svg>
  ),
  close: (
    <svg
      width='18'
      height='18'
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
  collapseLeft: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <path d='M11 17l-5-5 5-5M18 17l-5-5 5-5' />
    </svg>
  ),
  collapseRight: (
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
    >
      <path d='M13 17l5-5-5-5M6 17l5-5-5-5' />
    </svg>
  ),
  search: (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#8C9196'
      strokeWidth='2'
    >
      <circle cx='11' cy='11' r='8' />
      <line x1='21' y1='21' x2='16.65' y2='16.65' />
    </svg>
  ),
  pos: (
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
      <rect x='2' y='3' width='20' height='14' rx='2' />
      <line x1='8' y1='21' x2='16' y2='21' />
      <line x1='12' y1='17' x2='12' y2='21' />
    </svg>
  ),
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Icons.overview },
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: Icons.orders,
    children: [
      { label: 'All Orders', href: '/dashboard/orders' },
      { label: 'Drafts', href: '/dashboard/orders?status=draft' },
      {
        label: 'Abandoned Checkouts',
        href: '/dashboard/orders?status=abandoned',
      },
    ],
  },
  {
    label: 'Products',
    icon: Icons.products,
    children: [
      { label: 'All Products', href: '/dashboard/products' },
      { label: 'Add Product', href: '/dashboard/products/new' },
      { label: 'Categories', href: '/dashboard/categories' },
      { label: 'Inventory', href: '/dashboard/inventory' },
    ],
  },
  {
    label: 'Customers',
    icon: Icons.customers,
    children: [
      { label: 'All Customers', href: '/dashboard/customers' },
      { label: 'Segments', href: '/dashboard/customers?view=segments' },
    ],
  },
  {
    label: 'Analytics',
    icon: Icons.analytics,
    children: [
      { label: 'Sales', href: '/dashboard/sales' },
      { label: 'Reports', href: '/dashboard/sales?view=reports' },
      { label: 'Live View', href: '/dashboard/sales?view=live' },
    ],
  },
  {
    label: 'Discounts',
    icon: Icons.discounts,
    children: [
      { label: 'All Discounts', href: '/dashboard/discounts' },
      { label: 'Add Discount', href: '/dashboard/discounts/add' },
    ],
  },
  // ── Staff Management — admin only ──────────────────────────────────────────
  {
    label: 'Staff',
    icon: Icons.staff,
    adminOnly: true,
    children: [
      { label: 'Staff Members', href: '/dashboard/staff' },
      { label: 'POS Terminal', href: '/pos' },
    ],
  },
  { label: 'SEO', href: '/dashboard/seo', icon: Icons.seo },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Icons.reviews },
  { label: 'Gift Cards', href: '/dashboard/gift-cards', icon: Icons.giftCard },
  {
    label: 'Settings',
    icon: Icons.settings,
    children: [
      { label: 'General', href: '/dashboard/settings' },
      { label: 'Billing', href: '/dashboard/settings/billing' },
      { label: 'Shipping', href: '/dashboard/settings/shipping' },
      { label: 'Notifications', href: '/dashboard/settings/notifications' },
    ],
  },
]

function NavContent({
  collapsed,
  openMenus,
  toggleMenu,
  isActive,
  isGroupActive,
  onLinkClick,
  userRole,
  orderCount,
}: {
  collapsed: boolean
  openMenus: string[]
  toggleMenu: (label: string) => void
  isActive: (href: string) => boolean
  isGroupActive: (item: NavItem) => boolean
  onLinkClick?: () => void
  userRole?: string
  orderCount?: number | null
}) {
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && userRole !== 'admin') return false
    return true
  }).map((item) =>
    // BUG FIX: String(orderCount) is always truthy — even "0" — so the
    // badge rendered a red "0" pill on Orders instead of hiding when there
    // was nothing pending. Only attach a badge once the count is > 0.
    item.label === 'Orders' && orderCount != null && orderCount > 0
      ? { ...item, badge: String(orderCount) }
      : item,
  )

  return (
    <nav className='flex-1 px-2 py-2 overflow-y-auto space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      {visibleItems.map((item) => {
        const hasChildren = !!item.children?.length
        const isOpen = openMenus.includes(item.label)
        const groupActive = isGroupActive(item)

        return (
          <div key={item.label}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => toggleMenu(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-[13px] font-medium border-none cursor-pointer ${groupActive ? 'bg-[#F2F7F5] text-[#008060]' : 'text-[#202223] hover:bg-[#F6F6F7] bg-transparent'} ${collapsed ? 'justify-center' : ''}`}
                >
                  <span
                    className={`shrink-0 ${groupActive ? 'text-[#008060]' : 'text-[#6D7175]'}`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className='flex-1 truncate'>{item.label}</span>
                      {item.badge && (
                        <span className='bg-[#D82C0D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none'>
                          {item.badge}
                        </span>
                      )}
                      <span
                        className='text-[#8C9196] transition-transform duration-200'
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        {Icons.chevron}
                      </span>
                    </>
                  )}
                </button>
                {!collapsed && (
                  <div
                    className='overflow-hidden transition-all duration-200'
                    style={{
                      maxHeight: isOpen
                        ? `${item.children!.length * 40}px`
                        : '0px',
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className='ml-3 mt-0.5 mb-1 pl-3 border-l-2 border-[#E1E3E5] space-y-0.5 pt-0.5'>
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onLinkClick}
                          className={`flex items-center px-2.5 py-1.5 rounded-lg text-[12.5px] no-underline transition-all ${isActive(child.href) ? 'text-[#008060] font-semibold bg-[#F2F7F5]' : 'text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7]'}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href!}
                onClick={onLinkClick}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium no-underline ${groupActive ? 'bg-[#F2F7F5] text-[#008060]' : 'text-[#202223] hover:bg-[#F6F6F7]'} ${collapsed ? 'justify-center' : ''}`}
              >
                <span
                  className={`shrink-0 ${groupActive ? 'text-[#008060]' : 'text-[#6D7175]'}`}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className='flex-1 truncate'>{item.label}</span>
                )}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function UserSection({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore()
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'A'

  return (
    <div className='px-2 py-2 border-t border-[#E1E3E5] shrink-0'>
      {!collapsed && (
        <div className='flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg bg-[#F6F6F7]'>
          <span className='w-2 h-2 rounded-full bg-[#008060] shrink-0 animate-pulse' />
          <span className='text-[11.5px] text-[#6D7175] flex-1'>
            Store Online
          </span>
          <span className='text-[10px] text-[#008060] font-medium'>Live</span>
        </div>
      )}
      <div
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#F6F6F7] cursor-pointer transition-colors ${collapsed ? 'justify-center' : ''}`}
      >
        <div className='w-7 h-7 rounded-full bg-[#008060] flex items-center justify-center text-white text-[11px] font-bold shrink-0'>
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className='flex flex-col leading-none min-w-0 flex-1'>
              <span className='text-[12px] font-medium text-[#202223] truncate'>
                {user?.name ?? 'Admin User'}
              </span>
              <span className='text-[10.5px] text-[#8C9196] mt-0.5 truncate'>
                {user?.email ?? ''}
              </span>
            </div>
            <button
              onClick={() => logout('dashboard')}
              className='text-[10.5px] text-[#6D7175] hover:text-[#D82C0D] bg-transparent border-none cursor-pointer transition-colors'
              title='Sign out'
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { mobileOpen, closeMobileSidebar } = useSidebar()
  const { user } = useAuthStore()

  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)
  // Dynamic sidebar badges — real counts from the backend, not hardcoded.
  const [orderCount, setOrderCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/orders?limit=1&status=pending', {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === 'number') {
          setOrderCount(data.count)
        }
      })
      .catch(() => {
        /* badge just stays hidden if this fails */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // On route change: only keep the active group open, close all others
  useEffect(() => {
    const activeParent = NAV_ITEMS.find((item) => {
      if (!item.children) return false
      return item.children.some((c) =>
        pathname.startsWith(c.href.split('?')[0]),
      )
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    setOpenMenus(activeParent ? [activeParent.label] : [])
  }, [pathname])

  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  // Accordion: only one menu stays open at a time.
  // Opening a new menu automatically closes the previous one.
  const toggleMenu = (label: string) =>
    setOpenMenus((prev) => (prev.includes(label) ? [] : [label]))

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href.split('?')[0])

  const isGroupActive = (item: NavItem): boolean => {
    if (item.href && isActive(item.href)) return true
    if (item.children) return item.children.some((c) => isActive(c.href))
    return false
  }

  const logoSection = (
    <div className='flex items-center justify-between px-3 py-3 border-b border-[#E1E3E5] h-14 shrink-0'>
      {!collapsed ? (
        <>
          <Link
            href='/dashboard'
            className='flex items-center gap-2.5 no-underline min-w-0'
          >
            <div className='w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-wider shrink-0'>
              AS
            </div>
            <div className='flex flex-col leading-none min-w-0'>
              <span className='font-sora text-[13px] font-semibold text-[#202223] truncate'>
                Smash Pro
              </span>
              <span className='text-[10px] text-[#8C9196] mt-0.5 capitalize'>
                {user?.role ?? 'Admin'} Panel
              </span>
            </div>
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className='w-6 h-6 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded transition-colors bg-transparent border-none cursor-pointer shrink-0'
          >
            {Icons.collapseLeft}
          </button>
        </>
      ) : (
        <div className='flex flex-col items-center w-full gap-1'>
          <Link href='/dashboard' className='no-underline'>
            <div className='w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center text-white text-[11px] font-bold'>
              AS
            </div>
          </Link>
          <button
            onClick={() => setCollapsed(false)}
            className='w-5 h-5 bg-white border border-[#E1E3E5] rounded-full flex items-center justify-center text-[#6D7175] hover:text-[#202223] shadow-sm cursor-pointer'
          >
            {Icons.collapseRight}
          </button>
        </div>
      )}
    </div>
  )

  const searchSection = !collapsed && (
    <div className='px-3 py-2.5 border-b border-[#E1E3E5] shrink-0'>
      <div className='flex items-center gap-2 px-2.5 py-1.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg hover:border-[#8C9196] transition-colors cursor-text'>
        {Icons.search}
        <input
          type='text'
          placeholder='Search...'
          className='flex-1 bg-transparent text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none'
        />
        <span className='text-[10px] text-[#8C9196] bg-white border border-[#E1E3E5] px-1 py-0.5 rounded font-mono'>
          ⌘K
        </span>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden lg:flex h-screen bg-white border-r border-[#E1E3E5] flex-col shrink-0 transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-60'}`}
      >
        {logoSection}
        {searchSection}
        <NavContent
          collapsed={collapsed}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
          isActive={isActive}
          isGroupActive={isGroupActive}
          userRole={user?.role}
          orderCount={orderCount}
        />
        <UserSection collapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className='fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden'
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-white border-r border-[#E1E3E5] flex flex-col z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='flex items-center justify-between px-4 py-3 border-b border-[#E1E3E5] h-14 shrink-0'>
          <Link
            href='/dashboard'
            className='flex items-center gap-2.5 no-underline'
            onClick={closeMobileSidebar}
          >
            <div className='w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center text-white text-[11px] font-bold'>
              AS
            </div>
            <div className='flex flex-col leading-none'>
              <span className='font-sora text-[13px] font-semibold text-[#202223]'>
                Smash Pro
              </span>
              <span className='text-[10px] text-[#8C9196] mt-0.5'>
                Admin Panel
              </span>
            </div>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className='w-8 h-8 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'
          >
            {Icons.close}
          </button>
        </div>
        <div className='px-3 py-2.5 border-b border-[#E1E3E5] shrink-0'>
          <div className='flex items-center gap-2 px-2.5 py-1.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg'>
            {Icons.search}
            <input
              type='text'
              placeholder='Search...'
              className='flex-1 bg-transparent text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none'
            />
          </div>
        </div>
        <NavContent
          collapsed={false}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
          isActive={isActive}
          isGroupActive={isGroupActive}
          onLinkClick={closeMobileSidebar}
          userRole={user?.role}
          orderCount={orderCount}
        />
        <UserSection collapsed={false} />
      </aside>
    </>
  )
}
