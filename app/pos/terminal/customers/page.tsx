'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchPOSCustomers } from '@/lib/api/pos';
import type { POSCustomer } from '@/store/posStore';
import { POSCustomerRowSkeleton } from '@/components/ui/Skeleton';
import CustomerSearch from '@/components/pos/CustomerSearch';
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const loadCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await fetchPOSCustomers(q);
      setCustomers(data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);
  useEffect(() => {
    const t = setTimeout(() => loadCustomers(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, loadCustomers]);
  return <div className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold' style={{
        color: '#202223'
      }}>Customers</h1>
        <button onClick={() => setShowAddCustomer(true)} className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium' style={{
        background: '#008060',
        color: '#FFFFFF'
      }}>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
          </svg>
          Add Customer
        </button>
      </div>

      {}
      <div className='flex items-center gap-2 px-3 py-2 rounded-lg border bg-white' style={{
      borderColor: '#E1E3E5'
    }}>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5'>
          <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name, phone or email...' className='flex-1 bg-transparent outline-none text-sm' style={{
        color: '#202223'
      }} />
      </div>

      {}
      <div className='rounded-xl overflow-hidden' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5'
    }}>
        {loading ? [...Array(6)].map((_, i) => <POSCustomerRowSkeleton key={i} />) : customers.length === 0 ? <div className='flex flex-col items-center py-12 gap-2'>
            <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#E1E3E5' strokeWidth='1.5'>
              <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
              <circle cx='12' cy='7' r='4' />
            </svg>
            <p className='text-sm' style={{
          color: '#8C9196'
        }}>
              {search ? 'No customers found' : 'No customers yet'}
            </p>
            {!search && <button onClick={() => setShowAddCustomer(true)} className='text-xs font-medium mt-1' style={{
          color: '#008060'
        }}>
                + Add first customer
              </button>}
          </div> : customers.map((c, i) => <div key={c.id} className='flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F6F6F7]' style={{
        borderBottom: i < customers.length - 1 ? '1px solid #F6F6F7' : 'none'
      }}>
              <div className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0' style={{
          background: '#E3F1EB',
          color: '#008060'
        }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate' style={{
            color: '#202223'
          }}>{c.name}</p>
                <p className='text-xs' style={{
            color: '#8C9196'
          }}>
                  {c.phone ?? c.email ?? '—'} · {c.totalOrders} orders
                </p>
              </div>
              <div className='text-right shrink-0'>
                <p className='text-sm font-semibold' style={{
            color: '#008060'
          }}>
                  £{c.totalSpent.toLocaleString('en-GB', {
              minimumFractionDigits: 2
            })}
                </p>
              </div>
            </div>)}
      </div>

      {showAddCustomer && <CustomerSearch onClose={() => {
      setShowAddCustomer(false);
      loadCustomers();
    }} />}
    </div>;
}
