'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePOSStore } from '@/store/posStore';
import type { StaffRole } from '@/store/posStore';
import { getOrders } from '@/lib/api/dashboard';
interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  hasPin: boolean;
  shift: string;
  isActive: boolean;
  initials: string;
  totalSales: number;
  totalOrders: number;
}
const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  staff: 'bg-[#008060]/10 text-[#008060]'
};
const ROLE_LABELS: Record<StaffRole, string> = {
  staff: 'Staff',
  admin: 'Admin'
};
const ACTION_STYLES: Record<string, string> = {
  login: 'bg-[#008060]/10 text-[#008060]',
  logout: 'bg-[#6D7175]/10 text-[#6D7175]',
  sale: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  void: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  return: 'bg-[#FFC453]/20 text-[#916A00]',
  pin_change: 'bg-purple-100 text-purple-700'
};
const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: 'staff' as StaffRole,
  pin: '',
  shift: '',
  isActive: true
};
const TotalStaffStatIcon = () => <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
    <circle cx='9' cy='7' r='4' />
    <path d='M23 21v-2a4 4 0 00-3-3.87' />
    <path d='M16 3.13a4 4 0 010 7.75' />
  </svg>;
const ActiveStatIcon = () => <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M22 11.08V12a10 10 0 11-5.93-9.14' />
    <polyline points='22 4 12 14.01 9 11.01' />
  </svg>;
const LoginsStatIcon = () => <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4' />
    <polyline points='10 17 15 12 10 7' />
    <line x1='15' y1='12' x2='3' y2='12' />
  </svg>;
