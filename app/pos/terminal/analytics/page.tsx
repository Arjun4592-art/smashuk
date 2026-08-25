'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePOSStore } from '@/store/posStore';
import { useAuthStore } from '@/store/authStore';
import { POSAnalyticsSkeleton } from '@/components/ui/Skeleton';
import { fetchPOSOrderHistory, type PosOrderRecord } from '@/lib/api/pos';
const fmt = (n: number) => '£' + n.toLocaleString('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
export default function AnalyticsPage() {
  const cashDrawer = usePOSStore(s => s.cashDrawer);
  const authUser = useAuthStore(s => s.user);
  const [allCompletedOrders, setAllCompletedOrders] = useState<PosOrderRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null);
      const orders = await fetchPOSOrderHistory();
      setAllCompletedOrders(orders);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setMounted(true);
    }
  }, []);
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  if (!mounted) return <POSAnalyticsSkeleton />;
  const isAdmin = authUser?.role === 'admin';
  const completedOrders = isAdmin || !authUser ? allCompletedOrders : allCompletedOrders.filter(o => o.cashier.trim().toLowerCase() === authUser.name.trim().toLowerCase());
  const todayStr = new Date().toDateString();
  const todayOrders = completedOrders.filter(o => new Date(o.completedAt).toDateString() === todayStr);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
  const returnedCount = todayOrders.filter(o => o.returned).length;
  const productMap = new Map<string, {
    name: string;
    brand: string;
    sold: number;
    rev: number;
  }>();
  completedOrders.forEach(o => {
    o.items.forEach(item => {
      const existing = productMap.get(item.product.id) ?? {
        name: item.product.name,
        brand: item.product.brand,
        sold: 0,
        rev: 0
      };
      existing.sold += item.quantity;
      existing.rev += item.product.price * item.quantity;
      productMap.set(item.product.id, existing);
    });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.rev - a.rev).slice(0, 5);
  const payMap = new Map<string, number>();
  completedOrders.forEach(o => {
    payMap.set(o.paymentMethod, (payMap.get(o.paymentMethod) ?? 0) + 1);
  });
  const totalPay = completedOrders.length || 1;
  const payMix = Array.from(payMap.entries()).map(([label, count], i) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    pct: Math.round(count / totalPay * 100),
    color: ['#2C6ECB', '#008060', '#FFC453', '#D82C0D', '#8C9196'][i % 5]
  }));
  const last7: {
    day: string;
    rev: number;
  }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const rev = completedOrders.filter(o => new Date(o.completedAt).toDateString() === dayStr).reduce((s, o) => s + o.total, 0);
    last7.push({
      day: d.toLocaleDateString('en-GB', {
        weekday: 'short'
      }),
      rev
    });
  }
  const maxRev = Math.max(...last7.map(d => d.rev), 1);
  const STAT_CARDS = [{
    label: "Today's Revenue",
    value: fmt(todayRevenue),
    sub: `${todayOrders.length} orders`,
    color: '#008060'
  }, {
    label: 'Avg Order Value',
    value: fmt(avgOrder),
    sub: 'per transaction',
    color: '#2C6ECB'
  }, {
    label: 'Returns Today',
    value: String(returnedCount),
    sub: 'transactions',
    color: '#D82C0D'
  }, {
    label: 'Total Orders',
    value: String(completedOrders.length),
    sub: 'all time',
    color: '#B7791F'
  }];
  return <div className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4'>
      <div>
        <h1 className='text-xl font-semibold' style={{
        color: '#202223'
      }}>Analytics</h1>
        <p className='text-xs mt-0.5' style={{
        color: '#8C9196'
      }}>
          {isAdmin ? 'All staff' : 'Your sales only'}
        </p>
      </div>

      {loadError && <div className='rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2' style={{
      background: '#FEF3F2',
      color: '#D82C0D',
      border: '1px solid #FDA29B'
    }}>
          <span>{loadError}</span>
          <button onClick={loadOrders} className='font-semibold underline shrink-0'>
            Retry
          </button>
        </div>}

      {}
      <div className='grid grid-cols-2 gap-3'>
        {STAT_CARDS.map(s => <div key={s.label} className='rounded-xl p-4' style={{
        background: '#FFFFFF',
        border: '1px solid #E1E3E5'
      }}>
            <p className='text-[11px] font-medium uppercase tracking-wide mb-1' style={{
          color: '#8C9196'
        }}>{s.label}</p>
            <p className='text-xl font-bold' style={{
          color: s.color
        }}>{s.value}</p>
            <p className='text-[11px] mt-0.5' style={{
          color: '#8C9196'
        }}>{s.sub}</p>
          </div>)}
      </div>

      {}
      <div className='rounded-xl p-4' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5'
    }}>
        <p className='text-sm font-semibold mb-4' style={{
        color: '#202223'
      }}>Revenue — last 7 days</p>
        {completedOrders.length === 0 ? <div className='flex items-center justify-center h-28 rounded-lg' style={{
        background: '#F6F6F7'
      }}>
            <p className='text-xs' style={{
          color: '#8C9196'
        }}>No sales data yet — complete a sale to see your chart</p>
          </div> : <div className='flex items-end gap-1.5 h-28'>
            {}
            {last7.map(d => <div key={d.day} className='group relative flex-1 flex flex-col items-center gap-1'>
                <div className='w-full flex flex-col justify-end' style={{
            height: '96px'
          }}>
                  {}
                  <div className='pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-sm z-10' style={{
              background: '#202223',
              color: '#FFFFFF'
            }}>
                    {fmt(d.rev)}
                  </div>
                  <div className='w-full rounded-t-md transition-all duration-500 cursor-default' style={{
              height: `${Math.max(d.rev / maxRev * 100, 4)}%`,
              background: d.day === last7[6].day ? '#008060' : '#B5E4D8'
            }} />
                </div>
                <span className='text-[10px]' style={{
            color: '#8C9196'
          }}>{d.day}</span>
              </div>)}
          </div>}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {}
        <div className='rounded-xl p-4' style={{
        background: '#FFFFFF',
        border: '1px solid #E1E3E5'
      }}>
          <p className='text-sm font-semibold mb-4' style={{
          color: '#202223'
        }}>Payment Mix</p>
          {payMix.length === 0 ? <p className='text-xs py-4 text-center' style={{
          color: '#8C9196'
        }}>No payments yet</p> : <div className='space-y-3'>
              {payMix.map(p => <div key={p.label}>
                  <div className='flex justify-between text-xs mb-1' style={{
              color: '#6D7175'
            }}>
                    <span>{p.label}</span><span>{p.pct}%</span>
                  </div>
                  <div className='h-1.5 rounded-full overflow-hidden' style={{
              background: '#F6F6F7'
            }}>
                    <div className='h-full rounded-full' style={{
                width: `${p.pct}%`,
                background: p.color
              }} />
                  </div>
                </div>)}
            </div>}
        </div>

        {}
        <div className='rounded-xl p-4' style={{
        background: '#FFFFFF',
        border: '1px solid #E1E3E5'
      }}>
          <p className='text-sm font-semibold mb-4' style={{
          color: '#202223'
        }}>Cash Drawer</p>
          {!cashDrawer ? <p className='text-xs py-4 text-center' style={{
          color: '#8C9196'
        }}>Cash drawer not opened</p> : <div className='grid grid-cols-2 gap-3 text-center'>
              {[{
            label: 'Opening',
            value: fmt(cashDrawer.openingCash)
          }, {
            label: 'Movements',
            value: String(cashDrawer.movements.length)
          }, {
            label: 'Status',
            value: cashDrawer.closedAt ? 'Closed' : 'Open'
          }, {
            label: 'Cash In',
            value: fmt(cashDrawer.movements.filter(m => m.type === 'in').reduce((s, m) => s + m.amount, 0))
          }].map(s => <div key={s.label} className='rounded-lg p-2.5' style={{
            background: '#F6F6F7'
          }}>
                  <p className='text-sm font-semibold' style={{
              color: '#202223'
            }}>{s.value}</p>
                  <p className='text-[11px] mt-0.5' style={{
              color: '#8C9196'
            }}>{s.label}</p>
                </div>)}
            </div>}
        </div>
      </div>

      {}
      <div className='rounded-xl overflow-hidden' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5'
    }}>
        <div className='px-4 py-3' style={{
        borderBottom: '1px solid #E1E3E5'
      }}>
          <p className='text-sm font-semibold' style={{
          color: '#202223'
        }}>Top Selling Products</p>
        </div>
        {topProducts.length === 0 ? <div className='flex flex-col items-center py-10 gap-2'>
            <p className='text-sm' style={{
          color: '#8C9196'
        }}>No sales data yet</p>
          </div> : <table className='w-full'>
            <thead>
              <tr style={{
            background: '#F6F6F7'
          }}>
                {['Product', 'Sold', 'Revenue'].map(h => <th key={h} className='px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide' style={{
              color: '#8C9196'
            }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => <tr key={i} style={{
            borderBottom: i < topProducts.length - 1 ? '1px solid #F6F6F7' : 'none'
          }}>
                  <td className='px-4 py-2.5'>
                    <p className='text-sm font-medium' style={{
                color: '#202223'
              }}>{p.name}</p>
                    <p className='text-[11px]' style={{
                color: '#8C9196'
              }}>{p.brand}</p>
                  </td>
                  <td className='px-4 py-2.5 text-sm' style={{
              color: '#202223'
            }}>{p.sold}</td>
                  <td className='px-4 py-2.5 text-sm font-semibold' style={{
              color: '#008060'
            }}>{fmt(p.rev)}</td>
                </tr>)}
            </tbody>
          </table>}
      </div>
    </div>;
}
