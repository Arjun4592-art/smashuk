import { CURRENCY_SYMBOL } from '@/lib/constants';
import { usePOSStore } from '@/store/posStore';
export interface POSProduct {
  id: string;
  name: string;
  brand: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  description?: string;
  channel?: 'both' | 'online_only' | 'pos_only';
  posPrice?: number;
  variantId?: string;
}
interface Props {
  products: POSProduct[];
  onAdd: (product: POSProduct) => void;
}
export default function ProductGrid({
  products,
  onAdd
}: Props) {
  const showStockCount = usePOSStore(s => s.showStockCount);
  if (products.length === 0) {
    return <div className='flex flex-col items-center justify-center py-16 gap-3'>
        <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5'>
          <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
        </svg>
        <p className='text-sm' style={{
        color: '#8C9196'
      }}>
          No products found
        </p>
      </div>;
  }
  return <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
      {products.map(p => {
      const isOut = p.stock === 0;
      const isLow = p.stock > 0 && p.stock <= 3;
      return <button key={p.id} onClick={() => !isOut && onAdd(p)} disabled={isOut} title={p.name} className='flex flex-col p-3 rounded-lg border text-left transition-all' style={{
        background: '#FFFFFF',
        borderColor: '#E1E3E5',
        opacity: isOut ? 0.5 : 1,
        cursor: isOut ? 'not-allowed' : 'pointer'
      }} onMouseEnter={e => {
        if (!isOut) {
          e.currentTarget.style.borderColor = '#008060';
          e.currentTarget.style.background = '#F2F7F5';
        }
      }} onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E1E3E5';
        e.currentTarget.style.background = '#FFFFFF';
      }}>
            {}
            <div className='w-full aspect-square rounded-md flex items-center justify-center mb-2 overflow-hidden' style={{
          background: '#F6F6F7'
        }}>
              {p.image ? <img src={p.image} alt={p.name} className='w-full h-full object-cover' onError={e => {
            e.currentTarget.style.display = 'none';
            const svg = e.currentTarget.parentElement?.querySelector('svg');
            if (svg) svg.style.display = '';
          }} /> : null}
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5' style={{
            display: p.image ? 'none' : undefined
          }}>
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <line x1='3' y1='6' x2='21' y2='6' />
                <path d='M16 10a4 4 0 01-8 0' />
              </svg>
            </div>

            {}
            <p className='text-xs font-medium leading-tight line-clamp-2 mb-0.5' style={{
          color: '#202223'
        }}>
              {p.name}
            </p>

            {}
            <p className='text-[11px] mb-1.5' style={{
          color: '#8C9196'
        }}>
              {p.brand}
            </p>

            {}
            <p className='text-sm font-semibold mb-1' style={{
          color: '#202223'
        }}>
              {CURRENCY_SYMBOL}
              {p.price.toLocaleString('en-GB')}
            </p>

            {}
            {(showStockCount || isOut) && <div className='flex items-center gap-1'>
                <div className='w-1.5 h-1.5 rounded-full shrink-0' style={{
            background: isOut ? '#D82C0D' : isLow ? '#FFC453' : '#008060'
          }} />
                <p className='text-[10px]' style={{
            color: isOut ? '#D82C0D' : isLow ? '#B7791F' : '#6D7175'
          }}>
                  {isOut ? 'Out of stock' : showStockCount ? isLow ? `Only ${p.stock} left` : `${p.stock} in stock` : ''}
                </p>
              </div>}
          </button>;
    })}
    </div>;
}
