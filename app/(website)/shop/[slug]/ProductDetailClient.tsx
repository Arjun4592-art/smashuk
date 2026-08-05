'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/api/store'
import ProductGrid from '@/components/website/ProductGrid'
import ProductImageZoom from '@/components/website/ProductImageZoom'
import {
  StarIcon,
  HeartIcon,
  CartIcon,
  TruckIcon,
  ShieldIcon,
  RefreshIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
} from '@/components/ui/Icons'
import toast from 'react-hot-toast'
import ProductReviews from '@/components/website/ProductReviews'
import SizeGuideModal from '@/components/website/SizeGuideModal'
import NotifyStockForm from '@/components/website/NotifyStockForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StringOption {
  id: string
  name: string
  brand: string
  tensionRange: string
  price: number
  bestFor: string
  color: string
}

interface StringUpgradeSelection {
  string: StringOption
  tension: number
  grip: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STRING_OPTIONS: StringOption[] = [
  {
    id: 'babolat-spiraltek',
    name: 'Spiraltek',
    brand: 'Babolat',
    tensionRange: '50–55 lbs',
    price: 299,
    bestFor: 'Power & Durability',
    color: '#E8553A',
  },
  {
    id: 'babolat-vs-touch',
    name: 'VS Touch',
    brand: 'Babolat',
    tensionRange: '48–58 lbs',
    price: 599,
    bestFor: 'Feel & Control',
    color: '#0A1F44',
  },
  {
    id: 'head-velocity',
    name: 'Velocity MLT',
    brand: 'HEAD',
    tensionRange: '45–60 lbs',
    price: 449,
    bestFor: 'Comfort & Power',
    color: '#6366f1',
  },
  {
    id: 'wilson-nxt',
    name: 'NXT Power',
    brand: 'Wilson',
    tensionRange: '50–60 lbs',
    price: 399,
    bestFor: 'Spin & Touch',
    color: '#16a34a',
  },
]

const GRIP_SIZES = [
  { id: 'G0', label: 'G0', inches: '4"', desc: 'XS' },
  { id: 'G1', label: 'G1', inches: '4⅛"', desc: 'S' },
  { id: 'G2', label: 'G2', inches: '4¼"', desc: 'M' },
  { id: 'G3', label: 'G3', inches: '4⅜"', desc: 'L' },
  { id: 'G4', label: 'G4', inches: '4½"', desc: 'XL' },
  { id: 'G5', label: 'G5', inches: '4⅝"', desc: 'XXL' },
]

const MIN_TENSION = 44
const MAX_TENSION = 62

// ─── StringUpgrade Component ──────────────────────────────────────────────────

function StringUpgrade({
  onChange,
}: {
  onChange?: (sel: StringUpgradeSelection | null) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [selectedString, setSelectedString] = useState<StringOption>(
    STRING_OPTIONS[0],
  )
  const [tension, setTension] = useState(52)
  const [selectedGrip, setSelectedGrip] = useState<string>('G1')
  const [showGripGuide, setShowGripGuide] = useState(false)

  const fillPct = ((tension - MIN_TENSION) / (MAX_TENSION - MIN_TENSION)) * 100
  const tensionLabel =
    tension <= 50 ? 'Power' : tension <= 56 ? 'Balanced' : 'Control'

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    onChange?.(
      next ? { string: selectedString, tension, grip: selectedGrip } : null,
    )
  }

  const updateString = (opt: StringOption) => {
    setSelectedString(opt)
    if (enabled) onChange?.({ string: opt, tension, grip: selectedGrip })
  }

  const updateTension = (val: number) => {
    setTension(val)
    if (enabled)
      onChange?.({ string: selectedString, tension: val, grip: selectedGrip })
  }

  const updateGrip = (g: string) => {
    setSelectedGrip(g)
    if (enabled) onChange?.({ string: selectedString, tension, grip: g })
  }

  return (
    <div className='mb-6'>
      <button
        type='button'
        onClick={toggle}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${enabled ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
      >
        <div className='flex items-center gap-3'>
          <span
            className={`transition-colors ${enabled ? 'text-[#E8553A]' : 'text-gray-400'}`}
          >
            <svg
              width='22'
              height='22'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <ellipse cx='11' cy='9' rx='6' ry='7' />
              <line x1='8' y1='6' x2='14' y2='6' />
              <line x1='8' y1='9' x2='14' y2='9' />
              <line x1='8' y1='12' x2='14' y2='12' />
              <line x1='9' y1='4' x2='9' y2='14' />
              <line x1='12' y1='4' x2='12' y2='14' />
              <line x1='11' y1='16' x2='13' y2='22' />
            </svg>
          </span>
          <div className='text-left'>
            <p
              className={`text-sm font-black font-montserrat transition-colors ${enabled ? 'text-[#E8553A]' : 'text-[#0A1F44]'}`}
            >
              String Upgrade
              <span className='ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-lato'>
                +1 Day
              </span>
            </p>
            <p className='text-xs text-gray-400 font-lato'>
              {enabled
                ? `${selectedString.brand} ${selectedString.name} · ${tension} lbs · Grip ${selectedGrip} · +£${selectedString.price}`
                : 'Get your racket professionally strung & gripped before dispatch'}
            </p>
          </div>
        </div>
        <div
          className={`w-11 h-6 rounded-full transition-all duration-300 relative shrink-0 ${enabled ? 'bg-[#E8553A]' : 'bg-gray-200'}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? 'left-5' : 'left-0.5'}`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${enabled ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className='border-2 border-t-0 border-[#E8553A]/20 rounded-b-xl px-4 pb-5 pt-4 space-y-5 bg-white'>
          {/* String selection, tension, grip — same as before, omitted for brevity */}
          <div>
            <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider mb-2.5'>
              1. Choose String
            </p>
            <div className='grid grid-cols-2 gap-2'>
              {STRING_OPTIONS.map((opt) => {
                const isActive = selectedString.id === opt.id
                return (
                  <button
                    key={opt.id}
                    type='button'
                    onClick={() => updateString(opt)}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all duration-150 ${isActive ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                  >
                    <div className='flex items-center gap-1.5 mb-1'>
                      <span
                        className='w-2 h-2 rounded-full shrink-0'
                        style={{ background: opt.color }}
                      />
                      <span className='text-[10px] font-bold text-gray-400 font-lato uppercase tracking-wide'>
                        {opt.brand}
                      </span>
                    </div>
                    <p
                      className={`text-sm font-black font-montserrat ${isActive ? 'text-[#E8553A]' : 'text-[#0A1F44]'}`}
                    >
                      {opt.name}
                    </p>
                    <p className='text-[11px] text-gray-400 font-lato'>
                      {opt.bestFor}
                    </p>
                    <div className='flex items-center justify-between mt-1'>
                      <span className='text-[10px] text-gray-400 font-lato'>
                        {opt.tensionRange}
                      </span>
                      <span
                        className={`text-xs font-bold font-montserrat ${isActive ? 'text-[#E8553A]' : 'text-gray-500'}`}
                      >
                        +£{opt.price}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider'>
                2. String Tension
              </p>
              <div className='flex items-center gap-2'>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-lato font-semibold ${tension <= 50 ? 'bg-blue-50 text-blue-500' : tension <= 56 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
                >
                  {tensionLabel}
                </span>
                <span className='text-sm font-black text-[#E8553A] font-montserrat'>
                  {tension} lbs
                </span>
              </div>
            </div>
            <div className='relative h-5 flex items-center'>
              <div className='absolute w-full h-1.5 rounded-full bg-gray-100' />
              <div
                className='absolute h-1.5 rounded-full bg-[#E8553A] transition-all'
                style={{ width: `${fillPct}%` }}
              />
              <input
                type='range'
                min={MIN_TENSION}
                max={MAX_TENSION}
                step={1}
                value={tension}
                onChange={(e) => updateTension(Number(e.target.value))}
                className='absolute w-full h-full opacity-0 cursor-pointer'
              />
              <div
                className='absolute w-4 h-4 rounded-full bg-[#E8553A] border-2 border-white shadow-md pointer-events-none transition-all'
                style={{ left: `calc(${fillPct}% - 8px)` }}
              />
            </div>
            <div className='flex justify-between mt-1.5 mb-2'>
              <span className='text-[10px] text-gray-400 font-lato'>
                {MIN_TENSION} lbs · More Power
              </span>
              <span className='text-[10px] text-gray-400 font-lato'>
                More Control · {MAX_TENSION} lbs
              </span>
            </div>
          </div>

          <div>
            <div className='flex items-center justify-between mb-2.5'>
              <p className='text-xs font-bold text-gray-400 font-montserrat uppercase tracking-wider'>
                3. Grip Size
              </p>
              <button
                type='button'
                onClick={() => setShowGripGuide((v) => !v)}
                className='text-[11px] text-[#E8553A] font-lato font-semibold underline underline-offset-2'
              >
                {showGripGuide ? 'Hide guide' : 'How to choose?'}
              </button>
            </div>
            <div className='flex gap-2'>
              {GRIP_SIZES.map((g) => {
                const isActive = selectedGrip === g.id
                return (
                  <button
                    key={g.id}
                    type='button'
                    onClick={() => updateGrip(g.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all duration-150 ${isActive ? 'border-[#E8553A] bg-[#E8553A]/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                  >
                    <span
                      className={`text-sm font-black font-montserrat ${isActive ? 'text-[#E8553A]' : 'text-[#0A1F44]'}`}
                    >
                      {g.label}
                    </span>
                    <span className='text-[9px] text-gray-400 font-lato'>
                      {g.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='bg-[#0A1F44]/5 rounded-xl px-4 py-3 space-y-2'>
            <p className='text-xs font-bold text-[#0A1F44] font-montserrat mb-2'>
              Order Summary
            </p>
            <div className='flex justify-between text-xs font-lato'>
              <span className='text-gray-500'>String</span>
              <span className='font-semibold text-[#0A1F44]'>
                {selectedString.brand} {selectedString.name}
              </span>
            </div>
            <div className='flex justify-between text-xs font-lato'>
              <span className='text-gray-500'>Tension</span>
              <span className='font-semibold text-[#0A1F44]'>
                {tension} lbs ({tensionLabel})
              </span>
            </div>
            <div className='flex justify-between text-xs font-lato'>
              <span className='text-gray-500'>Grip Size</span>
              <span className='font-semibold text-[#0A1F44]'>
                {selectedGrip} ·{' '}
                {GRIP_SIZES.find((g) => g.id === selectedGrip)?.inches}
              </span>
            </div>
            <div className='border-t border-gray-200 pt-2 flex justify-between'>
              <span className='text-xs font-bold font-montserrat text-[#0A1F44]'>
                Upgrade cost
              </span>
              <span className='text-sm font-black font-montserrat text-[#E8553A]'>
                +£{selectedString.price}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  product: any
  related: any[]
}

const BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-[#0A1F44] text-white',
  SALE: 'bg-[#E8553A] text-white',
  BESTSELLER: 'bg-amber-500 text-white',
  LIMITED: 'bg-purple-600 text-white',
}

export default function ProductDetailClient({ product, related }: Props) {
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  // BUG FIX: this product page previously had no way to choose between
  // variants at all — Add to Cart always grabbed product.variants[0], no
  // matter how many sizes/colors the dashboard's product-edit page let a
  // store owner create for this product. Defaults to the first variant so
  // single-variant products (the common case for rackets) behave exactly
  // as before; multi-variant products now get an actual picker below.
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants?.[0]?.id,
  )
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1
  const selectedVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ??
    product.variants?.[0]
  const [stringUpgrade, setStringUpgrade] =
    useState<StringUpgradeSelection | null>(null)
  const [activeTab, setActiveTab] = useState<
    'description' | 'specs' | 'shipping'
  >('description')
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Shoes and apparel are the categories that actually need a size chart
  // (rackets/bags/shuttlecocks don't) — matches smashuk.co's per-category
  // size guide behaviour.
  const categoryLower = (product.category ?? '').toLowerCase()
  const isShoe = categoryLower.includes('shoe')
  const isApparel =
    categoryLower.includes('top') ||
    categoryLower.includes('bottom') ||
    categoryLower.includes('cloth') ||
    categoryLower.includes('apparel') ||
    categoryLower.includes('sock')
  const showSizeGuideLink = isShoe || isApparel

  const { addItem } = useCart()

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0
  // Same fallback as ProductCard.tsx / QuickViewModal.tsx — show SALE
  // automatically when the product is genuinely discounted, not only when
  // an explicit metadata.badge is set.
  const displayBadge = product.badge ?? (discount > 0 ? 'SALE' : null)

  const handleAddToCart = async () => {
    if (adding || added) return

    // Check variant first — use whichever variant the customer picked (see
    // selectedVariantId above), not always the first one.
    const variant = selectedVariant
    if (!variant) {
      toast.error('Product variant not found')
      return
    }
    if (hasMultipleVariants && !selectedVariantId) {
      toast.error('Please choose an option before adding to cart')
      return
    }

    setAdding(true)
    try {
      // Pass the string-upgrade selection through as line-item metadata so
      // staff can see it on the order — it doesn't change the racket's
      // price (matches smashuk.co's real behaviour: a free-choice service
      // note, not a paid add-on).
      const metadata = stringUpgrade
        ? {
            string_upgrade: 'Yes',
            string_choice: `${stringUpgrade.string.brand} ${stringUpgrade.string.name}`,
            string_tension: `${stringUpgrade.tension} lbs`,
            string_grip: stringUpgrade.grip,
          }
        : product.stringUpgradeAvailable
          ? { string_upgrade: 'No Thanks' }
          : undefined

      await addItem.mutateAsync({ variantId: variant.id, quantity, metadata })
      setAdded(true)
      toast.success('Added to cart!')
      setTimeout(() => setAdded(false), 3000)
    } catch (err) {
      toast.error('Could not add to cart. Try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className='min-h-screen bg-white'>
      {/* Breadcrumb */}
      <div className='bg-[#F2F4F7] border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
          <div className='flex items-center gap-2 text-sm font-lato text-gray-500'>
            <Link href='/' className='hover:text-[#E8553A] transition-colors'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <Link
              href='/shop'
              className='hover:text-[#E8553A] transition-colors'
            >
              Shop
            </Link>
            <ChevronRightIcon size={14} />
            <Link
              href={`/shop?sport=${product.sport}`}
              className='hover:text-[#E8553A] transition-colors capitalize'
            >
              {product.sport}
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-[#0A1F44] font-medium truncate max-w-xs'>
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
          {/* Images */}
          <div className='space-y-4'>
            <ProductImageZoom
              src={product.images[activeImage]}
              alt={product.name}
            >
              {displayBadge && (
                <span
                  className={`absolute top-4 left-4 text-xs font-black px-3 py-1.5 rounded-full font-montserrat ${BADGE_STYLES[displayBadge]}`}
                >
                  {displayBadge}
                </span>
              )}
              {discount > 0 && (
                <span className='absolute top-4 right-4 text-xs font-black px-3 py-1.5 rounded-full bg-[#E8553A] text-white font-montserrat'>
                  -{discount}%
                </span>
              )}
            </ProductImageZoom>
            {product.images.length > 1 && (
              <div className='flex gap-3'>
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#E8553A]' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className='w-full h-full object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className='flex items-center gap-3 mb-3'>
              <span className='text-sm font-bold text-[#E8553A] font-lato uppercase tracking-wider'>
                {product.brand}
              </span>
              <span className='w-1 h-1 rounded-full bg-gray-300' />
              <span className='text-sm text-gray-400 font-lato capitalize'>
                {product.sport}
              </span>
            </div>

            <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-4 leading-tight'>
              {product.name}
            </h1>

            <div className='flex items-center gap-3 mb-5'>
              <div className='flex items-center gap-1'>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    size={16}
                    filled={i < Math.floor(product.rating)}
                    className={
                      i < Math.floor(product.rating)
                        ? 'text-amber-400'
                        : 'text-gray-200'
                    }
                  />
                ))}
              </div>
              <span className='font-montserrat font-bold text-[#0A1F44]'>
                {product.rating}
              </span>
              <span className='text-gray-400 font-lato text-sm'>
                ({product.reviewCount} reviews)
              </span>
            </div>

            {/* Price — GBP */}
            <div className='flex items-center gap-4 mb-6 pb-6 border-b border-gray-100'>
              <span className='font-montserrat font-black text-4xl text-[#0A1F44]'>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className='text-xl text-gray-400 line-through font-lato'>
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className='bg-[#E8553A]/10 text-[#E8553A] font-montserrat font-black text-sm px-3 py-1 rounded-full'>
                    Save {discount}%
                  </span>
                </>
              )}
              {stringUpgrade && (
                <span className='bg-amber-100 text-amber-700 font-montserrat font-bold text-xs px-3 py-1 rounded-full'>
                  incl. stringing
                </span>
              )}
            </div>

            {/* Variant picker — size/color (only rendered when the product
                actually has more than one purchasable variant; the dashboard's
                product-edit page supports creating these, so this must exist
                for the customer to ever get the one they actually want). */}
            {hasMultipleVariants && (
              <div className='mb-6 pb-6 border-b border-gray-100'>
                <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2.5'>
                  Choose an option
                </p>
                <div className='flex flex-wrap gap-2'>
                  {product.variants!.map((v) => {
                    const label = v.title || 'Option'
                    const isSelected = v.id === selectedVariantId
                    const outOfStock =
                      typeof v.inventory_quantity === 'number' &&
                      v.inventory_quantity <= 0
                    return (
                      <button
                        key={v.id}
                        type='button'
                        disabled={outOfStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-4 py-2 rounded-lg border text-sm font-montserrat font-semibold transition-all ${
                          isSelected
                            ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]'
                            : outOfStock
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                              : 'border-gray-200 text-[#0A1F44] hover:border-[#E8553A]'
                        }`}
                      >
                        {label}
                        {outOfStock ? ' (Out of stock)' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className='mb-6'>
              <div className='flex border-b border-gray-200 mb-4'>
                {(['description', 'specs', 'shipping'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-semibold font-montserrat capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-[#E8553A] text-[#E8553A]' : 'border-transparent text-gray-400 hover:text-[#0A1F44]'}`}
                  >
                    {tab === 'specs'
                      ? 'Specifications'
                      : tab === 'shipping'
                        ? 'Shipping & Returns'
                        : 'Description'}
                  </button>
                ))}
              </div>

              {activeTab === 'description' && (
                <div>
                  <p className='font-lato text-gray-600 leading-relaxed mb-4'>
                    {product.description}
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {product.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className='px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-lato'
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div>
                  {product.specs && product.specs.length > 0 ? (
                    <div className='rounded-xl overflow-hidden border border-gray-100'>
                      {product.specs.map((spec: any, i: number) => (
                        <div
                          key={spec.label}
                          className={`flex items-center px-4 py-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                        >
                          <span className='w-1/2 text-sm font-semibold text-[#0A1F44] font-lato'>
                            {spec.label}
                          </span>
                          <span className='w-1/2 text-sm text-gray-600 font-lato'>
                            {spec.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-gray-400 font-lato'>
                      No specifications available.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className='space-y-4'>
                  {[
                    {
                      title: 'Free Delivery',
                      desc: 'Free shipping on all orders above £50. Standard delivery in 2–4 business days.',
                    },
                    {
                      title: '7-Day Returns',
                      desc: 'Not satisfied? Return within 7 days of delivery for a full refund. Items must be unused and in original packaging.',
                    },
                    {
                      title: '100% Authentic',
                      desc: 'All products sourced directly from official brand distributors. Authenticity guaranteed.',
                    },
                  ].map((item) => (
                    <div key={item.title} className='flex gap-3'>
                      <div className='w-1.5 h-1.5 rounded-full bg-[#E8553A] mt-2 shrink-0' />
                      <div>
                        <p className='text-sm font-semibold text-[#0A1F44] font-montserrat mb-0.5'>
                          {item.title}
                        </p>
                        <p className='text-sm text-gray-500 font-lato'>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock */}
            <div className='flex items-center justify-between gap-2 mb-6'>
              <div className='flex items-center gap-2'>
                {product.inStock ? (
                  <>
                    <div className='w-2 h-2 rounded-full bg-green-500' />
                    <span className='text-sm text-green-600 font-semibold font-lato'>
                      In Stock — {product.stock}{' '}
                      {product.stock === 1 ? 'unit' : 'units'} available
                      {product.stock <= 10 && product.stock > 0 && (
                        <span className='text-red-500 font-bold'>
                          {' '}
                          (Only {product.stock} left!)
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <div className='w-2 h-2 rounded-full bg-red-500' />
                    <span className='text-sm text-red-500 font-semibold font-lato'>
                      Out of Stock
                    </span>
                  </>
                )}
              </div>

              {showSizeGuideLink && (
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className='text-xs font-montserrat font-bold text-[#0A1F44] underline decoration-gray-300 hover:decoration-[#E8553A] hover:text-[#E8553A] transition-colors shrink-0'
                >
                  Size Guide
                </button>
              )}
            </div>

            {showSizeGuide && (
              <SizeGuideModal
                initialTab={isShoe ? 'shoes' : 'apparel'}
                onClose={() => setShowSizeGuide(false)}
              />
            )}

            {/* Only racket products offer this (matches smashuk.co — not
                every product has it, e.g. shoes/bags/clothing don't) */}
            {product.stringUpgradeAvailable && (
              <StringUpgrade onChange={(sel) => setStringUpgrade(sel)} />
            )}

            {/* Notify me — shown instead of the qty/cart controls when the
                product is out of stock, matches standard ecommerce UX */}
            {!product.inStock && (
              <div className='mb-6'>
                <p className='text-xs text-gray-500 font-lato mb-2'>
                  Leave your email and we&apos;ll let you know the moment this
                  is back.
                </p>
                <NotifyStockForm
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            )}

            {/* Quantity + Actions */}
            <div className='flex items-center gap-4 mb-6'>
              <div className='flex items-center border border-gray-200 rounded-xl overflow-hidden'>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className='w-11 h-11 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                >
                  <MinusIcon size={16} />
                </button>
                <span className='w-12 text-center font-montserrat font-bold text-[#0A1F44]'>
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  className='w-11 h-11 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                >
                  <PlusIcon size={16} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || adding}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-montserrat font-black text-sm transition-all duration-200 ${
                  !product.inStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : added
                      ? 'bg-green-500 text-white'
                      : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:shadow-[#E8553A]/30 hover:-translate-y-0.5'
                }`}
              >
                <CartIcon size={18} />
                {!product.inStock
                  ? 'Out of Stock'
                  : adding
                    ? 'Adding...'
                    : added
                      ? '✓ Added to Cart'
                      : 'Add to Cart'}
              </button>

              <button
                onClick={() => setWishlisted((w) => !w)}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${wishlisted ? 'border-[#E8553A] bg-[#E8553A]/10 text-[#E8553A]' : 'border-gray-200 text-gray-400 hover:border-[#E8553A]/40'}`}
              >
                <HeartIcon size={20} filled={wishlisted} />
              </button>
            </div>

            <p className='text-xs text-gray-400 font-lato mb-6'>
              SKU: <span className='font-semibold'>{product.sku}</span>
            </p>

            <div className='grid grid-cols-3 gap-3 pt-6 border-t border-gray-100'>
              {[
                { icon: <TruckIcon size={18} />, text: 'Free Delivery' },
                { icon: <ShieldIcon size={18} />, text: '100% Authentic' },
                { icon: <RefreshIcon size={18} />, text: '7-Day Returns' },
              ].map((badge) => (
                <div
                  key={badge.text}
                  className='flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center'
                >
                  <span className='text-[#E8553A]'>{badge.icon}</span>
                  <span className='text-xs font-semibold text-[#0A1F44] font-lato'>
                    {badge.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className='mt-16'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='font-montserrat font-black text-2xl text-[#0A1F44]'>
              Customer Reviews
            </h2>
            {product.reviewCount > 0 && (
              <div className='flex items-center gap-1.5'>
                <div className='flex items-center gap-0.5'>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarIcon
                      key={s}
                      size={14}
                      filled={s <= Math.round(product.rating)}
                      className={
                        s <= Math.round(product.rating)
                          ? 'text-amber-400'
                          : 'text-gray-200'
                      }
                    />
                  ))}
                </div>
                <span className='text-sm text-gray-500 font-lato'>
                  {product.rating} ({product.reviewCount})
                </span>
              </div>
            )}
          </div>
          <ProductReviews
            productId={product.id}
            initialRating={product.rating}
            initialCount={product.reviewCount}
          />
        </div>

        {related.length > 0 && (
          <div className='mt-20'>
            <ProductGrid
              products={related}
              title='You Might Also Like'
              showSort={false}
              showViewToggle={false}
              columns={4}
            />
          </div>
        )}
      </div>
    </div>
  )
}
