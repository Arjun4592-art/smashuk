'use client';
import { useMemo, useState } from 'react';
import { useMedusaProducts } from '@/hooks/useProducts';
import { normalizeProduct, isNewArrival } from '@/lib/api/store';
import ProductGrid from '@/components/website/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';
const TABS: {
  label: string;
  sport: string;
}[] = [{
  label: 'Tennis',
  sport: 'tennis'
}, {
  label: 'Badminton',
  sport: 'badminton'
}, {
  label: 'Padel',
  sport: 'padel'
}];
export default function LocalStoreNewArrivals() {
  const {
    data,
    isLoading
  } = useMedusaProducts({
    limit: 48
  });
  const [activeSport, setActiveSport] = useState(TABS[0].sport);
  const products: Product[] = useMemo(() => (data?.products ?? []).map(normalizeProduct).filter((p: Product) => p.inStock), [data]);
  const bySport = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    for (const tab of TABS) {
      const sportProducts = products.filter(p => p.sport === tab.sport);
      const fresh = sportProducts.filter(isNewArrival);
      grouped[tab.sport] = (fresh.length > 0 ? fresh : sportProducts).slice(0, 8);
    }
    return grouped;
  }, [products]);
  const availableTabs = TABS.filter(t => bySport[t.sport]?.length > 0);
  if (isLoading) {
    return <div className='mb-16'>
        <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-1'>
          New Products In-Store
        </h2>
        <p className='text-gray-500 font-lato text-center mb-8'>
          A taste of what's just landed on the shelves
        </p>
        <ProductGridSkeleton count={4} columns={4} />
      </div>;
  }
  if (availableTabs.length === 0) return null;
  const active = availableTabs.some(t => t.sport === activeSport) ? activeSport : availableTabs[0].sport;
  return <div className='mb-16'>
      <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] text-center mb-1'>
        New Products In-Store
      </h2>
      <p className='text-gray-500 font-lato text-center mb-8'>
        A taste of what's just landed on the shelves
      </p>

      <div className='flex items-center justify-center gap-2 mb-8'>
        {availableTabs.map(tab => <button key={tab.sport} type='button' onClick={() => setActiveSport(tab.sport)} className={`font-montserrat font-bold text-sm px-5 py-2 rounded-full border transition-colors ${active === tab.sport ? 'bg-[#0A1F44] text-white border-[#0A1F44]' : 'bg-white text-[#0A1F44] border-gray-200 hover:border-[#0A1F44]/40'}`}>
            {tab.label}
          </button>)}
      </div>

      <ProductGrid products={bySport[active] ?? []} showSort={false} showViewToggle={false} columns={4} />
    </div>;
}
