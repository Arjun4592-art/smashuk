'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { useCustomers } from '@/hooks/useDashboard';
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#008060]/10 text-[#008060]',
  inactive: 'bg-[#6D7175]/10 text-[#6D7175]',
  blocked: 'bg-[#D82C0D]/10 text-[#D82C0D]'
};
const STATUS_DOT: Record<string, string> = {
  active: 'bg-[#008060]',
  inactive: 'bg-[#6D7175]',
  blocked: 'bg-[#D82C0D]'
};
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}
function SearchIcon() {
  return <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='11' cy='11' r='7.5' />
      <path d='M18.5 18.5L22 22' />
    </svg>;
}
function CloseIcon() {
  return <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M18 6L6 18M6 6l12 12' />
    </svg>;
}
function ExportIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
      <polyline points='7 10 12 15 17 10' />
      <line x1='12' y1='15' x2='12' y2='3' />
    </svg>;
}
function PlusIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M12 4v16M4 12h16' />
    </svg>;
}
function EditIcon() {
  return <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>;
}
function ChevronLeftIcon() {
  return <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M15 18l-6-6 6-6' />
    </svg>;
}
function ChevronRightIcon() {
  return <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M9 18l6-6-6-6' />
    </svg>;
}
function TotalCustomersIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>;
}
function ActiveCustomersIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='10' />
      <path d='M8 12l3 3 5-6' />
    </svg>;
}
function VIPIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 2l2.88 6.26L22 9.27l-5.5 5.13 1.38 7.6L12 18.4l-5.88 3.6 1.38-7.6L2 9.27l7.12-1.01L12 2z' />
    </svg>;
}
function RevenueIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
    </svg>;
}
function AlertIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <path d='M12 9v5M12 17h.01' />
    </svg>;
}
function SegmentIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='3' />
      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
    </svg>;
}
function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}
function EmptyCustomersIcon() {
  return <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#C4C8CC' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>;
}
function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  loading
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) {
  return <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200'>
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className='font-sora text-[22px] font-bold text-[#202223] leading-tight tracking-tight'>
          {loading ? <span className='inline-block w-16 h-6 bg-[#F1F1F1] rounded animate-pulse' /> : value}
        </p>
        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>{label}</p>
      </div>
    </div>;
}
function CustomersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') ?? 'customers';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data,
    loading,
    error,
    refetch
  } = useCustomers({
    limit: 100,
    q: search || undefined
  });
  const customers = data?.customers ?? [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const handleAddCustomer = async () => {
    if (!addForm.email.trim()) return;
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: addForm.email.trim(),
          first_name: addForm.firstName.trim() || undefined,
          last_name: addForm.lastName.trim() || undefined,
          phone: addForm.phone.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add customer');
      toast.success('Customer added');
      setShowAddModal(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
      });
      refetch();
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to add customer');
    } finally {
      setAddSaving(false);
    }
  };
  const [editingCustomer, setEditingCustomer] = useState<typeof customers[number] | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const openEditModal = (customer: typeof customers[number]) => {
    const [firstName, ...rest] = customer.name.split(' ');
    setEditingCustomer(customer);
    setEditForm({
      firstName: firstName ?? '',
      lastName: rest.join(' '),
      email: customer.email,
      phone: customer.phone ?? ''
    });
    setEditError('');
  };
  const handleEditCustomer = async () => {
    if (!editingCustomer || !editForm.email.trim()) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/admin/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: editForm.email.trim(),
          first_name: editForm.firstName.trim() || undefined,
          last_name: editForm.lastName.trim() || undefined,
          phone: editForm.phone.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update customer');
      toast.success('Customer updated');
      setEditingCustomer(null);
      refetch();
    } catch (err: any) {
      setEditError(err.message ?? 'Failed to update customer');
    } finally {
      setEditSaving(false);
    }
  };
  const handleExportCsv = () => {
    if (customers.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const rows = customers.map((c: typeof customers[number]) => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      City: c.city,
      Status: c.status,
      'Total Orders': c.totalOrders,
      'Total Spent': c.totalSpent,
      'Joined At': c.joinedAt
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} customers`);
  };
  const filtered = customers.filter((c: typeof customers[number]) => {
    const matchStatus = statusFilter === 'All' || c.status === statusFilter.toLowerCase();
    return matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalRevenue = customers.reduce((s: number, c: typeof customers[number]) => s + c.totalSpent, 0);
  const vipCustomers = customers.filter((c: typeof customers[number]) => c.totalSpent > 300).length;

  // Segments
  type Customer = typeof customers[number];
  const SEGMENTS: {
    id: string;
    label: string;
    description: string;
    color: string;
    filter: (c: Customer) => boolean;
  }[] = [{
    id: 'vip',
    label: 'VIP Customers',
    description: 'Spent over £300 lifetime',
    color: 'amber',
    filter: c => c.totalSpent > 300
  }, {
    id: 'active',
    label: 'Active',
    description: 'Current status is active',
    color: 'emerald',
    filter: c => c.status === 'active'
  }, {
    id: 'at-risk',
    label: 'At Risk',
    description: 'No order in the last 60 days',
    color: 'orange',
    filter: c => c.status !== 'blocked' && daysSince(c.joinedAt) > 60 && c.totalOrders > 0 && daysSince(c.lastOrder) > 60
  }, {
    id: 'new',
    label: 'New',
    description: 'Joined in the last 30 days',
    color: 'blue',
    filter: c => daysSince(c.joinedAt) <= 30
  }, {
    id: 'repeat',
    label: 'Repeat Buyers',
    description: '2 or more orders placed',
    color: 'violet',
    filter: c => c.totalOrders >= 2
  }, {
    id: 'no-orders',
    label: 'No Orders Yet',
    description: "Haven't placed an order",
    color: 'gray',
    filter: c => c.totalOrders === 0
  }, {
    id: 'blocked',
    label: 'Blocked',
    description: 'Blocked from ordering',
    color: 'red',
    filter: c => c.status === 'blocked'
  }];
  const SEGMENT_STYLES: Record<string, {
    bg: string;
    text: string;
  }> = {
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600'
    },
    emerald: {
      bg: 'bg-[#008060]/8',
      text: 'text-[#008060]'
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600'
    },
    blue: {
      bg: 'bg-[#2C6ECB]/8',
      text: 'text-[#2C6ECB]'
    },
    violet: {
      bg: 'bg-violet-50',
      text: 'text-violet-600'
    },
    gray: {
      bg: 'bg-[#F6F6F7]',
      text: 'text-[#6D7175]'
    },
    red: {
      bg: 'bg-[#D82C0D]/8',
      text: 'text-[#D82C0D]'
    }
  };
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const activeSegment = SEGMENTS.find(s => s.id === selectedSegment) ?? null;
  const segmentCustomers = activeSegment ? customers.filter(activeSegment.filter) : [];
  const handleExportSegment = () => {
    if (!activeSegment || segmentCustomers.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const rows = segmentCustomers.map((c: Customer) => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      City: c.city,
      Status: c.status,
      'Total Orders': c.totalOrders,
      'Total Spent': c.totalSpent,
      'Joined At': c.joinedAt
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segment-${activeSegment.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} customers`);
  };
  function setTab(tab: string) {
    if (tab === 'customers') router.push('/dashboard/customers');else router.push(`/dashboard/customers?view=${tab}`);
  }
  const ALL_STATUSES = ['All', 'Active', 'Inactive', 'Blocked'];
  return <div className='space-y-5'>
      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>
            Customers
          </h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            {data?.count ?? 0} customers total
          </p>
        </div>
        <div className='flex items-center gap-2.5'>
          <button onClick={handleExportCsv} className='inline-flex items-center gap-2 px-3.5 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer shadow-sm'>
            <ExportIcon />
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] text-white text-[13px] font-medium rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#008060]/20'>
            <PlusIcon />
            Add Customer
          </button>
        </div>
      </div>

      {}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard label='Total Customers' value={customers.length} icon={<TotalCustomersIcon />} iconBg='bg-[#2C6ECB]/8' iconColor='text-[#2C6ECB]' loading={loading} />
        <StatCard label='Active' value={customers.filter((c: typeof customers[number]) => c.status === 'active').length} icon={<ActiveCustomersIcon />} iconBg='bg-[#008060]/8' iconColor='text-[#008060]' loading={loading} />
        <StatCard label='VIP Customers' value={vipCustomers} icon={<VIPIcon />} iconBg='bg-amber-50' iconColor='text-amber-600' loading={loading} />
        <StatCard label='Total Revenue' value={formatCurrency(totalRevenue)} icon={<RevenueIcon />} iconBg='bg-[#F6F6F7]' iconColor='text-[#6D7175]' loading={loading} />
      </div>

      {}
      {error && <div className='flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          <AlertIcon />
          Failed to load customers: {error}
        </div>}

      {}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
        {}
        <div className='flex items-center border-b border-[#E1E3E5] px-4 gap-0.5'>
          {[{
          id: 'customers',
          label: 'All Customers',
          count: customers.length
        }, {
          id: 'segments',
          label: 'Segments',
          count: SEGMENTS.length
        }].map(tab => <button key={tab.id} onClick={() => setTab(tab.id)} className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${view === tab.id ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#8C9196] hover:text-[#202223]'}`}>
              {tab.label}
              <span className='ml-1.5 text-[10.5px] text-[#B0B5BA]'>
                {tab.count}
              </span>
            </button>)}
        </div>

        {view === 'customers' && <>
            {}
            <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
              <div className='flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F8F9FA] focus-within:border-[#008060] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#008060]/10 transition-all duration-150'>
                <SearchIcon />
                <input type='text' placeholder='Search customers...' value={search} onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }} className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#B0B5BA] outline-none' />
                {search && <button onClick={() => setSearch('')} className='text-[#B0B5BA] hover:text-[#6D7175] bg-transparent border-none cursor-pointer transition-colors p-0.5'>
                    <CloseIcon />
                  </button>}
              </div>
              <select value={statusFilter} onChange={e => {
            setStatusFilter(e.target.value);
            setPage(1);
          }} className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'>
                {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {}
            <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4 gap-0.5'>
              {ALL_STATUSES.map(s => <button key={s} onClick={() => {
            setStatusFilter(s);
            setPage(1);
          }} className={`px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${statusFilter === s ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#8C9196] hover:text-[#202223]'}`}>
                  {s}
                  <span className='ml-1.5 text-[10.5px] text-[#B0B5BA]'>
                    {s === 'All' ? customers.length : customers.filter((c: typeof customers[number]) => c.status === s.toLowerCase()).length}
                  </span>
                </button>)}
            </div>

            {}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-[#E1E3E5] bg-[#FAFAFA]'>
                    {['Customer', 'Location', 'Orders', 'Total Spent', 'Last Order', 'Status', ''].map((h, i) => <th key={i} className={`px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider ${i === 6 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>)}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#F5F5F5]'>
                  {loading ? [...Array(8)].map((_, i) => <tr key={i} className='animate-pulse'>
                        <td className='px-4 py-3.5'>
                          <div className='flex items-center gap-3'>
                            <div className='w-8 h-8 bg-[#F1F1F1] rounded-full shrink-0' />
                            <div className='space-y-2'>
                              <div className='w-28 h-2.5 bg-[#F1F1F1] rounded-full' />
                              <div className='w-20 h-2.5 bg-[#F1F1F1] rounded-full' />
                            </div>
                          </div>
                        </td>
                        {[20, 8, 20, 24, 16, 14].map((w, j) => <td key={j} className='px-4 py-3.5'>
                            <div className={`w-${w} h-2.5 bg-[#F1F1F1] rounded-full`} />
                          </td>)}
                      </tr>) : paginated.length === 0 ? <tr>
                      <td colSpan={7} className='px-4 py-16 text-center'>
                        <div className='flex flex-col items-center gap-3'>
                          <EmptyCustomersIcon />
                          <div>
                            <p className='text-[14px] font-medium text-[#202223]'>
                              No customers found
                            </p>
                            <p className='text-[13px] text-[#8C9196] mt-0.5'>
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr> : paginated.map((customer: typeof customers[number]) => <tr key={customer.id} className='hover:bg-[#FAFAFA] transition-colors duration-100 group'>
                        {}
                        <td className='px-4 py-3.5'>
                          <div className='flex items-center gap-3'>
                            <div className='w-8 h-8 rounded-full bg-[#008060] flex items-center justify-center text-white text-[11px] font-bold shrink-0 ring-2 ring-[#008060]/10'>
                              {customer.avatar}
                            </div>
                            <div className='min-w-0'>
                              <p className='text-[13px] font-medium text-[#202223]'>
                                {customer.name}
                              </p>
                              <p className='text-[11px] text-[#B0B5BA] truncate mt-0.5'>
                                {customer.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <p className='text-[13px] text-[#202223]'>
                            {customer.city || '—'}
                          </p>
                          <p className='text-[11px] text-[#B0B5BA] mt-0.5'>
                            {customer.state}
                          </p>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <span className='text-[13px] font-semibold text-[#202223]'>
                            {customer.totalOrders}
                          </span>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <span className='text-[13px] font-semibold text-[#202223]'>
                            {formatCurrency(customer.totalSpent)}
                          </span>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <span className='text-[12.5px] text-[#8C9196]'>
                            {customer.lastOrder}
                          </span>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[customer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[customer.status] ?? 'bg-gray-400'}`} />
                            {customer.status}
                          </span>
                        </td>

                        {}
                        <td className='px-4 py-3.5'>
                          <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150'>
                            <button onClick={() => openEditModal(customer)} className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F0F0F0] rounded-lg transition-all duration-150 bg-transparent border-none cursor-pointer' title='Edit'>
                              <EditIcon />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                </tbody>
              </table>
            </div>

            {}
            <div className='flex items-center justify-between px-4 py-3 border-t border-[#F1F1F1]'>
              <p className='text-[12.5px] text-[#8C9196]'>
                Showing{' '}
                <span className='font-medium text-[#202223]'>
                  {Math.min((page - 1) * pageSize + 1, filtered.length)}–
                  {Math.min(page * pageSize, filtered.length)}
                </span>{' '}
                of{' '}
                <span className='font-medium text-[#202223]'>
                  {filtered.length}
                </span>
              </p>
              <div className='flex items-center gap-1'>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#8C9196] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
                  <ChevronLeftIcon />
                </button>
                {Array.from({
              length: Math.min(totalPages, 5)
            }).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-medium cursor-pointer transition-all duration-150 ${page === i + 1 ? 'bg-[#008060] text-white border-none shadow-sm shadow-[#008060]/20' : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}>
                    {i + 1}
                  </button>)}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#8C9196] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>}

        {view === 'segments' && <div className='p-4 space-y-4'>
            {}
            <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
              {SEGMENTS.map(seg => {
            const count = customers.filter(seg.filter).length;
            const style = SEGMENT_STYLES[seg.color];
            const isActive = selectedSegment === seg.id;
            return <button key={seg.id} onClick={() => setSelectedSegment(isActive ? null : seg.id)} className={`text-left bg-white border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${isActive ? 'border-[#008060] ring-2 ring-[#008060]/15' : 'border-[#E1E3E5]'}`}>
                    <div className={`w-9 h-9 ${style.bg} rounded-lg flex items-center justify-center ${style.text} shrink-0`}>
                      <SegmentIcon />
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <p className='text-[13px] font-semibold text-[#202223]'>
                          {seg.label}
                        </p>
                        <span className='text-[11px] font-medium text-[#8C9196]'>
                          {loading ? '—' : count}
                        </span>
                      </div>
                      <p className='text-[11.5px] text-[#8C9196] mt-0.5 leading-snug'>
                        {seg.description}
                      </p>
                    </div>
                  </button>;
          })}
            </div>

            {}
            {activeSegment && <div className='border border-[#E1E3E5] rounded-xl overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-3 bg-[#FAFAFA] border-b border-[#E1E3E5]'>
                  <div>
                    <p className='text-[13px] font-semibold text-[#202223]'>
                      {activeSegment.label}{' '}
                      <span className='text-[#8C9196] font-normal'>
                        ({segmentCustomers.length})
                      </span>
                    </p>
                    <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                      {activeSegment.description}
                    </p>
                  </div>
                  <button onClick={handleExportSegment} className='inline-flex items-center gap-2 px-3 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[12.5px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer shadow-sm'>
                    <ExportIcon />
                    Export
                  </button>
                </div>
                {segmentCustomers.length === 0 ? <div className='px-5 py-14 text-center'>
                    <p className='text-[13px] text-[#8C9196]'>
                      No customers match this segment yet
                    </p>
                  </div> : <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b border-[#E1E3E5]'>
                          {['Customer', 'Location', 'Orders', 'Total Spent', 'Status'].map((h, i) => <th key={i} className='px-4 py-2.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider text-left'>
                              {h}
                            </th>)}
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-[#F5F5F5]'>
                        {segmentCustomers.map((customer: Customer) => <tr key={customer.id} className='hover:bg-[#FAFAFA] transition-colors duration-100'>
                            <td className='px-4 py-3'>
                              <div className='flex items-center gap-3'>
                                <div className='w-7 h-7 rounded-full bg-[#008060] flex items-center justify-center text-white text-[10.5px] font-bold shrink-0 ring-2 ring-[#008060]/10'>
                                  {customer.avatar}
                                </div>
                                <div className='min-w-0'>
                                  <p className='text-[13px] font-medium text-[#202223]'>
                                    {customer.name}
                                  </p>
                                  <p className='text-[11px] text-[#B0B5BA] truncate mt-0.5'>
                                    {customer.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className='px-4 py-3 text-[13px] text-[#202223]'>
                              {customer.city || '—'}
                            </td>
                            <td className='px-4 py-3 text-[13px] font-semibold text-[#202223]'>
                              {customer.totalOrders}
                            </td>
                            <td className='px-4 py-3 text-[13px] font-semibold text-[#202223]'>
                              {formatCurrency(customer.totalSpent)}
                            </td>
                            <td className='px-4 py-3'>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLES[customer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[customer.status] ?? 'bg-gray-400'}`} />
                                {customer.status}
                              </span>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
              </div>}
          </div>}
      </div>

      {}
      {showAddModal && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-[2px]' onClick={() => !addSaving && setShowAddModal(false)} />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Add customer
              </h2>
              <button onClick={() => !addSaving && setShowAddModal(false)} className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer transition-colors'>
                ✕
              </button>
            </div>

            <div className='px-6 py-5 space-y-3'>
              {addError && <div className='px-3 py-2 rounded-lg text-xs bg-[#FFF4F4] text-[#D82C0D]'>
                  {addError}
                </div>}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>First name</label>
                  <input value={addForm.firstName} onChange={e => setAddForm({
                ...addForm,
                firstName: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
                </div>
                <div>
                  <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Last name</label>
                  <input value={addForm.lastName} onChange={e => setAddForm({
                ...addForm,
                lastName: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
                </div>
              </div>
              <div>
                <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Email *</label>
                <input type='email' value={addForm.email} onChange={e => setAddForm({
              ...addForm,
              email: e.target.value
            })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
              </div>
              <div>
                <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm({
              ...addForm,
              phone: e.target.value
            })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
              </div>
            </div>

            <div className='flex items-center justify-end gap-2.5 px-6 py-4 bg-[#FAFAFA] border-t border-[#E1E3E5]'>
              <button onClick={() => setShowAddModal(false)} disabled={addSaving} className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer disabled:opacity-50'>
                Cancel
              </button>
              <button onClick={handleAddCustomer} disabled={addSaving || !addForm.email.trim()} className='px-5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 cursor-pointer border-none shadow-sm shadow-[#008060]/20'>
                {addSaving ? 'Adding...' : 'Add customer'}
              </button>
            </div>
          </div>
        </div>}

      {editingCustomer && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-[2px]' onClick={() => !editSaving && setEditingCustomer(null)} />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Edit customer
              </h2>
              <button onClick={() => !editSaving && setEditingCustomer(null)} className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer transition-colors'>
                ✕
              </button>
            </div>

            <div className='px-6 py-5 space-y-3'>
              {editError && <div className='px-3 py-2 rounded-lg text-xs bg-[#FFF4F4] text-[#D82C0D]'>
                  {editError}
                </div>}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>First name</label>
                  <input value={editForm.firstName} onChange={e => setEditForm({
                ...editForm,
                firstName: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
                </div>
                <div>
                  <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Last name</label>
                  <input value={editForm.lastName} onChange={e => setEditForm({
                ...editForm,
                lastName: e.target.value
              })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
                </div>
              </div>
              <div>
                <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Email *</label>
                <input type='email' value={editForm.email} onChange={e => setEditForm({
              ...editForm,
              email: e.target.value
            })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
              </div>
              <div>
                <label className='block text-[11px] font-medium text-[#6D7175] mb-1'>Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm({
              ...editForm,
              phone: e.target.value
            })} className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] outline-none focus:border-[#008060]' />
              </div>
            </div>

            <div className='flex items-center justify-end gap-2.5 px-6 py-4 bg-[#FAFAFA] border-t border-[#E1E3E5]'>
              <button onClick={() => setEditingCustomer(null)} disabled={editSaving} className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer disabled:opacity-50'>
                Cancel
              </button>
              <button onClick={handleEditCustomer} disabled={editSaving || !editForm.email.trim()} className='px-5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 cursor-pointer border-none shadow-sm shadow-[#008060]/20'>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
export default function CustomersPage() {
  return <Suspense fallback={<div className='animate-pulse space-y-5'>
          <div className='h-8 w-40 bg-[#E1E3E5] rounded-lg' />
          <div className='h-[500px] bg-[#E1E3E5] rounded-2xl' />
        </div>}>
      <CustomersContent />
    </Suspense>;
}