const TotalSalesStatIcon = () => <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
  </svg>;
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
function toStaff(u: any): StaffMember {
  const name = (u.name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()) || u.email;
  const initials = u.initials ?? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return {
    id: u.id,
    name,
    email: u.email ?? '',
    phone: u.phone ?? u.metadata?.phone ?? '',
    role: (['admin', 'staff'].includes(u.role ?? '') ? u.role : ['admin', 'staff'].includes(u.metadata?.posRole ?? '') ? u.metadata.posRole : ['admin', 'staff'].includes(u.metadata?.role ?? '') ? u.metadata.role : 'staff') as StaffRole,
    hasPin: u.hasPin ?? Boolean(u.metadata?.pin),
    shift: u.shift ?? u.metadata?.shift ?? '',
    isActive: u.isActive ?? u.metadata?.isActive ?? true,
    initials,
    totalSales: u.totalSales ?? u.metadata?.totalSales ?? 0,
    totalOrders: u.totalOrders ?? u.metadata?.totalOrders ?? 0
  };
}
export default function StaffPage() {
  const {
    auditLog,
    clearAuditLog
  } = usePOSStore();
  const [serverActivity, setServerActivity] = useState<Array<{
    id: string;
    staffId: string;
    staffName: string;
    action: 'login' | 'logout' | 'return';
    surface: 'dashboard' | 'pos';
    detail?: string;
    timestamp: string;
  }>>([]);
  const fetchServerActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff-activity?limit=200');
      if (!res.ok) return;
      const {
        entries
      } = await res.json();
      setServerActivity((entries ?? []).map((e: any) => ({
        id: `server-${e.id}`,
        staffId: e.staff_id,
        staffName: e.staff_name,
        action: e.action,
        surface: e.surface,
        detail: e.detail,
        timestamp: e.created_at
      })));
    } catch (err) {
      console.warn('[Staff] failed to load server activity:', err);
    }
  }, []);
  useEffect(() => {
    fetchServerActivity();
  }, [fetchServerActivity]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyForm
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStaffId, setPinStaffId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showPinValue, setShowPinValue] = useState(false);
  const [showNewPinValue, setShowNewPinValue] = useState(false);
  const ROLES = ['All', 'Staff', 'Admin'];
  const ROLE_FILTER_TO_INTERNAL: Record<string, StaffRole> = {
    Staff: 'staff',
    Admin: 'admin'
  };
  const ACTIONS = ['All', 'login', 'logout', 'sale', 'void', 'return', 'pin_change'];
  const authHeaders = () => ({
    'Content-Type': 'application/json'
  });
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/staff?limit=100', {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const data = await res.json();
      const list = data.staff ?? [];
      let staff = list.map(toStaff) as StaffMember[];
      try {
        const {
          orders
        } = await getOrders({
          limit: 200
        });
        const totalsByName = new Map<string, {
          orders: number;
          sales: number;
        }>();
        for (const o of orders as any[]) {
          const key = (o.cashier ?? '').trim().toLowerCase();
          if (!key) continue;
          const existing = totalsByName.get(key) ?? {
            orders: 0,
            sales: 0
          };
          existing.orders += 1;
          existing.sales += o.amount ?? 0;
          totalsByName.set(key, existing);
        }
        staff = staff.map(s => {
          const totals = totalsByName.get(s.name.trim().toLowerCase());
          return totals ? {
            ...s,
            totalOrders: totals.orders,
            totalSales: totals.sales
          } : s;
        });
      } catch (ordersErr) {
        console.warn('[Staff] failed to compute per-staff sales totals:', ordersErr);
      }
      setStaffList(staff);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load staff', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);
  const filtered = staffList.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || s.role === ROLE_FILTER_TO_INTERNAL[roleFilter];
    return matchSearch && matchRole;
  });
  const combinedAuditLog = [...auditLog, ...serverActivity.map(e => ({
    id: e.id,
    staffId: e.staffId,
    staffName: e.staffName || staffList.find(s => s.id === e.staffId)?.name || e.staffId,
    action: e.action,
    detail: e.detail ?? (e.surface === 'pos' ? 'POS' : 'Dashboard'),
    timestamp: e.timestamp
  }))].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const filteredAudit = combinedAuditLog.filter(e => {
    const matchSearch = e.staffName.toLowerCase().includes(auditSearch.toLowerCase()) || (e.detail?.toLowerCase().includes(auditSearch.toLowerCase()) ?? false);
    const matchAction = auditAction === 'All' || e.action === auditAction;
    return matchSearch && matchAction;
  });
  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm
    });
    setSaveError(null);
    setShowPinValue(false);
    setShowModal(true);
  };
  const openEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      pin: '',
      shift: s.shift,
      isActive: s.isActive
    });
    setSaveError(null);
    setShowPinValue(false);
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name) return;
    if (!editingId && form.pin.length !== 6) return;
    if (form.pin && form.pin.length !== 6) return;
    setSaving(true);
    setSaveError(null);
    const toastId = toast.loading(editingId ? 'Updating staff...' : 'Adding staff member...');
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/staff/${editingId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(form)
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Update failed');
        const data = await res.json();
        const updated = toStaff(data.staff ?? data.user);
        setStaffList(prev => prev.map(s => s.id === editingId ? updated : s));
        toast.success('Staff updated', {
          id: toastId,
          description: `${updated.name}'s details have been saved.`
        });
      } else {
        if (!form.email) {
          setSaveError('Email is required to create a staff member');
          toast.dismiss(toastId);
          setSaving(false);
          return;
        }
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(form)
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error ?? 'Create failed');
        const newStaff = toStaff(resData.staff);
        setStaffList(prev => [newStaff, ...prev]);
        toast.success('Staff member added', {
          id: toastId,
          description: `${newStaff.name} has been added successfully.`
        });
      }
      setShowModal(false);
    } catch (err: any) {
      setSaveError(err.message);
      toast.error(editingId ? 'Update failed' : 'Failed to add staff', {
        id: toastId,
        description: err.message
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    const staffName = staffList.find(s => s.id === id)?.name ?? 'Staff member';
    const toastId = toast.loading('Removing staff member...');
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed');
      setStaffList(prev => prev.filter(s => s.id !== id));
      setDeleteId(null);
      toast.success('Staff removed', {
        id: toastId,
        description: `${staffName} has been removed.`
      });
    } catch (err: any) {
      toast.error('Delete failed', {
        id: toastId,
        description: err.message
      });
    }
  };
  const toggleStatus = async (s: StaffMember) => {
    const next = !s.isActive;
    setStaffList(prev => prev.map(x => x.id === s.id ? {
      ...x,
      isActive: next
    } : x));
    try {
      const res = await fetch(`/api/admin/staff/${s.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          isActive: next
        })
      });
      if (!res.ok) throw new Error('Status update failed');
      toast.success(next ? `${s.name} activated` : `${s.name} deactivated`);
    } catch (err: any) {
      setStaffList(prev => prev.map(x => x.id === s.id ? {
        ...x,
        isActive: s.isActive
      } : x));
      toast.error('Status update failed', {
        description: err.message
      });
    }
  };
  const handleUpdatePin = async () => {
    if (!pinStaffId || newPin.length !== 6) return;
    const staffName = staffList.find(s => s.id === pinStaffId)?.name ?? 'Staff member';
    const toastId = toast.loading('Updating PIN...');
    try {
      const res = await fetch(`/api/admin/staff/${pinStaffId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          pin: newPin
        })
      });
      if (!res.ok) throw new Error('PIN update failed');
      setStaffList(prev => prev.map(s => s.id === pinStaffId ? {
        ...s,
        hasPin: true
      } : s));
      setShowPinModal(false);
      setNewPin('');
      setPinStaffId(null);
      toast.success('PIN updated', {
        id: toastId,
        description: `${staffName}'s PIN has been changed.`
      });
    } catch (err: any) {
      toast.error('PIN update failed', {
        id: toastId,
        description: err.message
      });
    }
  };
  const handleClearAudit = async () => {
    if (!window.confirm('Clear all audit logs? This cannot be undone.')) return;
    clearAuditLog();
    try {
      const res = await fetch('/api/admin/staff-activity', {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      setServerActivity([]);
      toast.success('Audit log cleared');
    } catch (err: any) {
      toast.error('Local log cleared, but server-side entries failed to clear', {
        description: err.message
      });
    }
  };
  const totalSales = staffList.reduce((s, m) => s + m.totalSales, 0);
  const activeCount = staffList.filter(s => s.isActive).length;
  const loginToday = combinedAuditLog.filter(e => {
    const today = new Date();
    return e.action === 'login' && new Date(e.timestamp).toDateString() === today.toDateString();
  }).length;
  const STATS = [{
    label: 'Total Staff',
    value: loading ? '—' : staffList.length,
    color: 'text-[#2C6ECB]',
    bg: 'bg-[#2C6ECB]/10',
    icon: <TotalStaffStatIcon />
  }, {
    label: 'Active',
    value: loading ? '—' : activeCount,
    color: 'text-[#008060]',
    bg: 'bg-[#008060]/10',
    icon: <ActiveStatIcon />
  }, {
    label: 'Logins Today',
    value: loginToday,
    color: 'text-[#916A00]',
    bg: 'bg-[#FFC453]/20',
    icon: <LoginsStatIcon />
  }, {
    label: 'Total Sales',
    value: `£${totalSales.toLocaleString('en-GB')}`,
    color: 'text-[#202223]',
    bg: 'bg-[#F6F6F7]',
    icon: <TotalSalesStatIcon />
  }];
  return <div className='space-y-5'>
      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Staff Management
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            {loading ? 'Loading...' : `${staffList.length} staff members · ${activeCount} active`}
          </p>
        </div>
        <button onClick={openAdd} className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors border-none cursor-pointer'>
          + Add Staff
        </button>
      </div>

      {}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {STATS.map(stat => <div key={stat.label} className='bg-white border border-[#E1E3E5] rounded-xl p-5 flex items-center gap-4'>
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg shrink-0 flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div>
              <p className={`font-sora text-[22px] font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className='text-[12px] text-[#6D7175]'>{stat.label}</p>
            </div>
          </div>)}
      </div>

      {}
      {error && <div className='px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          Failed to load staff: {error}
          <button onClick={fetchStaff} className='ml-3 underline cursor-pointer bg-transparent border-none text-red-600'>
            Retry
          </button>
        </div>}

      {}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        {}
        <div className='flex items-center border-b border-[#E1E3E5] px-4'>
          {[{
          id: 'staff',
          label: 'Staff Members'
        }, {
          id: 'audit',
          label: `Activity Log${combinedAuditLog.length > 0 ? ` (${combinedAuditLog.length})` : ''}`
        }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${activeTab === tab.id ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}>
              {tab.label}
            </button>)}
        </div>

        {}
        {activeTab === 'staff' && <>
            <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
              <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2'>
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input type='text' placeholder='Search staff...' value={search} onChange={e => setSearch(e.target.value)} className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none' />
                {search && <button onClick={() => setSearch('')} className='text-[#8C9196] bg-transparent border-none cursor-pointer'>
                    ✕
                  </button>}
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer'>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4'>
              {ROLES.map(r => <button key={r} onClick={() => setRoleFilter(r)} className={`px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${roleFilter === r ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}>
                  {r}{' '}
                  <span className='ml-1 text-[10.5px] text-[#8C9196]'>
                    {r === 'All' ? staffList.length : staffList.filter(s => s.role === ROLE_FILTER_TO_INTERNAL[r]).length}
                  </span>
                </button>)}
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                    {['Staff Member', 'Role', 'Shift', 'Orders', 'Total Sales', 'Status', 'Actions'].map((h, i) => <th key={h} className={`px-4 py-3 text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>)}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#F1F1F1]'>
                  {loading ? [...Array(5)].map((_, i) => <tr key={i} className='animate-pulse'>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <div className='w-9 h-9 bg-[#E1E3E5] rounded-full' />
                            <div className='space-y-1'>
                              <div className='w-28 h-2.5 bg-[#E1E3E5] rounded' />
                              <div className='w-20 h-2.5 bg-[#E1E3E5] rounded' />
                            </div>
                          </div>
                        </td>
                        {[...Array(6)].map((_, j) => <td key={j} className='px-4 py-3'>
                            <div className='w-16 h-2.5 bg-[#E1E3E5] rounded' />
                          </td>)}
                      </tr>) : filtered.length === 0 ? <tr>
                      <td colSpan={7} className='px-4 py-16 text-center'>
                        <span className='text-4xl'>👤</span>
                        <p className='text-[14px] font-medium text-[#202223] mt-2'>
                          No staff found
                        </p>
                        <button onClick={openAdd} className='mt-3 px-4 py-2 bg-[#008060] text-white text-[13px] rounded-lg hover:bg-[#006e52] border-none cursor-pointer'>
                          Add Staff Member
                        </button>
                      </td>
                    </tr> : filtered.map(staff => <tr key={staff.id} className='hover:bg-[#F6F6F7] transition-colors'>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${staff.isActive ? 'bg-[#008060] text-white' : 'bg-[#F1F2F3] text-[#6D7175]'}`}>
                              {staff.initials}
                            </div>
                            <div>
                              <p className='text-[13px] font-medium text-[#202223]'>
                                {staff.name}
                              </p>
                              <p className='text-[11.5px] text-[#8C9196]'>
                                {[staff.email, staff.phone].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${ROLE_STYLES[staff.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[staff.role] ?? staff.role}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-[13px] text-[#6D7175]'>
                            {staff.shift || '—'}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-[13px] font-medium text-[#202223]'>
                            {staff.totalOrders}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-[13px] font-semibold text-[#202223]'>
                            £{staff.totalSales.toLocaleString('en-GB')}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <button onClick={() => toggleStatus(staff)} className={`relative w-9 h-5 rounded-full transition-colors border-none cursor-pointer ${staff.isActive ? 'bg-[#008060]' : 'bg-[#8C9196]'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${staff.isActive ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-end gap-1'>
                            <button onClick={() => {
                      setPinStaffId(staff.id);
                      setNewPin('');
                      setShowNewPinValue(false);
                      setShowPinModal(true);
                    }} className='px-2 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[11.5px] font-medium text-[#6D7175] rounded-lg transition-colors cursor-pointer'>
                              PIN
                            </button>
                            <button onClick={() => openEdit(staff)} className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                                <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                              </svg>
                            </button>
                            <button onClick={() => setDeleteId(staff.id)} className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#D82C0D] hover:bg-[#D82C0D]/5 rounded-lg bg-transparent border-none cursor-pointer'>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                                <polyline points='3 6 5 6 21 6' />
                                <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                                <path d='M10 11v6M14 11v6' />
                                <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>)}
                </tbody>
              </table>
            </div>
            <div className='px-4 py-3 border-t border-[#E1E3E5]'>
              <p className='text-[12.5px] text-[#6D7175]'>
                Showing{' '}
                <span className='font-medium text-[#202223]'>
                  {filtered.length}
                </span>{' '}
                of{' '}
                <span className='font-medium text-[#202223]'>
                  {staffList.length}
                </span>{' '}
                staff members
              </p>
            </div>
          </>}

        {}
        {activeTab === 'audit' && <>
            <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
              <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2'>
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input type='text' placeholder='Search by name or detail...' value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none' />
                {auditSearch && <button onClick={() => setAuditSearch('')} className='text-[#8C9196] bg-transparent border-none cursor-pointer'>
                    ✕
                  </button>}
              </div>
              <select value={auditAction} onChange={e => setAuditAction(e.target.value)} className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer'>
                {ACTIONS.map(a => <option key={a} value={a}>
                    {a === 'All' ? 'All Actions' : a.replace('_', ' ')}
                  </option>)}
              </select>
              {combinedAuditLog.length > 0 && <button onClick={handleClearAudit} className='px-3 py-2 border border-[#D82C0D]/30 text-[#D82C0D] hover:bg-[#D82C0D]/5 text-[12.5px] font-medium rounded-lg cursor-pointer bg-transparent transition-colors'>
                  Clear Log
                </button>}
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                    {['Staff Member', 'Action', 'Detail', 'Time'].map((h, i) => <th key={h} className={`px-4 py-3 text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>)}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#F1F1F1]'>
                  {filteredAudit.length === 0 ? <tr>
                      <td colSpan={4} className='px-4 py-16 text-center'>
                        <span className='text-4xl'>📋</span>
                        <p className='text-[14px] font-medium text-[#202223] mt-2'>
                          No activity yet
                        </p>
                        <p className='text-[12.5px] text-[#6D7175] mt-1'>
                          Staff login/logout and sales will appear here
                        </p>
                      </td>
                    </tr> : filteredAudit.map(entry => {
                const staff = staffList.find(s => s.id === entry.staffId);
                return <tr key={entry.id} className='hover:bg-[#F6F6F7] transition-colors'>
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-2.5'>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${staff?.isActive ? 'bg-[#008060] text-white' : 'bg-[#F1F2F3] text-[#6D7175]'}`}>
                                {staff?.initials ?? entry.staffName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className='text-[13px] font-medium text-[#202223]'>
                                  {entry.staffName}
                                </p>
                                {staff && <p className='text-[11px] text-[#8C9196]'>
                                    {ROLE_LABELS[staff.role] ?? staff.role}
                                  </p>}
                              </div>
                            </div>
                          </td>
                          <td className='px-4 py-3'>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${ACTION_STYLES[entry.action] ?? 'bg-[#F6F6F7] text-[#6D7175]'}`}>
                              {entry.action.replace('_', ' ')}
                            </span>
                          </td>
                          <td className='px-4 py-3'>
                            <p className='text-[12.5px] text-[#6D7175] max-w-xs truncate'>
                              {entry.detail ?? '—'}
                            </p>
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <p className='text-[12px] text-[#6D7175] whitespace-nowrap'>
                              {formatTime(entry.timestamp)}
                            </p>
                          </td>
                        </tr>;
              })}
                </tbody>
              </table>
            </div>
            <div className='px-4 py-3 border-t border-[#E1E3E5]'>
              <p className='text-[12.5px] text-[#6D7175]'>
                Showing{' '}
                <span className='font-medium text-[#202223]'>
                  {filteredAudit.length}
                </span>{' '}
                of{' '}
                <span className='font-medium text-[#202223]'>
                  {combinedAuditLog.length}
                </span>{' '}
                entries
              </p>
            </div>
          </>}
      </div>

      {}
      {showModal && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setShowModal(false)} />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-125 overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button onClick={() => setShowModal(false)} className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'>
                ✕
              </button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              {saveError && <div className='px-3 py-2.5 bg-[#FFF4F4] border border-[#D82C0D]/20 rounded-lg text-[12.5px] text-[#D82C0D]'>
                  {saveError}
                </div>}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Full Name <span className='text-[#D82C0D]'>*</span>
                  </label>
                  <input type='text' name='staff_full_name' autoComplete='off' value={form.name} onChange={e => setForm(f => ({
                ...f,
                name: e.target.value
              }))} placeholder='Ramesh Kumar' className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all' />
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    POS permission <span className='text-[#D82C0D]'>*</span>
                  </label>
                  <select value={form.role} onChange={e => setForm(f => ({
                ...f,
                role: e.target.value as StaffRole
              }))} className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all cursor-pointer'>
                    <option value='staff'>Staff (standard POS access)</option>
                    <option value='admin'>
                      Admin (can void/discount on POS)
                    </option>
                  </select>
                  <p className='text-[11.5px] text-[#6D7175] mt-1'>
                    This only controls POS terminal permissions. It never grants
                    access to this dashboard.
                  </p>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Email{' '}
                    {!editingId && <span className='text-[#D82C0D]'>*</span>}
                  </label>
                  <input type='email' name='staff_email' autoComplete='off' value={form.email} onChange={e => setForm(f => ({
                ...f,
                email: e.target.value
              }))} placeholder='ramesh@store.com' className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all' />
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Phone
                  </label>
                  <input type='tel' name='staff_phone' autoComplete='off' inputMode='numeric' value={form.phone} onChange={e => setForm(f => ({
                ...f,
                phone: e.target.value
              }))} placeholder='+44 7700 900000' className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all' />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    6-digit PIN{' '}
                    {editingId ? <span className='text-[#8C9196] font-normal'>
                        (leave blank to keep current PIN)
                      </span> : <span className='text-[#D82C0D]'>*</span>}
                  </label>
                  <div className='relative'>
                    <input type={showPinValue ? 'text' : 'password'} name='staff_pin' autoComplete='off' inputMode='numeric' value={form.pin} onChange={e => setForm(f => ({
                  ...f,
                  pin: e.target.value.replace(/\D/g, '').slice(0, 6)
                }))} placeholder='••••••' maxLength={6} className='w-full px-3.5 py-2.5 pr-10 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all' />
                    <button type='button' onClick={() => setShowPinValue(v => !v)} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9196] hover:text-[#202223] bg-transparent border-none cursor-pointer p-0.5' tabIndex={-1}>
                      {showPinValue ? <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path d='M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 014.22-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24' />
                          <line x1='1' y1='1' x2='23' y2='23' />
                        </svg> : <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                          <circle cx='12' cy='12' r='3' />
                        </svg>}
                    </button>
                  </div>
                  <p className='text-[11.5px] text-[#6D7175] mt-1'>
                    Used for POS login
                  </p>
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Shift
                  </label>
                  <select value={form.shift} onChange={e => setForm(f => ({
                ...f,
                shift: e.target.value
              }))} className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all cursor-pointer'>
                    <option value=''>Select shift</option>
                    <option value='Morning'>Morning</option>
                    <option value='Evening'>Evening</option>
                    <option value='Full day'>Full day</option>
                    <option value='Night'>Night</option>
                  </select>
                </div>
              </div>
              <div className='flex items-center justify-between p-3 border border-[#E1E3E5] rounded-lg'>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    Active
                  </p>
                  <p className='text-[11.5px] text-[#6D7175]'>
                    Can login to POS terminal
                  </p>
                </div>
                <button onClick={() => setForm(f => ({
              ...f,
              isActive: !f.isActive
            }))} className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${form.isActive ? 'bg-[#008060]' : 'bg-[#8C9196]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E1E3E5] bg-[#F6F6F7]/50'>
              <button onClick={() => setShowModal(false)} className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer'>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !editingId && form.pin.length !== 6 || form.pin.length > 0 && form.pin.length !== 6} className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none flex items-center gap-2'>
                {saving ? <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
                  </svg> : null}
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>}

      {}
      {showPinModal && pinStaffId && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setShowPinModal(false)} />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-95 p-6'>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] mb-2'>
              Update PIN
            </h3>
            <p className='text-[13px] text-[#6D7175] mb-4'>
              Changing PIN for{' '}
              <strong className='text-[#202223]'>
                {staffList.find(s => s.id === pinStaffId)?.name}
              </strong>
            </p>
            <div className='relative mb-4'>
              <input type={showNewPinValue ? 'text' : 'password'} name='new_staff_pin' autoComplete='off' inputMode='numeric' value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder='Enter new 6-digit PIN' maxLength={6} className='w-full px-3.5 py-2.5 pr-10 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all text-center tracking-widest text-[18px]' />
              <button type='button' onClick={() => setShowNewPinValue(v => !v)} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9196] hover:text-[#202223] bg-transparent border-none cursor-pointer p-0.5' tabIndex={-1}>
                {showNewPinValue ? <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 014.22-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24' />
                    <line x1='1' y1='1' x2='23' y2='23' />
                  </svg> : <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                    <circle cx='12' cy='12' r='3' />
                  </svg>}
              </button>
            </div>
            <div className='flex gap-3'>
              <button onClick={() => setShowPinModal(false)} className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer'>
                Cancel
              </button>
              <button onClick={handleUpdatePin} disabled={newPin.length !== 6} className='flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer disabled:opacity-50'>
                Update PIN
              </button>
            </div>
          </div>
        </div>}

      {}
      {deleteId && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setDeleteId(null)} />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-95 p-6'>
            <div className='w-12 h-12 bg-[#D82C0D]/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#D82C0D' strokeWidth='2'>
                <polyline points='3 6 5 6 21 6' />
                <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                <path d='M10 11v6M14 11v6' />
                <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
              </svg>
            </div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] text-center mb-2'>
              Remove Staff Member
            </h3>
            <p className='text-[13px] text-[#6D7175] text-center leading-relaxed mb-6'>
              Are you sure you want to remove{' '}
              <strong className='text-[#202223]'>
                {staffList.find(s => s.id === deleteId)?.name}
              </strong>
              ? They will lose POS access.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setDeleteId(null)} className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer'>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#be2209] text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer'>
                Remove
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
