'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { useProducts } from '@/hooks/useDashboard'
import { deleteProduct } from '@/lib/api/dashboard'

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

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({
  product,
  onConfirm,
  onCancel,
  deleting,
}: {
  product: { id: string; name: string }
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onCancel}
      />
      {/* Modal */}
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

// ── Smart Pagination ──────────────────────────────────────────────────────────
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
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${
              page === p
                ? 'bg-[#008060] text-white border-none'
                : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'
            }`}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Import / Export ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importResult, setImportResult] = useState<{
    success: number
    failed: { row: number; name: string; error: string }[]
  } | null>(null)

  const { data, loading, error, refetch } = useProducts({
    limit: 200,
    q: search || undefined,
  })

  const products = data?.products ?? []

  const filtered = products.filter((p: (typeof products)[0]) => {
    const matchStatus =
      selectedStatus === 'All' ||
      p.status === selectedStatus.toLowerCase() ||
      (selectedStatus === 'Active' && p.status === 'published')
    return matchStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === paginated.length
        ? []
        : paginated.map((p: (typeof products)[0]) => p.id),
    )

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export')
      return
    }

    const rows = filtered.map((p: (typeof products)[0]) => ({
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} products`)
  }

  // ── Import CSV ───────────────────────────────────────────────────────────
  // Expected columns (case-insensitive): Name, SKU, Category, Brand, Price,
  // Stock, Status, Badge, Description, Sport, Specifications, Image URL.
  // Only Name is required. Each row creates a NEW single-variant product —
  // this doesn't update existing products or handle size/color variants (use
  // the product edit page for that level of detail).
  //
  // Specifications format: "Key:Value;Key:Value" e.g.
  // "Weight:85g;Balance:Head Heavy;Flex:Stiff" — parsed into the same
  // metadata.specs = [{label, value}] shape the storefront's Specifications
  // tab reads (see app/api/admin/seed/route.ts), so CSV-imported products
  // show specs exactly like seeded ones instead of an empty tab.
  const parseSpecifications = (
    raw: string,
  ): { label: string; value: string }[] => {
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
    e.target.value = '' // allow re-selecting the same file later
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
    setImportProgress({ done: 0, total: rows.length })

    // Build a category name → id map once, so "Badminton" in the CSV can be
    // matched to the real category instead of every row being uncategorized.
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
    } catch {
      // non-fatal — rows just won't get a category
    }

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
    const failed: { row: number; name: string; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const name = getField(row, 'Name', 'Title').trim()

      if (!name) {
        failed.push({ row: i + 2, name: '(blank)', error: 'Name is required' })
        setImportProgress((p) => ({ ...p, done: p.done + 1 }))
        continue
      }

      const priceStr = getField(row, 'Price')
      const stockStr = getField(row, 'Stock')
      const categoryName = getField(row, 'Category').toLowerCase().trim()
      const statusRaw = getField(row, 'Status').toLowerCase().trim()
      const status = statusRaw === 'draft' ? 'draft' : 'published'
      const badge = getField(row, 'Badge').toUpperCase().trim()

      const price = parseFloat(priceStr) || 0
      const stock = parseInt(stockStr) || 0
      const categoryId = categoryMap.get(categoryName)

      // Image URL(s) — comma-separated. CSV can't carry actual image files,
      // only links to images already hosted somewhere (e.g. Cloudinary, your
      // own CDN, or a direct product-photo URL). The first URL becomes the
      // thumbnail, same convention scripts/seed-smashuk.ts already uses.
      const imageUrls = getField(row, 'Image URL', 'Image URLs', 'Images')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)

      const payload = {
        title: name,
        description: getField(row, 'Description') || undefined,
        status,
        categories: categoryId ? [{ id: categoryId }] : [],
        thumbnail: imageUrls[0] || undefined,
        images:
          imageUrls.length > 0 ? imageUrls.map((url) => ({ url })) : undefined,
        options: [{ title: 'Default', values: ['Default'] }],
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
            options: { Default: 'Default' },
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
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Create failed')
        success++
      } catch (err: any) {
        failed.push({ row: i + 2, name, error: err.message ?? 'Unknown error' })
      }

      setImportProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setImportResult({ success, failed })
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
      await refetch()
    } catch (err: any) {
      console.error('Delete failed:', err)
      setSaveError?.('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
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
      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Import Progress / Result Modal */}
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

      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Products
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            {data?.count ?? 0} products total
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
            className='px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] text-[#202223] font-medium rounded-lg transition-colors cursor-pointer'
          >
            Export
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
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className='flex items-center gap-3 px-4 py-2.5 bg-[#008060]/8 border border-[#008060]/20 rounded-lg'>
          <span className='text-[13px] font-medium text-[#008060]'>
            {selectedIds.length} selected
          </span>
          <div className='flex items-center gap-2 ml-2'>
            <button className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#E1E3E5] text-[#202223] hover:bg-white bg-transparent cursor-pointer transition-colors'>
              Archive
            </button>
            <button
              onClick={() => {
                const first = products.find((p: any) =>
                  selectedIds.includes(p.id),
                )
                if (first)
                  setDeleteTarget({ id: selectedIds[0], name: first.name })
              }}
              className='px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[#D82C0D]/30 text-[#D82C0D] hover:bg-[#D82C0D]/5 bg-transparent cursor-pointer transition-colors'
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

      {/* Main card */}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        {/* Filter bar */}
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
            onChange={(e) => setSelectedStatus(e.target.value)}
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

        {/* Status tabs */}
        <div className='flex items-center gap-0 border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4'>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSelectedStatus(s)
                setPage(1)
              }}
              className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${selectedStatus === s ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
            >
              {s}{' '}
              <span className='ml-1.5 text-[11px] text-[#8C9196]'>
                {s === 'All'
                  ? products.length
                  : products.filter(
                      (p: (typeof products)[0]) =>
                        p.status === s.toLowerCase() ||
                        (s === 'Active' && p.status === 'published'),
                    ).length}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {view === 'table' && (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                  <th className='w-10 px-4 py-3'>
                    <input
                      type='checkbox'
                      checked={
                        selectedIds.length === paginated.length &&
                        paginated.length > 0
                      }
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
                            // eslint-disable-next-line @next/next/no-img-element
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
                          {/* Edit button */}
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
                          {/* Delete button */}
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

        {/* Grid */}
        {view === 'grid' && (
          <div className='p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'>
            {paginated.map((product: (typeof products)[0]) => (
              <div key={product.id} className='relative group'>
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className='no-underline block'
                >
                  <div className='border border-[#E1E3E5] rounded-xl overflow-hidden hover:border-[#008060]/30 hover:shadow-md transition-all'>
                    <div className='aspect-square bg-[#F6F6F7] flex items-center justify-center overflow-hidden'>
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
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
                      <p className='text-[12.5px] font-medium text-[#202223] truncate group-hover:text-[#008060] transition-colors'>
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
                {/* Delete button on grid card */}
                <button
                  onClick={() =>
                    setDeleteTarget({ id: product.id, name: product.name })
                  }
                  className='absolute top-2 right-2 w-6 h-6 bg-white border border-[#E1E3E5] rounded-lg flex items-center justify-center text-[#6D7175] hover:text-[#D82C0D] hover:border-[#D82C0D]/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm'
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
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className='flex items-center justify-between px-4 py-3 border-t border-[#E1E3E5]'>
          <p className='text-[12.5px] text-[#6D7175]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {Math.min(page * pageSize, filtered.length)}
            </span>{' '}
            of{' '}
            <span className='font-medium text-[#202223]'>
              {filtered.length}
            </span>{' '}
            products
          </p>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
