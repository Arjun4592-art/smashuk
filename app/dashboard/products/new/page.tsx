'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/lib/api/dashboard'
import { toast } from 'sonner'

// BUG FIX: SPORTS/BRANDS used to be hardcoded here and drifted out of sync
// across files. Dropdown options now come from
// /api/admin/products/field-options (distinct values already in use across
// the catalog) — see that route. metadata.brand/metadata.sport themselves
// are untouched, so nothing else that reads them changes.
// See lib/constants.ts SPORTS and components/website/BrandsBar.tsx BRANDS.

// ─── SEO auto-fill ──────────────────────────────────────────────────
// If the user doesn't type anything into the SEO tab, we generate sensible
// defaults from the product's own title/description/brand/sport so the
// dashboard's SEO page (app/dashboard/seo/page.tsx) always has something
// useful to show instead of a blank, 0-score row. Anything the user DID
// type manually always wins — these are fallbacks only.
function buildAutoMetaTitle(name: string, brand: string): string {
  const withBrand =
    brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${name} – ${brand}`
      : name
  return withBrand.length <= 60
    ? withBrand
    : withBrand.slice(0, 57).trim() + '...'
}

function buildAutoMetaDescription(
  description: string,
  name: string,
  brand: string,
  sport: string,
): string {
  const clean = description.replace(/\s+/g, ' ').trim()
  if (clean) {
    return clean.length <= 155 ? clean : clean.slice(0, 152).trim() + '...'
  }
  // No description written yet — build a generic but still useful one.
  const bits = [
    `Buy ${name}`,
    brand ? `by ${brand}` : '',
    sport ? `for ${sport}` : '',
    'online at SmashUK. Fast UK delivery, genuine products, easy returns.',
  ].filter(Boolean)
  const fallback = bits.join(' ')
  return fallback.length <= 155
    ? fallback
    : fallback.slice(0, 152).trim() + '...'
}

function buildAutoMetaKeywords(
  tags: string,
  brand: string,
  sport: string,
  categoryName: string,
): string {
  const parts = [
    ...tags.split(',').map((t) => t.trim()),
    brand,
    sport,
    categoryName,
  ].filter(Boolean)
  return Array.from(new Set(parts)).join(', ')
}

interface Variant {
  id: string
  size: string
  color: string
  sku: string
  price: string
  stock: string
}

interface MedusaCategory {
  id: string
  name: string
}

interface UploadedImage {
  file: File
  preview: string
  url?: string
  uploading: boolean
  error?: string
}

export default function AddProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'draft'>('draft')
  const [activeTab, setActiveTab] = useState('general')

  const [categories, setCategories] = useState<MedusaCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [sellingChannel, setSellingChannel] = useState<
    'both' | 'website' | 'store'
  >('both')

  // Dynamic Brand/Sport dropdown options — fetched from existing product
  // catalog, not hardcoded. "Adding new" just means typing a value that
  // isn't in the list yet; it becomes an option for next time once saved.
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [sportOptions, setSportOptions] = useState<string[]>([])
  const [addingBrand, setAddingBrand] = useState(false)
  const [addingSport, setAddingSport] = useState(false)

  useEffect(() => {
    fetch('/api/admin/products/field-options')
      .then((res) => res.json())
      .then((data) => {
        setBrandOptions(data.brands ?? [])
        setSportOptions(data.sports ?? [])
      })
      .catch((err) => console.error('Failed to load brand/sport options:', err))
  }, [])

  const [form, setForm] = useState({
    name: '',
    description: '',
    brand: '',
    sport: '',
    category: '',
    categoryName: '',
    sku: '',
    barcode: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    taxable: true,
    trackInventory: true,
    stock: '',
    lowStockAlert: '5',
    weight: '',
    tags: '',
    badge: '',
    stringUpgrade: false,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
  })

  const [variants, setVariants] = useState<Variant[]>([
    { id: '1', size: '', color: '', sku: '', price: '', stock: '' },
  ])

  const [specs, setSpecs] = useState<{ label: string; value: string }[]>([])

  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/admin/categories?limit=100')
        const data = await res.json()
        setCategories(
          (data.product_categories ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
          })),
        )
      } catch (err) {
        console.error('Failed to load categories:', err)
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [])

  const updateForm = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        size: '',
        color: '',
        sku: '',
        price: '',
        stock: '',
      },
    ])
  }
  const removeVariant = (id: string) =>
    setVariants((prev) => prev.filter((v) => v.id !== id))
  const updateVariant = (id: string, key: keyof Variant, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [key]: value } : v)),
    )
  }

  const addImages = async (files: FileList | File[]) => {
    const newImages: UploadedImage[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))
    setImages((prev) => [...prev, ...newImages])
    for (const img of newImages) {
      uploadImage(img)
    }
  }

  const uploadImage = async (img: UploadedImage) => {
    try {
      const formData = new FormData()
      formData.append('files', img.file)

      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Upload failed')
      }

      const data = await res.json()
      const uploadedUrl: string =
        data.files?.[0]?.url ?? data.uploads?.[0]?.url ?? ''

      setImages((prev) =>
        prev.map((i) =>
          i.preview === img.preview
            ? { ...i, uploading: false, url: uploadedUrl }
            : i,
        ),
      )
    } catch (err: any) {
      setImages((prev) =>
        prev.map((i) =>
          i.preview === img.preview
            ? { ...i, uploading: false, error: err.message }
            : i,
        ),
      )
    }
  }

  const removeImage = (preview: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.preview === preview)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.preview !== preview)
    })
  }

  // ── Build Medusa product payload ───────────────────────────────────────────
  const buildPayload = (saveStatus: 'active' | 'draft') => {
    const medusaStatus = saveStatus === 'active' ? 'published' : 'draft'
    const hasExtraVariants = variants.some((v) => v.size || v.color)

    // Options array
    const options = hasExtraVariants
      ? [
          ...(variants.some((v) => v.size)
            ? [
                {
                  title: 'Size',
                  values: [
                    ...new Set(
                      variants.filter((v) => v.size).map((v) => v.size),
                    ),
                  ],
                },
              ]
            : []),
          ...(variants.some((v) => v.color)
            ? [
                {
                  title: 'Color',
                  values: [
                    ...new Set(
                      variants.filter((v) => v.color).map((v) => v.color),
                    ),
                  ],
                },
              ]
            : []),
        ]
      : [{ title: 'Default', values: ['Default'] }]

    // Base variant
    const baseVariant = {
      title: 'Default',
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      manage_inventory: form.trackInventory,
      prices: form.price
        ? [
            {
              amount: Math.round(parseFloat(form.price) * 100) / 100,
              currency_code: 'gbp',
            },
          ]
        : [],
      weight: form.weight ? Number(form.weight) : undefined,
      options: { Default: 'Default' },
    }

    // Extra variants
    const extraVariants = variants
      .filter((v) => v.size || v.color)
      .map((v) => ({
        title: [v.size, v.color].filter(Boolean).join(' / '),
        sku: v.sku || undefined,
        manage_inventory: form.trackInventory,
        prices: v.price
          ? [
              {
                amount: Math.round(parseFloat(v.price) * 100) / 100,
                currency_code: 'gbp',
              },
            ]
          : baseVariant.prices,
        options: {
          ...(v.size ? { Size: v.size } : {}),
          ...(v.color ? { Color: v.color } : {}),
        },
      }))

    const allVariants = hasExtraVariants ? extraVariants : [baseVariant]

    const uploadedImages = images
      .filter((i) => i.url)
      .map((i, idx) => ({ url: i.url!, rank: idx }))

    return {
      title: form.name,
      description: form.description || undefined,
      status: medusaStatus,
      // Where this product should be sellable — "Website", "Store" (POS), or
      // both. Handled by app/api/admin/products/route.ts, not a raw Medusa
      // field, so it's stripped out server-side before hitting Medusa.
      selling_channel: sellingChannel,
      thumbnail: uploadedImages[0]?.url ?? undefined,
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      categories: form.category ? [{ id: form.category }] : [],
      // BUG FIX: Medusa's admin product-create endpoint expects `tags` as an
      // array of { value } objects, not a raw comma-separated string. Sending
      // a string here fails schema validation and rejects the ENTIRE product
      // create request with a 400 — which is why products never got created
      // while categories (which don't send `tags`) always worked fine.
      tags: form.tags
        ? form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((value) => ({ value }))
        : undefined,
      options,
      variants: allVariants,
      metadata: {
        brand: form.brand || undefined,
        sport: form.sport || undefined,
        badge: form.badge || undefined,
        string_upgrade_available: form.stringUpgrade,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()),
        compare_at_price: form.comparePrice
          ? parseFloat(form.comparePrice)
          : undefined,
        cost_price: form.costPrice ? parseFloat(form.costPrice) : undefined,
        low_stock_alert: form.lowStockAlert ? Number(form.lowStockAlert) : 5,
        taxable: form.taxable,
        // BUG FIX: the SEO tab (Meta Title / Description / Keywords) collected
        // input into form.metaTitle etc. but this payload never included them,
        // so anything typed there was silently dropped and never reached
        // Medusa — the dashboard's SEO page always showed these products as
        // blank/unoptimized. Now included, and auto-generated from the
        // product's own title/description/brand/sport when left blank, so
        // every new product automatically shows up on the SEO page with
        // usable meta title/description instead of nothing.
        metaTitle:
          form.metaTitle.trim() || buildAutoMetaTitle(form.name, form.brand),
        metaDescription:
          form.metaDescription.trim() ||
          buildAutoMetaDescription(
            form.description,
            form.name,
            form.brand,
            form.sport,
          ),
        metaKeywords:
          form.metaKeywords.trim() ||
          buildAutoMetaKeywords(
            form.tags,
            form.brand,
            form.sport,
            form.categoryName,
          ),
        ogImage: uploadedImages[0]?.url || undefined,
      },
      _stock: form.stock ? Number(form.stock) : 0,
      ...(form.name
        ? {
            handle: form.name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
          }
        : {}),
    }
  }

  const handleSave = async (saveStatus: 'active' | 'draft') => {
    if (!form.name.trim()) {
      setActiveTab('general')
      setSaveError('Product name is required.')
      return
    }
    if (!form.price) {
      setActiveTab('pricing')
      setSaveError('Price is required.')
      return
    }

    const stillUploading = images.some((i) => i.uploading)
    if (stillUploading) {
      setSaveError('Images are still uploading, please wait...')
      return
    }

    setSaving(true)
    setSaveError(null)
    setStatus(saveStatus)

    try {
      const payload = buildPayload(saveStatus)
      await createProduct(payload)
      toast.success('Product created successfully!')
      router.push('/dashboard/products')
    } catch (err: any) {
      console.error('Save product error:', err)
      const msg = err.message ?? 'Failed to save product. Please try again.'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const profit =
    form.price && form.costPrice
      ? (parseFloat(form.price) - parseFloat(form.costPrice)).toFixed(0)
      : null
  const margin =
    form.price && form.costPrice
      ? (
          ((parseFloat(form.price) - parseFloat(form.costPrice)) /
            parseFloat(form.price)) *
          100
        ).toFixed(1)
      : null

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'variants', label: 'Variants' },
    { id: 'seo', label: 'SEO' },
  ]

  return (
    <div className='max-w-275 mx-auto space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link
            href='/dashboard/products'
            className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#6D7175] hover:text-[#202223] hover:bg-white no-underline transition-all bg-white'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <polyline points='15 18 9 12 15 6' />
            </svg>
          </Link>
          <div>
            <h1 className='font-sora text-[20px] font-semibold text-[#202223]'>
              Add Product
            </h1>
            <p className='text-[12.5px] text-[#6D7175] mt-0.5'>
              Fill in the details to add a new product
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => handleSave('active')}
            disabled={saving}
            className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2'
          >
            {saving ? (
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
                Saving...
              </>
            ) : (
              'Save & Publish'
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className='flex items-center gap-3 px-4 py-3 bg-[#FFF4F4] border border-[#D82C0D]/20 rounded-xl text-[13px] text-[#D82C0D]'>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
          </svg>
          {saveError}
          <button
            onClick={() => setSaveError(null)}
            className='ml-auto bg-transparent border-none cursor-pointer text-[#D82C0D]'
          >
            ✕
          </button>
        </div>
      )}

      <div className='grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5'>
        {/* ── Left column ── */}
        <div className='space-y-5'>
          {/* Tabs card */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            <div className='flex border-b border-[#E1E3E5] overflow-x-auto scrollbar-none'>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-b-[#008060] text-[#008060]'
                      : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className='p-6'>
              {/* ── GENERAL TAB ── */}
              {activeTab === 'general' && (
                <div className='space-y-5'>
                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Product Name <span className='text-[#D82C0D]'>*</span>
                    </label>
                    <input
                      type='text'
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder='e.g. Pro Strike Football Boots'
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Sell on
                    </label>
                    <div className='grid grid-cols-3 gap-2'>
                      {(
                        [
                          { value: 'website', label: 'Website' },
                          { value: 'store', label: 'Store' },
                          { value: 'both', label: 'Both' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type='button'
                          onClick={() => setSellingChannel(opt.value)}
                          className={`px-3.5 py-2.5 rounded-lg text-[13px] font-medium border transition-all ${
                            sellingChannel === opt.value
                              ? 'border-[#008060] bg-[#008060]/8 text-[#008060]'
                              : 'border-[#E1E3E5] text-[#202223] hover:border-[#C9CCCF]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className='mt-1.5 text-[11.5px] text-[#8C9196]'>
                      Website = smashuk.co only · Store = POS (in-store) only ·
                      Both = shows everywhere
                    </p>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        updateForm('description', e.target.value)
                      }
                      placeholder='Describe your product in detail...'
                      rows={5}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Brand
                      </label>
                      {addingBrand ? (
                        <input
                          autoFocus
                          type='text'
                          placeholder='Type new brand, press Enter'
                          className='w-full px-3.5 py-2.5 border border-[#008060] rounded-lg text-[13px] text-[#202223] outline-none focus:ring-2 focus:ring-[#008060]/15 transition-all'
                          onKeyDown={(e) => {
                            const val = (
                              e.target as HTMLInputElement
                            ).value.trim()
                            if (e.key === 'Enter' && val) {
                              updateForm('brand', val)
                              setBrandOptions((prev) =>
                                prev.includes(val)
                                  ? prev
                                  : [...prev, val].sort(),
                              )
                              setAddingBrand(false)
                            } else if (e.key === 'Escape') {
                              setAddingBrand(false)
                            }
                          }}
                          onBlur={() => setAddingBrand(false)}
                        />
                      ) : (
                        <select
                          value={form.brand}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setAddingBrand(true)
                            } else {
                              updateForm('brand', e.target.value)
                            }
                          }}
                          className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer'
                        >
                          <option value=''>Select brand</option>
                          {brandOptions.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                          <option value='__add_new__'>+ Add new brand…</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Sport
                      </label>
                      {addingSport ? (
                        <input
                          autoFocus
                          type='text'
                          placeholder='Type new sport, press Enter'
                          className='w-full px-3.5 py-2.5 border border-[#008060] rounded-lg text-[13px] text-[#202223] outline-none focus:ring-2 focus:ring-[#008060]/15 transition-all'
                          onKeyDown={(e) => {
                            const val = (
                              e.target as HTMLInputElement
                            ).value.trim()
                            if (e.key === 'Enter' && val) {
                              updateForm('sport', val)
                              setSportOptions((prev) =>
                                prev.includes(val)
                                  ? prev
                                  : [...prev, val].sort(),
                              )
                              setAddingSport(false)
                            } else if (e.key === 'Escape') {
                              setAddingSport(false)
                            }
                          }}
                          onBlur={() => setAddingSport(false)}
                        />
                      ) : (
                        <select
                          value={form.sport}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setAddingSport(true)
                            } else {
                              updateForm('sport', e.target.value)
                            }
                          }}
                          className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer'
                        >
                          <option value=''>Select sport</option>
                          {sportOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          <option value='__add_new__'>+ Add new sport…</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const selected = categories.find(
                          (c) => c.id === e.target.value,
                        )
                        updateForm('category', e.target.value)
                        updateForm('categoryName', selected?.name ?? '')
                      }}
                      disabled={categoriesLoading}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white cursor-pointer disabled:opacity-50'
                    >
                      <option value=''>
                        {categoriesLoading ? 'Loading...' : 'Select category'}
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        SKU
                      </label>
                      <input
                        type='text'
                        value={form.sku}
                        onChange={(e) => updateForm('sku', e.target.value)}
                        placeholder='e.g. FB-001'
                        className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                      />
                    </div>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Barcode
                      </label>
                      <input
                        type='text'
                        value={form.barcode}
                        onChange={(e) => updateForm('barcode', e.target.value)}
                        placeholder='ISBN, UPC, GTIN etc.'
                        className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Tags{' '}
                      <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                        (comma separated)
                      </span>
                    </label>
                    <input
                      type='text'
                      value={form.tags}
                      onChange={(e) => updateForm('tags', e.target.value)}
                      placeholder='e.g. football, boots, nike, men'
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                    {form.tags && (
                      <div className='flex flex-wrap gap-1.5 mt-2'>
                        {form.tags
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className='px-2.5 py-1 bg-[#F6F6F7] border border-[#E1E3E5] rounded-full text-[11.5px] text-[#6D7175]'
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Badge{' '}
                      <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                        (shows on the storefront card + "Sale"/"New Arrivals"
                        nav links)
                      </span>
                    </label>
                    <select
                      value={form.badge}
                      onChange={(e) => updateForm('badge', e.target.value)}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    >
                      <option value=''>None</option>
                      <option value='NEW'>New</option>
                      <option value='SALE'>Sale</option>
                      <option value='BESTSELLER'>Bestseller</option>
                      <option value='LIMITED'>Limited</option>
                    </select>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <label className='block text-[12.5px] font-medium text-[#202223]'>
                        Specifications{' '}
                        <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                          (shown in the "Specifications" tab on the product
                          page)
                        </span>
                      </label>
                      <button
                        type='button'
                        onClick={() =>
                          setSpecs((prev) => [
                            ...prev,
                            { label: '', value: '' },
                          ])
                        }
                        className='text-[12px] font-medium text-[#008060] hover:underline'
                      >
                        + Add spec
                      </button>
                    </div>

                    {specs.length === 0 ? (
                      <p className='text-[12px] text-[#8C9196] py-2'>
                        No specifications added yet — e.g. "Weight: 85g",
                        "Balance: Head-Heavy", "Material: Carbon".
                      </p>
                    ) : (
                      <div className='space-y-2'>
                        {specs.map((s, i) => (
                          <div key={i} className='flex gap-2'>
                            <input
                              value={s.label}
                              onChange={(e) =>
                                setSpecs((prev) =>
                                  prev.map((row, idx) =>
                                    idx === i
                                      ? { ...row, label: e.target.value }
                                      : row,
                                  ),
                                )
                              }
                              placeholder='Label (e.g. Weight)'
                              className='flex-1 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060]'
                            />
                            <input
                              value={s.value}
                              onChange={(e) =>
                                setSpecs((prev) =>
                                  prev.map((row, idx) =>
                                    idx === i
                                      ? { ...row, value: e.target.value }
                                      : row,
                                  ),
                                )
                              }
                              placeholder='Value (e.g. 85g)'
                              className='flex-1 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060]'
                            />
                            <button
                              type='button'
                              onClick={() =>
                                setSpecs((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                )
                              }
                              className='w-9 h-9 shrink-0 flex items-center justify-center text-[#D82C0D] hover:bg-[#FFF4F4] rounded-lg'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className='flex items-start gap-2.5 p-3 border border-[#E1E3E5] rounded-lg cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={form.stringUpgrade}
                      onChange={(e) =>
                        setForm({ ...form, stringUpgrade: e.target.checked })
                      }
                      className='mt-0.5 accent-[#008060]'
                    />
                    <span>
                      <span className='block text-[13px] font-medium text-[#202223]'>
                        Offer "String Upgrade" option
                      </span>
                      <span className='block text-[11.5px] text-[#8C9196] mt-0.5'>
                        Shows a required Yes/No choice on the product page (adds
                        +1 day processing, no price change) — for racket
                        products only, matches smashuk.co.
                      </span>
                    </span>
                  </label>
                </div>
              )}
              {activeTab === 'pricing' && (
                <div className='space-y-5'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Price <span className='text-[#D82C0D]'>*</span>
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175] text-[13px]'>
                          £
                        </span>
                        <input
                          type='number'
                          value={form.price}
                          onChange={(e) => updateForm('price', e.target.value)}
                          placeholder='0.00'
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Compare-at Price{' '}
                        <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                          (original)
                        </span>
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175] text-[13px]'>
                          £
                        </span>
                        <input
                          type='number'
                          value={form.comparePrice}
                          onChange={(e) =>
                            updateForm('comparePrice', e.target.value)
                          }
                          placeholder='0.00'
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                        Cost per Item{' '}
                        <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                          (for margin calc)
                        </span>
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7175] text-[13px]'>
                          £
                        </span>
                        <input
                          type='number'
                          value={form.costPrice}
                          onChange={(e) =>
                            updateForm('costPrice', e.target.value)
                          }
                          placeholder='0.00'
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                        />
                      </div>
                    </div>
                    <div className='flex flex-col justify-end pb-0.5'>
                      {profit && margin ? (
                        <div className='p-3 bg-[#F2F7F5] border border-[#008060]/20 rounded-lg'>
                          <p className='text-[11.5px] text-[#6D7175]'>
                            Profit per item
                          </p>
                          <p className='text-[16px] font-bold text-[#008060]'>
                            £{profit}
                          </p>
                          <p className='text-[11.5px] text-[#6D7175] mt-0.5'>
                            Margin: {margin}%
                          </p>
                        </div>
                      ) : (
                        <div className='p-3 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg'>
                          <p className='text-[11.5px] text-[#8C9196]'>
                            Enter price & cost to see margin
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center justify-between p-4 border border-[#E1E3E5] rounded-lg'>
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>
                        Charge taxes on this product
                      </p>
                      <p className='text-[12px] text-[#6D7175] mt-0.5'>
                        VAT (20%) will be applied at checkout
                      </p>
                    </div>
                    <button
                      onClick={() => updateForm('taxable', !form.taxable)}
                      className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${form.taxable ? 'bg-[#008060]' : 'bg-[#8C9196]'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.taxable ? 'right-0.5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* ── INVENTORY TAB ── */}
              {activeTab === 'inventory' && (
                <div className='space-y-5'>
                  <div className='flex items-center justify-between p-4 border border-[#E1E3E5] rounded-lg'>
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>
                        Track inventory
                      </p>
                      <p className='text-[12px] text-[#6D7175] mt-0.5'>
                        Monitor stock levels for this product
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateForm('trackInventory', !form.trackInventory)
                      }
                      className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${form.trackInventory ? 'bg-[#008060]' : 'bg-[#8C9196]'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.trackInventory ? 'right-0.5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>

                  {form.trackInventory && (
                    <>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                            Stock Quantity
                          </label>
                          <input
                            type='number'
                            value={form.stock}
                            onChange={(e) =>
                              updateForm('stock', e.target.value)
                            }
                            placeholder='0'
                            className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                          />
                        </div>
                        <div>
                          <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                            Low Stock Alert
                          </label>
                          <input
                            type='number'
                            value={form.lowStockAlert}
                            onChange={(e) =>
                              updateForm('lowStockAlert', e.target.value)
                            }
                            placeholder='5'
                            className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                          Weight (grams)
                        </label>
                        <input
                          type='number'
                          value={form.weight}
                          onChange={(e) => updateForm('weight', e.target.value)}
                          placeholder='e.g. 500'
                          className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── VARIANTS TAB ── */}
              {activeTab === 'variants' && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>
                        Product Variants
                      </p>
                      <p className='text-[12px] text-[#6D7175] mt-0.5'>
                        Add different sizes, colors or options
                      </p>
                    </div>
                    <button
                      onClick={addVariant}
                      className='px-3 py-1.5 border border-[#008060] text-[#008060] text-[12.5px] font-medium rounded-lg hover:bg-[#F2F7F5] transition-colors bg-transparent cursor-pointer'
                    >
                      + Add Variant
                    </button>
                  </div>

                  <div className='space-y-3'>
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className='p-4 border border-[#E1E3E5] rounded-lg space-y-3'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-[12.5px] font-semibold text-[#202223]'>
                            Variant {index + 1}
                          </span>
                          {variants.length > 1 && (
                            <button
                              onClick={() => removeVariant(variant.id)}
                              className='text-[#D82C0D] text-[12px] hover:underline bg-transparent border-none cursor-pointer'
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          {(
                            ['size', 'color', 'sku', 'price', 'stock'] as const
                          ).map((field) => (
                            <div key={field}>
                              <label className='block text-[11.5px] text-[#6D7175] mb-1 capitalize'>
                                {field === 'price' ? 'Price (£)' : field}
                              </label>
                              <input
                                type={
                                  ['price', 'stock'].includes(field)
                                    ? 'number'
                                    : 'text'
                                }
                                value={variant[field]}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    field,
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  field === 'size'
                                    ? 'e.g. UK 8, L, XL'
                                    : field === 'color'
                                      ? 'e.g. Black, Red'
                                      : field === 'sku'
                                        ? 'e.g. FB-001-BLK-8'
                                        : field === 'price'
                                          ? '0.00'
                                          : '0'
                                }
                                className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all'
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SEO TAB ── */}
              {activeTab === 'seo' && (
                <div className='space-y-5'>
                  <div className='p-4 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg'>
                    <p className='text-[12.5px] font-medium text-[#202223] mb-1'>
                      Search Engine Preview
                    </p>
                    <div className='mt-3 space-y-1'>
                      <p className='text-[#2C6ECB] text-[15px] truncate'>
                        {form.metaTitle || form.name || 'Product Title'}
                      </p>
                      <p className='text-[#008060] text-[12px]'>
                        smashuk.co.uk/shop/product/
                        {form.name
                          ? form.name.toLowerCase().replace(/\s+/g, '-')
                          : 'product-slug'}
                      </p>
                      <p className='text-[#6D7175] text-[12.5px] leading-relaxed line-clamp-2'>
                        {form.metaDescription ||
                          form.description ||
                          'Product description will appear here...'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Meta Title{' '}
                      <span className='ml-2 text-[11px] text-[#8C9196] font-normal'>
                        {form.metaTitle.length}/60
                      </span>
                    </label>
                    <input
                      type='text'
                      value={form.metaTitle}
                      onChange={(e) => updateForm('metaTitle', e.target.value)}
                      maxLength={60}
                      placeholder='SEO title for search engines'
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                    <div className='mt-1.5 h-1 bg-[#E1E3E5] rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all ${form.metaTitle.length > 50 ? 'bg-[#D82C0D]' : form.metaTitle.length > 30 ? 'bg-[#008060]' : 'bg-[#FFC453]'}`}
                        style={{
                          width: `${(form.metaTitle.length / 60) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Meta Description{' '}
                      <span className='ml-2 text-[11px] text-[#8C9196] font-normal'>
                        {form.metaDescription.length}/160
                      </span>
                    </label>
                    <textarea
                      value={form.metaDescription}
                      onChange={(e) =>
                        updateForm('metaDescription', e.target.value)
                      }
                      maxLength={160}
                      placeholder='Brief description for search results...'
                      rows={3}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
                    />
                    <div className='mt-1.5 h-1 bg-[#E1E3E5] rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all ${form.metaDescription.length > 140 ? 'bg-[#D82C0D]' : form.metaDescription.length > 80 ? 'bg-[#008060]' : 'bg-[#FFC453]'}`}
                        style={{
                          width: `${(form.metaDescription.length / 160) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Meta Keywords{' '}
                      <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                        (comma separated)
                      </span>
                    </label>
                    <input
                      type='text'
                      value={form.metaKeywords}
                      onChange={(e) =>
                        updateForm('metaKeywords', e.target.value)
                      }
                      placeholder='football boots, nike, sports shoes'
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Image Upload ── */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223] mb-4'>
              Product Images
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files.length) addImages(e.dataTransfer.files)
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-[#008060] bg-[#F2F7F5]' : 'border-[#E1E3E5] hover:border-[#8C9196] hover:bg-[#F6F6F7]'}`}
            >
              <div className='w-12 h-12 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl flex items-center justify-center mx-auto mb-3'>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='#8C9196'
                  strokeWidth='2'
                >
                  <rect x='3' y='3' width='18' height='18' rx='2' />
                  <circle cx='8.5' cy='8.5' r='1.5' />
                  <polyline points='21 15 16 10 5 21' />
                </svg>
              </div>
              <p className='text-[13px] font-medium text-[#202223]'>
                Drag & drop images here
              </p>
              <p className='text-[12px] text-[#6D7175] mt-1'>
                or{' '}
                <label className='text-[#008060] cursor-pointer hover:underline'>
                  browse files
                  <input
                    type='file'
                    multiple
                    accept='image/*'
                    className='hidden'
                    onChange={(e) => {
                      if (e.target.files?.length) addImages(e.target.files)
                    }}
                  />
                </label>
              </p>
              <p className='text-[11px] text-[#8C9196] mt-2'>
                PNG, JPG, WEBP up to 10MB each
              </p>
            </div>

            {images.length > 0 ? (
              <div className='grid grid-cols-4 gap-3 mt-4'>
                {images.map((img, idx) => (
                  <div
                    key={img.preview}
                    className='relative aspect-square rounded-lg overflow-hidden border border-[#E1E3E5] group'
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt={`Product image ${idx + 1}`}
                      className='w-full h-full object-cover'
                    />
                    {img.uploading && (
                      <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                        <svg
                          className='animate-spin w-5 h-5 text-white'
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
                      </div>
                    )}
                    {img.error && (
                      <div className='absolute inset-0 bg-[#D82C0D]/60 flex items-center justify-center p-2'>
                        <p className='text-white text-[10px] text-center leading-tight'>
                          Upload failed
                        </p>
                      </div>
                    )}
                    {!img.uploading && !img.error && (
                      <>
                        {idx === 0 && (
                          <div className='absolute top-1 left-1 bg-[#008060] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded'>
                            MAIN
                          </div>
                        )}
                        <button
                          onClick={() => removeImage(img.preview)}
                          className='absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer text-[10px]'
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {img.error && (
                      <button
                        onClick={() => {
                          setImages((prev) =>
                            prev.map((i) =>
                              i.preview === img.preview
                                ? { ...i, uploading: true, error: undefined }
                                : i,
                            ),
                          )
                          uploadImage({
                            ...img,
                            uploading: true,
                            error: undefined,
                          })
                        }}
                        className='absolute bottom-1 right-1 bg-white text-[10px] text-[#D82C0D] px-1.5 py-0.5 rounded border border-[#D82C0D] cursor-pointer'
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className='grid grid-cols-4 gap-3 mt-4'>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className='aspect-square bg-[#F6F6F7] border border-dashed border-[#E1E3E5] rounded-lg flex items-center justify-center'
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='#E1E3E5'
                      strokeWidth='2'
                    >
                      <rect x='3' y='3' width='18' height='18' rx='2' />
                      <circle cx='8.5' cy='8.5' r='1.5' />
                      <polyline points='21 15 16 10 5 21' />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className='space-y-4'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <div className='flex items-center gap-2'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#008060'
                strokeWidth='2'
                strokeLinecap='round'
              >
                <path d='M20 6L9 17l-5-5' />
              </svg>
              <p className='text-[13px] font-medium text-[#202223]'>
                Published on save
              </p>
            </div>
            <p className='text-[11.5px] text-[#6D7175] mt-1'>
              Every new product goes live on the storefront and POS as soon as
              you save it — no separate publish step.
            </p>
          </div>

          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Summary
            </h3>
            <div className='space-y-3'>
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Brand', value: form.brand || '—' },
                { label: 'Sport', value: form.sport || '—' },
                { label: 'Category', value: form.categoryName || '—' },
                { label: 'Price', value: form.price ? `£${form.price}` : '—' },
                { label: 'Stock', value: form.stock || '—' },
                { label: 'SKU', value: form.sku || '—' },
                {
                  label: 'Images',
                  value:
                    images.filter((i) => i.url).length > 0
                      ? `${images.filter((i) => i.url).length} uploaded`
                      : '—',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className='flex items-center justify-between'
                >
                  <span className='text-[12px] text-[#6D7175]'>
                    {item.label}
                  </span>
                  <span className='text-[12.5px] font-medium text-[#202223] truncate max-w-35 text-right'>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Checklist
            </h3>
            <div className='space-y-2.5'>
              {[
                { label: 'Product name', done: !!form.name },
                { label: 'Description', done: !!form.description },
                { label: 'Price set', done: !!form.price },
                { label: 'SKU added', done: !!form.sku },
                { label: 'Stock quantity', done: !!form.stock },
                { label: 'Images uploaded', done: images.some((i) => i.url) },
                { label: 'SEO title', done: !!form.metaTitle },
              ].map((item) => (
                <div key={item.label} className='flex items-center gap-2.5'>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-[#008060]' : 'bg-[#E1E3E5]'}`}
                  >
                    {item.done && (
                      <svg
                        width='8'
                        height='8'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='white'
                        strokeWidth='3'
                      >
                        <polyline points='20 6 9 17 4 12' />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[12.5px] ${item.done ? 'text-[#202223]' : 'text-[#8C9196]'}`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className='space-y-2'>
            <button
              onClick={() => handleSave('active')}
              disabled={saving}
              className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none'
            >
              {saving ? 'Saving...' : 'Save & Publish'}
            </button>
            <Link
              href='/dashboard/products'
              className='block text-center py-2.5 text-[13px] text-[#6D7175] hover:text-[#202223] no-underline transition-colors'
            >
              Discard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
