'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  updateProduct,
  upsertOptionValues,
  linkOptionsToProduct,
  deleteProductVariant,
  upsertProductTags,
} from '@/lib/api/dashboard'
import { inferSellingChannel } from '@/lib/api/selling-channels-client'
import { toast } from 'sonner'
interface VariantOptionEntry {
  id: string
  name: string
  value: string
}
interface Variant {
  id: string
  medusaId?: string
  options: VariantOptionEntry[]
  colorCode: string
  sku: string
  price: string
  stock: string
  imageUrls: string[]
}
interface TierPricingRow {
  minQty: number
  maxQty?: number
  discountPct: number
}
interface CrossSellItem {
  id: string
  productId: string
  productTitle: string
  discountPct: number
}
interface MedusaCategory {
  id: string
  name: string
}
interface UploadedImage {
  file?: File
  preview: string
  url?: string
  uploading: boolean
  error?: string
  existing?: boolean
}
export default function EditProductPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [status, setStatus] = useState<'published' | 'draft'>('draft')
  const [activeTab, setActiveTab] = useState('general')
  const [sellingChannel, setSellingChannel] = useState<
    'both' | 'website' | 'store'
  >('both')
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
  const [categories, setCategories] = useState<MedusaCategory[]>([])
  const [extraCategoryIds, setExtraCategoryIds] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [globalOptions, setGlobalOptions] = useState<
    {
      id: string
      title: string
      values: string[]
    }[]
  >([])
  useEffect(() => {
    fetch('/api/admin/product-options?limit=200&fields=id,title')
      .then((res) => res.json())
      .then(async (data) => {
        const list = (data.product_options ?? []) as {
          id: string
          title: string
        }[]
        setGlobalOptions(
          list.map((o) => ({
            ...o,
            values: [],
          })),
        )
        const withValues = await Promise.all(
          list.map(async (o) => {
            try {
              const res = await fetch(
                `/api/admin/product-options/${o.id}?fields=id,title,values.id,values.value`,
              )
              const single = await res.json()
              const values = (single.product_option?.values ?? []).map(
                (v: any) => v.value,
              )
              return {
                id: o.id,
                title: o.title,
                values,
              }
            } catch (err) {
              console.error('Failed to load option values:', o.title, err)
              return {
                id: o.id,
                title: o.title,
                values: [] as string[],
              }
            }
          }),
        )
        setGlobalOptions(withValues)
      })
      .catch((err) => console.error('Failed to load global options:', err))
  }, [])
  const [customValueRows, setCustomValueRows] = useState<Set<string>>(new Set())
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
    stringUpgradeType: 'free' as 'free' | 'paid',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
  })
  const [tierPricing, setTierPricing] = useState<
    {
      minQty: number
      maxQty?: number
      discountPct: number
    }[]
  >([])
  const [crossSells, setCrossSells] = useState<CrossSellItem[]>([])
  const [crossSellSearch, setCrossSellSearch] = useState('')
  const [crossSellResults, setCrossSeachResults] = useState<
    {
      id: string
      title: string
    }[]
  >([])
  const [crossSellLoading, setCrossSellLoading] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([
    {
      id: '1',
      options: [
        {
          id: 'o1',
          name: '',
          value: '',
        },
      ],
      colorCode: '',
      sku: '',
      price: '',
      stock: '',
      imageUrls: [],
    },
  ])
  const [defaultVariantId, setDefaultVariantId] = useState<string>('')
  const [defaultOption, setDefaultOption] = useState<{
    title: string
    value: string
  } | null>(null)
  const [existingOptions, setExistingOptions] = useState<
    {
      id: string
      title: string
      values: string[]
    }[]
  >([])
  const optionValueCasingRef = useRef<Map<string, string>>(new Map())
  const deletedDefaultVariantRef = useRef(false)
  const staleOptionIdsRef = useRef<string[]>([])
  const isSavingRef = useRef(false)
  const variantsToDeleteRef = useRef<string[]>([])
  const [specs, setSpecs] = useState<
    {
      label: string
      value: string
    }[]
  >([])
  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/admin/products/${id}`)
        const data = await res.json()
        const p = data.product
        if (!p) throw new Error('Product not found')
        const firstVariant = p.variants?.[0]
        const firstPrice = firstVariant?.prices?.[0]?.amount
        setStatus(p.status === 'published' ? 'published' : 'draft')
        setSellingChannel(inferSellingChannel(p.sales_channels))
        setExtraCategoryIds((p.categories ?? []).slice(1).map((c: any) => c.id))
        setForm({
          name: p.title ?? '',
          description: p.description ?? '',
          brand: p.metadata?.brand ?? '',
          sport: p.metadata?.sport ?? '',
          badge: p.metadata?.badge ?? '',
          stringUpgrade: p.metadata?.string_upgrade_available === true,
          stringUpgradeType:
            p.metadata?.string_upgrade_type === 'paid' ? 'paid' : 'free',
          category: p.categories?.[0]?.id ?? '',
          categoryName: p.categories?.[0]?.name ?? '',
          sku: firstVariant?.sku ?? '',
          barcode: firstVariant?.barcode ?? '',
          price: firstPrice ? String(firstPrice) : '',
          comparePrice: p.metadata?.compare_at_price
            ? String(p.metadata.compare_at_price)
            : '',
          costPrice: p.metadata?.cost_price
            ? String(p.metadata.cost_price)
            : '',
          taxable: p.metadata?.taxable !== false,
          trackInventory: firstVariant?.manage_inventory ?? true,
          stock: String(firstVariant?.inventory_quantity ?? ''),
          lowStockAlert: String(p.metadata?.low_stock_alert ?? '5'),
          weight: firstVariant?.weight ? String(firstVariant.weight) : '',
          tags:
            Array.isArray(p.tags) && p.tags.length > 0
              ? p.tags.map((t: any) => t.value).join(', ')
              : (p.metadata?.tags ?? ''),
          metaTitle: p.metadata?.metaTitle ?? '',
          metaDescription: p.metadata?.metaDescription ?? '',
          metaKeywords: p.metadata?.metaKeywords ?? '',
        })
        const KNOWN_KEYS = new Set([
          'brand',
          'sport',
          'badge',
          'tags',
          'specs',
          'specifications',
          'sale_price',
          'regular_price',
          'compare_at_price',
          'cost_price',
          'low_stock_alert',
          'taxable',
          'tier_pricing',
          'cross_sells',
          'string_upgrade_available',
          'string_upgrade_type',
          'originalPrice',
          'rating',
          'reviewCount',
          'metaTitle',
          'metaDescription',
          'metaKeywords',
          'ogImage',
          'service_type',
          'service_sport',
        ])
        if (Array.isArray(p.metadata?.cross_sells)) {
          setCrossSells(
            p.metadata.cross_sells.map((c: any, i: number) => ({
              id: String(i),
              productId: c.productId ?? '',
              productTitle: c.productTitle ?? c.productId ?? '',
              discountPct: c.discountPct ?? 10,
            })),
          )
        }
        if (Array.isArray(p.metadata?.tier_pricing)) {
          setTierPricing(p.metadata.tier_pricing)
        }
        if (Array.isArray(p.metadata?.specs) && p.metadata.specs.length > 0) {
          setSpecs(p.metadata.specs)
        } else if (p.metadata) {
          const legacy = Object.entries(p.metadata)
            .filter(
              ([k, v]) =>
                !KNOWN_KEYS.has(k) && v !== undefined && v !== null && v !== '',
            )
            .map(([k, v]) => ({
              label: k
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              value: typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v),
            }))
          if (legacy.length > 0) setSpecs(legacy)
        }
        if (p.variants && p.variants.length > 1) {
          setVariants(
            p.variants.map((v: any) => ({
              id: v.id,
              medusaId: v.id,
              options:
                (v.options ?? [])
                  .map((o: any, i: number) => ({
                    id: `${v.id}-${i}`,
                    name: o.option?.title ?? '',
                    value: o.value ?? '',
                  }))
                  .filter((o: any) => o.name) ?? [],
              colorCode: v.metadata?.color_code ?? '',
              sku: v.sku ?? '',
              price: v.prices?.[0]?.amount ? String(v.prices[0].amount) : '',
              stock: String(v.inventory_quantity ?? ''),
              imageUrls: Array.isArray(v.metadata?.variant_images)
                ? v.metadata.variant_images
                : [],
            })),
          )
        } else if (p.variants && p.variants.length === 1) {
          const v = p.variants[0]
          setDefaultVariantId(v.id)
          const opt = v.options?.[0]
          if (opt?.option?.title && opt?.value) {
            setDefaultOption({
              title: opt.option.title,
              value: opt.value,
            })
          }
          setVariants([
            {
              id: '1',
              medusaId: v.id,
              options: [
                {
                  id: 'o1',
                  name: opt?.option?.title ?? '',
                  value: opt?.value ?? '',
                },
              ],
              colorCode: v.metadata?.color_code ?? '',
              sku: v.sku ?? '',
              price: v.prices?.[0]?.amount ? String(v.prices[0].amount) : '',
              stock: String(v.inventory_quantity ?? ''),
              imageUrls: Array.isArray(v.metadata?.variant_images)
                ? v.metadata.variant_images
                : [],
            },
          ])
        }
        if (Array.isArray(p.options)) {
          const rawOptions = p.options.map((o: any) => ({
            id: o.id,
            title: o.title,
            values: (o.values ?? []).map((v: any) => v.value),
          }))
          setExistingOptions(rawOptions)
          Promise.all(
            rawOptions.map(async (o: { id: string; title: string }) => {
              try {
                const res = await fetch(
                  `/api/admin/product-options/${o.id}?fields=id,title,values.id,values.value`,
                )
                const data = await res.json()
                const values = (data.product_option?.values ?? []).map(
                  (v: any) => v.value,
                )
                return values.length > 0
                  ? {
                      id: o.id,
                      values,
                    }
                  : null
              } catch (err) {
                console.error('Failed to load full option values:', err)
                return null
              }
            }),
          ).then((results) => {
            const full = results.filter(Boolean) as {
              id: string
              values: string[]
            }[]
            if (full.length === 0) return
            setExistingOptions((prev) =>
              prev.map((o) => {
                const match = full.find((f) => f.id === o.id)
                return match
                  ? {
                      ...o,
                      values: match.values,
                    }
                  : o
              }),
            )
          })
        }
        if (p.images && p.images.length > 0) {
          setImages(
            p.images.map((img: any) => ({
              preview: img.url,
              url: img.url,
              uploading: false,
              existing: true,
            })),
          )
        }
      } catch (err: any) {
        setSaveError(err.message ?? 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }
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
    loadProduct()
    loadCategories()
  }, [id])
  const updateForm = (key: string, value: string | boolean) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        options: [
          {
            id: `o${Date.now()}`,
            name: '',
            value: '',
          },
        ],
        colorCode: '',
        sku: '',
        price: '',
        stock: '',
        imageUrls: [],
      },
    ])
  const removeVariant = (vid: string) =>
    setVariants((prev) => {
      const target = prev.find((v) => v.id === vid)
      if (target?.medusaId) {
        variantsToDeleteRef.current = [
          ...variantsToDeleteRef.current,
          target.medusaId,
        ]
      }
      return prev.filter((v) => v.id !== vid)
    })
  const updateVariant = (
    vid: string,
    key: Exclude<keyof Variant, 'options' | 'imageUrls'>,
    value: string,
  ) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === vid
          ? {
              ...v,
              [key]: value,
            }
          : v,
      ),
    )
  const addOptionRow = (variantId: string) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              options: [
                ...v.options,
                {
                  id: `o${Date.now()}`,
                  name: '',
                  value: '',
                },
              ],
            }
          : v,
      ),
    )
  const removeOptionRow = (variantId: string, optionId: string) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              options: v.options.filter((o) => o.id !== optionId),
            }
          : v,
      ),
    )
  const updateOptionRow = (
    variantId: string,
    optionId: string,
    key: 'name' | 'value',
    value: string,
  ) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              options: v.options.map((o) =>
                o.id === optionId
                  ? {
                      ...o,
                      [key]: value,
                    }
                  : o,
              ),
            }
          : v,
      ),
    )
  const toggleVariantImage = (vid: string, url: string) =>
    setVariants((prev) =>
      prev.map((v) =>
        v.id === vid
          ? {
              ...v,
              imageUrls: v.imageUrls.includes(url)
                ? v.imageUrls.filter((u) => u !== url)
                : [...v.imageUrls, url],
            }
          : v,
      ),
    )
  const searchCrossSellProducts = async (q: string) => {
    if (!q.trim()) {
      setCrossSeachResults([])
      return
    }
    setCrossSellLoading(true)
    try {
      const res = await fetch(
        `/api/admin/products?q=${encodeURIComponent(q)}&limit=8`,
      )
      const data = await res.json()
      setCrossSeachResults(
        (data.products ?? [])
          .filter((p: any) => p.id !== id)
          .map((p: any) => ({
            id: p.id,
            title: p.title,
          })),
      )
    } catch {
      setCrossSeachResults([])
    } finally {
      setCrossSellLoading(false)
    }
  }
  const addCrossSell = (product: { id: string; title: string }) => {
    if (crossSells.some((c) => c.productId === product.id)) return
    setCrossSells((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: product.id,
        productTitle: product.title,
        discountPct: 10,
      },
    ])
    setCrossSellSearch('')
    setCrossSeachResults([])
  }
  const addImages = async (files: FileList | File[]) => {
    const newImages: UploadedImage[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))
    setImages((prev) => [...prev, ...newImages])
    for (const img of newImages) uploadImage(img)
  }
  const uploadImage = async (img: UploadedImage) => {
    if (!img.file) return
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
            ? {
                ...i,
                uploading: false,
                url: uploadedUrl,
              }
            : i,
        ),
      )
    } catch (err: any) {
      setImages((prev) =>
        prev.map((i) =>
          i.preview === img.preview
            ? {
                ...i,
                uploading: false,
                error: err.message,
              }
            : i,
        ),
      )
    }
  }
  const removeImage = (preview: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.preview === preview)
      if (img && !img.existing) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.preview !== preview)
    })
  }
  const filledOptions = (v: Variant) =>
    v.options.filter((o) => o.name.trim() && o.value.trim())
  const buildPayload = (saveStatus: 'published' | 'draft') => {
    const hasExtraVariants = variants.some((v) => filledOptions(v).length > 0)
    const baseVariant = {
      id: defaultVariantId || undefined,
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
      options: defaultOption
        ? {
            [defaultOption.title]: defaultOption.value,
          }
        : {
            Default: 'Default',
          },
    }
    const canonicalValue = (title: string, typed: string) =>
      optionValueCasingRef.current.get(
        `${title.toLowerCase()}::${typed.toLowerCase()}`,
      ) ?? typed
    const extraVariants = variants
      .filter((v) => filledOptions(v).length > 0)
      .map((v) => {
        const filled = filledOptions(v)
        return {
          id: v.medusaId || undefined,
          title: filled.map((o) => o.value.trim()).join(' / '),
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
          options: Object.fromEntries(
            filled.map((o) => [
              o.name.trim(),
              canonicalValue(o.name.trim(), o.value.trim()),
            ]),
          ),
          metadata: v.colorCode
            ? {
                color_code: v.colorCode,
              }
            : undefined,
          images:
            v.imageUrls.length > 0
              ? v.imageUrls.map((url) => ({
                  url,
                }))
              : undefined,
        }
      })
    const allVariants = hasExtraVariants ? extraVariants : [baseVariant]
    const uploadedImages = images
      .filter((i) => i.url)
      .map((i, idx) => ({
        url: i.url!,
        rank: idx,
      }))
    const productPayload = {
      title: form.name,
      description: form.description || undefined,
      status: saveStatus,
      selling_channel: sellingChannel,
      thumbnail: uploadedImages[0]?.url ?? undefined,
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      categories: [
        ...(form.category
          ? [
              {
                id: form.category,
              },
            ]
          : []),
        ...extraCategoryIds
          .filter((id) => id !== form.category)
          .map((id) => ({
            id,
          })),
      ],
      tags: undefined as
        | {
            id: string
          }[]
        | undefined,
      variants: allVariants,
      metadata: {
        brand: form.brand || undefined,
        sport: form.sport || undefined,
        badge: form.badge || undefined,
        string_upgrade_available: form.stringUpgrade,
        string_upgrade_type: form.stringUpgrade
          ? form.stringUpgradeType
          : undefined,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()),
        compare_at_price: form.comparePrice
          ? parseFloat(form.comparePrice)
          : undefined,
        cost_price: form.costPrice ? parseFloat(form.costPrice) : undefined,
        low_stock_alert: form.lowStockAlert ? Number(form.lowStockAlert) : 5,
        taxable: form.taxable,
        tier_pricing: tierPricing.length > 0 ? tierPricing : undefined,
        cross_sells:
          crossSells.length > 0
            ? crossSells.map((c) => ({
                productId: c.productId,
                productTitle: c.productTitle,
                discountPct: c.discountPct,
              }))
            : undefined,
      },
      _stock: form.stock ? Number(form.stock) : 0,
      _variantStocks: hasExtraVariants
        ? Object.fromEntries(
            variants
              .filter((v) => v.stock && filledOptions(v).length > 0)
              .map((v) => [
                filledOptions(v)
                  .map((o) => o.value.trim())
                  .join(' / '),
                Number(v.stock),
              ]),
          )
        : undefined,
    }
    return productPayload
  }
  const syncOptionsForVariants = async () => {
    const hasExtraVariants = variants.some((v) => filledOptions(v).length > 0)
    if (!hasExtraVariants) {
      if (defaultOption) return
      const { optionId, valueIds, canonicalValues } = await upsertOptionValues(
        'Default',
        ['Default'],
      )
      const alreadyLinked = new Set(existingOptions.map((o) => o.id))
      const linkTargets: {
        id: string
        title: string
        value_ids: string[]
      }[] = [
        {
          id: optionId,
          title: 'Default',
          value_ids: valueIds,
        },
      ]
      await linkOptionsToProduct(id, linkTargets, alreadyLinked, [])
      setDefaultOption({
        title: 'Default',
        value: canonicalValues[0] ?? 'Default',
      })
      setExistingOptions((prev) => {
        const others = prev.filter((o) => o.id !== optionId)
        return [
          ...others,
          {
            id: optionId,
            title: 'Default',
            values: canonicalValues,
          },
        ]
      })
      return
    }
    const neededByTitle = new Map<string, Set<string>>()
    variants.forEach((v) => {
      filledOptions(v).forEach((o) => {
        const title = o.name.trim()
        if (!neededByTitle.has(title)) neededByTitle.set(title, new Set())
        neededByTitle.get(title)!.add(o.value.trim())
      })
    })
    if (neededByTitle.size === 0) return
    const linkTargets: {
      id: string
      title: string
      value_ids: string[]
    }[] = []
    for (const [title, valueSet] of neededByTitle) {
      const requested = Array.from(valueSet)
      const existingOption = existingOptions.find(
        (o) => o.title.toLowerCase() === title.toLowerCase(),
      )
      const union = Array.from(
        new Set([...(existingOption?.values ?? []), ...requested]),
      )
      const { optionId, valueIds, canonicalValues } = await upsertOptionValues(
        title,
        union,
        existingOption?.id,
      )
      linkTargets.push({
        id: optionId,
        title,
        value_ids: valueIds,
      })
      requested.forEach((typed) => {
        const idx = union.findIndex(
          (v) => v.toLowerCase() === typed.toLowerCase(),
        )
        const canonical = idx >= 0 ? canonicalValues[idx] : undefined
        if (canonical) {
          optionValueCasingRef.current.set(
            `${title.toLowerCase()}::${typed.toLowerCase()}`,
            canonical,
          )
        }
      })
      setExistingOptions((prev) => {
        const others = prev.filter(
          (o) =>
            o.id !== optionId && o.title.toLowerCase() !== title.toLowerCase(),
        )
        return [
          ...others,
          {
            id: optionId,
            title,
            values: canonicalValues,
          },
        ]
      })
    }
    const alreadyLinked = new Set(existingOptions.map((o) => o.id))
    const neededTitles = new Set(neededByTitle.keys())
    const removeOptionIds = existingOptions
      .filter((o) => !neededTitles.has(o.title))
      .map((o) => o.id)
    const defaultVariantSurvives = variants.some(
      (v) => v.medusaId === defaultVariantId && filledOptions(v).length > 0,
    )
    if (removeOptionIds.length > 0 && defaultVariantId) {
      if (!defaultVariantSurvives) {
        await deleteProductVariant(id, defaultVariantId)
        deletedDefaultVariantRef.current = true
        setDefaultVariantId('')
      } else {
        staleOptionIdsRef.current = removeOptionIds
      }
    }
    const removeNow = staleOptionIdsRef.current.length ? [] : removeOptionIds
    try {
      await linkOptionsToProduct(id, linkTargets, alreadyLinked, removeNow)
    } catch (err) {
      throw err
    }
    if (removeNow.length > 0) {
      setExistingOptions((prev) =>
        prev.filter((o) => !removeNow.includes(o.id)),
      )
    }
  }
  const restoreDeletedDefaultVariant = async () => {
    try {
      const result = await updateProduct(id, {
        variants: [
          {
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
            options: defaultOption
              ? {
                  [defaultOption.title]: defaultOption.value,
                }
              : {
                  Default: 'Default',
                },
          },
        ],
      })
      const restoredId = result?.product?.variants?.[0]?.id
      if (restoredId) {
        setDefaultVariantId(restoredId)
        setVariants((prev) =>
          prev.map((v, i) =>
            i === 0 && filledOptions(v).length === 0
              ? {
                  ...v,
                  medusaId: restoredId,
                }
              : v,
          ),
        )
      }
      toast.error(
        'Save failed — your original SKU/price/stock have been restored. Please try adding the variant again.',
      )
    } catch (restoreErr) {
      console.error('[restore deleted default variant]', restoreErr)
      toast.error(
        'Save failed and the original variant could not be restored automatically — please refresh and check this product before saving again.',
      )
    } finally {
      deletedDefaultVariantRef.current = false
    }
  }
  const handleSave = async (saveStatus: 'published' | 'draft') => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    try {
      await handleSaveInner(saveStatus)
    } finally {
      isSavingRef.current = false
    }
  }
  const handleSaveInner = async (saveStatus: 'published' | 'draft') => {
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
    if (images.some((i) => i.uploading)) {
      setSaveError('Images are still uploading, please wait...')
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    setStatus(saveStatus)
    try {
      const hadExtraVariants = variants.some((v) => filledOptions(v).length > 0)
      await syncOptionsForVariants()
      const tagIds = form.tags
        ? await upsertProductTags(form.tags.split(','))
        : []
      const payload = buildPayload(saveStatus)
      payload.tags = tagIds.length > 0 ? tagIds : []
      const updateResult = await updateProduct(id, payload)
      if (hadExtraVariants) {
        setDefaultOption(null)
      }
      if (variantsToDeleteRef.current.length > 0) {
        const toDelete = variantsToDeleteRef.current
        variantsToDeleteRef.current = []
        for (const variantId of toDelete) {
          try {
            await deleteProductVariant(id, variantId)
          } catch (deleteErr) {
            console.error('[delete removed variant]', deleteErr)
            variantsToDeleteRef.current.push(variantId)
          }
        }
      }
      if (staleOptionIdsRef.current.length > 0) {
        const toRemove = staleOptionIdsRef.current
        try {
          await linkOptionsToProduct(
            id,
            [],
            new Set(existingOptions.map((o) => o.id)),
            toRemove,
          )
          staleOptionIdsRef.current = []
          setExistingOptions((prev) => {
            const removedSet = new Set(toRemove)
            return prev.filter((o) => !removedSet.has(o.id))
          })
        } catch (cleanupErr) {
          console.error('[cleanup stale product option]', cleanupErr)
        }
      }
      setSaveSuccess(true)
      toast.success('Product updated successfully!')
      setTimeout(() => setSaveSuccess(false), 3000)
      const inventoryDebug: string[] = updateResult?._inventoryDebug ?? []
      if (inventoryDebug.length > 0) {
        const hasFailure = inventoryDebug.some((line) =>
          /FAILED|SKIPPED|THREW|No stock location|still NOT FOUND/.test(line),
        )
        if (hasFailure) {
          setSaveError('Inventory debug:\n' + inventoryDebug.join('\n'))
          toast.error('Inventory setup had issues — see details below Save.')
        }
      }
    } catch (err: any) {
      if (deletedDefaultVariantRef.current) {
        await restoreDeletedDefaultVariant()
      }
      const msg = err.message ?? 'Failed to save product.'
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
    {
      id: 'general',
      label: 'General',
    },
    {
      id: 'pricing',
      label: 'Pricing',
    },
    {
      id: 'inventory',
      label: 'Inventory',
    },
    {
      id: 'variants',
      label: 'Variants',
    },
    {
      id: 'cross-sell',
      label: 'Cross-sell',
    },
    {
      id: 'seo',
      label: 'SEO',
    },
  ]
  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='flex items-center gap-3 text-[#6D7175]'>
          <svg className='animate-spin w-5 h-5' viewBox='0 0 24 24' fill='none'>
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
          <span className='text-[13px]'>Loading product...</span>
        </div>
      </div>
    )
  }
  return (
    <div className='max-w-275 mx-auto space-y-5'>
      {}
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
              Edit Product
            </h1>
            <p className='text-[12.5px] text-[#6D7175] mt-0.5 truncate max-w-64'>
              {form.name || 'Loading...'}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('published')}
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
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {}
      {saveSuccess && (
        <div className='flex items-center gap-3 px-4 py-3 bg-[#F2F7F5] border border-[#008060]/20 rounded-xl text-[13px] text-[#008060]'>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M22 11.08V12a10 10 0 11-5.93-9.14' />
            <polyline points='22 4 12 14.01 9 11.01' />
          </svg>
          Product updated successfully!
        </div>
      )}

      {}
      {saveError && (
        <div className='flex items-start gap-3 px-4 py-3 bg-[#FFF4F4] border border-[#D82C0D]/20 rounded-xl text-[13px] text-[#D82C0D]'>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            className='mt-0.5 shrink-0'
          >
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
          </svg>
          <span className='whitespace-pre-wrap break-words'>{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className='ml-auto bg-transparent border-none cursor-pointer text-[#D82C0D]'
          >
            ✕
          </button>
        </div>
      )}

      <div className='grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5'>
        {}
        <div className='space-y-5'>
          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            <div className='flex border-b border-[#E1E3E5] overflow-x-auto scrollbar-none'>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${activeTab === tab.id ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className='p-6'>
              {}
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
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                  </div>

                  <div>
                    <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                      Sell on
                    </label>
                    <div className='grid grid-cols-3 gap-2'>
                      {(
                        [
                          {
                            value: 'website',
                            label: 'Website',
                          },
                          {
                            value: 'store',
                            label: 'Store',
                          },
                          {
                            value: 'both',
                            label: 'Both',
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type='button'
                          onClick={() => setSellingChannel(opt.value)}
                          className={`px-3.5 py-2.5 rounded-lg text-[13px] font-medium border transition-all ${sellingChannel === opt.value ? 'border-[#008060] bg-[#008060]/8 text-[#008060]' : 'border-[#E1E3E5] text-[#202223] hover:border-[#C9CCCF]'}`}
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
                      rows={5}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
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
                          {}
                          {(form.brand && !brandOptions.includes(form.brand)
                            ? [form.brand, ...brandOptions]
                            : brandOptions
                          ).map((b) => (
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
                          {(form.sport && !sportOptions.includes(form.sport)
                            ? [form.sport, ...sportOptions]
                            : sportOptions
                          ).map((s) => (
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
                        className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                        className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                            {
                              label: '',
                              value: '',
                            },
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
                                      ? {
                                          ...row,
                                          label: e.target.value,
                                        }
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
                                      ? {
                                          ...row,
                                          value: e.target.value,
                                        }
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
                        setForm({
                          ...form,
                          stringUpgrade: e.target.checked,
                        })
                      }
                      className='mt-0.5 accent-[#008060]'
                    />
                    <span>
                      <span className='block text-[13px] font-medium text-[#202223]'>
                        Offer "String Upgrade" option
                      </span>
                      <span className='block text-[11.5px] text-[#8C9196] mt-0.5'>
                        Shows a required Yes/No choice on the product page (adds
                        +1 day processing) — for racket products only, matches
                        smashuk.co.
                      </span>
                    </span>
                  </label>

                  {form.stringUpgrade && (
                    <div className='ml-1 pl-3 border-l-2 border-[#E1E3E5] flex gap-4'>
                      <label className='flex items-center gap-2 text-[13px] text-[#202223] cursor-pointer'>
                        <input
                          type='radio'
                          name='stringUpgradeType'
                          checked={form.stringUpgradeType === 'free'}
                          onChange={() =>
                            setForm({
                              ...form,
                              stringUpgradeType: 'free',
                            })
                          }
                          className='accent-[#008060]'
                        />
                        Free
                      </label>
                      <label className='flex items-center gap-2 text-[13px] text-[#202223] cursor-pointer'>
                        <input
                          type='radio'
                          name='stringUpgradeType'
                          checked={form.stringUpgradeType === 'paid'}
                          onChange={() =>
                            setForm({
                              ...form,
                              stringUpgradeType: 'paid',
                            })
                          }
                          className='accent-[#008060]'
                        />
                        Paid
                        <span className='text-[11.5px] text-[#8C9196]'>
                          (uses each string's own product price)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {}
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
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                          className='w-full pl-8 pr-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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

                  {}
                  <div className='border border-[#E1E3E5] rounded-lg overflow-hidden'>
                    <div className='flex items-center justify-between px-4 py-3 bg-[#F6F6F7] border-b border-[#E1E3E5]'>
                      <div>
                        <p className='text-[13px] font-medium text-[#202223]'>
                          Volume / Tier Pricing
                        </p>
                        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                          e.g. Buy 2–9 = 12% off, Buy 10+ = 20% off
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setTierPricing((prev) => [
                            ...prev,
                            {
                              minQty: (prev[prev.length - 1]?.maxQty ?? 1) + 1,
                              maxQty: undefined,
                              discountPct: 10,
                            },
                          ])
                        }
                        className='flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#008060] border border-[#008060]/30 rounded-lg hover:bg-[#008060]/5 transition-colors bg-white'
                      >
                        + Add tier
                      </button>
                    </div>

                    {tierPricing.length === 0 ? (
                      <div className='px-4 py-6 text-center'>
                        <p className='text-[12.5px] text-[#8C9196]'>
                          No tiers yet. Click "Add tier" to set volume
                          discounts.
                        </p>
                      </div>
                    ) : (
                      <div className='divide-y divide-[#F1F1F1]'>
                        {}
                        <div className='grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-[#FAFAFA]'>
                          <span className='text-[11px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                            Min Qty
                          </span>
                          <span className='text-[11px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                            Max Qty
                          </span>
                          <span className='text-[11px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                            Discount %
                          </span>
                          <span className='w-8' />
                        </div>
                        {tierPricing.map((tier, i) => (
                          <div
                            key={i}
                            className='grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3'
                          >
                            <input
                              type='number'
                              min='1'
                              value={tier.minQty}
                              onChange={(e) => {
                                const updated = [...tierPricing]
                                updated[i] = {
                                  ...updated[i],
                                  minQty: Number(e.target.value),
                                }
                                setTierPricing(updated)
                              }}
                              className='w-full px-2.5 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                              placeholder='2'
                            />
                            <input
                              type='number'
                              min='1'
                              value={tier.maxQty ?? ''}
                              onChange={(e) => {
                                const updated = [...tierPricing]
                                updated[i] = {
                                  ...updated[i],
                                  maxQty: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                }
                                setTierPricing(updated)
                              }}
                              className='w-full px-2.5 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                              placeholder='∞ (no limit)'
                            />
                            <div className='relative'>
                              <input
                                type='number'
                                min='1'
                                max='99'
                                value={tier.discountPct}
                                onChange={(e) => {
                                  const updated = [...tierPricing]
                                  updated[i] = {
                                    ...updated[i],
                                    discountPct: Number(e.target.value),
                                  }
                                  setTierPricing(updated)
                                }}
                                className='w-full pl-2.5 pr-6 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                                placeholder='10'
                              />
                              <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8C9196]'>
                                %
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setTierPricing((prev) =>
                                  prev.filter((_, j) => j !== i),
                                )
                              }
                              className='w-8 h-8 flex items-center justify-center text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#FFF4F4] rounded-lg bg-transparent border-none cursor-pointer text-base'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {}
                        {form.price && (
                          <div className='px-4 py-3 bg-[#F9F9F9] border-t border-[#E1E3E5]'>
                            <p className='text-[11.5px] font-semibold text-[#6D7175] mb-2'>
                              Preview (base price £{form.price})
                            </p>
                            <div className='space-y-1'>
                              <p className='text-[11.5px] text-[#8C9196]'>
                                Buy 1 →{' '}
                                <strong className='text-[#202223]'>
                                  £{parseFloat(form.price).toFixed(2)}
                                </strong>{' '}
                                each
                              </p>
                              {tierPricing.map((t, i) => {
                                const discounted = (
                                  parseFloat(form.price) *
                                  (1 - t.discountPct / 100)
                                ).toFixed(2)
                                const label = t.maxQty
                                  ? `${t.minQty}–${t.maxQty}`
                                  : `${t.minQty}+`
                                return (
                                  <p
                                    key={i}
                                    className='text-[11.5px] text-[#8C9196]'
                                  >
                                    Buy {label} →{' '}
                                    <strong className='text-[#008060]'>
                                      £{discounted}
                                    </strong>{' '}
                                    each ({t.discountPct}% off)
                                  </p>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {}
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
                            className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                            className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
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
                          className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {}
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
                        {}
                        <div className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <label className='block text-[11.5px] text-[#6D7175]'>
                              Options
                            </label>
                            <button
                              type='button'
                              onClick={() => addOptionRow(variant.id)}
                              className='text-[11.5px] text-[#008060] font-medium hover:underline bg-transparent border-none cursor-pointer'
                            >
                              + Add Option
                            </button>
                          </div>
                          {variant.options.map((opt) => {
                            const selectedGlobalOption = globalOptions.find(
                              (g) => g.title === opt.name,
                            )
                            const isCustomValue = customValueRows.has(opt.id)
                            return (
                              <div
                                key={opt.id}
                                className='flex items-center gap-1.5'
                              >
                                <select
                                  value={opt.name}
                                  onChange={(e) => {
                                    updateOptionRow(
                                      variant.id,
                                      opt.id,
                                      'name',
                                      e.target.value,
                                    )
                                    updateOptionRow(
                                      variant.id,
                                      opt.id,
                                      'value',
                                      '',
                                    )
                                    setCustomValueRows((prev) => {
                                      const next = new Set(prev)
                                      next.delete(opt.id)
                                      return next
                                    })
                                  }}
                                  className='flex-1 min-w-0 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] outline-none focus:border-[#008060] transition-all bg-white'
                                >
                                  <option value=''>Select option...</option>
                                  {globalOptions.map((g) => (
                                    <option key={g.id} value={g.title}>
                                      {g.title}
                                    </option>
                                  ))}
                                </select>
                                {isCustomValue ? (
                                  <input
                                    type='text'
                                    autoFocus
                                    value={opt.value}
                                    onChange={(e) =>
                                      updateOptionRow(
                                        variant.id,
                                        opt.id,
                                        'value',
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() => {
                                      if (!opt.value.trim()) {
                                        setCustomValueRows((prev) => {
                                          const next = new Set(prev)
                                          next.delete(opt.id)
                                          return next
                                        })
                                      }
                                    }}
                                    placeholder='New value (e.g. 12, Navy)'
                                    className='flex-1 min-w-0 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] transition-all'
                                  />
                                ) : (
                                  <select
                                    value={opt.value}
                                    disabled={!selectedGlobalOption}
                                    onChange={(e) => {
                                      if (e.target.value === '__custom__') {
                                        updateOptionRow(
                                          variant.id,
                                          opt.id,
                                          'value',
                                          '',
                                        )
                                        setCustomValueRows((prev) =>
                                          new Set(prev).add(opt.id),
                                        )
                                      } else {
                                        updateOptionRow(
                                          variant.id,
                                          opt.id,
                                          'value',
                                          e.target.value,
                                        )
                                      }
                                    }}
                                    className='flex-1 min-w-0 px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] outline-none focus:border-[#008060] transition-all bg-white disabled:bg-[#F6F6F7] disabled:text-[#8C9196]'
                                  >
                                    <option value=''>
                                      {selectedGlobalOption
                                        ? 'Select value...'
                                        : 'Pick an option first'}
                                    </option>
                                    {selectedGlobalOption?.values.map((v) => (
                                      <option key={v} value={v}>
                                        {v}
                                      </option>
                                    ))}
                                    {selectedGlobalOption && (
                                      <option value='__custom__'>
                                        + Add new value...
                                      </option>
                                    )}
                                  </select>
                                )}
                                {variant.options.length > 1 && (
                                  <button
                                    type='button'
                                    onClick={() =>
                                      removeOptionRow(variant.id, opt.id)
                                    }
                                    title='Remove option'
                                    className='px-2 py-2 text-[#D82C0D] text-[12px] hover:underline bg-transparent border-none cursor-pointer shrink-0'
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          {}
                          <div className='flex items-center gap-2 pt-1'>
                            <label className='text-[11.5px] text-[#6D7175] shrink-0'>
                              Swatch colour (optional)
                            </label>
                            <input
                              type='color'
                              title='Swatch colour shown on the storefront'
                              value={variant.colorCode || '#ffffff'}
                              onChange={(e) =>
                                updateVariant(
                                  variant.id,
                                  'colorCode',
                                  e.target.value,
                                )
                              }
                              className='w-10 h-8 p-1 border border-[#E1E3E5] rounded-lg cursor-pointer bg-white shrink-0'
                            />
                          </div>
                        </div>

                        <div className='grid grid-cols-3 gap-3'>
                          {(['sku', 'price', 'stock'] as const).map((field) => (
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
                                className='w-full px-3 py-2 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] outline-none focus:border-[#008060] transition-all'
                              />
                            </div>
                          ))}
                        </div>

                        {}
                        <div>
                          <label className='block text-[11.5px] text-[#6D7175] mb-1'>
                            Variant Media
                          </label>
                          {images.filter((i) => i.url).length === 0 ? (
                            <p className='text-[11.5px] text-[#8C9196] italic'>
                              Upload product images in the Images tab first,
                              then come back here to pick which ones belong to
                              this variant.
                            </p>
                          ) : (
                            <div className='flex flex-wrap gap-2'>
                              {images
                                .filter((i) => i.url)
                                .map((img) => {
                                  const picked = variant.imageUrls.includes(
                                    img.url!,
                                  )
                                  return (
                                    <button
                                      key={img.url}
                                      type='button'
                                      onClick={() =>
                                        toggleVariantImage(variant.id, img.url!)
                                      }
                                      title={
                                        picked
                                          ? 'Remove from this variant'
                                          : 'Add to this variant'
                                      }
                                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-transparent p-0 ${picked ? 'border-[#008060] ring-2 ring-[#008060]/30' : 'border-[#E1E3E5] hover:border-[#8C9196]'}`}
                                    >
                                      <img
                                        src={img.url}
                                        alt=''
                                        className='w-full h-full object-cover'
                                      />
                                      {picked && (
                                        <span className='absolute inset-0 flex items-center justify-center bg-[#008060]/40 text-white text-[16px] font-bold'>
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                            </div>
                          )}
                          {variant.imageUrls.length === 0 && (
                            <p className='text-[11px] text-[#8C9196] mt-1'>
                              No images picked — this variant will show the
                              product's default images on the storefront.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              {activeTab === 'cross-sell' && (
                <div className='space-y-5'>
                  <div>
                    <p className='text-[13px] font-medium text-[#202223]'>
                      Cross-sell Products
                    </p>
                    <p className='text-[12px] text-[#6D7175] mt-0.5'>
                      When a customer buys this product, a related product will
                      be offered with a discount (e.g. 10% off Socks with
                      Shoes).
                    </p>
                  </div>
                  <div className='relative'>
                    <input
                      type='text'
                      value={crossSellSearch}
                      onChange={(e) => {
                        setCrossSellSearch(e.target.value)
                        searchCrossSellProducts(e.target.value)
                      }}
                      placeholder='Search for a product (e.g. Socks, Grip, Shuttle)...'
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
                    {crossSellLoading && (
                      <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                        <svg
                          className='animate-spin w-4 h-4 text-[#8C9196]'
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
                    {crossSellResults.length > 0 && (
                      <div className='absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#E1E3E5] rounded-lg shadow-lg overflow-hidden'>
                        {crossSellResults.map((p) => (
                          <button
                            key={p.id}
                            type='button'
                            onClick={() => addCrossSell(p)}
                            disabled={crossSells.some(
                              (c) => c.productId === p.id,
                            )}
                            className='w-full text-left px-4 py-2.5 text-[13px] text-[#202223] hover:bg-[#F6F6F7] border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                          >
                            {p.title}
                            {crossSells.some((c) => c.productId === p.id) && (
                              <span className='ml-2 text-[11px] text-[#8C9196]'>
                                (already added)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {crossSells.length === 0 ? (
                    <div className='py-8 text-center border border-dashed border-[#E1E3E5] rounded-lg'>
                      <p className='text-[12.5px] text-[#8C9196]'>
                        No cross-sell products added yet.
                      </p>
                      <p className='text-[12px] text-[#8C9196] mt-1'>
                        Search above and add a product.
                      </p>
                    </div>
                  ) : (
                    <div className='border border-[#E1E3E5] rounded-lg overflow-hidden'>
                      <div className='grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 bg-[#FAFAFA] border-b border-[#E1E3E5]'>
                        <span className='text-[11px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                          Product
                        </span>
                        <span className='text-[11px] font-semibold text-[#6D7175] uppercase tracking-wider'>
                          Discount %
                        </span>
                        <span className='w-8' />
                      </div>
                      <div className='divide-y divide-[#F1F1F1]'>
                        {crossSells.map((cs) => (
                          <div
                            key={cs.id}
                            className='grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3'
                          >
                            <div>
                              <p className='text-[13px] font-medium text-[#202223] truncate'>
                                {cs.productTitle}
                              </p>
                              <p className='text-[11px] text-[#8C9196] mt-0.5'>
                                ID: {cs.productId.slice(0, 16)}…
                              </p>
                            </div>
                            <div className='relative w-24'>
                              <input
                                type='number'
                                min='1'
                                max='99'
                                value={cs.discountPct}
                                onChange={(e) =>
                                  setCrossSells((prev) =>
                                    prev.map((c) =>
                                      c.id === cs.id
                                        ? {
                                            ...c,
                                            discountPct: Number(e.target.value),
                                          }
                                        : c,
                                    ),
                                  )
                                }
                                className='w-full pl-2.5 pr-6 py-1.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                              />
                              <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8C9196]'>
                                %
                              </span>
                            </div>
                            <button
                              type='button'
                              onClick={() =>
                                setCrossSells((prev) =>
                                  prev.filter((c) => c.id !== cs.id),
                                )
                              }
                              className='w-8 h-8 flex items-center justify-center text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#FFF4F4] rounded-lg bg-transparent border-none cursor-pointer text-base'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {crossSells.length > 0 && (
                    <div className='p-3 bg-[#F2F7F5] border border-[#008060]/20 rounded-lg'>
                      <p className='text-[12px] text-[#6D7175]'>
                        <strong className='text-[#008060]'>ℹ️</strong> When a
                        customer adds this product to their cart, these
                        cross-sell products will be suggested on the product or
                        cart page — with the discount defined above.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {}
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
                        smashuk.co.uk/shop/
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
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                    />
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
                      rows={3}
                      className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {}
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

            {images.length > 0 && (
              <div className='grid grid-cols-4 gap-3 mt-4'>
                {images.map((img, idx) => (
                  <div
                    key={img.preview}
                    className='relative aspect-square rounded-lg overflow-hidden border border-[#E1E3E5] group'
                  >
                    {}
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
                        <p className='text-white text-[10px] text-center'>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {}
        <div className='space-y-4'>
          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Product Status
            </h3>
            <div className='space-y-2'>
              {(['published', 'draft'] as const).map((s) => (
                <label
                  key={s}
                  className='relative flex items-center gap-3 p-3 border border-[#E1E3E5] rounded-lg cursor-pointer hover:bg-[#F6F6F7] transition-colors'
                >
                  <input
                    type='radio'
                    name='status'
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className='accent-[#008060] w-4 h-4'
                  />
                  <div>
                    <p className='text-[13px] font-medium text-[#202223] capitalize'>
                      {s}
                    </p>
                    <p className='text-[11.5px] text-[#6D7175]'>
                      {s === 'published'
                        ? 'Visible on storefront'
                        : 'Hidden from storefront'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
            <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
              Summary
            </h3>
            <div className='space-y-3'>
              {[
                {
                  label: 'Name',
                  value: form.name || '—',
                },
                {
                  label: 'Brand',
                  value: form.brand || '—',
                },
                {
                  label: 'Sport',
                  value: form.sport || '—',
                },
                {
                  label: 'Category',
                  value: form.categoryName || '—',
                },
                {
                  label: 'Price',
                  value: form.price ? `£${form.price}` : '—',
                },
                {
                  label: 'Stock',
                  value: form.stock || '—',
                },
                {
                  label: 'SKU',
                  value: form.sku || '—',
                },
                {
                  label: 'Images',
                  value:
                    images.filter((i) => i.url).length > 0
                      ? `${images.filter((i) => i.url).length} images`
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

          {}
          <div className='space-y-2'>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none'
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className='w-full py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors disabled:opacity-50 cursor-pointer'
            >
              Save as Draft
            </button>
            <Link
              href='/dashboard/products'
              className='block text-center py-2.5 text-[13px] text-[#6D7175] hover:text-[#202223] no-underline transition-colors'
            >
              ← Back to Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
