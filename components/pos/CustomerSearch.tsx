'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePOSStore, POSCustomer } from '@/store/posStore';
import { fetchPOSCustomers, createPOSCustomer } from '@/lib/api/pos';
interface Props {
  onClose: () => void;
  required?: boolean;
}
export default function CustomerSearch({
  onClose,
  required = false
}: Props) {
  const {
    customer,
    attachCustomer,
    detachCustomer
  } = usePOSStore();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [matches, setMatches] = useState<POSCustomer[]>([]);
  const [matching, setMatching] = useState(false);
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isValidPhone = (v: string) => v.trim().replace(/\D/g, '').length >= 10;
  const isNewCustomerFormValid = newName.trim().length > 0 && isValidPhone(newPhone) && isValidEmail(newEmail);
  const loadCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await fetchPOSCustomers(q);
      setCustomers(data);
    } catch (err: unknown) {
      setApiError('Failed to load customers');
      console.error('[CustomerSearch]', err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!search.trim()) {
      setCustomers([]);
      setApiError(null);
      return;
    }
    const t = setTimeout(() => loadCustomers(search), 400);
    return () => clearTimeout(t);
  }, [search, loadCustomers]);
  useEffect(() => {
    if (!showNew) return;
    const query = newEmail.trim() || newPhone.trim() || newName.trim();
    if (query.length < 3) {
      setMatches([]);
      return;
    }
    setMatching(true);
    const t = setTimeout(async () => {
      try {
        const found = await fetchPOSCustomers(query);
        setMatches(found);
      } catch (err) {
        console.error('[CustomerSearch] duplicate lookup failed:', err);
      } finally {
        setMatching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [showNew, newName, newPhone, newEmail]);
  const handleSelect = (c: POSCustomer) => {
    attachCustomer(c);
    onClose();
  };
  const handleRemove = () => {
    detachCustomer();
    onClose();
  };
  const handleAddNew = async () => {
    setFormError(null);
    if (!newName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!isValidPhone(newPhone)) {
      setFormError('A valid phone number is required');
      return;
    }
    if (!isValidEmail(newEmail)) {
      setFormError('A valid email is required');
      return;
    }
    setSaving(true);
    const email = newEmail.trim().toLowerCase();
    try {
      const parts = newName.trim().split(' ');
      const created = await createPOSCustomer({
        first_name: parts[0],
        last_name: parts.slice(1).join(' ') || undefined,
        email,
        phone: newPhone.trim() || undefined
      });
      attachCustomer(created);
      onClose();
      return;
    } catch (err) {
      console.error('[CustomerSearch] create failed, using local:', err);
    }
    attachCustomer({
      id: `local-${Date.now()}`,
      name: newName.trim(),
      email,
      phone: newPhone.trim(),
      totalOrders: 0,
      totalSpent: 0,
      marketingOptIn: optIn
    });
    onClose();
    setSaving(false);
  };
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.4)'
  }} onClick={e => e.target === e.currentTarget && !required && onClose()}>
      <div className='w-full max-w-md rounded-xl overflow-hidden' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
        {}
        <div className='flex items-center justify-between px-5 py-4' style={{
        borderBottom: '1px solid #E1E3E5'
      }}>
          <h3 className='text-base font-semibold' style={{
          color: '#202223'
        }}>
            {showNew ? 'Add new customer' : 'Add customer to sale'}
          </h3>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors' style={{
          color: '#6D7175'
        }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='p-4 max-h-[70vh] overflow-y-auto'>
          {!showNew ? <>
              {}
              <div className='relative mb-3'>
                <svg className='absolute left-3 top-1/2 -translate-y-1/2' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='2' strokeLinecap='round'>
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input type='text' placeholder='Search by name, phone, or email...' value={search} onChange={e => setSearch(e.target.value)} className='w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none' style={{
              border: '1px solid #E1E3E5',
              background: '#F6F6F7',
              color: '#202223'
            }} autoFocus />
              </div>

              {}
              {customer && <div className='flex items-center justify-between p-3 rounded-lg mb-3' style={{
            background: '#F2F7F5',
            border: '1px solid #B5E4D8'
          }}>
                  <div>
                    <p className='text-sm font-medium' style={{
                color: '#202223'
              }}>
                      {customer.name}
                    </p>
                    {customer.phone && <p className='text-xs' style={{
                color: '#6D7175'
              }}>
                        {customer.phone}
                      </p>}
                  </div>
                  <button onClick={handleRemove} className='text-xs px-2 py-1 rounded' style={{
              color: '#D82C0D',
              background: '#FFF4F4'
            }}>
                    Remove
                  </button>
                </div>}

              {}
              {apiError && <p className='text-xs text-center py-2' style={{
            color: '#D82C0D'
          }}>
                  {apiError}
                </p>}

              {}
              {loading && <div className='flex justify-center py-6'>
                  <div className='w-5 h-5 rounded-full border-2 animate-spin' style={{
              borderColor: '#E1E3E5',
              borderTopColor: '#008060'
            }} />
                </div>}

              {}
              {!loading && customers.length === 0 && !apiError && <p className='text-sm text-center py-6' style={{
            color: '#8C9196'
          }}>
                  {search.trim() ? 'No customers found' : 'Start typing a name, phone, or email to search'}
                </p>}

              {!loading && customers.map(c => <button key={c.id} onClick={() => handleSelect(c)} className='w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-gray-50 mb-1' style={{
            border: '1px solid #E1E3E5'
          }}>
                    <div className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold' style={{
              background: '#F2F7F5',
              color: '#008060'
            }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate' style={{
                color: '#202223'
              }}>
                        {c.name}
                      </p>
                      <p className='text-xs truncate' style={{
                color: '#6D7175'
              }}>
                        {c.phone ?? c.email ?? 'No contact'}
                      </p>
                    </div>
                    <div className='text-right flex-shrink-0'>
                      <p className='text-xs' style={{
                color: '#6D7175'
              }}>
                        {c.totalOrders} orders
                      </p>
                    </div>
                  </button>)}

              {}
              <button onClick={() => setShowNew(true)} className='w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg text-sm font-medium transition-colors' style={{
            color: '#008060',
            border: '1px dashed #008060',
            background: 'transparent'
          }}>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                  <line x1='12' y1='5' x2='12' y2='19' />
                  <line x1='5' y1='12' x2='19' y2='12' />
                </svg>
                Add new customer
              </button>

              {required && <button onClick={onClose} className='w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg text-sm font-medium transition-colors' style={{
            color: '#6D7175',
            background: 'transparent'
          }}>
                  Continue as Walk-in Customer →
                </button>}
            </> : (<div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium mb-1' style={{
              color: '#6D7175'
            }}>
                  Name *
                </label>
                <input type='text' placeholder='Customer ka naam' value={newName} onChange={e => setNewName(e.target.value)} className='w-full px-3 py-2 text-sm rounded-lg border outline-none' style={{
              border: '1px solid #E1E3E5',
              color: '#202223'
            }} autoFocus />
              </div>
              <div>
                <label className='block text-xs font-medium mb-1' style={{
              color: '#6D7175'
            }}>
                  Phone *
                </label>
                <input type='tel' placeholder='10-digit mobile number' value={newPhone} onChange={e => setNewPhone(e.target.value)} className='w-full px-3 py-2 text-sm rounded-lg border outline-none' style={{
              border: '1px solid #E1E3E5',
              color: '#202223'
            }} />
              </div>
              <div>
                <label className='block text-xs font-medium mb-1' style={{
              color: '#6D7175'
            }}>
                  Email *
                </label>
                <input type='email' placeholder='email@example.com' value={newEmail} onChange={e => setNewEmail(e.target.value)} className='w-full px-3 py-2 text-sm rounded-lg border outline-none' style={{
              border: '1px solid #E1E3E5',
              color: '#202223'
            }} />
              </div>
              {formError && <p className='text-xs' style={{
            color: '#D82C0D'
          }}>
                  {formError}
                </p>}

              {}
              {matching && <p className='text-xs' style={{
            color: '#8C9196'
          }}>
                  Checking existing customers…
                </p>}
              {!matching && matches.length > 0 && <div className='rounded-lg p-2 space-y-1.5' style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A'
          }}>
                  <p className='text-[11px] font-medium' style={{
              color: '#B7791F'
            }}>
                    Already in the system:
                  </p>
                  {matches.slice(0, 3).map(m => <button key={m.id} onClick={() => handleSelect(m)} className='w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left bg-white hover:bg-gray-50 transition-colors' style={{
              border: '1px solid #E1E3E5'
            }}>
                      <span>
                        <span className='text-xs font-medium block' style={{
                  color: '#202223'
                }}>
                          {m.name}
                        </span>
                        <span className='text-[11px]' style={{
                  color: '#6D7175'
                }}>
                          {m.phone ?? m.email ?? 'No contact'}
                        </span>
                      </span>
                      <span className='text-[11px] font-medium' style={{
                color: '#008060'
              }}>
                        Use this
                      </span>
                    </button>)}
                </div>}

              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='checkbox' checked={optIn} onChange={e => setOptIn(e.target.checked)} className='rounded' />
                <span className='text-xs' style={{
              color: '#6D7175'
            }}>
                  Marketing emails ke liye opt-in
                </span>
              </label>

              <div className='flex gap-2 pt-2'>
                <button onClick={() => setShowNew(false)} className='flex-1 py-2.5 text-sm rounded-lg border transition-colors' style={{
              color: '#6D7175',
              border: '1px solid #E1E3E5'
            }}>
                  Back
                </button>
                <button onClick={handleAddNew} disabled={!isNewCustomerFormValid || saving} className='flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors' style={{
              background: isNewCustomerFormValid && !saving ? '#008060' : '#E1E3E5',
              color: isNewCustomerFormValid && !saving ? '#FFFFFF' : '#8C9196',
              cursor: isNewCustomerFormValid && !saving ? 'pointer' : 'not-allowed'
            }}>
                  {saving ? 'Saving...' : 'Add customer'}
                </button>
              </div>
            </div>)}
        </div>
      </div>
    </div>;
}
