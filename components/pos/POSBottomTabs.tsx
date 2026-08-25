'use client';

import { CartIcon, ListIcon, PackageIcon, BoltIcon } from '@/components/ui/Icons';
type BottomTab = 'billing' | 'orders' | 'products' | 'analytics';
type Tab = BottomTab | 'customers' | 'settings';
interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  itemCount: number;
  onMore: () => void;
}
const TABS = [{
  id: 'billing' as BottomTab,
  label: 'Billing',
  Icon: ({
    active
  }: {
    active: boolean;
  }) => <CartIcon size={24} className={active ? 'text-[#007AFF]' : 'text-[#8E8E93]'} />
}, {
  id: 'orders' as BottomTab,
  label: 'Orders',
  Icon: ({
    active
  }: {
    active: boolean;
  }) => <ListIcon size={24} className={active ? 'text-[#007AFF]' : 'text-[#8E8E93]'} />
}, {
  id: 'products' as BottomTab,
  label: 'Products',
  Icon: ({
    active
  }: {
    active: boolean;
  }) => <PackageIcon size={24} className={active ? 'text-[#007AFF]' : 'text-[#8E8E93]'} />
}, {
  id: 'analytics' as BottomTab,
  label: 'Analytics',
  Icon: ({
    active
  }: {
    active: boolean;
  }) => <BoltIcon size={24} className={active ? 'text-[#007AFF]' : 'text-[#8E8E93]'} />
}];
export default function POSBottomTabs({
  tab,
  setTab,
  itemCount,
  onMore
}: Props) {
  return (<nav className='lg:hidden shrink-0 flex items-stretch' style={{
      background: '#F9F9F9',
      borderTop: '0.5px solid #D1D1D6',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)'
    }}>
      {TABS.map(({
        id,
        label,
        Icon
      }) => {
        const isActive = tab === id;
        return <button key={id} onClick={() => setTab(id)} className='flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-2 relative' style={{
          minHeight: 56
        }}>
            {}
            {isActive && <span className='absolute top-0 rounded-b' style={{
            left: '25%',
            right: '25%',
            height: 2,
            background: '#007AFF'
          }} />}

            {}
            {id === 'billing' && itemCount > 0 && <span className='absolute rounded-full text-white font-bold flex items-center justify-center' style={{
            top: 4,
            right: 'calc(50% - 22px)',
            minWidth: 16,
            height: 16,
            fontSize: 9,
            background: '#007AFF',
            padding: '0 4px'
          }}>
                {itemCount}
              </span>}

            <Icon active={isActive} />

            <span className='text-[10px] font-medium' style={{
            color: isActive ? '#007AFF' : '#8E8E93'
          }}>
              {label}
            </span>
          </button>;
      })}

      {}
      <button onClick={onMore} className='flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-2' style={{
        minHeight: 56
      }}>
        <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#8E8E93' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
          <circle cx='5' cy='12' r='1' />
          <circle cx='12' cy='12' r='1' />
          <circle cx='19' cy='12' r='1' />
        </svg>
        <span className='text-[10px] font-medium' style={{
          color: '#8E8E93'
        }}>
          More
        </span>
      </button>
    </nav>
  );
}
