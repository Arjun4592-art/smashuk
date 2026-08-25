'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
interface OptionValue {
  id: string;
  value: string;
  rank?: number;
}
interface ProductOption {
  id: string;
  title: string;
  values: OptionValue[];
  product_count?: number;
}
function PlusIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
      <path d='M12 4v16M4 12h16' />
    </svg>;
}
function TrashIcon({
  size = 13
}: {
  size?: number;
}) {
  return <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M3 6h18' />
      <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' />
      <path d='M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v5M14 11v5' />
    </svg>;
}
function ChevronDownIcon({
  open
}: {
  open: boolean;
}) {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{
    transform: open ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.2s'
  }}>
      <path d='M6 9l6 6 6-6' />
    </svg>;
}
function SpinnerIcon() {
  return <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v8H4z' />
    </svg>;
}
function OptionsIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#6D7175' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M4 6h16M4 12h10M4 18h7' />
    </svg>;
}
function ConfirmDialog({
  message,
  onConfirm,
  onCancel
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='bg-white rounded-2xl shadow-xl p-6 w-[340px] max-w-full'>
        <p className='text-[13.5px] text-[#202223] leading-relaxed'>
          {message}
        </p>
        <div className='flex items-center gap-2.5 mt-5 justify-end'>
          <button onClick={onCancel} className='px-4 py-2 text-[12.5px] text-[#202223] border border-[#E1E3E5] rounded-lg hover:bg-[#F6F6F7] transition-colors bg-white cursor-pointer'>
            Cancel
          </button>
          <button onClick={onConfirm} className='px-4 py-2 text-[12.5px] text-white bg-[#D82C0D] rounded-lg hover:bg-[#B32500] transition-colors border-none cursor-pointer'>
            Delete
          </button>
        </div>
      </div>
    </div>;
}
function OptionRow({
  option,
  onDelete,
  onUpdate
}: {
  option: ProductOption;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, values: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteValue, setConfirmDeleteValue] = useState<string | null>(null);
  const handleAddValue = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (option.values.some(v => v.value.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This value already exists');
      return;
    }
    setSaving(true);
    try {
      const allValues = [...option.values.map(v => v.value), trimmed];
      await onUpdate(option.id, option.title, allValues);
      setNewValue('');
      toast.success(`"${trimmed}" added to ${option.title}`);
    } catch {
      toast.error('Failed to add value');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteValue = async (val: string) => {
    setSaving(true);
    try {
      const remaining = option.values.filter(v => v.value !== val).map(v => v.value);
      await onUpdate(option.id, option.title, remaining);
      toast.success(`"${val}" removed`);
    } catch {
      toast.error('Failed to remove value');
    } finally {
      setSaving(false);
      setConfirmDeleteValue(null);
    }
  };
  return <>
      {confirmDeleteValue && <ConfirmDialog message={`Remove value "${confirmDeleteValue}" from ${option.title}? Products using this value may be affected.`} onConfirm={() => handleDeleteValue(confirmDeleteValue)} onCancel={() => setConfirmDeleteValue(null)} />}
      {confirmDelete && <ConfirmDialog message={`Delete option "${option.title}" and all its values? This cannot be undone and may affect products using this option.`} onConfirm={() => {
      setConfirmDelete(false);
      onDelete(option.id);
    }} onCancel={() => setConfirmDelete(false)} />}

      <div className='border border-[#E1E3E5] rounded-xl overflow-hidden bg-white hover:border-[#C4C8CC] transition-colors'>
        {}
        <div className='flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none' onClick={() => setOpen(o => !o)}>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='text-[13px] font-semibold text-[#202223]'>
                {option.title}
              </span>
              <span className='text-[11px] text-[#8C9196] bg-[#F6F6F7] border border-[#E1E3E5] px-2 py-0.5 rounded-full'>
                Global
              </span>
            </div>
            <p className='text-[11.5px] text-[#6D7175] mt-0.5'>
              {option.values.length}{' '}
              {option.values.length === 1 ? 'value' : 'values'}
              {option.values.length > 0 && <span className='ml-1 text-[#8C9196]'>
                  ·{' '}
                  {option.values.slice(0, 5).map(v => v.value).join(', ')}
                  {option.values.length > 5 && ` +${option.values.length - 5} more`}
                </span>}
            </p>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <button onClick={e => {
            e.stopPropagation();
            setConfirmDelete(true);
          }} title='Delete option' className='p-1.5 text-[#6D7175] hover:text-[#D82C0D] hover:bg-[#FFF4F2] rounded-lg transition-colors bg-transparent border-none cursor-pointer'>
              <TrashIcon />
            </button>
            <span className='text-[#8C9196]'>
              <ChevronDownIcon open={open} />
            </span>
          </div>
        </div>

        {}
        {open && <div className='border-t border-[#E1E3E5] bg-[#FAFAFA] px-4 py-4 space-y-3'>
            {}
            {option.values.length > 0 ? <div className='flex flex-wrap gap-2'>
                {option.values.map(val => <div key={val.id} className='flex items-center gap-1.5 bg-white border border-[#E1E3E5] rounded-lg px-2.5 py-1.5 text-[12px] text-[#202223] group'>
                    <span>{val.value}</span>
                    <button onClick={() => setConfirmDeleteValue(val.value)} disabled={saving} title={`Remove "${val.value}"`} className='text-[#8C9196] hover:text-[#D82C0D] transition-colors bg-transparent border-none cursor-pointer p-0 leading-none opacity-0 group-hover:opacity-100 disabled:opacity-30'>
                      ✕
                    </button>
                  </div>)}
              </div> : <p className='text-[12px] text-[#8C9196] italic'>
                No values yet. Add one below.
              </p>}

            {}
            <div className='flex items-center gap-2'>
              <input type='text' value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') handleAddValue();
          }} placeholder={`Add value to ${option.title} (e.g. XL, Red, 4U)`} disabled={saving} className='flex-1 min-w-0 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all bg-white disabled:opacity-60' />
              <button onClick={handleAddValue} disabled={saving || !newValue.trim()} className='flex items-center gap-1.5 px-3 py-2 bg-[#008060] text-white text-[12px] font-medium rounded-lg hover:bg-[#006B50] transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0'>
                {saving ? <SpinnerIcon /> : <PlusIcon />}
                Add
              </button>
            </div>
          </div>}
      </div>
    </>;
}
export default function ProductOptionsPage() {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newValues, setNewValues] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      let allOptions: any[] = [];
      let offset = 0;
      const PAGE = 100;
      while (true) {
        const res = await fetch(`/api/admin/product-options?fields=id,title,values.id,values.value&limit=${PAGE}&offset=${offset}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const page: any[] = data.product_options ?? [];
        allOptions = allOptions.concat(page);
        if (page.length < PAGE) break;
        offset += PAGE;
        if (offset > 2000) break;
      }
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const o of allOptions) {
        const valsSorted = (o.values ?? []).map((v: any) => v.value).sort().join('|');
        const fp = `${o.title.toLowerCase()}::${valsSorted}`;
        if (!seen.has(fp)) {
          seen.add(fp);
          deduped.push(o);
        }
      }
      setOptions(deduped.sort((a, b) => a.title.localeCompare(b.title)).map(o => ({
        id: o.id,
        title: o.title,
        values: (o.values ?? []).map((v: any) => ({
          id: v.id,
          value: v.value,
          rank: v.rank
        })),
        product_count: undefined
      })));
    } catch (err: any) {
      toast.error(err.message ?? 'Could not load product options');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);
  const handleUpdate = useCallback(async (optionId: string, title: string, values: string[]) => {
    const res = await fetch(`/api/admin/product-options/${optionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        values
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Update failed');
    }
    const data = await res.json();
    const updated = data.product_option;
    if (updated) {
      setOptions(prev => prev.map(o => o.id === optionId ? {
        ...o,
        title: updated.title,
        values: updated.values ?? []
      } : o));
    }
  }, []);
  const handleDelete = useCallback(async (optionId: string) => {
    try {
      const res = await fetch(`/api/admin/product-options/${optionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Delete failed');
      }
      setOptions(prev => prev.filter(o => o.id !== optionId));
      toast.success('Option deleted');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not delete option');
    } finally {
      setConfirmDelete(null);
    }
  }, []);
  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error('Option name is required');
      return;
    }
    const values = newValues.split(',').map(v => v.trim()).filter(Boolean);
    setCreating(true);
    try {
      const res = await fetch('/api/admin/product-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          values
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Create failed');
      }
      const data = await res.json();
      const created = data.product_option;
      if (created) {
        setOptions(prev => [{
          id: created.id,
          title: created.title,
          values: created.values ?? []
        }, ...prev]);
      }
      toast.success(`Option "${title}" created`);
      setNewTitle('');
      setNewValues('');
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create option');
    } finally {
      setCreating(false);
    }
  };
  const filtered = options.filter(o => o.title.toLowerCase().includes(search.toLowerCase()));
  return <div className='p-6 md:p-8 max-w-4xl mx-auto space-y-6'>
      {}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-[20px] font-bold text-[#202223] tracking-tight'>
            Product Options
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-1'>
            Manage global options (Size, Color, etc.) and their values. These
            can be linked to any product.
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] text-white text-[13px] font-medium rounded-xl hover:bg-[#006B50] transition-colors border-none cursor-pointer shrink-0'>
          <PlusIcon />
          Create Option
        </button>
      </div>

      {}
      {showCreate && <div className='bg-white border border-[#008060] rounded-2xl p-5 space-y-4 shadow-[0_0_0_3px_rgba(0,128,96,0.08)]'>
          <p className='text-[13px] font-semibold text-[#202223]'>
            New Global Option
          </p>
          <div className='space-y-3'>
            <div>
              <label className='block text-[11.5px] text-[#6D7175] mb-1'>
                Option name <span className='text-[#D82C0D]'>*</span>
              </label>
              <input type='text' value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder='e.g. Size, Color, Weight, Grip Size' className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all' />
            </div>
            <div>
              <label className='block text-[11.5px] text-[#6D7175] mb-1'>
                Initial values{' '}
                <span className='text-[#8C9196]'>
                  (comma-separated, optional)
                </span>
              </label>
              <input type='text' value={newValues} onChange={e => setNewValues(e.target.value)} placeholder='e.g. XS, S, M, L, XL, XXL' className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all' />
            </div>
          </div>
          <div className='flex items-center gap-2.5 pt-1'>
            <button onClick={handleCreate} disabled={creating || !newTitle.trim()} className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] text-white text-[12.5px] font-medium rounded-lg hover:bg-[#006B50] transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
              {creating && <SpinnerIcon />}
              {creating ? 'Creating…' : 'Create Option'}
            </button>
            <button onClick={() => {
          setShowCreate(false);
          setNewTitle('');
          setNewValues('');
        }} className='px-4 py-2 text-[12.5px] text-[#202223] border border-[#E1E3E5] rounded-lg hover:bg-[#F6F6F7] transition-colors bg-white cursor-pointer'>
              Cancel
            </button>
          </div>
        </div>}

      {}
      <div className='flex items-center gap-3'>
        <div className='flex-1 relative'>
          <svg className='absolute left-3 top-1/2 -translate-y-1/2' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='11' cy='11' r='7.5' />
            <path d='M18.5 18.5L22 22' />
          </svg>
          <input type='text' value={search} onChange={e => setSearch(e.target.value)} placeholder='Search options…' className='w-full pl-9 pr-3 py-2 border border-[#E1E3E5] rounded-xl text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all bg-white' />
        </div>
        <span className='text-[12px] text-[#8C9196] shrink-0 whitespace-nowrap'>
          {loading ? '…' : `${filtered.length} option${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {}
      {loading ? <div className='py-16 flex flex-col items-center gap-3 text-[#8C9196]'>
          <svg className='animate-spin w-5 h-5' viewBox='0 0 24 24' fill='none'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v8H4z' />
          </svg>
          <span className='text-[13px]'>Loading options…</span>
        </div> : filtered.length === 0 ? <div className='py-16 flex flex-col items-center gap-3 text-center'>
          <OptionsIcon />
          <p className='text-[13px] text-[#6D7175]'>
            {search ? `No options match "${search}"` : 'No global options yet. Create your first one above.'}
          </p>
        </div> : <div className='space-y-2.5'>
          {filtered.map(option => <OptionRow key={option.id} option={option} onDelete={handleDelete} onUpdate={handleUpdate} />)}
        </div>}
    </div>;
}
