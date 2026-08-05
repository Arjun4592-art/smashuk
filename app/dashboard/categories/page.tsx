'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  handle: string
  description: string
  sport: string
  parentId: string | null
  productCount: number
  status: 'active' | 'inactive'
  icon: string
  createdAt: string
}

// BUG FIX: was a generic multi-sport template list (Football/Cricket/
// Basketball/Swimming/Running/Cycling/Boxing) that never matched what
// smashuk.co (and this replica) actually sells. See lib/constants.ts.
const SPORTS = ['All', 'Badminton', 'Tennis', 'Padel', 'Squash', 'Clothing']
const SPORT_ICONS: Record<string, string> = {
  Badminton: '🏸',
  Tennis: '🎾',
  Padel: '🎾',
  Squash: '🏸',
  Clothing: '👕',
}

const emptyForm = {
  name: '',
  handle: '',
  description: '',
  sport: '',
  icon: '📦',
  status: 'active' as 'active' | 'inactive',
}

// ─── Auth helper ───────────────────────────────────────────────────
// Dashboard JWT is in an HttpOnly cookie — browser sends it automatically
// on same-origin requests. No manual header needed.
function authHeaders() {
  return {
    'Content-Type': 'application/json',
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#8C9196'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='11' cy='11' r='7.5' />
      <path d='M18.5 18.5L22 22' />
    </svg>
  )
}
function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M18 6L6 18M6 6l12 12' />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>
  )
}
function TrashIcon({
  size = 13,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M3 6h18' />
      <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' />
      <path d='M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v5M14 11v5' />
    </svg>
  )
}
function FolderIcon() {
  return (
    <svg
      width='32'
      height='32'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#C4C8CC'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' />
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
      <circle
        className='opacity-25'
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 0 1 8-8v8H4z'
      />
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M15 18l-6-6 6-6' />
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M9 18l6-6-6-6' />
    </svg>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  title,
}: {
  checked: boolean
  onChange: () => void
  title?: string
}) {
  return (
    <button
      onClick={onChange}
      title={title}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${checked ? 'bg-[#008060] focus-visible:ring-[#008060]' : 'bg-[#D1D5DB] focus-visible:ring-[#8C9196]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`}
      />
    </button>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  colorClasses,
}: {
  label: string
  value: number
  icon: React.ReactNode
  colorClasses: string
}) {
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200'>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClasses}`}
      >
        {icon}
      </div>
      <div>
        <p className='font-sora text-[22px] font-bold text-[#202223] leading-tight tracking-tight'>
          {value}
        </p>
        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>{label}</p>
      </div>
    </div>
  )
}

// ─── Medusa helpers ───────────────────────────────────────────────
function toCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    handle: c.handle ?? '',
    description: c.description ?? '',
    // Raw metadata sport, if it happens to be set — real derivation happens
    // in deriveSports() below, since Medusa's actual data model groups
    // categories by parent_category_id hierarchy (e.g. "Badminton" as a
    // parent with "Badminton Rackets"/"Shuttlecocks"/etc as children), not
    // by a metadata.sport field. No category in this store actually has
    // metadata.sport set, which is why every sport tab used to show
    // "No categories found".
    sport: c.metadata?.sport ?? '',
    parentId: c.parent_category_id ?? null,
    productCount: c.products?.length ?? c.product_count ?? 0,
    status: c.is_active ? 'active' : 'inactive',
    icon: c.metadata?.icon ?? '📦',
    createdAt: new Date(c.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}

// Walks a category up its parent chain to find which top-level "sport"
// branch it belongs to (e.g. "Badminton Rackets" → parent "Badminton").
// If the category itself is a top-level sport category, or has no
// identifiable sport ancestor, falls back to any explicit metadata.sport.
function deriveSports(categories: Category[]): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const sportNames = new Set(SPORTS.filter((s) => s !== 'All'))

  const topLevelSportFor = (cat: Category): string => {
    let current: Category | undefined = cat
    const seen = new Set<string>()
    while (current && current.parentId && !seen.has(current.id)) {
      seen.add(current.id)
      const parent = byId.get(current.parentId)
      if (!parent) break
      current = parent
    }
    if (current && sportNames.has(current.name)) return current.name
    return cat.sport // fall back to metadata.sport if it was actually set
  }

  return categories.map((c) => ({ ...c, sport: topLevelSportFor(c) }))
}

const PAGE_SIZE = 20

