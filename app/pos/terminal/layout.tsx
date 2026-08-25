'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePOSStore } from '@/store/posStore';
import { useAuthStore } from '@/store/authStore';
import POSNavBar from '@/components/pos/POSNavBar';
import POSBottomTabs from '@/components/pos/POSBottomTabs';
import POSMoreDrawer from '@/components/pos/POSMoreDrawer';
import CashDrawer from '@/components/pos/CashDrawer';
import StaffManagement from '@/components/pos/StaffManagement';
import AuthProvider from '@/components/providers/AuthProvider';
type Tab = 'billing' | 'orders' | 'products' | 'analytics' | 'customers' | 'settings';
const TAB_ROUTES: Record<Tab, string> = {
  billing: '/pos/terminal/billing',
  orders: '/pos/terminal/orders',
  products: '/pos/terminal/products',
  analytics: '/pos/terminal/analytics',
  customers: '/pos/terminal/customers',
  settings: '/pos/terminal/settings'
};
function getTabFromPath(pathname: string): Tab {
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/products')) return 'products';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/customers')) return 'customers';
  if (pathname.includes('/settings')) return 'settings';
  return 'billing';
}
export default function POSTerminalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    itemCount,
    cashDrawer,
    fetchStoreSettings,
    storeSettingsLoaded
  } = usePOSStore();
  const authUser = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const tab = getTabFromPath(pathname);
  useEffect(() => {
    if (!storeSettingsLoaded) fetchStoreSettings();
  }, [storeSettingsLoaded, fetchStoreSettings]);
  useEffect(() => {
    if (!authUser || authUser.role !== 'admin' && authUser.role !== 'staff') {
      router.replace('/pos');
    }
  }, [authUser, router]);
  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab === tab) return;
    setIsNavigating(true);
    router.push(TAB_ROUTES[newTab]);
    setTimeout(() => setIsNavigating(false), 300);
  }, [tab, router]);
  const handleLogout = () => {
    logout('pos');
    sessionStorage.removeItem('pos_authenticated');
    sessionStorage.removeItem('pos_user');
    router.replace('/pos');
  };
  if (!authUser || authUser.role !== 'admin' && authUser.role !== 'staff') {
    return null;
  }
  return <AuthProvider surface='pos'>
      <div className='flex flex-col h-[100dvh] overflow-hidden' style={{
      background: '#F6F6F7'
    }}>
        <POSNavBar user={authUser} tab={tab} setTab={handleTabChange} itemCount={itemCount} onLogout={handleLogout} onCashDrawer={() => setShowCashDrawer(true)} cashDrawerOpen={!!cashDrawer && !cashDrawer.closedAt} />

        <main className='flex-1 min-h-0 overflow-hidden transition-opacity duration-200 flex flex-col' style={{
        opacity: isNavigating ? 0 : 1
      }}>
          {children}
        </main>

        <POSBottomTabs tab={tab} setTab={handleTabChange} itemCount={itemCount} onMore={() => setShowMoreDrawer(true)} />

        <POSMoreDrawer user={authUser} open={showMoreDrawer} onClose={() => setShowMoreDrawer(false)} onOpenProfile={() => {
        setShowStaff(true);
        setShowMoreDrawer(false);
      }} onCashDrawer={() => {
        setShowCashDrawer(true);
        setShowMoreDrawer(false);
      }} onStaffManagement={() => {
        if (authUser?.role !== 'admin') return;
        setShowStaff(true);
        setShowMoreDrawer(false);
      }} onLogout={handleLogout} />

        {showCashDrawer && <CashDrawer onClose={() => setShowCashDrawer(false)} />}
        {showStaff && authUser?.role === 'admin' && <StaffManagement onClose={() => setShowStaff(false)} />}
      </div>
    </AuthProvider>;
}
