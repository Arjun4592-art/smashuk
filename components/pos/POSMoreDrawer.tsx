'use client';
import { useEffect, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon, ChevronRightIcon, BoltIcon } from '@/components/ui/Icons';
interface Props {
  user: any;
  open: boolean;
  onClose: () => void;
  onCashDrawer: () => void;
  onStaffManagement: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}
export default function POSMoreDrawer({
  user,
  open,
  onClose,
  onCashDrawer,
  onStaffManagement,
  onOpenProfile,
  onLogout
}: Props) {
  const router = useRouter();
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  const MORE_ITEMS: {
    id: string;
    label: string;
    hidden?: boolean;
    Icon: () => JSX.Element;
    action: () => void;
  }[] = [{
    id: 'customers',
    label: 'Customers',
    Icon: () => <UserIcon size={20} />,
    action: () => {
      router.push('/pos/terminal/customers');
      onClose();
    }
  }, {
    id: 'connectivity',
    label: 'Connectivity',
    Icon: () => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <circle cx='12' cy='12' r='2' />
          <path d='M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12' />
        </svg>,
    action: onClose
  }, {
    id: 'analytics',
    label: 'Analytics',
    Icon: () => <BoltIcon size={20} />,
    action: () => {
      router.push('/pos/terminal/analytics');
      onClose();
    }
  }, {
    id: 'register',
    label: 'Register',
    Icon: () => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <rect x='2' y='7' width='20' height='14' rx='2' />
          <path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' />
          <line x1='12' y1='12' x2='12' y2='16' />
          <line x1='10' y1='14' x2='14' y2='14' />
        </svg>,
    action: () => {
      onCashDrawer();
      onClose();
    }
  }, {
    id: 'staff',
    label: 'Staff',
    hidden: user?.role !== 'admin',
    Icon: () => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
          <circle cx='9' cy='7' r='4' />
          <path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' />
        </svg>,
    action: () => {
      onStaffManagement();
      onClose();
    }
  }, {
    id: 'settings',
    label: 'Settings',
    Icon: () => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <circle cx='12' cy='12' r='3' />
          <path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' />
        </svg>,
    action: () => {
      router.push('/pos/terminal/settings');
      onClose();
    }
  }, {
    id: 'support',
    label: 'Support',
    Icon: () => <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <circle cx='12' cy='12' r='10' />
          <path d='M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3' />
          <line x1='12' y1='17' x2='12.01' y2='17' />
        </svg>,
    action: onClose
  }];
  if (!open) return null;
  return <>
      {}
      <div className='lg:hidden fixed inset-0 z-40' style={{
      background: 'rgba(0,0,0,0.4)'
    }} onClick={onClose} />

      {}
      <div className='lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden' style={{
      background: '#F2F2F7',
      paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      maxHeight: '85vh',
      overflowY: 'auto',
      animation: 'pos-sheet-up 0.25s ease-out'
    }}>
        <style>{`
          @keyframes pos-sheet-up {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {}
        <div className='flex justify-center pt-3 pb-1'>
          <div className='w-10 h-1 rounded-full' style={{
          background: '#C7C7CC'
        }} />
        </div>

        {}
        <div className='mx-4 mt-2 mb-3 rounded-xl overflow-hidden' style={{
        background: '#FFFFFF'
      }}>
          <div className='flex items-center justify-between p-4'>
            <button onClick={() => {
            onOpenProfile();
            onClose();
          }} className='flex-1 text-left'>
              <p className='text-base font-semibold' style={{
              color: '#202223'
            }}>
                {user?.name || 'Staff'}
              </p>
              <p className='text-sm mt-0.5' style={{
              color: '#8C9196'
            }}>
                Smash Racket Pro Store
              </p>
              <span className='inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full' style={{
              background: '#007AFF',
              color: '#fff'
            }}>
                Pro
              </span>
            </button>
            <button onClick={onClose} className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0' style={{
            background: '#E5E5EA',
            color: '#000'
          }}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
        </div>

        {}
        <div className='mx-4 rounded-xl overflow-hidden' style={{
        background: '#FFFFFF'
      }}>
          {MORE_ITEMS.filter(item => !item.hidden).map(({
          id,
          label,
          Icon,
          action
        }, i, arr) => <button key={id} onClick={action} className='w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#F6F6F7] transition-colors active:bg-[#EFEFF4]' style={{
          borderBottom: i < arr.length - 1 ? '0.5px solid #E5E5EA' : 'none'
        }}>
                <span style={{
            color: '#000'
          }}>
                  <Icon />
                </span>
                <span className='flex-1 text-base' style={{
            color: '#000'
          }}>
                  {label}
                </span>
                <ChevronRightIcon size={16} className='text-[#C7C7CC]' />
              </button>)}
        </div>

        {}
        <div className='mx-4 mt-3 mb-2 rounded-xl overflow-hidden' style={{
        background: '#FFFFFF'
      }}>
          <button onClick={() => {
          onLogout();
          onClose();
        }} className='w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#FFF4F4] transition-colors'>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#D82C0D' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' />
              <polyline points='16 17 21 12 16 7' />
              <line x1='21' y1='12' x2='9' y2='12' />
            </svg>
            <span className='text-base font-medium' style={{
            color: '#D82C0D'
          }}>
              Sign out
            </span>
          </button>
        </div>
      </div>
    </>;
}