// ─── Main Page ────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('All')
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────
  // BUG FIX: this used to fetch only PAGE_SIZE (20) categories per page from
  // Medusa via limit/offset, then applied the sport filter (Badminton/Tennis/
  // etc.) client-side on just that page's slice. So if the categories that
  // matched the selected sport happened to live on page 2, filtering on page 1
  // showed "No categories found" even though matches existed. Fix: fetch ALL
  // categories once (category counts are small — tens, not thousands) and do
  // search/sport filtering + pagination entirely client-side.
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '1000',
        offset: '0',
      })
      const res = await fetch(`/api/admin/categories?${params}`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText)
      const data = await res.json()
      const raw = (data.product_categories ?? []).map(toCategory)
      setCategories(deriveSports(raw))
      setTotal(data.count ?? 0)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message ?? 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    fetchCategories()
  }, [fetchCategories])

  // ── Client-side filter (search + sport) ─────────────────────────
  const filteredAll = categories.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle.toLowerCase().includes(search.toLowerCase())
    const matchSport = sportFilter === 'All' || c.sport === sportFilter
    return matchSearch && matchSport
  })

  // Reset to page 1 whenever the filter/search changes so we don't get stuck
  // on an out-of-range page with no visible results.
  useEffect(() => {
    setPage(1)
  }, [search, sportFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE))
  const filtered = filteredAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Modal helpers ─────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setSaveError(null)
    setShowModal(true)
  }
  const openEdit = (cat: Category) => {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      handle: cat.handle,
      description: cat.description,
      sport: cat.sport,
      icon: cat.icon,
      status: cat.status,
    })
    setSaveError(null)
    setShowModal(true)
  }

  const autoHandle = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.sport) return
    setSaving(true)
    setSaveError(null)

    // Medusa groups categories by parent_category_id, not by a metadata
    // field — "Badminton Rackets" is a *child* of the "Badminton" category,
    // for example. Find that top-level sport category (if it already
    // exists) and link the new/edited category under it, unless the
    // category being saved IS the top-level sport itself.
    const sportParent = categories.find(
      (c) => c.parentId === null && c.name === form.sport,
    )
    const isTopLevelSport = form.name.trim() === form.sport

    const payload: any = {
      name: form.name,
      handle: form.handle || autoHandle(form.name),
      description: form.description || undefined,
      is_active: form.status === 'active',
      metadata: { sport: form.sport, icon: form.icon },
    }
    if (!isTopLevelSport && sportParent) {
      payload.parent_category_id = sportParent.id
    }

    const toastId = toast.loading(
      editingId ? 'Updating category...' : 'Creating category...',
    )

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok)
          throw new Error((await res.json()).error ?? 'Update failed')
        const data = await res.json()
        const updated = toCategory(data.product_category)
        setCategories((prev) =>
          deriveSports(prev.map((c) => (c.id === editingId ? updated : c))),
        )
        toast.success('Category updated successfully', { id: toastId })
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok)
          throw new Error((await res.json()).error ?? 'Create failed')
        const data = await res.json()
        const created = toCategory(data.product_category)
        setCategories((prev) => deriveSports([created, ...prev]))
        setTotal((t) => t + 1)
        toast.success('Category created successfully', { id: toastId })
      }
      setShowModal(false)
    } catch (err: any) {
      setSaveError(err.message)
      toast.error(err.message ?? 'Something went wrong', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const catName = categories.find((c) => c.id === id)?.name
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setTotal((t) => t - 1)
    setDeleteId(null)

    const toastId = toast.loading('Deleting category...')
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed')
      toast.success(`"${catName}" deleted successfully`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed', { id: toastId })
      fetchCategories()
    }
  }

  // ── Toggle status ─────────────────────────────────────────────
  const toggleStatus = async (cat: Category) => {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active'
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, status: newStatus } : c)),
    )
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: newStatus === 'active' }),
      })
      if (!res.ok) throw new Error('Status update failed')
      toast.success(
        `Category ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      )
    } catch (err: any) {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, status: cat.status } : c)),
      )
      toast.error(err.message ?? 'Status update failed')
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>
            Categories
          </h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            {total} categories ·{' '}
            {categories.filter((c) => c.status === 'active').length} active
          </p>
        </div>
        <button
          onClick={openAdd}
          className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] text-white text-[13px] font-medium rounded-lg transition-all duration-150 shadow-sm shadow-[#008060]/20 border-none cursor-pointer'
        >
          <PlusIcon /> Add Category
        </button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        <StatCard
          label='Total Categories'
          value={total}
          icon={
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' />
            </svg>
          }
          colorClasses='bg-[#2C6ECB]/8 text-[#2C6ECB]'
        />
        <StatCard
          label='Active'
          value={categories.filter((c) => c.status === 'active').length}
          icon={
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M8 12l3 3 5-6' />
            </svg>
          }
          colorClasses='bg-[#008060]/8 text-[#008060]'
        />
        <StatCard
          label='Inactive'
          value={categories.filter((c) => c.status === 'inactive').length}
          icon={
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M10 15V9M14 15V9' />
            </svg>
          }
          colorClasses='bg-[#6D7175]/8 text-[#6D7175]'
        />
        <StatCard
          label='Total Products'
          value={categories.reduce((s, c) => s + c.productCount, 0)}
          icon={
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
              <polyline points='3.27 6.96 12 12.01 20.73 6.96' />
              <line x1='12' y1='22.08' x2='12' y2='12' />
            </svg>
          }
          colorClasses='bg-amber-50 text-amber-600'
        />
      </div>

      {/* Table card */}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
        {/* Filters */}
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F8F9FA] focus-within:border-[#008060] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#008060]/10 transition-all duration-150'>
            <SearchIcon />
            <input
              type='text'
              placeholder='Search categories...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#B0B5BA] outline-none'
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className='text-[#B0B5BA] hover:text-[#6D7175] bg-transparent border-none cursor-pointer transition-colors p-0.5'
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Sports' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Sport tabs */}
        <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4 gap-0.5'>
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer flex items-center gap-1.5 ${sportFilter === s ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#8C9196] hover:text-[#202223] hover:border-b-[#E1E3E5]'}`}
            >
              {s !== 'All' && (
                <span className='text-[13px]'>{SPORT_ICONS[s]}</span>
              )}
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className='animate-pulse'>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className='flex items-center gap-4 px-5 py-4 border-b border-[#F1F1F1]'
              >
                <div className='h-8 w-8 bg-[#F1F1F1] rounded-lg' />
                <div className='flex-1 h-4 bg-[#F1F1F1] rounded' />
                <div className='h-4 w-20 bg-[#F1F1F1] rounded' />
                <div className='h-4 w-16 bg-[#F1F1F1] rounded' />
                <div className='h-7 w-20 bg-[#F1F1F1] rounded-full' />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className='flex flex-col items-center justify-center py-20 gap-3'>
            <p className='text-[13px] text-[#D82C0D]'>{error}</p>
            <button
              onClick={fetchCategories}
              className='px-4 py-2 bg-[#008060] text-white text-[13px] rounded-lg border-none cursor-pointer hover:bg-[#006e52]'
            >
              Retry
            </button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-[#E1E3E5] bg-[#FAFAFA]'>
                  {[
                    'Category',
                    'Sport',
                    'Handle',
                    'Products',
                    'Status',
                    'Created',
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider ${i === 6 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-[#F5F5F5]'>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-4 py-16 text-center'>
                      <div className='flex flex-col items-center gap-3'>
                        <FolderIcon />
                        <div>
                          <p className='text-[14px] font-medium text-[#202223]'>
                            No categories found
                          </p>
                          <p className='text-[13px] text-[#8C9196] mt-0.5'>
                            Try adjusting your search or filters
                          </p>
                        </div>
                        <button
                          onClick={openAdd}
                          className='mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-[#008060] text-white text-[13px] font-medium rounded-lg hover:bg-[#006e52] transition-colors border-none cursor-pointer'
                        >
                          <PlusIcon /> Add Category
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat) => (
                    <tr
                      key={cat.id}
                      className='hover:bg-[#FAFAFA] transition-colors duration-100 group'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-9 h-9 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:border-[#D1D5DB] transition-colors'>
                            {cat.icon}
                          </div>
                          <div>
                            <p className='text-[13px] font-medium text-[#202223]'>
                              {cat.name}
                            </p>
                            <p className='text-[11.5px] text-[#B0B5BA] truncate max-w-45 mt-0.5'>
                              {cat.description || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='inline-flex items-center gap-1.5 text-[12.5px] text-[#202223]'>
                          {cat.sport ? (
                            <>
                              <span>{SPORT_ICONS[cat.sport]}</span>
                              {cat.sport}
                            </>
                          ) : (
                            <span className='text-[#B0B5BA]'>—</span>
                          )}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <code className='text-[11px] text-[#6D7175] bg-[#F6F6F7] px-2 py-1 rounded-md font-mono tracking-tight'>
                          /{cat.handle || '—'}
                        </code>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-[13px] font-semibold text-[#202223]'>
                          {cat.productCount}
                        </span>
                        <span className='text-[11.5px] text-[#B0B5BA] ml-1'>
                          products
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <Toggle
                          checked={cat.status === 'active'}
                          onChange={() => toggleStatus(cat)}
                          title={
                            cat.status === 'active'
                              ? 'Click to deactivate'
                              : 'Click to activate'
                          }
                        />
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-[12.5px] text-[#8C9196]'>
                          {cat.createdAt}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150'>
                          <button
                            onClick={() => openEdit(cat)}
                            className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F0F0F0] rounded-lg transition-all duration-150 bg-transparent border-none cursor-pointer'
                            title='Edit'
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeleteId(cat.id)}
                            className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#D82C0D]/5 rounded-lg transition-all duration-150 bg-transparent border-none cursor-pointer'
                            title='Delete'
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className='flex items-center justify-between px-4 py-3 border-t border-[#F1F1F1]'>
          <p className='text-[12.5px] text-[#8C9196]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {filtered.length}
            </span>{' '}
            of <span className='font-medium text-[#202223]'>{total}</span>{' '}
            categories
          </p>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-semibold border transition-colors cursor-pointer ${p === page ? 'bg-[#008060] text-white border-[#008060] shadow-sm shadow-[#008060]/20' : 'border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => setShowModal(false)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-lg overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                {editingId ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg transition-all bg-transparent border-none cursor-pointer'
              >
                <CloseIcon />
              </button>
            </div>
            <div className='px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto'>
              {saveError && (
                <div className='px-3 py-2.5 bg-[#FFF4F4] border border-[#D82C0D]/20 rounded-lg text-[12.5px] text-[#D82C0D]'>
                  {saveError}
                </div>
              )}
              {/* Icon picker */}
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-2'>
                  Icon
                </label>
                <div className='flex flex-wrap gap-2'>
                  {[
                    '📦',
                    '⚽',
                    '🏏',
                    '🏀',
                    '🎾',
                    '🥊',
                    '🏊',
                    '🚴',
                    '🏃',
                    '👟',
                    '🦺',
                    '🧤',
                    '⛑️',
                    '🥅',
                  ].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg border transition-all duration-150 cursor-pointer ${form.icon === icon ? 'border-[#008060] bg-[#F2F7F5] ring-2 ring-[#008060]/15 scale-105' : 'border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] hover:scale-105'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              {/* Name */}
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Category Name{' '}
                  <span className='text-[#D82C0D] normal-case font-normal'>
                    *
                  </span>
                </label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => ({ ...f, name, handle: autoHandle(name) }))
                  }}
                  placeholder='e.g. Football Boots'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#C4C8CC] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/12 transition-all duration-150'
                />
              </div>
              {/* Handle */}
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Handle
                </label>
                <div className='flex items-center border border-[#E1E3E5] rounded-lg overflow-hidden focus-within:border-[#008060] focus-within:ring-2 focus-within:ring-[#008060]/12 transition-all duration-150'>
                  <span className='px-3 py-2.5 bg-[#F6F6F7] border-r border-[#E1E3E5] text-[12.5px] text-[#8C9196] shrink-0 font-mono'>
                    /shop/
                  </span>
                  <input
                    type='text'
                    value={form.handle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, handle: e.target.value }))
                    }
                    className='flex-1 px-3 py-2.5 text-[13px] text-[#202223] outline-none bg-white font-mono'
                  />
                </div>
              </div>
              {/* Sport */}
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Sport{' '}
                  <span className='text-[#D82C0D] normal-case font-normal'>
                    *
                  </span>
                </label>
                <select
                  value={form.sport}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sport: e.target.value }))
                  }
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/12 transition-all duration-150 cursor-pointer'
                >
                  <option value=''>Select sport</option>
                  {SPORTS.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {SPORT_ICONS[s]} {s}
                    </option>
                  ))}
                </select>
              </div>
              {/* Description */}
              <div>
                <label className='block text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-1.5'>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder='Brief description of this category...'
                  rows={3}
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#C4C8CC] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/12 transition-all duration-150 resize-none'
                />
              </div>
              {/* Status */}
              <div className='flex items-center justify-between p-3.5 border border-[#E1E3E5] rounded-xl bg-[#FAFAFA]'>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    Active
                  </p>
                  <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                    Visible in shop navigation
                  </p>
                </div>
                <Toggle
                  checked={form.status === 'active'}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      status: f.status === 'active' ? 'inactive' : 'active',
                    }))
                  }
                />
              </div>
            </div>
            <div className='flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#E1E3E5] bg-[#FAFAFA]'>
              <button
                onClick={() => setShowModal(false)}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.sport}
                className='inline-flex items-center gap-2 px-5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none shadow-sm shadow-[#008060]/20'
              >
                {saving ? (
                  <>
                    <SpinnerIcon /> Saving...
                  </>
                ) : editingId ? (
                  'Save Changes'
                ) : (
                  'Add Category'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => setDeleteId(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-sm p-6'>
            <div className='w-12 h-12 bg-[#D82C0D]/8 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <TrashIcon size={22} color='#D82C0D' />
            </div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] text-center mb-2'>
              Delete Category
            </h3>
            <p className='text-[13px] text-[#6D7175] text-center leading-relaxed mb-6'>
              Are you sure you want to delete{' '}
              <span className='font-semibold text-[#202223]'>
                {categories.find((c) => c.id === deleteId)?.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className='flex gap-2.5'>
              <button
                onClick={() => setDeleteId(null)}
                className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#be2209] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#D82C0D]/20'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
