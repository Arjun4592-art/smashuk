'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAddresses, addAddress, updateAddress, deleteAddress } from '@/lib/api/store';
import type { CustomerAddress } from '@/types';
import { PlusIcon } from '@/components/ui/Icons';
const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  address_1: '',
  address_2: '',
  city: '',
  province: '',
  postal_code: '',
  country_code: 'gb',
  phone: ''
};
export default function AddressesTab() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };
  const openEdit = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    setForm({
      first_name: addr.first_name ?? '',
      last_name: addr.last_name ?? '',
      address_1: addr.address_1 ?? '',
      address_2: addr.address_2 ?? '',
      city: addr.city ?? '',
      province: addr.province ?? '',
      postal_code: addr.postal_code ?? '',
      country_code: addr.country_code ?? 'gb',
      phone: addr.phone ?? ''
    });
    setShowForm(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form);
        toast.success('Address updated');
      } else {
        await addAddress(form);
        toast.success('Address added');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      await deleteAddress(id);
      toast.success('Address deleted');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete address');
    }
  };
  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato';
  return <div className='bg-white rounded-2xl border border-gray-100 p-6'>
      <div className='flex items-center justify-between mb-5'>
        <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
          Saved Addresses
        </h2>
        <button onClick={openAdd} className='flex items-center gap-1.5 bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-4 py-2 rounded-full text-xs transition-colors'>
          <PlusIcon size={14} /> Add Address
        </button>
      </div>

      {loading ? <p className='text-sm text-gray-400 font-lato'>Loading addresses...</p> : addresses.length === 0 && !showForm ? <p className='text-sm text-gray-400 font-lato py-6 text-center'>
          You haven&apos;t saved any addresses yet.
        </p> : <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2'>
          {addresses.map(addr => <div key={addr.id} className='border border-gray-100 rounded-xl p-4 relative'>
              <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                {addr.first_name} {addr.last_name}
              </p>
              <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                {addr.address_1}
                {addr.address_2 ? `, ${addr.address_2}` : ''}
                <br />
                {addr.city}, {addr.province} {addr.postal_code}
                <br />
                {addr.country_code?.toUpperCase()}
                {addr.phone ? <><br />{addr.phone}</> : null}
              </p>
              <div className='flex gap-3 mt-3'>
                <button onClick={() => openEdit(addr)} className='text-xs font-semibold text-[#E8553A] hover:underline font-lato'>
                  Edit
                </button>
                <button onClick={() => handleDelete(addr.id)} className='text-xs font-semibold text-red-500 hover:underline font-lato'>
                  Delete
                </button>
              </div>
            </div>)}
        </div>}

      {showForm && <form onSubmit={handleSave} className='mt-5 border-t border-gray-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {[{
        name: 'first_name',
        label: 'First Name',
        required: true
      }, {
        name: 'last_name',
        label: 'Last Name',
        required: true
      }, {
        name: 'address_1',
        label: 'Address Line 1',
        required: true,
        colSpan: true
      }, {
        name: 'address_2',
        label: 'Address Line 2 (Optional)',
        colSpan: true
      }, {
        name: 'city',
        label: 'City',
        required: true
      }, {
        name: 'province',
        label: 'County'
      }, {
        name: 'postal_code',
        label: 'Postcode',
        required: true
      }, {
        name: 'phone',
        label: 'Phone (Optional)'
      }].map(field => <div key={field.name} className={field.colSpan ? 'sm:col-span-2' : ''}>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                {field.label}
              </label>
              <input type='text' value={(form as any)[field.name]} onChange={e => setForm(f => ({
          ...f,
          [field.name]: e.target.value
        }))} className={inputClass} required={field.required} />
            </div>)}

          <div className='sm:col-span-2 flex gap-3 mt-1'>
            <button type='submit' disabled={saving} className='bg-[#E8553A] hover:bg-[#D4441F] disabled:bg-gray-300 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'>
              {saving ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
            </button>
            <button type='button' onClick={() => setShowForm(false)} className='text-sm font-semibold text-gray-500 hover:text-gray-700 font-lato'>
              Cancel
            </button>
          </div>
        </form>}
    </div>;
}
