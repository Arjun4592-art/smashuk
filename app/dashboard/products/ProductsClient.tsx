'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { useDebouncedValue } from '@/hooks/useDebounce'
import { useRouter } from 'next/navigation'
import {
  bulkProducts,
  type BulkProductChanges,
  deleteProduct,
  duplicateProduct,
  getProductList,
  type ProductListFilters,
  type ProductListResult,
} from '@/lib/api/dashboard'
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#008060]/10 text-[#008060]',
  draft: 'bg-[#6D7175]/10 text-[#6D7175]',
  archived: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  published: 'bg-[#008060]/10 text-[#008060]',
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
const STATUSES = ['All', 'Active', 'Draft', 'Archived']
// Status tab -> Medusa `status` filter, applied on the server. Medusa has no
// "archived" status, so that tab maps to its closest one ("rejected").
const STATUS_FILTERS: Record<string, string[] | undefined> = {
  All: undefined,
  Active: ['published'],
  Draft: ['draft'],
  Archived: ['rejected'],
}
function DeleteModal({
  product,
  onConfirm,
  onCancel,
  deleting,
}: {
  product: {
    id: string
    name: string
  }
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {}
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onCancel}
      />
      {}
      <div className='relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 bg-[#D82C0D]/10 rounded-xl flex items-center justify-center shrink-0'>
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#D82C0D'
              strokeWidth='2'
            >
              <polyline points='3 6 5 6 21 6' />
              <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
              <path d='M10 11v6M14 11v6' />
              <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
            </svg>
          </div>
          <div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223]'>
              Delete Product
            </h3>
            <p className='text-[12.5px] text-[#6D7175] mt-0.5'>
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className='text-[13.5px] text-[#202223] mb-6'>
          Are you sure you want to delete{' '}
          <span className='font-semibold'>"{product.name}"</span>? This will
          permanently remove the product and all its variants.
        </p>

        <div className='flex items-center gap-3'>
          <button
            onClick={onCancel}
            disabled={deleting}
            className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#C02009] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2'
          >
            {deleting ? (
              <>
                <svg
                  className='animate-spin w-3.5 h-3.5'
                  viewBox='0 0 24 24'
                  fill='none'
                >
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
                    d='M4 12a8 8 0 018-8v8H4z'
                  />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Product'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }
  return (
    <div className='flex items-center gap-1'>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] hover:bg-[#F6F6F7] disabled:opacity-40 bg-white cursor-pointer transition-colors'
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`dots-${i}`}
            className='px-2 text-[#8C9196] text-[12.5px] select-none'
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(Number(p))}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${page === p ? 'bg-[#008060] text-white border-none' : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] hover:bg-[#F6F6F7] bg-white cursor-pointer disabled:opacity-40 transition-colors'
      >
        Next →
      </button>
    </div>
  )
}
function BulkDeleteModal({
  count,
  names,
  working,
  onConfirm,
  onCancel,
}: {
  count: number
  names: string[]
  working: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const extra = count - names.length
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={() => !working && onCancel()}
      />
      <div className='relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6'>
        <h3 className='font-sora text-[16px] font-semibold text-[#202223]'>
          Delete {count} product{count !== 1 ? 's' : ''}?
        </h3>
        <p className='text-[12.5px] text-[#6D7175] mt-0.5 mb-4'>
          This action cannot be undone
        </p>
        <ul className='text-[13px] text-[#202223] mb-4 space-y-1 list-disc pl-5'>
          {names.map((n, i) => (
            <li key={i} className='truncate'>
              {n}
            </li>
          ))}
          {extra > 0 && <li className='text-[#6D7175]'>and {extra} more…</li>}
        </ul>
        <p className='text-[12.5px] text-[#6D7175] mb-6'>
          The products and all their variants will be permanently removed.
        </p>
        <div className='flex items-center gap-3'>
          <button
            onClick={onCancel}
            disabled={working}
            className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#C02009] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none'
          >
            {working ? 'Deleting…' : `Delete ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}
function BulkStockModal({
  count,
  working,
  onApply,
  onCancel,
}: {
  count: number
  working: boolean
  onApply: (quantity: number) => void
  onCancel: () => void
}) {
  const [qty, setQty] = useState('0')
  const parsed = Number(qty)
  const valid = qty.trim() !== '' && Number.isInteger(parsed) && parsed >= 0
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={() => !working && onCancel()}
      />
      <div className='relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6'>
        <h3 className='font-sora text-[16px] font-semibold text-[#202223]'>
          Set stock for {count} product{count !== 1 ? 's' : ''}
        </h3>
        <p className='text-[12.5px] text-[#6D7175] mt-0.5 mb-4'>
          The same quantity is applied to every variant of each selected product
          (single-variant products too).
        </p>
        <label className='block text-[12.5px] font-medium text-[#202223] mb-1'>
          New stock quantity
        </label>
        <input
          type='number'
          min={0}
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          autoFocus
          className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
        />
        <div className='flex items-center gap-2 mt-2'>
          <button
            type='button'
            onClick={() => setQty('0')}
            className='px-2.5 py-1 text-[11.5px] rounded-md border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] cursor-pointer text-[#202223]'
          >
            Reset to 0
          </button>
        </div>
        <p className='text-[12px] text-[#6D7175] mt-3 mb-5'>
          Units already reserved by open orders stay reserved. This can’t be
          undone automatically.
        </p>
        <div className='flex items-center gap-3'>
          <button
            onClick={onCancel}
            disabled={working}
            className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Cancel
          </button>
          <button
            onClick={() => valid && onApply(parsed)}
            disabled={working || !valid}
            className='flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none'
          >
            {working
              ? 'Updating…'
              : valid
                ? `Set to ${parsed} for ${count}`
                : 'Enter a quantity'}
          </button>
        </div>
      </div>
    </div>
  )
}
function BulkEditModal({
  count,
  working,
  onApply,
  onCancel,
}: {
  count: number
  working: boolean
  onApply: (changes: BulkProductChanges) => void
  onCancel: () => void
}) {
  // '' means "don't change" for every field (badge uses NONE to clear it).
  const [status, setStatus] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [sport, setSport] = useState('')
  const [badge, setBadge] = useState('')
  const [channel, setChannel] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  )
  const [brands, setBrands] = useState<string[]>([])
  const [sports, setSports] = useState<string[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/categories?limit=200', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/admin/products/field-options', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([cats, fields]) => {
      if (cancelled) return
      const list = cats?.categories ?? cats?.product_categories ?? []
      setCategories(
        list
          .map((c: any) => ({ id: String(c.id), name: String(c.name) }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name)),
      )
      setBrands(fields?.brands ?? [])
      setSports(fields?.sports ?? [])
      setOptionsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const changes: BulkProductChanges = {}
  if (status) changes.status = status as BulkProductChanges['status']
  if (categoryId) changes.categoryId = categoryId
  if (brand.trim()) changes.brand = brand.trim()
  if (sport.trim()) changes.sport = sport.trim()
  if (badge) changes.badge = badge === 'NONE' ? '' : badge
  if (channel) {
    changes.sellingChannel = channel as BulkProductChanges['sellingChannel']
  }
  const hasChanges = Object.keys(changes).length > 0

  const fieldCls =
    'w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
  const labelCls = 'block text-[12.5px] font-medium text-[#202223] mb-1'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={() => !working && onCancel()}
      />
      <div className='relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6'>
        <h3 className='font-sora text-[16px] font-semibold text-[#202223]'>
          Edit {count} product{count !== 1 ? 's' : ''}
        </h3>
        <p className='text-[12.5px] text-[#6D7175] mt-0.5 mb-5'>
          Only the fields you change are applied. Everything left on “Don’t
          change” stays as it is.
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldCls}
            >
              <option value=''>Don’t change</option>
              <option value='published'>Published</option>
              <option value='draft'>Draft</option>
              <option value='rejected'>Archived</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Selling channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={fieldCls}
            >
              <option value=''>Don’t change</option>
              <option value='both'>Website + Store</option>
              <option value='website'>Website only</option>
              <option value='store'>Store only</option>
            </select>
          </div>
          <div className='sm:col-span-2'>
            <label className={labelCls}>
              Category{' '}
              <span className='text-[11px] text-[#8C9196] font-normal'>
                (replaces the current categories)
              </span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={fieldCls}
              disabled={optionsLoading}
            >
              <option value=''>
                {optionsLoading ? 'Loading categories…' : 'Don’t change'}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Brand</label>
            <input
              list='bulk-brand-options'
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder='Don’t change'
              className={fieldCls}
            />
            <datalist id='bulk-brand-options'>
              {brands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Sport</label>
            <input
              list='bulk-sport-options'
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder='Don’t change'
              className={fieldCls}
            />
            <datalist id='bulk-sport-options'>
              {sports.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className='sm:col-span-2'>
            <label className={labelCls}>Badge</label>
            <select
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className={fieldCls}
            >
              <option value=''>Don’t change</option>
              <option value='NONE'>Remove badge</option>
              <option value='NEW'>New</option>
              <option value='SALE'>Sale</option>
              <option value='BESTSELLER'>Bestseller</option>
              <option value='LIMITED'>Limited</option>
            </select>
          </div>
        </div>

        <div className='flex items-center gap-3 mt-6'>
          <button
            onClick={onCancel}
            disabled={working}
            className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(changes)}
            disabled={working || !hasChanges}
            className='flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none'
          >
            {working ? 'Applying…' : `Apply to ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}
export default function ProductsClient({
  initialData,
  initialError,
}: {
  // Loaded on the server (app/dashboard/products/page.tsx) so the first
  // paint already has the products — no client fetch / spinner on arrival.
  initialData: ProductListResult | null
  initialError?: string | null
}) {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkStockOpen, setBulkStockOpen] = useState(false)
  const [selectingAll, setSelectingAll] = useState(false)
  // ---- filters (category / brand / sport / stock / price) ----
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [filterStock, setFilterStock] = useState<'' | 'in' | 'low' | 'out'>('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const debouncedPriceMin = useDebouncedValue(filterPriceMin, 500)
  const debouncedPriceMax = useDebouncedValue(filterPriceMax, 500)
  const [categoryOptions, setCategoryOptions] = useState<
    { id: string; label: string }[]
  >([])
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [sportOptions, setSportOptions] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({
    done: 0,
    total: 0,
  })
  const [importResult, setImportResult] = useState<{
    success: number
    failed: {
      row: number
      name: string
      error: string
    }[]
  } | null>(null)
  const debouncedSearch = useDebouncedValue(search, 400)
  // First page comes from the server (initialData). Paging / search / status
  // changes hit /api/admin/products/list, which is answered from a
  // server-side cache — one request returns the rows AND the tab counts.
  const statusFilter = STATUS_FILTERS[selectedStatus]
  const toNum = (v: string) =>
    v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Number(v)
  const filters: ProductListFilters = {
    category: filterCategory ? [filterCategory] : undefined,
    brand: filterBrand || undefined,
    sport: filterSport || undefined,
    stock: filterStock || undefined,
    priceMin: toNum(debouncedPriceMin),
    priceMax: toNum(debouncedPriceMax),
  }
  const activeFilterCount = [
    filterCategory,
    filterBrand,
    filterSport,
    filterStock,
    filterPriceMin.trim(),
    filterPriceMax.trim(),
  ].filter(Boolean).length
  const clearFilters = () => {
    setFilterCategory('')
    setFilterBrand('')
    setFilterSport('')
    setFilterStock('')
    setFilterPriceMin('')
    setFilterPriceMax('')
  }
  const [data, setData] = useState<ProductListResult | null>(initialData)
  const [loading, setLoading] = useState(initialData === null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [reloadKey, setReloadKey] = useState(0)
  const requestId = useRef(0)
  const skipFirstFetch = useRef(initialData !== null)
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false
      return
    }
    const myId = ++requestId.current
    setFetching(true)
    setError(null)
    getProductList({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      q: debouncedSearch || undefined,
      status: statusFilter,
      filters,
    })
      .then((r) => {
        if (myId === requestId.current) setData(r)
      })
      .catch((err: any) => {
        if (myId !== requestId.current) return
        console.error('Products fetch error:', err)
        setError(err?.message ?? 'Failed to load products')
      })
      .finally(() => {
        if (myId !== requestId.current) return
        setLoading(false)
        setFetching(false)
      })
  }, [
    page,
    debouncedSearch,
    selectedStatus,
    reloadKey,
    filterCategory,
    filterBrand,
    filterSport,
    filterStock,
    debouncedPriceMin,
    debouncedPriceMax,
  ])
  // Any filter change starts again from page 1 and drops the selection.
  const filtersKey = [
    filterCategory,
    filterBrand,
    filterSport,
    filterStock,
    debouncedPriceMin,
    debouncedPriceMax,
  ].join('|')
  const firstFilterRun = useRef(true)
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false
      return
    }
    setPage(1)
    setSelectedIds([])
  }, [filtersKey])
  // Dropdown values for the filter bar (loaded once).
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/categories?limit=200', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/admin/products/field-options', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([cats, fields]) => {
      if (cancelled) return
      const list: any[] = cats?.categories ?? cats?.product_categories ?? []
      const nameById = new Map(list.map((c) => [String(c.id), String(c.name)]))
      setCategoryOptions(
        list
          .map((c) => ({
            id: String(c.id),
            label: c.parent_category_id
              ? `${nameById.get(String(c.parent_category_id)) ?? ''} › ${c.name}`
              : String(c.name),
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      )
      setBrandOptions(fields?.brands ?? [])
      setSportOptions(fields?.sports ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])
  const [exporting, setExporting] = useState(false)
  const refetch = async () => {
    setReloadKey((v) => v + 1)
  }
  const statusCounts: Partial<Record<string, number>> = data?.counts ?? {}
  const products = data?.products ?? []
  const totalCount: number = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginated = products
  const changePage = (p: number) => {
    setPage(p)
    setSelectedIds([])
  }
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  const pageAllSelected =
    paginated.length > 0 &&
    paginated.every((p: (typeof products)[0]) => selectedIds.includes(p.id))
  const toggleAll = () =>
    setSelectedIds(
      pageAllSelected ? [] : paginated.map((p: (typeof products)[0]) => p.id),
    )
  // Selects every product that matches the current search / tab / filters —
  // not just the 20 on screen — so e.g. a whole category can be reset at once.
  const selectAllMatching = async () => {
    if (selectingAll) return
    setSelectingAll(true)
    try {
      const ids: string[] = []
      const chunk = 500
      let offset = 0
      let total = Infinity
      while (offset < total) {
        const res = await getProductList({
          limit: chunk,
          offset,
          q: debouncedSearch || undefined,
          status: statusFilter,
          filters,
        })
        total = res.count ?? 0
        ids.push(...res.products.map((p: (typeof products)[0]) => p.id))
        if (res.products.length === 0) break
        offset += chunk
      }
      setSelectedIds(ids)
    } catch (err: any) {
      toast.error('Could not select all: ' + (err?.message ?? 'unknown error'))
    } finally {
      setSelectingAll(false)
    }
  }
  const handleExportCsv = async () => {
    if (exporting) return
    setExporting(true)
    const toastId = toast.loading('Preparing export…')
    try {
      // The list only holds one page, so pull every product that matches the
      // current search / status filter, in chunks.
      const all: (typeof products)[0][] = []
      const chunk = 200
      let offset = 0
      let total = Infinity
      while (offset < total) {
        const res = await getProductList({
          limit: chunk,
          offset,
          q: debouncedSearch || undefined,
          status: STATUS_FILTERS[selectedStatus],
          filters,
        })
        total = res.count ?? 0
        all.push(...res.products)
        if (res.products.length === 0) break
        offset += chunk
        toast.loading(
          `Preparing export… ${Math.min(all.length, total)} / ${total}`,
          {
            id: toastId,
          },
        )
      }
      if (all.length === 0) {
        toast.error('Nothing to export', { id: toastId })
        return
      }
      exportRowsToCsv(all)
      toast.success(`Exported ${all.length} products`, { id: toastId })
    } catch (err: any) {
      console.error('Export failed:', err)
      toast.error('Export failed: ' + (err?.message ?? 'unknown error'), {
        id: toastId,
      })
    } finally {
      setExporting(false)
    }
  }
  const exportRowsToCsv = (list: (typeof products)[0][]) => {
    const rows = list.map((p: (typeof products)[0]) => ({
      Name: p.name,
      SKU: p.sku,
      Category: p.category,
      Brand: p.brand,
      Price: p.price,
      Stock: p.stock,
      Status: p.status,
      Badge: p.badge ?? '',
      Specifications: (p.specs ?? [])
        .map((s: { label: string; value: string }) => `${s.label}:${s.value}`)
        .join(';'),
      'Image URL': (p.imageUrls ?? []).join(','),
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const parseSpecifications = (
    raw: string,
  ): {
    label: string
    value: string
  }[] => {
    if (!raw || !raw.trim()) return []
    return raw
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.split(':')
        const value = rest.join(':').trim()
        return {
          label: key.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
          value: value || '',
        }
      })
      .filter((s) => s.label && s.value)
  }
  const handleImportClick = () => fileInputRef.current?.click()
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        if (rows.length === 0) {
          toast.error('CSV has no rows')
          return
        }
        await runImport(rows)
      },
      error: (err) => {
        toast.error('Failed to read CSV: ' + err.message)
      },
    })
  }
  const runImport = async (rows: Record<string, string>[]) => {
    setImporting(true)
    setImportResult(null)
    setImportProgress({
      done: 0,
      total: rows.length,
    })
    const categoryMap = new Map<string, string>()
    try {
      const catRes = await fetch('/api/admin/categories?limit=200', {
        credentials: 'include',
      })
      if (catRes.ok) {
        const catData = await catRes.json()
        ;(catData.categories ?? catData.product_categories ?? []).forEach(
          (c: any) =>
            categoryMap.set(String(c.name).toLowerCase().trim(), c.id),
        )
      }
    } catch {}
    const getField = (row: Record<string, string>, ...names: string[]) => {
      for (const n of names) {
        const key = Object.keys(row).find(
          (k) => k.trim().toLowerCase() === n.toLowerCase(),
        )
        if (key && row[key] !== undefined) return row[key]
      }
      return ''
    }
    let success = 0
    const failed: {
      row: number
      name: string
      error: string
    }[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const name = getField(row, 'Name', 'Title').trim()
      if (!name) {
        failed.push({
          row: i + 2,
          name: '(blank)',
          error: 'Name is required',
        })
        setImportProgress((p) => ({
          ...p,
          done: p.done + 1,
        }))
        continue
      }
      const priceStr = getField(row, 'Price')
      const stockStr = getField(row, 'Stock')
      const categoryName = getField(row, 'Category').toLowerCase().trim()
      const statusRaw = getField(row, 'Status').toLowerCase().trim()
      // Only publish when the CSV says so (or has no status at all). Draft /
      // archived / proposed / rejected etc. must never go live by accident.
      const status =
        statusRaw === '' || statusRaw === 'published' || statusRaw === 'active'
          ? 'published'
          : 'draft'
      const badge = getField(row, 'Badge').toUpperCase().trim()
      const price = parseFloat(priceStr) || 0
      const stock = parseInt(stockStr) || 0
      const categoryId = categoryMap.get(categoryName)
      const imageUrls = getField(row, 'Image URL', 'Image URLs', 'Images')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
      const payload = {
        title: name,
        description: getField(row, 'Description') || undefined,
        status,
        categories: categoryId
          ? [
              {
                id: categoryId,
              },
            ]
          : [],
        thumbnail: imageUrls[0] || undefined,
        images:
          imageUrls.length > 0
            ? imageUrls.map((url) => ({
                url,
              }))
            : undefined,
        options: [
          {
            title: 'Default',
            values: ['Default'],
          },
        ],
        variants: [
          {
            title: 'Default',
            sku: getField(row, 'SKU') || undefined,
            manage_inventory: true,
            prices:
              price > 0
                ? [
                    {
                      amount: Math.round(price * 100) / 100,
                      currency_code: 'gbp',
                    },
                  ]
                : [],
            options: {
              Default: 'Default',
            },
          },
        ],
        metadata: {
          brand: getField(row, 'Brand') || undefined,
          sport: getField(row, 'Sport') || undefined,
          badge: ['NEW', 'SALE', 'BESTSELLER', 'LIMITED'].includes(badge)
            ? badge
            : undefined,
          specs: parseSpecifications(getField(row, 'Specifications', 'Specs')),
        },
        _stock: stock,
      }
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Create failed')
        success++
      } catch (err: any) {
        failed.push({
          row: i + 2,
          name,
          error: err.message ?? 'Unknown error',
        })
      }
      setImportProgress((p) => ({
        ...p,
        done: p.done + 1,
      }))
    }
    setImportResult({
      success,
      failed,
    })
    setImporting(false)
    if (success > 0) refetch()
    if (failed.length === 0) {
      toast.success(`Imported ${success} product${success !== 1 ? 's' : ''}`)
    } else {
      toast.error(`${success} imported, ${failed.length} failed — see details`)
    }
  }
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      setDeleteTarget(null)
      setSelectedIds([])
      if (page > 1 && products.length <= 1) {
        // Deleted the last row of the last page — go back one page (that
        // triggers its own fetch).
        setPage(page - 1)
      } else {
        await refetch()
      }
    } catch (err: any) {
      console.error('Delete failed:', err)
      setSaveError?.('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }
  const selectedProducts = products.filter((p: (typeof products)[0]) =>
    selectedIds.includes(p.id),
  )
  // Runs a bulk delete / update in chunks (the API takes 25 ids at a time) and
  // reports how many worked. Rows that failed stay selected so they can be retried.
  const runBulk = async (
    action: 'delete' | 'update' | 'stock',
    ids: string[],
    changes?: BulkProductChanges,
    quantity?: number,
  ) => {
    if (bulkBusy || ids.length === 0) return
    setBulkBusy(true)
    const verb =
      action === 'delete'
        ? 'Deleting'
        : action === 'stock'
          ? 'Updating stock'
          : 'Updating'
    const toastId = toast.loading(`${verb}… 0 / ${ids.length}`)
    const okIds: string[] = []
    const failed: { id: string; error: string }[] = []
    try {
      // Stock changes touch every variant (many Medusa calls per product), so
      // they go in small chunks — one big request outlives the server /
      // proxy timeout and the browser just reports "Failed to fetch".
      const CHUNK = action === 'stock' ? 3 : 25
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK)
        // Setting a quantity / status is idempotent, so a dropped connection
        // is simply retried (once for delete, twice for the rest).
        const attempts = action === 'delete' ? 1 : 3
        let lastErr: any = null
        let done = false
        for (let a = 0; a < attempts && !done; a++) {
          try {
            const res = await bulkProducts({
              action,
              ids: chunk,
              changes,
              quantity,
            })
            okIds.push(...(res.ok ?? []))
            failed.push(...(res.failed ?? []))
            done = true
          } catch (err: any) {
            lastErr = err
            if (a < attempts - 1)
              await new Promise((r) => setTimeout(r, 1500 * (a + 1)))
          }
        }
        if (!done) {
          const raw = String(lastErr?.message ?? 'Request failed')
          const msg = /failed to fetch|networkerror|load failed/i.test(raw)
            ? 'Connection to the server dropped (timeout). Try again.'
            : raw
          chunk.forEach((id) => failed.push({ id, error: msg }))
        }
        toast.loading(
          `${verb}… ${Math.min(i + CHUNK, ids.length)} / ${ids.length}`,
          { id: toastId },
        )
      }
      const noun = `product${okIds.length !== 1 ? 's' : ''}`
      if (failed.length === 0) {
        toast.success(
          action === 'stock'
            ? `Stock set to ${quantity} for ${okIds.length} ${noun}`
            : `${action === 'delete' ? 'Deleted' : 'Updated'} ${okIds.length} ${noun}`,
          { id: toastId },
        )
      } else {
        toast.error(
          `${okIds.length} done, ${failed.length} failed: ${failed[0].error}`,
          { id: toastId, duration: 8000 },
        )
      }
      setBulkDeleteOpen(false)
      setBulkEditOpen(false)
      setBulkStockOpen(false)
      setSelectedIds(failed.map((f) => f.id))
      if (action === 'delete' && page > 1 && okIds.length >= products.length) {
        setPage(page - 1)
      } else {
        await refetch()
      }
    } finally {
      setBulkBusy(false)
    }
  }
  const handleBulkArchive = () => {
    if (
      !window.confirm(
        `Archive ${selectedIds.length} product${selectedIds.length !== 1 ? 's' : ''}? They will be hidden from the shop.`,
      )
    )
      return
    runBulk('update', selectedIds, { status: 'rejected' })
  }
  const handleDuplicate = async (product: { id: string; name: string }) => {
    if (duplicatingId) return
    setDuplicatingId(product.id)
    try {
      const result = await duplicateProduct(product.id)
      const newId = result?.product?.id
      toast.success(`Duplicated "${product.name}"`)
      await refetch()
      if (newId) router.push(`/dashboard/products/${newId}`)
    } catch (err: any) {
      console.error('Duplicate failed:', err)
      toast.error('Duplicate failed: ' + err.message)
    } finally {
      setDuplicatingId(null)
    }
  }
  const SPORT_EMOJI: Record<string, string> = {
    Badminton: '🏸',
    Tennis: '🎾',
    Padel: '🎾',
    Squash: '🏸',
    Clothing: '👕',
  }
  return (
    <div className='space-y-5'>
      {}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
      {bulkDeleteOpen && (
        <BulkDeleteModal
          count={selectedIds.length}
          names={selectedProducts.slice(0, 5).map((p: any) => p.name)}
          working={bulkBusy}
          onConfirm={() => runBulk('delete', selectedIds)}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      )}
      {bulkStockOpen && (
        <BulkStockModal
          count={selectedIds.length}
          working={bulkBusy}
          onApply={(q) => runBulk('stock', selectedIds, undefined, q)}
          onCancel={() => setBulkStockOpen(false)}
        />
      )}
      {bulkEditOpen && (
        <BulkEditModal
          count={selectedIds.length}
          working={bulkBusy}
          onApply={(changes) => runBulk('update', selectedIds, changes)}
          onCancel={() => setBulkEditOpen(false)}
        />
      )}

      {}
      {(importing || importResult) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => !importing && setImportResult(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                {importing ? 'Importing products…' : 'Import complete'}
              </h2>
              {!importing && (
                <button
                  onClick={() => setImportResult(null)}
                  className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer transition-colors'
                >
                  ✕
                </button>
              )}
            </div>

            <div className='px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto'>
              {importing ? (
                <div className='space-y-2'>
                  <div className='h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-[#008060] transition-all duration-200'
                      style={{
                        width: `${(importProgress.done / Math.max(1, importProgress.total)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className='text-[12.5px] text-[#8C9196]'>
                    {importProgress.done} of {importProgress.total} rows
                    processed…
                  </p>
                </div>
              ) : (
                importResult && (
                  <>
                    <div className='flex gap-3'>
                      <div className='flex-1 p-3 rounded-xl bg-[#008060]/8 text-center'>
                        <p className='text-[20px] font-semibold text-[#008060]'>
                          {importResult.success}
                        </p>
                        <p className='text-[11.5px] text-[#008060]'>Imported</p>
                      </div>
                      <div className='flex-1 p-3 rounded-xl bg-[#D82C0D]/8 text-center'>
                        <p className='text-[20px] font-semibold text-[#D82C0D]'>
                          {importResult.failed.length}
                        </p>
                        <p className='text-[11.5px] text-[#D82C0D]'>Failed</p>
                      </div>
                    </div>

                    {importResult.failed.length > 0 && (
                      <div className='space-y-1.5'>
                        <p className='text-[12px] font-medium text-[#6D7175]'>
                          Failed rows:
                        </p>
                        <div className='space-y-1 max-h-[160px] overflow-y-auto'>
                          {importResult.failed.map((f, i) => (
                            <div
                              key={i}
                              className='text-[11.5px] px-2.5 py-1.5 bg-[#FFF4F4] rounded-lg text-[#D82C0D]'
                            >
                              Row {f.row} ({f.name || 'unnamed'}): {f.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              )}
            </div>

            {!importing && (
              <div className='flex items-center justify-end px-6 py-4 bg-[#FAFAFA] border-t border-[#E1E3E5]'>
                <button
                  onClick={() => setImportResult(null)}
                  className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 cursor-pointer border-none shadow-sm shadow-[#008060]/20'
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Products
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            {statusCounts.All ?? totalCount} products total
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv'
            className='hidden'
            onChange={handleImportFile}
          />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className='px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] text-[#202223] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50'
          >
            Import
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className='px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] text-[#202223] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50'
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          <Link
            href='/dashboard/products/new'
            className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg transition-colors no-underline flex items-center gap-1.5'
          >
            <span className='text-lg leading-none'>+</span> Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          ⚠ Failed to load products: {error}
          <button
            onClick={refetch}
            className='ml-3 underline font-medium bg-transparent border-none cursor-pointer text-red-600'
          >
            Retry
          </button>
        </div>
      )}

      {}
      {selectedIds.length > 0 && (
        <div className='flex items-center gap-3 px-4 py-2.5 bg-[#008060]/8 border border-[#008060]/20 rounded-lg'>
          <span className='text-[13px] font-medium text-[#008060]'>
            {selectedIds.length} selected
          </span>
          <div className='flex items-center gap-2 ml-2'>
            <button
              onClick={() => setBulkEditOpen(true)}
              disabled={bulkBusy}
              className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#008060]/30 text-[#008060] hover:bg-white bg-transparent cursor-pointer transition-colors disabled:opacity-50'
            >
              Edit
            </button>
            <button
              onClick={() => setBulkStockOpen(true)}
              disabled={bulkBusy}
              className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#008060]/30 text-[#008060] hover:bg-white bg-transparent cursor-pointer transition-colors disabled:opacity-50'
            >
              Set stock
            </button>
            <button
              onClick={handleBulkArchive}
              disabled={bulkBusy}
              className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#E1E3E5] text-[#202223] hover:bg-white bg-transparent cursor-pointer transition-colors disabled:opacity-50'
            >
              Archive
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkBusy}
              className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#D82C0D]/30 text-[#D82C0D] hover:bg-[#D82C0D]/5 bg-transparent cursor-pointer transition-colors disabled:opacity-50'
            >
              Delete
            </button>
          </div>
          <button
            className='ml-auto text-[#6D7175] hover:text-[#202223] bg-transparent border-none cursor-pointer text-lg'
            onClick={() => setSelectedIds([])}
          >
            ✕
          </button>
        </div>
      )}

      {pageAllSelected && totalCount > selectedIds.length && (
        <div className='flex items-center gap-2 px-4 py-2 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223]'>
          <span>
            All {paginated.length} products on this page are selected.
          </span>
          <button
            onClick={selectAllMatching}
            disabled={selectingAll}
            className='text-[#008060] font-medium underline bg-transparent border-none cursor-pointer disabled:opacity-50'
          >
            {selectingAll
              ? 'Selecting…'
              : `Select all ${totalCount} matching products`}
          </button>
        </div>
      )}

      {}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        {}
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#8C9196'
              strokeWidth='2'
            >
              <circle cx='11' cy='11' r='8' />
              <line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input
              type='text'
              placeholder='Search products...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none'
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className='text-[#8C9196] hover:text-[#202223] bg-transparent border-none cursor-pointer text-sm'
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              changePage(1)
            }}
            className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors'
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
          <div className='flex items-center border border-[#E1E3E5] rounded-lg overflow-hidden ml-auto'>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-[13px] transition-colors border-none cursor-pointer ${view === 'table' ? 'bg-[#008060] text-white' : 'bg-white text-[#6D7175] hover:bg-[#F6F6F7]'}`}
            >
              ☰
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 text-[13px] transition-colors border-none cursor-pointer ${view === 'grid' ? 'bg-[#008060] text-white' : 'bg-white text-[#6D7175] hover:bg-[#F6F6F7]'}`}
            >
              ⊞
            </button>
          </div>
        </div>

        {}
        <div className='flex items-center gap-2 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          {(() => {
            const sel =
              'px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors max-w-[220px]'
            const num =
              'w-24 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060]'
            return (
              <>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={sel}
                >
                  <option value=''>All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className={sel}
                >
                  <option value=''>All brands</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSport}
                  onChange={(e) => setFilterSport(e.target.value)}
                  className={sel}
                >
                  <option value=''>All sports</option>
                  {sportOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStock}
                  onChange={(e) =>
                    setFilterStock(e.target.value as '' | 'in' | 'low' | 'out')
                  }
                  className={sel}
                >
                  <option value=''>Any stock</option>
                  <option value='in'>In stock</option>
                  <option value='low'>Low stock (1–5)</option>
                  <option value='out'>Out of stock</option>
                </select>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[12.5px] text-[#6D7175]'>£</span>
                  <input
                    type='number'
                    min={0}
                    placeholder='Min'
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    className={num}
                  />
                  <span className='text-[12.5px] text-[#6D7175]'>–</span>
                  <input
                    type='number'
                    min={0}
                    placeholder='Max'
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    className={num}
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className='text-[12.5px] text-[#008060] font-medium underline bg-transparent border-none cursor-pointer'
                  >
                    Clear filters ({activeFilterCount})
                  </button>
                )}
              </>
            )
          })()}
        </div>

        {}
        <div className='flex items-center gap-0 border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4'>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSelectedStatus(s)
                changePage(1)
              }}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${selectedStatus === s ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
            >
              {s}{' '}
              <span className='ml-1.5 text-[11px] text-[#8C9196]'>
                {statusCounts[s] ?? (s === selectedStatus ? totalCount : '')}
              </span>
            </button>
          ))}
        </div>

        {}
        {view === 'table' && (
          <div
            className={`overflow-x-auto transition-opacity ${fetching ? 'opacity-60' : ''}`}
          >
            <table className='w-full'>
              <thead>
                <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                  <th className='w-10 px-4 py-3'>
                    <input
                      type='checkbox'
                      checked={pageAllSelected}
                      onChange={toggleAll}
                      className='w-4 h-4 rounded accent-[#008060] cursor-pointer'
                    />
                  </th>
                  <th className='px-4 py-3 text-left text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide w-[35%] max-w-[300px]'>
                    Product
                  </th>
                  <th className='px-4 py-3 text-left text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    Status
                  </th>
                  <th className='px-4 py-3 text-left text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    Category
                  </th>
                  <th className='px-4 py-3 text-left text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    Stock
                  </th>
                  <th className='px-4 py-3 text-left text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    Price
                  </th>
                  <th className='px-4 py-3 text-right text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#F1F1F1]'>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className='animate-pulse'>
                      <td className='px-4 py-3'>
                        <div className='w-4 h-4 bg-[#E1E3E5] rounded' />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 bg-[#E1E3E5] rounded-lg' />
                          <div className='space-y-2'>
                            <div className='w-32 h-3 bg-[#E1E3E5] rounded' />
                            <div className='w-20 h-3 bg-[#E1E3E5] rounded' />
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='w-16 h-5 bg-[#E1E3E5] rounded-full' />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='w-20 h-3 bg-[#E1E3E5] rounded' />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='w-16 h-3 bg-[#E1E3E5] rounded' />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='w-16 h-3 bg-[#E1E3E5] rounded' />
                      </td>
                      <td className='px-4 py-3'>
                        <div className='w-14 h-6 bg-[#E1E3E5] rounded ml-auto' />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-4 py-16 text-center'>
                      <span className='text-4xl'>📦</span>
                      <p className='text-[14px] font-medium text-[#202223] mt-2'>
                        No products found
                      </p>
                      {(activeFilterCount > 0 || search) && (
                        <p className='text-[12.5px] text-[#6D7175] mt-1'>
                          Try changing or clearing the search / filters.
                        </p>
                      )}
                      <Link
                        href='/dashboard/products/new'
                        className='inline-block mt-3 px-4 py-2 bg-[#008060] text-white text-[13px] font-medium rounded-lg no-underline hover:bg-[#006e52] transition-colors'
                      >
                        Add your first product
                      </Link>
                    </td>
                  </tr>
                ) : (
                  paginated.map((product: (typeof products)[0]) => (
                    <tr
                      key={product.id}
                      className={`hover:bg-[#F6F6F7] transition-colors ${selectedIds.includes(product.id) ? 'bg-[#F2F7F5]' : ''}`}
                    >
                      <td className='px-4 py-3'>
                        <input
                          type='checkbox'
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className='w-4 h-4 rounded accent-[#008060] cursor-pointer'
                        />
                      </td>
                      <td className='px-4 py-3 max-w-[300px] w-[35%]'>
                        <div className='flex items-center gap-3 min-w-0'>
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className='w-10 h-10 rounded-lg object-cover border border-[#E1E3E5] shrink-0'
                            />
                          ) : (
                            <div className='w-10 h-10 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg flex items-center justify-center text-[18px] shrink-0'>
                              {SPORT_EMOJI[product.category] ?? '📦'}
                            </div>
                          )}
                          <div className='min-w-0'>
                            <Link
                              href={`/dashboard/products/${product.id}`}
                              title={product.name}
                              className='text-[13px] font-medium text-[#202223] hover:text-[#008060] no-underline transition-colors truncate block max-w-[220px]'
                            >
                              {product.name}
                            </Link>
                            <p className='text-[11.5px] text-[#8C9196]'>
                              {product.sku || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium capitalize ${STATUS_STYLES[product.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${product.status === 'active' || product.status === 'published' ? 'bg-[#008060]' : product.status === 'draft' ? 'bg-[#6D7175]' : 'bg-[#D82C0D]'}`}
                          />
                          {product.status}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-[13px] text-[#202223]'>
                          {product.category || '—'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`text-[13px] font-medium ${product.stock === 0 ? 'text-[#D82C0D]' : product.stock <= 5 ? 'text-[#916A00]' : 'text-[#202223]'}`}
                        >
                          {product.stock === 0
                            ? 'Out of stock'
                            : `${product.stock} in stock`}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='text-[13px] font-semibold text-[#202223]'>
                          {formatCurrency(product.price)}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center justify-end gap-1'>
                          {}
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#008060] hover:bg-[#008060]/8 rounded-lg transition-all no-underline'
                            title='Edit'
                          >
                            <svg
                              width='14'
                              height='14'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                              <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                            </svg>
                          </Link>
                          {}
                          <button
                            onClick={() =>
                              handleDuplicate({
                                id: product.id,
                                name: product.name,
                              })
                            }
                            disabled={duplicatingId === product.id}
                            className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#008060] hover:bg-[#008060]/8 rounded-lg transition-all bg-transparent border-none cursor-pointer disabled:opacity-50'
                            title='Duplicate'
                          >
                            {duplicatingId === product.id ? (
                              <svg
                                className='animate-spin w-3.5 h-3.5'
                                viewBox='0 0 24 24'
                                fill='none'
                              >
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
                                  d='M4 12a8 8 0 018-8v8H4z'
                                />
                              </svg>
                            ) : (
                              <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <rect
                                  x='9'
                                  y='9'
                                  width='13'
                                  height='13'
                                  rx='2'
                                />
                                <path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
                              </svg>
                            )}
                          </button>
                          {}
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: product.id,
                                name: product.name,
                              })
                            }
                            className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#D82C0D] hover:bg-[#D82C0D]/5 rounded-lg transition-all bg-transparent border-none cursor-pointer'
                            title='Delete'
                          >
                            <svg
                              width='14'
                              height='14'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <polyline points='3 6 5 6 21 6' />
                              <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                              <path d='M10 11v6M14 11v6' />
                              <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                            </svg>
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

        {}
        {view === 'grid' && (
          <div
            className={`p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 transition-opacity ${fetching ? 'opacity-60' : ''}`}
          >
            {paginated.map((product: (typeof products)[0]) => (
              <div key={product.id} className='relative group'>
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className='no-underline block'
                >
                  <div className='border border-[#E1E3E5] rounded-xl overflow-hidden hover:border-[#008060]/30 hover:shadow-md transition-all'>
                    <div className='aspect-square bg-[#F6F6F7] flex items-center justify-center overflow-hidden'>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <span className='text-4xl'>
                          {SPORT_EMOJI[product.category] ?? '📦'}
                        </span>
                      )}
                    </div>
                    <div className='p-3'>
                      <p
                        title={product.name}
                        className='text-[12.5px] font-medium text-[#202223] truncate group-hover:text-[#008060] transition-colors'
                      >
                        {product.name}
                      </p>
                      <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                        {product.sku || '—'}
                      </p>
                      <div className='flex items-center justify-between mt-2'>
                        <span className='text-[13px] font-semibold text-[#202223]'>
                          {formatCurrency(product.price)}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[product.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {product.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                {}
                <div className='absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all'>
                  <button
                    onClick={() =>
                      handleDuplicate({
                        id: product.id,
                        name: product.name,
                      })
                    }
                    disabled={duplicatingId === product.id}
                    className='w-6 h-6 bg-white border border-[#E1E3E5] rounded-lg flex items-center justify-center text-[#6D7175] hover:text-[#008060] hover:border-[#008060]/30 cursor-pointer shadow-sm disabled:opacity-50'
                    title='Duplicate'
                  >
                    {duplicatingId === product.id ? (
                      <svg
                        className='animate-spin w-3 h-3'
                        viewBox='0 0 24 24'
                        fill='none'
                      >
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
                          d='M4 12a8 8 0 018-8v8H4z'
                        />
                      </svg>
                    ) : (
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <rect x='9' y='9' width='13' height='13' rx='2' />
                        <path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        id: product.id,
                        name: product.name,
                      })
                    }
                    className='w-6 h-6 bg-white border border-[#E1E3E5] rounded-lg flex items-center justify-center text-[#6D7175] hover:text-[#D82C0D] hover:border-[#D82C0D]/30 cursor-pointer shadow-sm'
                    title='Delete'
                  >
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <polyline points='3 6 5 6 21 6' />
                      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                      <path d='M10 11v6M14 11v6' />
                      <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {}
        <div className='flex items-center justify-between px-4 py-3 border-t border-[#E1E3E5]'>
          <p className='text-[12.5px] text-[#6D7175]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {totalCount === 0
                ? 0
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)}`}
            </span>{' '}
            of <span className='font-medium text-[#202223]'>{totalCount}</span>{' '}
            products
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
          />
        </div>
      </div>
    </div>
  )
}
