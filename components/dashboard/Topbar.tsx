'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { useAuthStore } from '@/store/authStore';
const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/orders': 'Orders',
  '/dashboard/products': 'Products',
  '/dashboard/products/new': 'Add Product',
  '/dashboard/categories': 'Categories',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/customers': 'Customers',
  '/dashboard/sales': 'Sales',
  '/dashboard/discounts': 'Discounts',
  '/dashboard/discounts/add': 'Add Discount',
  '/dashboard/seo': 'SEO',
  '/dashboard/settings': 'Settings',
  '/dashboard/settings/billing': 'Billing',
  '/dashboard/settings/shipping': 'Shipping',
  '/dashboard/settings/notifications': 'Notifications'
};
const NOTIFICATIONS: never[] = [];
export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    openMobileSidebar
  } = useSidebar();
  const {
    user,
    logout
  } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<{
    id: string;
    type: string;
    text: string;
    time: string;
    unread: boolean;
    link?: string;
  }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const READ_IDS_KEY = 'dashboard-read-notification-ids';
  const getReadIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(READ_IDS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };
  const saveReadIds = (ids: Set<string>) => {
    try {
      const arr = Array.from(ids).slice(-500);
      window.localStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
    } catch {}
  };
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/dashboard/notifications', {
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const readIds = getReadIds();
        const withReadState = (data.notifications ?? []).map((n: any) => ({
          ...n,
          unread: n.unread && !readIds.has(n.id)
        }));
        setNotifications(withReadState);
        setUnreadCount(withReadState.filter((n: any) => n.unread).length);
      } catch {}
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);
  const handleMarkAllRead = () => {
    const readIds = getReadIds();
    notifications.forEach(n => readIds.add(n.id));
    saveReadIds(readIds);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({
      ...n,
      unread: false
    })));
  };
  const handleNotificationClick = (n: typeof notifications[number]) => {
    const readIds = getReadIds();
    readIds.add(n.id);
    saveReadIds(readIds);
    setNotifications(prev => prev.map(item => item.id === n.id ? {
      ...item,
      unread: false
    } : item));
    setUnreadCount(prev => n.unread ? Math.max(0, prev - 1) : prev);
    if (n.link) router.push(n.link);
    setShowNotifications(false);
  };
  const handleLogout = async () => {
    logout('dashboard');
    router.push('/dashboard/login');
  };
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    return {
      label: BREADCRUMB_MAP[href] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      href
    };
  });
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'A';
  return <header className='h-14 bg-white border-b border-[#E1E3E5] flex items-center justify-between px-4 shrink-0 relative z-20'>
      {}
      <div className='flex items-center gap-3 min-w-0'>
        <button onClick={openMobileSidebar} className='lg:hidden w-8 h-8 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer shrink-0'>
          <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
            <line x1='3' y1='6' x2='21' y2='6' />
            <line x1='3' y1='12' x2='21' y2='12' />
            <line x1='3' y1='18' x2='21' y2='18' />
          </svg>
        </button>

        <div className='flex items-center gap-1.5 text-[13px] min-w-0'>
          {breadcrumbs.map((crumb, i) => <div key={crumb.href} className='flex items-center gap-1.5 min-w-0'>
              {i > 0 && <span className='text-[#8C9196] text-[11px]'>/</span>}
              {i === breadcrumbs.length - 1 ? <span className='font-semibold text-[#202223] truncate'>
                  {crumb.label}
                </span> : <Link href={crumb.href} className='text-[#6D7175] hover:text-[#202223] no-underline transition-colors truncate'>
                  {crumb.label}
                </Link>}
            </div>)}
        </div>
      </div>

      {}
      <div className='flex items-center gap-1 shrink-0'>
        <Link href='/' target='_blank' className='hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg no-underline transition-all'>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6' />
            <polyline points='15 3 21 3 21 9' />
            <line x1='10' y1='14' x2='21' y2='3' />
          </svg>
          View Store
        </Link>

        {}
        <div className='relative'>
          <button onClick={() => {
          setShowNotifications(!showNotifications);
          setShowProfile(false);
        }} className='relative w-8 h-8 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg transition-all bg-transparent border-none cursor-pointer'>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
              <path d='M13.73 21a2 2 0 01-3.46 0' />
            </svg>
            {unreadCount > 0 && <span className='absolute top-1 right-1 w-3.5 h-3.5 bg-[#D82C0D] text-white text-[8px] font-bold rounded-full flex items-center justify-center'>
                {unreadCount}
              </span>}
          </button>

          {showNotifications && <div className='absolute right-0 top-full mt-2 w-[340px] bg-white border border-[#E1E3E5] rounded-xl shadow-lg overflow-hidden z-50'>
              <div className='flex items-center justify-between px-4 py-3 border-b border-[#E1E3E5]'>
                <div className='flex items-center gap-2'>
                  <span className='font-sora text-[13px] font-semibold text-[#202223]'>
                    Notifications
                  </span>
                  {unreadCount > 0 && <span className='px-1.5 py-0.5 bg-[#D82C0D] text-white text-[10px] font-bold rounded-full'>
                      {unreadCount}
                    </span>}
                </div>
                <button onClick={handleMarkAllRead} className='text-[12px] text-[#008060] hover:text-[#006e52] bg-transparent border-none cursor-pointer'>
                  Mark all read
                </button>
              </div>
              <div className='divide-y divide-[#F1F1F1] max-h-[360px] overflow-y-auto'>
                {notifications.length === 0 ? <div className='flex flex-col items-center justify-center py-10 gap-2'>
                    <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#E1E3E5' strokeWidth='1.5'>
                      <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
                      <path d='M13.73 21a2 2 0 01-3.46 0' />
                    </svg>
                    <p className='text-[12px] text-[#8C9196]'>
                      No notifications
                    </p>
                  </div> : notifications.map(n => <div key={n.id} onClick={() => handleNotificationClick(n)} className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F6F6F7] transition-colors cursor-pointer ${n.unread ? 'bg-[#F2F7F5]/50' : ''}`}>
                      {}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.type === 'order' ? 'bg-[#E3F1EB]' : n.type === 'stock' ? 'bg-[#FFF4CD]' : 'bg-[#EBF5FB]'}`}>
                        {n.type === 'order' && <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#008060' strokeWidth='2'>
                            <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                            <line x1='3' y1='6' x2='21' y2='6' />
                            <path d='M16 10a4 4 0 01-8 0' />
                          </svg>}
                        {n.type === 'stock' && <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#B7791F' strokeWidth='2'>
                            <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
                            <line x1='12' y1='9' x2='12' y2='13' />
                            <line x1='12' y1='17' x2='12.01' y2='17' />
                          </svg>}
                        {n.type === 'customer' && <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#2C6ECB' strokeWidth='2'>
                            <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
                            <circle cx='12' cy='7' r='4' />
                          </svg>}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[12.5px] text-[#202223] leading-snug'>
                          {n.text}
                        </p>
                        <p className='text-[11px] text-[#8C9196] mt-0.5'>
                          {n.time}
                        </p>
                      </div>
                      {n.unread && <span className='w-2 h-2 rounded-full bg-[#008060] shrink-0 mt-1.5' />}
                    </div>)}
              </div>
              <div className='px-4 py-2.5 border-t border-[#E1E3E5] bg-[#FAFAFA]'>
                <button onClick={() => {
              router.push('/dashboard/orders');
              setShowNotifications(false);
            }} className='text-[12px] text-[#6D7175] hover:text-[#202223] bg-transparent border-none cursor-pointer w-full text-center'>
                  View all activity →
                </button>
              </div>
            </div>}
        </div>

        {}
        <div className='relative'>
          <button onClick={() => {
          setShowProfile(!showProfile);
          setShowNotifications(false);
        }} className='flex items-center gap-2 px-2 py-1.5 hover:bg-[#F6F6F7] rounded-lg transition-all bg-transparent border-none cursor-pointer'>
            <div className='w-7 h-7 rounded-full bg-[#008060] flex items-center justify-center text-white text-[11px] font-bold shrink-0'>
              {userInitials}
            </div>
            <span className='hidden sm:block text-[12.5px] font-medium text-[#202223]'>
              {user?.name?.split(' ')[0] ?? 'Admin'}
            </span>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2.5'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </button>

          {showProfile && <div className='absolute right-0 top-full mt-2 w-[200px] bg-white border border-[#E1E3E5] rounded-xl shadow-lg overflow-hidden z-50'>
              <div className='px-4 py-3 border-b border-[#E1E3E5]'>
                <p className='text-[13px] font-semibold text-[#202223]'>
                  {user?.name ?? 'Admin User'}
                </p>
                <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                  {user?.email ?? ''}
                </p>
                <span className='inline-block mt-1 px-2 py-0.5 bg-[#008060]/10 text-[#008060] text-[10px] font-semibold rounded-full capitalize'>
                  {user?.role ?? 'admin'}
                </span>
              </div>
              <div className='py-1'>
                {[{
              label: 'Settings',
              href: '/dashboard/settings'
            }, {
              label: 'Billing',
              href: '/dashboard/settings/billing'
            }].map(item => <Link key={item.label} href={item.href} className='flex items-center px-4 py-2 text-[13px] text-[#202223] hover:bg-[#F6F6F7] no-underline transition-colors' onClick={() => setShowProfile(false)}>
                    {item.label}
                  </Link>)}
              </div>
              <div className='border-t border-[#E1E3E5] py-1'>
                <button className='w-full flex items-center px-4 py-2 text-[13px] text-[#D82C0D] hover:bg-[#F6F6F7] transition-colors bg-transparent border-none cursor-pointer text-left' onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </div>}
        </div>
      </div>

      {(showNotifications || showProfile) && <div className='fixed inset-0 z-40' onClick={() => {
      setShowNotifications(false);
      setShowProfile(false);
    }} />}
    </header>;
}
