'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
const Icons = {
  back: <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M15 18l-6-6 6-6' />
    </svg>,
  percent: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <line x1='19' y1='5' x2='5' y2='19' />
      <circle cx='6.5' cy='6.5' r='2.5' />
      <circle cx='17.5' cy='17.5' r='2.5' />
    </svg>,
  rupee: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
    </svg>,
  shipping: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M1 3h15v13H1z' />
      <path d='M16 8h4l3 4v5h-7V8z' />
      <circle cx='5.5' cy='18.5' r='2' />
      <circle cx='18.5' cy='18.5' r='2' />
    </svg>,
  gift: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='20 12 20 22 4 22 4 12' />
      <rect x='2' y='7' width='20' height='5' />
      <line x1='12' y1='22' x2='12' y2='7' />
      <path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z' />
      <path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' />
    </svg>,
  refresh: <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 2v6h-6' />
      <path d='M3 12a9 9 0 0 1 15-6.7L21 8' />
      <path d='M3 22v-6h6' />
      <path d='M21 12a9 9 0 0 1-15 6.7L3 16' />
    </svg>,
  info: <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='10' />
      <path d='M12 16v-4M12 8h.01' />
    </svg>,
  check: <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M4 13l5 5L20 6' />
    </svg>,
  spinner: <svg className='animate-spin w-4 h-4' viewBox='0 0 24 24' fill='none'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v8H4z' />
    </svg>,
  users: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>,
  calendar: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='3' y='4' width='18' height='18' rx='2' />
      <line x1='16' y1='2' x2='16' y2='6' />
      <line x1='8' y1='2' x2='8' y2='6' />
      <line x1='3' y1='10' x2='21' y2='10' />
    </svg>,
  zap: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
    </svg>,
  plus: <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
      <path d='M12 4v16M4 12h16' />
    </svg>,
  trash: <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
    </svg>
};
type DiscountType = 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
type CustomerEligibility = 'all' | 'specific' | 'new_customers';
interface AutoRule {
  id: string;
  type: 'min_amount' | 'min_quantity' | 'specific_product' | 'specific_category' | 'first_order';
  value: string;
  selectedProducts?: {
    id: string;
    title: string;
    thumbnail?: string;
  }[];
}
const DISCOUNT_TYPES = [{
  type: 'percentage' as DiscountType,
  label: 'Percentage',
  desc: 'e.g. 10% off',
  icon: Icons.percent,
  color: 'text-[#008060]',
  activeBorder: 'border-[#008060]',
  activeBg: 'bg-[#F2F7F5]',
  iconActiveBg: 'bg-[#008060]/10'
}, {
  type: 'fixed' as DiscountType,
  label: 'Fixed Amount',
  desc: 'e.g. £200 off',
  icon: Icons.rupee,
  color: 'text-[#2C6ECB]',
  activeBorder: 'border-[#2C6ECB]',
  activeBg: 'bg-[#EBF2FF]',
  iconActiveBg: 'bg-[#2C6ECB]/10'
}, {
  type: 'free_shipping' as DiscountType,
  label: 'Free Shipping',
  desc: 'Remove shipping fee',
  icon: Icons.shipping,
  color: 'text-purple-600',
  activeBorder: 'border-purple-400',
  activeBg: 'bg-purple-50',
  iconActiveBg: 'bg-purple-100'
}, {
  type: 'buy_x_get_y' as DiscountType,
  label: 'Quantity Discount',
  desc: 'e.g. Buy 2, get 10% off',
  icon: Icons.gift,
  color: 'text-[#916A00]',
  activeBorder: 'border-[#FFC453]',
  activeBg: 'bg-[#FFF8E7]',
  iconActiveBg: 'bg-[#FFC453]/20'
}];
const AUTO_RULE_OPTIONS = [{
  type: 'min_amount' as const,
  label: 'Minimum order amount',
  desc: 'e.g. cart total ≥ £999',
  placeholder: '999',
  prefix: '£'
}, {
  type: 'min_quantity' as const,
  label: 'Minimum item quantity',
  desc: 'e.g. buy at least 3 items',
  placeholder: '3',
  prefix: '#'
}, {
  type: 'specific_product' as const,
  label: 'Specific products',
  desc: 'Search & select products',
  placeholder: '',
  prefix: ''
}, {
  type: 'specific_category' as const,
  label: 'Specific category',
  desc: 'Apply to a product category',
  placeholder: '',
  prefix: ''
}, {
  type: 'first_order' as const,
  label: 'First order (new customer)',
  desc: 'Auto-applies on first purchase',
  placeholder: '',
  prefix: ''
}];
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({
    length: 8
  }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function SectionCard({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`bg-white border border-[#E1E3E5] rounded-2xl p-6 shadow-sm ${className}`}>
      {children}
    </div>;
}
function SectionTitle({
  icon,
  children
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <div className='flex items-center gap-2 mb-5'>
      {icon && <span className='text-[#8C9196]'>{icon}</span>}
      <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
        {children}
      </h2>
    </div>;
}
function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return <button onClick={onChange} className={`relative w-10 h-6 rounded-full transition-colors duration-200 border-none cursor-pointer ${checked ? 'bg-[#008060]' : 'bg-[#D1D5DB]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>;
}
function Input({
  prefix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  prefix?: string;
}) {
  return <div className='relative'>
      {prefix && <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C9196] text-[13px] font-medium select-none'>
          {prefix}
        </span>}
      <input {...props} className={`w-full ${prefix ? 'pl-8' : 'px-3.5'} pr-3.5 py-2.5 border border-[#E1E3E5] rounded-xl text-[13px] text-[#202223] placeholder-[#C4C8CC] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 transition-all duration-150 ${props.className ?? ''}`} />
    </div>;
}
function buildPromotionPayload(form: any, autoRules: AutoRule[]) {
  const isAutomatic = autoRules.length > 0 || form.type === 'buy_x_get_y';
  const applicationMethod: any = {
    type: form.type === 'fixed' ? 'fixed' : 'percentage',
    target_type: form.type === 'free_shipping' ? 'shipping_methods' : 'order',
    allocation: 'across',
    value: form.type === 'fixed' ? Number(form.value || 0) : form.type === 'free_shipping' ? 100 : Number(form.value || 0),
    currency_code: 'gbp'
  };
  const rules: any[] = [];
  if (form.minOrderAmount) rules.push({
    attribute: 'subtotal',
    operator: 'gte',
    values: [{
      value: String(Number(form.minOrderAmount))
    }]
  });
  if (form.minQuantity) rules.push({
    attribute: 'quantity',
    operator: 'gte',
    values: [{
      value: form.minQuantity
    }]
  });
  if (form.type === 'buy_x_get_y' && form.buyQuantity) rules.push({
    attribute: 'quantity',
    operator: 'gte',
    values: [{
      value: form.buyQuantity
    }]
  });
  autoRules.forEach(rule => {
    if (rule.type === 'min_amount' && rule.value) rules.push({
      attribute: 'subtotal',
      operator: 'gte',
      values: [{
        value: String(Number(rule.value))
      }]
    });
    if (rule.type === 'min_quantity' && rule.value) rules.push({
      attribute: 'quantity',
      operator: 'gte',
      values: [{
        value: rule.value
      }]
    });
    if (rule.type === 'specific_product' && rule.selectedProducts?.length) rules.push({
      attribute: 'product_id',
      operator: 'in',
      values: rule.selectedProducts.map(p => ({
        value: p.id
      }))
    });
    if (rule.type === 'specific_category' && rule.value) rules.push({
      attribute: 'product_category_id',
      operator: 'in',
      values: [{
        value: rule.value
      }]
    });
    if (rule.type === 'first_order') rules.push({
      attribute: 'customer_order_count',
      operator: 'eq',
      values: [{
        value: '0'
      }]
    });
  });
  if (form.customerEligibility === 'new_customers') rules.push({
    attribute: 'customer_order_count',
    operator: 'eq',
    values: [{
      value: '0'
    }]
  });
  const hasCampaign = form.description || form.startsAt || form.hasEndDate && form.expiresAt || form.maxUses;
  const campaign = hasCampaign ? {
    name: form.code,
    ...(form.description ? {
      description: form.description
    } : {}),
    ...(form.startsAt ? {
      starts_at: new Date(form.startsAt).toISOString()
    } : {}),
    ...(form.hasEndDate && form.expiresAt ? {
      ends_at: new Date(form.expiresAt).toISOString()
    } : {}),
    ...(form.maxUses ? {
      budget: {
        type: 'usage',
        limit: Number(form.maxUses)
      }
    } : {})
  } : undefined;
  return {
    code: form.code,
    type: isAutomatic ? 'automatic' : 'standard',
    is_automatic: isAutomatic,
    status: form.isActive ? 'active' : 'inactive',
    application_method: applicationMethod,
    ...(rules.length > 0 ? {
      rules
    } : {}),
    ...(campaign ? {
      campaign
    } : {})
  };
}
function AddDiscountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = !!editId;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as DiscountType,
    value: '',
    buyQuantity: '2',
    minOrderAmount: '',
    minQuantity: '',
    maxUses: '',
    maxUsesPerCustomer: '1',
    startsAt: '',
    expiresAt: '',
    hasEndDate: false,
    description: '',
    isActive: true,
    customerEligibility: 'all' as CustomerEligibility,
    combineWithOther: false
  });
  const [autoRules, setAutoRules] = useState<AutoRule[]>([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [productModalRuleId, setProductModalRuleId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<{
    id: string;
    title: string;
    thumbnail?: string;
  }[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [categories, setCategories] = useState<{
    id: string;
    name: string;
  }[]>([]);
  useEffect(() => {
    fetch('/api/admin/categories?limit=100').then(r => r.json()).then(d => setCategories((d.product_categories ?? []).map((c: any) => ({
      id: c.id,
      name: c.name
    })))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!productModalRuleId) return;
    if (!productSearch.trim()) {
      setProductSearchResults([]);
      return;
    }
    setProductSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?q=${encodeURIComponent(productSearch)}&limit=10`);
        const data = await res.json();
        setProductSearchResults((data.products ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          thumbnail: p.thumbnail
        })));
      } catch {
        setProductSearchResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [productSearch, productModalRuleId]);
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/discounts/${editId}`);
        if (!res.ok) throw new Error('Failed to load discount');
        const data = await res.json();
        const p = data.promotion ?? data;
        if (cancelled || !p) return;
        const am = p.application_method ?? {};
        const subtotalRule = (p.rules ?? []).find((r: any) => r.attribute === 'subtotal');
        const quantityRule = (p.rules ?? []).find((r: any) => r.attribute === 'quantity');
        const isQuantityDiscount = am.type === 'percentage' && !!p.is_automatic && !!quantityRule;
        const isFreeShipping = am.target_type === 'shipping_methods';
        const type: DiscountType = isFreeShipping ? 'free_shipping' : isQuantityDiscount ? 'buy_x_get_y' : am.type === 'fixed' && am.value > 0 ? 'fixed' : 'percentage';
        setForm(f => ({
          ...f,
          code: p.code ?? '',
          type,
          value: type === 'percentage' || type === 'buy_x_get_y' ? String(am.value ?? '') : String(am.value ?? 0),
          buyQuantity: isQuantityDiscount ? String(quantityRule.values?.[0]?.value ?? '') : f.buyQuantity,
          minOrderAmount: subtotalRule ? String(Number(subtotalRule.values?.[0]?.value ?? 0)) : '',
          minQuantity: quantityRule && !isQuantityDiscount ? String(quantityRule.values?.[0]?.value ?? '') : '',
          maxUses: p.campaign?.budget?.limit ? String(p.campaign.budget.limit) : '',
          startsAt: p.campaign?.starts_at ? new Date(p.campaign.starts_at).toISOString().slice(0, 10) : '',
          expiresAt: p.campaign?.ends_at ? new Date(p.campaign.ends_at).toISOString().slice(0, 10) : '',
          hasEndDate: !!p.campaign?.ends_at,
          description: p.campaign?.description ?? '',
          isActive: p.status === 'active'
        }));
        setAutoEnabled(!!p.is_automatic);
      } catch (err: any) {
        setSaveError(err.message ?? 'Failed to load discount');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);
  const update = (key: string, value: string | boolean) => setForm(f => ({
    ...f,
    [key]: value
  }));
  const selectedType = DISCOUNT_TYPES.find(t => t.type === form.type)!;
  const addAutoRule = (type: AutoRule['type']) => {
    if (autoRules.find(r => r.type === type)) return;
    setAutoRules(prev => [...prev, {
      id: Date.now().toString(),
      type,
      value: ''
    }]);
  };
  const removeAutoRule = (id: string) => setAutoRules(prev => prev.filter(r => r.id !== id));
  const updateAutoRule = (id: string, value: string) => setAutoRules(prev => prev.map(r => r.id === id ? {
    ...r,
    value
  } : r));
  const toggleProductInRule = (ruleId: string, product: {
    id: string;
    title: string;
    thumbnail?: string;
  }) => {
    setAutoRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r;
      const existing = r.selectedProducts ?? [];
      const already = existing.find(p => p.id === product.id);
      const updated = already ? existing.filter(p => p.id !== product.id) : [...existing, product];
      return {
        ...r,
        selectedProducts: updated
      };
    }));
  };
  const previewValue = () => {
    if (form.type === 'percentage') return form.value ? `${form.value}% off` : '—';
    if (form.type === 'fixed') return form.value ? `£${form.value} off` : '—';
    if (form.type === 'free_shipping') return 'Free shipping';
    return form.buyQuantity && form.value ? `Buy ${form.buyQuantity}+, get ${form.value}% off` : '—';
  };
  const handleSave = async (active: boolean) => {
    if (!form.code) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildPromotionPayload({
        ...form,
        isActive: active
      }, autoRules);
      const url = isEditing ? `/api/admin/discounts/${editId}` : '/api/admin/discounts';
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? (isEditing ? 'Failed to update discount' : 'Failed to create discount'));
      }
      router.push('/dashboard/discounts');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const checklist = [{
    label: 'Discount code',
    done: !!form.code
  }, {
    label: 'Discount value',
    done: form.type === 'free_shipping' || (form.type === 'buy_x_get_y' ? !!form.buyQuantity && !!form.value : !!form.value)
  }, {
    label: 'Start date set',
    done: !!form.startsAt
  }, {
    label: 'Customer eligibility',
    done: true
  }, ...(autoEnabled ? [{
    label: 'Auto rules configured',
    done: autoRules.length > 0 && autoRules.every(r => r.type === 'first_order' || (r.type === 'specific_product' ? (r.selectedProducts?.length ?? 0) > 0 : !!r.value))
  }] : [])];
  return <div className='max-w-5xl mx-auto space-y-5'>
      {}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard/discounts' className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-xl text-[#6D7175] hover:text-[#202223] hover:bg-white no-underline transition-all bg-white shadow-sm'>
            {Icons.back}
          </Link>
          <div>
            <h1 className='font-sora text-[20px] font-semibold text-[#202223] tracking-tight'>
              {isEditing ? 'Edit Discount' : 'Create Discount'}
            </h1>
            <p className='text-[12.5px] text-[#8C9196] mt-0.5'>
              {isEditing ? 'Update this discount code' : 'Set up a new discount code for your store'}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2.5'>
          {!isEditing && <button onClick={() => handleSave(false)} disabled={saving || !form.code} className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm'>
              Save as Inactive
            </button>}
          <button onClick={() => handleSave(form.isActive)} disabled={saving || !form.code || loadingExisting} className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-all disabled:opacity-50 cursor-pointer border-none shadow-sm shadow-[#008060]/20'>
            {saving ? Icons.spinner : null}
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Activate'}
          </button>
        </div>
      </div>

      {}
      {saveError && <div className='flex items-center gap-3 px-4 py-3 bg-[#FFF4F4] border border-[#D82C0D]/20 rounded-xl text-[13px] text-[#D82C0D]'>
          {saveError}
          <button onClick={() => setSaveError(null)} className='ml-auto bg-transparent border-none cursor-pointer text-[#D82C0D]'>
            ✕
          </button>
        </div>}

      <div className='grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5'>
        {}
        <div className='space-y-5'>
          {}
          <SectionCard>
            <SectionTitle>Discount Type</SectionTitle>
            <div className='grid grid-cols-2 gap-3'>
              {DISCOUNT_TYPES.map(t => {
              const isActive = form.type === t.type;
              return <button key={t.type} onClick={() => update('type', t.type)} className={`flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all duration-150 cursor-pointer group ${isActive ? `${t.activeBorder} ${t.activeBg}` : 'border-[#E1E3E5] bg-white hover:border-[#C4C8CC] hover:bg-[#FAFAFA]'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? `${t.iconActiveBg} ${t.color}` : 'bg-[#F6F6F7] text-[#8C9196]'}`}>
                      {t.icon}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className={`text-[13px] font-semibold ${isActive ? t.color : 'text-[#202223]'}`}>
                        {t.label}
                      </p>
                      <p className='text-[11.5px] text-[#B0B5BA] mt-0.5'>
                        {t.desc}
                      </p>
                    </div>
                    {isActive && <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${t.iconActiveBg} ${t.color}`}>
                        {Icons.check}
                      </div>}
                  </button>;
            })}
            </div>
          </SectionCard>

          {}
          <SectionCard>
            <SectionTitle>Discount Details</SectionTitle>
            <div className='space-y-5'>
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Discount Code{' '}
                  <span className='text-[#D82C0D] normal-case font-normal'>
                    *
                  </span>
                </label>
                <div className='flex gap-2'>
                  <Input type='text' value={form.code} onChange={e => update('code', (e.target as HTMLInputElement).value.toUpperCase())} placeholder='e.g. APEX10' className='flex-1 font-mono tracking-widest uppercase' />
                  <button onClick={() => update('code', generateCode())} className='inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[12.5px] font-medium text-[#202223] rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-sm'>
                    {Icons.refresh} Generate
                  </button>
                </div>
                <p className='text-[11.5px] text-[#B0B5BA] mt-1.5 flex items-center gap-1'>
                  {Icons.info}{' '}
                  {form.type === 'buy_x_get_y' ? 'Applies automatically — this code is just an internal reference.' : 'Customers will enter this code at checkout'}
                </p>
              </div>

              {(form.type === 'percentage' || form.type === 'fixed') && <div>
                  <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                    {form.type === 'percentage' ? 'Percentage Off' : 'Fixed Amount Off'}{' '}
                    <span className='text-[#D82C0D] normal-case font-normal'>
                      *
                    </span>
                  </label>
                  <div className='max-w-[200px]'>
                    <Input prefix={form.type === 'percentage' ? '%' : '£'} type='number' value={form.value} onChange={e => update('value', (e.target as HTMLInputElement).value)} placeholder={form.type === 'percentage' ? '10' : '200'} min='0' max={form.type === 'percentage' ? '100' : undefined} />
                  </div>
                </div>}

              {form.type === 'buy_x_get_y' && <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                      Buy At Least (Qty){' '}
                      <span className='text-[#D82C0D] normal-case font-normal'>
                        *
                      </span>
                    </label>
                    <Input type='number' value={form.buyQuantity} onChange={e => update('buyQuantity', (e.target as HTMLInputElement).value)} placeholder='2' min='1' />
                  </div>
                  <div>
                    <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                      Discount{' '}
                      <span className='text-[#D82C0D] normal-case font-normal'>
                        *
                      </span>
                    </label>
                    <Input prefix='%' type='number' value={form.value} onChange={e => update('value', (e.target as HTMLInputElement).value)} placeholder='10' min='0' max='100' />
                  </div>
                  <p className='col-span-2 text-[11.5px] text-[#B0B5BA] flex items-center gap-1'>
                    {Icons.info} Applies automatically at checkout once the cart
                    has this many items — no code needed.
                  </p>
                </div>}

              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Internal Description{' '}
                  <span className='ml-1 text-[11px] text-[#B0B5BA] font-normal normal-case'>
                    (for your reference)
                  </span>
                </label>
                <Input type='text' value={form.description} onChange={e => update('description', (e.target as HTMLInputElement).value)} placeholder='e.g. Summer sale for football products' />
              </div>
            </div>
          </SectionCard>

          {}
          <SectionCard>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-2'>
                <span className='text-[#008060]'>{Icons.zap}</span>
                <div>
                  <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
                    Automatic Discount Rules
                  </h2>
                  <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                    Discount auto-applies when conditions are met
                  </p>
                </div>
              </div>
              <Toggle checked={autoEnabled} onChange={() => {
              setAutoEnabled(v => !v);
              if (autoEnabled) setAutoRules([]);
            }} />
            </div>

            {autoEnabled && <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-2'>
                  {AUTO_RULE_OPTIONS.map(opt => {
                const added = !!autoRules.find(r => r.type === opt.type);
                return <button key={opt.type} onClick={() => addAutoRule(opt.type)} disabled={added} className={`flex items-start gap-2.5 p-3 border rounded-xl text-left transition-all duration-150 cursor-pointer ${added ? 'border-[#008060]/30 bg-[#F2F7F5] opacity-60 cursor-not-allowed' : 'border-[#E1E3E5] bg-white hover:border-[#008060]/40 hover:bg-[#F2F7F5]'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${added ? 'bg-[#008060] text-white' : 'bg-[#F6F6F7] text-[#8C9196]'}`}>
                          {added ? Icons.check : Icons.plus}
                        </div>
                        <div>
                          <p className='text-[12.5px] font-medium text-[#202223]'>
                            {opt.label}
                          </p>
                          <p className='text-[11px] text-[#B0B5BA] mt-0.5'>
                            {opt.desc}
                          </p>
                        </div>
                      </button>;
              })}
                </div>

                {autoRules.length > 0 && <div className='space-y-3 pt-2 border-t border-[#F1F1F1]'>
                    <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                      Active Rules
                    </p>
                    {autoRules.map(rule => {
                const opt = AUTO_RULE_OPTIONS.find(o => o.type === rule.type)!;
                return <div key={rule.id} className='flex items-center gap-3 p-3.5 bg-[#F8F9FA] border border-[#E1E3E5] rounded-xl'>
                          <div className='w-8 h-8 rounded-lg bg-[#008060]/10 text-[#008060] flex items-center justify-center shrink-0'>
                            {Icons.zap}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[12.5px] font-medium text-[#202223]'>
                              {opt.label}
                            </p>

                            {}
                            {(rule.type === 'min_amount' || rule.type === 'min_quantity') && <div className='mt-1.5 max-w-[200px]'>
                                <Input prefix={opt.prefix} type='number' value={rule.value} onChange={e => updateAutoRule(rule.id, (e.target as HTMLInputElement).value)} placeholder={opt.placeholder} min='0' />
                              </div>}

                            {}
                            {rule.type === 'specific_product' && <div className='mt-1.5'>
                                {(rule.selectedProducts ?? []).length > 0 && <div className='flex flex-wrap gap-1.5 mb-2'>
                                    {(rule.selectedProducts ?? []).map(p => <span key={p.id} className='flex items-center gap-1 px-2 py-0.5 bg-[#F2F7F5] border border-[#008060]/20 rounded-full text-[11px] text-[#008060] font-medium'>
                                        {p.title}
                                        <button onClick={() => toggleProductInRule(rule.id, p)} className='text-[#8C9196] hover:text-[#D82C0D] bg-transparent border-none cursor-pointer p-0 leading-none'>
                                          ×
                                        </button>
                                      </span>)}
                                  </div>}
                                <button onClick={() => {
                        setProductModalRuleId(rule.id);
                        setProductSearch('');
                        setProductSearchResults([]);
                      }} className='text-[11.5px] text-[#2C6ECB] hover:underline bg-transparent border-none cursor-pointer p-0'>
                                  + Search & add products
                                </button>
                              </div>}

                            {}
                            {rule.type === 'specific_category' && <div className='mt-1.5 max-w-[220px]'>
                                <select value={rule.value} onChange={e => updateAutoRule(rule.id, e.target.value)} className='w-full text-[12.5px] border border-[#E1E3E5] rounded-lg px-2.5 py-1.5 bg-white text-[#202223] focus:outline-none focus:border-[#008060]'>
                                  <option value=''>— Select category —</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>)}
                                </select>
                              </div>}

                            {}
                            {rule.type === 'first_order' && <p className='text-[11.5px] text-[#008060] mt-0.5'>
                                Applies on customer&apos;s first order
                                automatically
                              </p>}
                          </div>
                          <button onClick={() => removeAutoRule(rule.id)} className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#D82C0D]/5 rounded-lg transition-all bg-transparent border-none cursor-pointer shrink-0'>
                            {Icons.trash}
                          </button>
                        </div>;
              })}
                    <div className='flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg'>
                      <span className='text-amber-600 shrink-0 mt-0.5'>
                        {Icons.info}
                      </span>
                      <p className='text-[11.5px] text-amber-800'>
                        <strong>All rules must be met</strong> for the discount
                        to apply automatically.
                      </p>
                    </div>
                  </div>}
              </div>}
          </SectionCard>

          {}
          <SectionCard>
            <SectionTitle>Minimum Requirements</SectionTitle>
            <div className='space-y-2.5'>
              {[{
              id: 'none',
              label: 'No minimum requirements'
            }, {
              id: 'amount',
              label: 'Minimum purchase amount (£)'
            }, {
              id: 'quantity',
              label: 'Minimum quantity of items'
            }].map(opt => {
              const isChecked = opt.id === 'none' ? !form.minOrderAmount && !form.minQuantity : opt.id === 'amount' ? !!form.minOrderAmount : !!form.minQuantity;
              return <label key={opt.id} className={`flex items-start gap-3 cursor-pointer p-3.5 border rounded-xl transition-all duration-150 ${isChecked ? 'border-[#008060]/30 bg-[#F2F7F5]' : 'border-[#E1E3E5] hover:bg-[#FAFAFA]'}`}>
                    <input type='radio' name='minReq' checked={isChecked} onChange={() => {
                  if (opt.id === 'none') {
                    update('minOrderAmount', '');
                    update('minQuantity', '');
                  } else if (opt.id === 'amount') {
                    update('minQuantity', '');
                    update('minOrderAmount', '999');
                  } else {
                    update('minOrderAmount', '');
                    update('minQuantity', '2');
                  }
                }} className='mt-0.5 accent-[#008060] w-4 h-4 shrink-0' />
                    <div className='flex-1'>
                      <span className='text-[13px] text-[#202223]'>
                        {opt.label}
                      </span>
                      {opt.id === 'amount' && form.minOrderAmount && <div className='mt-2.5 max-w-[180px]'>
                          <Input prefix='£' type='number' value={form.minOrderAmount} onChange={e => update('minOrderAmount', (e.target as HTMLInputElement).value)} min='0' />
                        </div>}
                      {opt.id === 'quantity' && form.minQuantity && <div className='mt-2.5 max-w-[180px]'>
                          <Input type='number' value={form.minQuantity} onChange={e => update('minQuantity', (e.target as HTMLInputElement).value)} min='1' />
                        </div>}
                    </div>
                  </label>;
            })}
            </div>
          </SectionCard>

          {}
          <SectionCard>
            <SectionTitle icon={Icons.users}>Customer Eligibility</SectionTitle>
            <div className='space-y-2'>
              {[{
              value: 'all',
              label: 'All customers'
            }, {
              value: 'new_customers',
              label: 'New customers only (first order)'
            }, {
              value: 'specific',
              label: 'Specific customers'
            }].map(opt => {
              const isChecked = form.customerEligibility === opt.value;
              return <label key={opt.value} className={`flex items-center gap-3 cursor-pointer p-3.5 border rounded-xl transition-all duration-150 ${isChecked ? 'border-[#008060]/30 bg-[#F2F7F5]' : 'border-[#E1E3E5] hover:bg-[#FAFAFA]'}`}>
                    <input type='radio' name='eligibility' value={opt.value} checked={isChecked} onChange={() => update('customerEligibility', opt.value)} className='accent-[#008060] w-4 h-4 shrink-0' />
                    <span className='text-[13px] text-[#202223]'>
                      {opt.label}
                    </span>
                  </label>;
            })}
            </div>
          </SectionCard>

          {}
          <SectionCard>
            <SectionTitle>Usage Limits</SectionTitle>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                    Total Limit{' '}
                    <span className='ml-1 text-[11px] text-[#B0B5BA] font-normal normal-case'>
                      (blank = unlimited)
                    </span>
                  </label>
                  <Input type='number' value={form.maxUses} onChange={e => update('maxUses', (e.target as HTMLInputElement).value)} placeholder='Unlimited' min='1' />
                </div>
                <div>
                  <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                    Per Customer
                  </label>
                  <Input type='number' value={form.maxUsesPerCustomer} onChange={e => update('maxUsesPerCustomer', (e.target as HTMLInputElement).value)} min='1' />
                </div>
              </div>
              <div className='flex items-center justify-between p-3.5 border border-[#E1E3E5] rounded-xl bg-[#FAFAFA]'>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    Combine with other discounts
                  </p>
                  <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                    Allow stacking with other active codes
                  </p>
                </div>
                <Toggle checked={form.combineWithOther} onChange={() => update('combineWithOther', !form.combineWithOther)} />
              </div>
            </div>
          </SectionCard>

          {}
          <SectionCard>
            <SectionTitle icon={Icons.calendar}>Active Dates</SectionTitle>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                    Start Date
                  </label>
                  <Input type='date' value={form.startsAt} onChange={e => update('startsAt', (e.target as HTMLInputElement).value)} />
                </div>
                <div>
                  <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                    Start Time
                  </label>
                  <Input type='time' defaultValue='00:00' />
                </div>
              </div>
              <label className='flex items-center gap-2.5 cursor-pointer'>
                <input type='checkbox' checked={form.hasEndDate} onChange={e => update('hasEndDate', e.target.checked)} className='w-4 h-4 rounded accent-[#008060] cursor-pointer' />
                <span className='text-[13px] text-[#202223]'>Set end date</span>
              </label>
              {form.hasEndDate && <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                      End Date
                    </label>
                    <Input type='date' value={form.expiresAt} onChange={e => update('expiresAt', (e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                      End Time
                    </label>
                    <Input type='time' defaultValue='23:59' />
                  </div>
                </div>}
            </div>
          </SectionCard>
        </div>

        {}
        <div className='space-y-4'>
          {autoEnabled && autoRules.length > 0 && <div className='flex items-center gap-2.5 px-4 py-3 bg-[#008060] text-white rounded-2xl shadow-sm shadow-[#008060]/20'>
              <span>{Icons.zap}</span>
              <div>
                <p className='text-[13px] font-semibold'>Automatic Discount</p>
                <p className='text-[11.5px] opacity-80'>
                  {autoRules.length} rule{autoRules.length > 1 ? 's' : ''}{' '}
                  active
                </p>
              </div>
            </div>}

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Status
            </h3>
            <div className='space-y-2'>
              {[{
              value: true,
              label: 'Active',
              desc: 'Customers can use this code'
            }, {
              value: false,
              label: 'Inactive',
              desc: 'Code will not work at checkout'
            }].map(opt => {
              const isChecked = form.isActive === opt.value;
              return <label key={String(opt.value)} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-150 ${isChecked ? 'border-[#008060]/30 bg-[#F2F7F5]' : 'border-[#E1E3E5] hover:bg-[#FAFAFA]'}`}>
                    <input type='radio' name='status' checked={isChecked} onChange={() => update('isActive', opt.value)} className='mt-0.5 accent-[#008060] w-4 h-4 shrink-0' />
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>
                        {opt.label}
                      </p>
                      <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                        {opt.desc}
                      </p>
                    </div>
                  </label>;
            })}
            </div>
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Summary
            </h3>
            <div className='space-y-3 divide-y divide-[#F5F5F5]'>
              {[{
              label: 'Code',
              value: form.code || '—',
              mono: true
            }, {
              label: 'Type',
              value: selectedType.label
            }, {
              label: 'Value',
              value: previewValue()
            }, {
              label: 'Auto Apply',
              value: autoEnabled && autoRules.length > 0 ? `Yes (${autoRules.length} rules)` : 'No'
            }, {
              label: 'Min Order',
              value: form.minOrderAmount ? `£${form.minOrderAmount}` : 'None'
            }, {
              label: 'Max Uses',
              value: form.maxUses || 'Unlimited'
            }, {
              label: 'Eligibility',
              value: form.customerEligibility === 'all' ? 'All' : form.customerEligibility === 'new_customers' ? 'New only' : 'Specific'
            }, {
              label: 'Status',
              value: form.isActive ? 'Active' : 'Inactive'
            }].map(item => <div key={item.label} className='flex items-center justify-between pt-3 first:pt-0'>
                  <span className='text-[11.5px] text-[#8C9196]'>
                    {item.label}
                  </span>
                  <span className={`text-[12.5px] font-medium text-[#202223] text-right max-w-[140px] truncate ${item.mono ? 'font-mono tracking-wider text-[11.5px]' : ''}`}>
                    {item.value}
                  </span>
                </div>)}
            </div>
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Checklist
            </h3>
            <div className='space-y-3'>
              {checklist.map(item => <div key={item.label} className='flex items-center gap-2.5'>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${item.done ? 'bg-[#008060]' : 'bg-[#E1E3E5]'}`}>
                    {item.done && <span className='text-white'>{Icons.check}</span>}
                  </div>
                  <span className={`text-[12.5px] transition-colors duration-150 ${item.done ? 'text-[#202223]' : 'text-[#B0B5BA]'}`}>
                    {item.label}
                  </span>
                </div>)}
            </div>
            <div className='mt-4 pt-3 border-t border-[#F5F5F5]'>
              <div className='h-1.5 bg-[#E1E3E5] rounded-full overflow-hidden'>
                <div className='h-full bg-[#008060] rounded-full transition-all duration-300' style={{
                width: `${checklist.filter(i => i.done).length / checklist.length * 100}%`
              }} />
              </div>
              <p className='text-[11px] text-[#B0B5BA] mt-1.5'>
                {checklist.filter(i => i.done).length} of {checklist.length}{' '}
                complete
              </p>
            </div>
          </div>

          {}
          <div className='space-y-2'>
            <button onClick={() => handleSave(isEditing ? form.isActive : true)} disabled={saving || !form.code || loadingExisting} className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer border-none inline-flex items-center justify-center gap-2 shadow-sm shadow-[#008060]/20'>
              {saving ? Icons.spinner : null}
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Activate'}
            </button>
            {!isEditing && <button onClick={() => handleSave(false)} disabled={saving || !form.code} className='w-full py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm'>
                Save as Inactive
              </button>}
            <Link href='/dashboard/discounts' className='block text-center py-2.5 text-[13px] text-[#8C9196] hover:text-[#202223] no-underline transition-colors'>
              Discard
            </Link>
          </div>
        </div>
      </div>

      {}
      {productModalRuleId && (() => {
      const rule = autoRules.find(r => r.id === productModalRuleId);
      if (!rule) return null;
      const selected = rule.selectedProducts ?? [];
      return <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{
        background: 'rgba(0,0,0,0.45)'
      }}>
              <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col' style={{
          maxHeight: '80vh'
        }}>
                {}
                <div className='flex items-center justify-between px-5 py-4 border-b border-[#E1E3E5]'>
                  <div>
                    <h3 className='text-[14px] font-semibold text-[#202223]'>
                      Select Products
                    </h3>
                    <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                      Discount applies only to selected products
                    </p>
                  </div>
                  <button onClick={() => setProductModalRuleId(null)} className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] bg-transparent border-none cursor-pointer rounded-lg hover:bg-[#F6F6F7]'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                      <path d='M18 6L6 18M6 6l12 12' />
                    </svg>
                  </button>
                </div>

                {}
                <div className='px-5 py-3 border-b border-[#F1F1F1]'>
                  <div className='flex items-center gap-2 border border-[#E1E3E5] rounded-lg px-3 py-2 bg-[#F9F9F9]'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#8C9196' strokeWidth='1.5' strokeLinecap='round'>
                      <circle cx='11' cy='11' r='7.5' />
                      <path d='M18.5 18.5L22 22' />
                    </svg>
                    <input autoFocus type='text' value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder='Search products...' className='flex-1 text-[13px] bg-transparent border-none outline-none text-[#202223] placeholder-[#8C9196]' />
                    {productSearchLoading && <span className='text-[#8C9196]'>{Icons.spinner}</span>}
                  </div>
                </div>

                {}
                <div className='flex-1 overflow-y-auto px-5 py-3 space-y-1.5'>
                  {!productSearch.trim() && <p className='text-[12px] text-[#8C9196] text-center py-6'>
                      Type to search products
                    </p>}
                  {productSearch.trim() && !productSearchLoading && productSearchResults.length === 0 && <p className='text-[12px] text-[#8C9196] text-center py-6'>
                        No products found
                      </p>}
                  {productSearchResults.map(p => {
              const isSelected = !!selected.find(s => s.id === p.id);
              return <button key={p.id} onClick={() => toggleProductInRule(productModalRuleId, p)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${isSelected ? 'border-[#008060]/30 bg-[#F2F7F5]' : 'border-[#E1E3E5] bg-white hover:border-[#008060]/20 hover:bg-[#F9FAF9]'}`}>
                        {p.thumbnail ? <img src={p.thumbnail} alt='' className='w-9 h-9 rounded-lg object-cover shrink-0 border border-[#E1E3E5]' /> : <div className='w-9 h-9 rounded-lg bg-[#F6F6F7] shrink-0 flex items-center justify-center text-[#8C9196]'>
                            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                              <rect x='3' y='3' width='18' height='18' rx='2' />
                              <path d='M3 9h18M9 21V9' />
                            </svg>
                          </div>}
                        <div className='flex-1 min-w-0'>
                          <p className='text-[12.5px] font-medium text-[#202223] truncate'>
                            {p.title}
                          </p>
                          <p className='text-[11px] text-[#8C9196] truncate'>
                            {p.id}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${isSelected ? 'bg-[#008060] border-[#008060] text-white' : 'border-[#C9CDD2] bg-white'}`}>
                          {isSelected && Icons.check}
                        </div>
                      </button>;
            })}
                </div>

                {}
                <div className='px-5 py-3 border-t border-[#E1E3E5] flex items-center justify-between'>
                  <p className='text-[12px] text-[#6D7175]'>
                    {selected.length} product{selected.length !== 1 ? 's' : ''}{' '}
                    selected
                  </p>
                  <button onClick={() => setProductModalRuleId(null)} className='px-4 py-2 bg-[#008060] text-white text-[13px] font-medium rounded-lg hover:bg-[#006B4F] transition-colors border-none cursor-pointer'>
                    Done
                  </button>
                </div>
              </div>
            </div>;
    })()}
    </div>;
}
export default function AddDiscountPage() {
  return <Suspense fallback={<div className='max-w-5xl mx-auto space-y-5 animate-pulse'>
          <div className='h-8 w-40 bg-[#E1E3E5] rounded-lg' />
          <div className='h-125 bg-[#E1E3E5] rounded-xl' />
        </div>}>
      <AddDiscountPageContent />
    </Suspense>;
}
