'use client'

// app/dashboard/seo/page.tsx
//
// Changes from original:
// 1. Static pages → loaded/saved via /api/admin/seo
// 2. Product/Category pages → saved in Medusa metadata
//    (updateProduct / productCategory update via existing API routes)
// 3. The page list calls the right API based on type

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

// ─── SVG Icons ───────────────────────────────────────────────────
const Icons = {
  search: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='11' cy='11' r='8' />
      <line x1='21' y1='21' x2='16.65' y2='16.65' />
    </svg>
  ),
  globe: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <line x1='2' y1='12' x2='22' y2='12' />
      <path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' />
    </svg>
  ),
  link: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71' />
      <path d='M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' />
    </svg>
  ),
  code: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='16 18 22 12 16 6' />
      <polyline points='8 6 2 12 8 18' />
    </svg>
  ),
  check: (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  ),
  warning: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  ),
  info: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='8' x2='12' y2='12' />
      <line x1='12' y1='16' x2='12.01' y2='16' />
    </svg>
  ),
  edit: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>
  ),
  refresh: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='23 4 23 10 17 10' />
      <path d='M20.49 15a9 9 0 11-2.12-9.36L23 10' />
    </svg>
  ),
  save: (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' />
      <polyline points='17 21 17 13 7 13 7 21' />
      <polyline points='7 3 7 8 15 8' />
    </svg>
  ),
  external: (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6' />
      <polyline points='15 3 21 3 21 9' />
      <line x1='10' y1='14' x2='21' y2='3' />
    </svg>
  ),
  image: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
      <circle cx='8.5' cy='8.5' r='1.5' />
      <polyline points='21 15 16 10 5 21' />
    </svg>
  ),
  twitter: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' />
    </svg>
  ),
  sitemap: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='3' y='3' width='6' height='6' />
      <rect x='15' y='3' width='6' height='6' />
      <rect x='9' y='15' width='6' height='6' />
      <path d='M6 9v3h12V9M12 12v3' />
    </svg>
  ),
  robot: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='3' y='11' width='18' height='10' rx='2' />
      <circle cx='12' cy='5' r='2' />
      <path d='M12 7v4' />
      <line x1='8' y1='16' x2='8' y2='16' />
      <line x1='16' y1='16' x2='16' y2='16' />
    </svg>
  ),
  spinner: (
    <svg className='animate-spin w-4 h-4' viewBox='0 0 24 24' fill='none'>
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
  ),
}

// ─── Types ────────────────────────────────────────────────────────
interface SEOPage {
  id: string
  title: string
  path: string
  // 'static' → saved via /api/admin/seo
  // 'product' → Medusa product metadata mein
  // 'category' → Medusa category metadata mein
  type: 'home' | 'shop' | 'product' | 'category' | 'other'
  storageType: 'static' | 'product' | 'category'
  medusaId?: string // product ya category ka Medusa ID
  pageKey?: string // static pages ke liye JSON key (e.g. 'home', 'shop')
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  ogImage: string
  canonical: string
  noIndex: boolean
  score: number
}

const SITE_URL = 'https://smashuk.co.uk'

// ─── Score calculator ─────────────────────────────────────────────
function calcScore(page: Partial<SEOPage>): number {
  let score = 0
  if (page.metaTitle) score += 25
  if (page.metaDescription) score += 25
  if (page.metaKeywords) score += 15
  if (page.ogImage) score += 15
  if (page.canonical) score += 10
  if (
    page.metaTitle &&
    page.metaTitle.length <= 60 &&
    page.metaTitle.length >= 30
  )
    score += 5
  if (
    page.metaDescription &&
    page.metaDescription.length <= 160 &&
    page.metaDescription.length >= 80
  )
    score += 5
  return score
}

// ─── Static page seed (shown while loading) ───────────────────────
const STATIC_SEED: SEOPage[] = [
  {
    id: 'static-home', title: 'Home Page', path: '/', type: 'home',
    storageType: 'static', pageKey: 'home',
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogImage: '', canonical: '', noIndex: false, score: 0,
  },
  {
    id: 'static-shop', title: 'Shop Page', path: '/shop', type: 'shop',
    storageType: 'static', pageKey: 'shop',
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogImage: '', canonical: '', noIndex: false, score: 0,
  },
  {
    id: 'static-about', title: 'About Page', path: '/about', type: 'home',
    storageType: 'static', pageKey: 'about',
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogImage: '', canonical: '', noIndex: false, score: 0,
  },
  {
    id: 'static-contact', title: 'Contact Page', path: '/contact', type: 'home',
    storageType: 'static', pageKey: 'contact',
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogImage: '', canonical: '', noIndex: false, score: 0,
  },
  {
    id: 'static-local-store', title: 'Local Store Page', path: '/local-store', type: 'home',
    storageType: 'static', pageKey: 'local-store',
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogImage: '', canonical: '', noIndex: false, score: 0,
  },
]

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-[#008060]/10 text-[#008060]'
      : score >= 50
        ? 'bg-[#FFC453]/20 text-[#916A00]'
        : 'bg-[#D82C0D]/10 text-[#D82C0D]'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${color}`}
    >
      {score}/100
    </span>
  )
}

function CharBar({
  value,
  max,
  warn,
  danger,
}: {
  value: number
  max: number
  warn: number
  danger: number
}) {
  const pct = Math.min((value / max) * 100, 100)
  const color =
    value > danger
      ? 'bg-[#D82C0D]'
      : value > warn
        ? 'bg-[#008060]'
        : 'bg-[#FFC453]'
  return (
    <div className='mt-1.5 h-1 bg-[#E1E3E5] rounded-full overflow-hidden'>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function DashboardSEOPage() {
  const [pages, setPages] = useState<SEOPage[]>(STATIC_SEED)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pages')
  const [editingPage, setEditingPage] = useState<SEOPage | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const [globalSettings, setGlobalSettings] = useState({
    siteName: 'SmashUK',
    siteDescription: 'Premium sports equipment for every athlete',
    defaultOgImage: '',
    googleVerification: '',
    bingVerification: '',
    robotsTxt: `User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /pos/\nDisallow: /api/\n\nSitemap: https://smashuk.co.uk/sitemap.xml`,
    twitterHandle: '@smashuk',
    facebookAppId: '',
  })

  // ── Load data on mount ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch SEO for static pages
        const [seoRes, productsRes, categoriesRes] = await Promise.all([
          fetch('/api/admin/seo').then((r) => r.json()),
          fetch('/api/admin/products?limit=50').then((r) => r.json()),
          fetch('/api/admin/categories?limit=100').then((r) => r.json()),
        ])

        // Global settings were saved before, apply them over the defaults
        if (seoRes._global) {
          setGlobalSettings((s) => ({ ...s, ...seoRes._global }))
        }

        const allPages: SEOPage[] = []

        // Static pages
        for (const seed of STATIC_SEED) {
          const saved = seoRes[seed.pageKey!] ?? {}
          allPages.push({
            ...seed,
            ...saved,
            score: calcScore({ ...seed, ...saved }),
          })
        }

        // Product pages
        const products = productsRes.products ?? []
        for (const p of products) {
          const seo = p.metadata ?? {}
          const page: SEOPage = {
            id: `product-${p.id}`,
            title: p.title,
            path: `/shop/product/${p.id}`,
            type: 'product',
            storageType: 'product',
            medusaId: p.id,
            metaTitle: seo.metaTitle ?? '',
            metaDescription: seo.metaDescription ?? '',
            metaKeywords: seo.metaKeywords ?? '',
            ogImage: seo.ogImage ?? p.thumbnail ?? '',
            canonical: seo.canonical ?? '',
            noIndex: seo.noIndex ?? false,
            score: 0,
          }
          page.score = calcScore(page)
          allPages.push(page)
        }

        // Category pages
        const categories =
          categoriesRes.product_categories ?? categoriesRes.categories ?? []
        for (const c of categories) {
          const seo = c.metadata ?? {}
          const page: SEOPage = {
            id: `category-${c.id}`,
            title: c.name,
            path: `/shop/${c.handle ?? c.name.toLowerCase()}`,
            type: 'category',
            storageType: 'category',
            medusaId: c.id,
            metaTitle: seo.metaTitle ?? '',
            metaDescription: seo.metaDescription ?? '',
            metaKeywords: seo.metaKeywords ?? '',
            ogImage: seo.ogImage ?? '',
            canonical: seo.canonical ?? '',
            noIndex: seo.noIndex ?? false,
            score: 0,
          }
          page.score = calcScore(page)
          allPages.push(page)
        }

        setPages(allPages)
      } catch (err) {
        console.error('[SEO] load error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()),
  )

  const avgScore = pages.length
    ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length)
    : 0
  const goodPages = pages.filter((p) => p.score >= 80).length
  const badPages = pages.filter((p) => p.score < 50).length

  // ── Save page SEO ───────────────────────────────────────────────
  const handleSavePage = async () => {
    if (!editingPage) return
    setSaving(true)

    try {
      const seoPayload = {
        metaTitle: editingPage.metaTitle,
        metaDescription: editingPage.metaDescription,
        metaKeywords: editingPage.metaKeywords,
        ogImage: editingPage.ogImage,
        canonical: editingPage.canonical,
        noIndex: editingPage.noIndex,
      }

      if (editingPage.storageType === 'static') {
        // Static page → /api/admin/seo
        const res = await fetch('/api/admin/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: editingPage.pageKey, ...seoPayload }),
        })
        if (!res.ok) throw new Error(await res.text())
      } else if (editingPage.storageType === 'product') {
        // Product → Medusa metadata mein
        const res = await fetch(`/api/admin/products/${editingPage.medusaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: seoPayload }),
        })
        if (!res.ok) throw new Error(await res.text())
      } else if (editingPage.storageType === 'category') {
        // Category → Medusa category metadata mein
        const res = await fetch(
          `/api/admin/categories/${editingPage.medusaId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: seoPayload }),
          },
        )
        if (!res.ok) throw new Error(await res.text())
      }

      const newScore = calcScore(editingPage)
      setPages((prev) =>
        prev.map((p) =>
          p.id === editingPage.id ? { ...editingPage, score: newScore } : p,
        ),
      )
      setEditingPage(null)
      toast.success('SEO settings saved!')
    } catch (err: any) {
      console.error('[SEO] save error:', err)
      toast.error(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateEditing = (key: keyof SEOPage, value: string | boolean) => {
    setEditingPage((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  const [savingGlobal, setSavingGlobal] = useState(false)
  const handleSaveGlobal = async () => {
    setSavingGlobal(true)
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: '_global', ...globalSettings }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Global SEO settings saved!')
    } catch (err: any) {
      console.error('[SEO] global save error:', err)
      toast.error(`Save failed: ${err.message}`)
    } finally {
      setSavingGlobal(false)
    }
  }

  const TABS = [
    { id: 'pages', label: 'Pages', icon: Icons.globe },
    { id: 'global', label: 'Global Settings', icon: Icons.sitemap },
    { id: 'social', label: 'Social / OG', icon: Icons.twitter },
    { id: 'robots', label: 'Robots & Sitemap', icon: Icons.robot },
    { id: 'schema', label: 'Schema / JSON-LD', icon: Icons.code },
  ]

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            SEO Manager
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Optimize your store for search engines
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {[
          {
            label: 'Avg SEO Score',
            value: loading ? '...' : `${avgScore}/100`,
            icon: Icons.search,
            color: 'text-[#008060]',
            bg: 'bg-[#008060]/10',
          },
          {
            label: 'Good Pages',
            value: loading ? '...' : goodPages,
            icon: Icons.check,
            color: 'text-[#008060]',
            bg: 'bg-[#008060]/10',
          },
          {
            label: 'Needs Work',
            value: loading ? '...' : badPages,
            icon: Icons.warning,
            color: 'text-[#D82C0D]',
            bg: 'bg-[#D82C0D]/10',
          },
          {
            label: 'Total Pages',
            value: loading ? '...' : pages.length,
            icon: Icons.globe,
            color: 'text-[#2C6ECB]',
            bg: 'bg-[#2C6ECB]/10',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className='bg-white border border-[#E1E3E5] rounded-xl p-5 flex items-center gap-4'
          >
            <div
              className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shrink-0`}
            >
              {stat.icon}
            </div>
            <div>
              <p className={`font-sora text-[22px] font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className='text-[12px] text-[#6D7175]'>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        {/* Tabs */}
        <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4'>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-b-[#008060] text-[#008060]'
                  : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'
              }`}
            >
              <span
                className={
                  activeTab === tab.id ? 'text-[#008060]' : 'text-[#6D7175]'
                }
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Pages Tab ── */}
        {activeTab === 'pages' && (
          <div>
            <div className='px-4 py-3 border-b border-[#E1E3E5]'>
              <div className='flex items-center gap-2 max-w-100 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
                <span className='text-[#8C9196]'>{Icons.search}</span>
                <input
                  type='text'
                  placeholder='Search pages...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none'
                />
              </div>
            </div>

            {loading ? (
              <div className='flex items-center justify-center py-16 text-[#6D7175] gap-2'>
                {Icons.spinner} Loading pages...
              </div>
            ) : (
              <div className='divide-y divide-[#F1F1F1]'>
                {filtered.map((page) => (
                  <div
                    key={page.id}
                    className='flex items-center gap-4 px-5 py-4 hover:bg-[#F6F6F7] transition-colors'
                  >
                    {/* Score ring */}
                    <div className='relative w-12 h-12 shrink-0'>
                      <svg
                        width='48'
                        height='48'
                        viewBox='0 0 48 48'
                        className='-rotate-90'
                      >
                        <circle
                          cx='24'
                          cy='24'
                          r='20'
                          fill='none'
                          stroke='#E1E3E5'
                          strokeWidth='4'
                        />
                        <circle
                          cx='24'
                          cy='24'
                          r='20'
                          fill='none'
                          stroke={
                            page.score >= 80
                              ? '#008060'
                              : page.score >= 50
                                ? '#FFC453'
                                : '#D82C0D'
                          }
                          strokeWidth='4'
                          strokeDasharray={`${(page.score / 100) * 125.6} 125.6`}
                          strokeLinecap='round'
                        />
                      </svg>
                      <span className='absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#202223]'>
                        {page.score}
                      </span>
                    </div>

                    {/* Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-0.5'>
                        <p className='text-[13px] font-semibold text-[#202223]'>
                          {page.title}
                        </p>
                        <span className='text-[10.5px] px-1.5 py-0.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded text-[#6D7175] capitalize'>
                          {page.type}
                        </span>
                      </div>
                      <p className='text-[11.5px] text-[#2C6ECB] mb-1'>
                        {SITE_URL}
                        {page.path}
                      </p>
                      {page.metaDescription ? (
                        <p className='text-[12px] text-[#6D7175] truncate max-w-125'>
                          {page.metaDescription}
                        </p>
                      ) : (
                        <p className='text-[12px] text-[#D82C0D] flex items-center gap-1'>
                          <span>{Icons.warning}</span> Missing meta description
                        </p>
                      )}
                    </div>

                    {/* Issues */}
                    <div className='flex items-center gap-1 shrink-0'>
                      {!page.metaTitle && (
                        <span className='text-[10.5px] px-2 py-0.5 bg-[#D82C0D]/10 text-[#D82C0D] rounded-full font-medium'>
                          No title
                        </span>
                      )}
                      {!page.metaDescription && (
                        <span className='text-[10.5px] px-2 py-0.5 bg-[#FFC453]/20 text-[#916A00] rounded-full font-medium'>
                          No desc
                        </span>
                      )}
                      {!page.ogImage && (
                        <span className='text-[10.5px] px-2 py-0.5 bg-[#F6F6F7] text-[#6D7175] rounded-full font-medium border border-[#E1E3E5]'>
                          No OG
                        </span>
                      )}
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingPage({ ...page })}
                      className='flex items-center gap-1.5 px-3 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[12.5px] font-medium text-[#202223] rounded-lg transition-all cursor-pointer shrink-0'
                    >
                      {Icons.edit} Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Global Settings Tab ── */}
        {activeTab === 'global' && (
          <div className='p-6 space-y-5 max-w-170'>
            <div>
              <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                Site Name
              </label>
              <input
                type='text'
                value={globalSettings.siteName}
                onChange={(e) =>
                  setGlobalSettings((s) => ({ ...s, siteName: e.target.value }))
                }
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
              />
            </div>
            <div>
              <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                Default Meta Description
                <span className='ml-2 text-[11px] text-[#8C9196] font-normal'>
                  {globalSettings.siteDescription.length}/160
                </span>
              </label>
              <textarea
                value={globalSettings.siteDescription}
                onChange={(e) =>
                  setGlobalSettings((s) => ({
                    ...s,
                    siteDescription: e.target.value,
                  }))
                }
                rows={3}
                maxLength={160}
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
              />
              <CharBar
                value={globalSettings.siteDescription.length}
                max={160}
                warn={80}
                danger={150}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Google Verification Code
                </label>
                <input
                  type='text'
                  value={globalSettings.googleVerification}
                  onChange={(e) =>
                    setGlobalSettings((s) => ({
                      ...s,
                      googleVerification: e.target.value,
                    }))
                  }
                  placeholder='google-site-verification=...'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Bing Verification Code
                </label>
                <input
                  type='text'
                  value={globalSettings.bingVerification}
                  onChange={(e) =>
                    setGlobalSettings((s) => ({
                      ...s,
                      bingVerification: e.target.value,
                    }))
                  }
                  placeholder='msvalidate.01=...'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
            </div>
            <div>
              <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                Default OG Image URL
              </label>
              <input
                type='text'
                value={globalSettings.defaultOgImage}
                onChange={(e) =>
                  setGlobalSettings((s) => ({
                    ...s,
                    defaultOgImage: e.target.value,
                  }))
                }
                placeholder='https://smashuk.co.uk/og-image.jpg'
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
              />
            </div>
            <button
              onClick={handleSaveGlobal}
              disabled={savingGlobal}
              className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50'
            >
              {Icons.save} {savingGlobal ? 'Saving...' : 'Save Global Settings'}
            </button>
          </div>
        )}

        {/* ── Social / OG Tab ── */}
        {activeTab === 'social' && (
          <div className='p-6 space-y-6 max-w-170'>
            <div>
              <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4 flex items-center gap-2'>
                <span className='text-[#6D7175]'>{Icons.twitter}</span> Twitter
                / X Settings
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Twitter Handle
                  </label>
                  <input
                    type='text'
                    value={globalSettings.twitterHandle}
                    onChange={(e) =>
                      setGlobalSettings((s) => ({
                        ...s,
                        twitterHandle: e.target.value,
                      }))
                    }
                    placeholder='@smashuk'
                    className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                  />
                </div>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-2'>
                    Twitter Card Type
                  </label>
                  <div className='flex gap-3'>
                    {['summary', 'summary_large_image'].map((type) => (
                      <label
                        key={type}
                        className='flex items-center gap-2 cursor-pointer'
                      >
                        <input
                          type='radio'
                          name='twitterCard'
                          defaultChecked={type === 'summary_large_image'}
                          className='accent-[#008060] w-4 h-4'
                        />
                        <span className='text-[13px] text-[#202223] capitalize'>
                          {type.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className='pt-4 border-t border-[#E1E3E5]'>
              <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
                Facebook / Open Graph
              </h3>
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Facebook App ID
                </label>
                <input
                  type='text'
                  value={globalSettings.facebookAppId}
                  onChange={(e) =>
                    setGlobalSettings((s) => ({
                      ...s,
                      facebookAppId: e.target.value,
                    }))
                  }
                  placeholder='123456789'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>
            </div>

            <div className='pt-4 border-t border-[#E1E3E5]'>
              <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-3'>
                OG Preview
              </h3>
              <div className='border border-[#E1E3E5] rounded-xl overflow-hidden max-w-100'>
                <div className='aspect-video bg-gradient-to-br from-[#0a1628] to-[#162847] flex items-center justify-center'>
                  <div className='text-white/20 text-center'>
                    <div className='flex justify-center mb-2 text-white/30'>
                      {Icons.image}
                    </div>
                    <p className='text-[12px]'>OG Image Preview</p>
                  </div>
                </div>
                <div className='p-3 bg-[#F6F6F7]'>
                  <p className='text-[10.5px] text-[#8C9196] uppercase tracking-wide'>
                    smashpro.co.uk
                  </p>
                  <p className='text-[13px] font-semibold text-[#202223] mt-0.5'>
                    Smash Pro — Premium Racket Sports Equipment UK
                  </p>
                  <p className='text-[12px] text-[#6D7175] mt-0.5 line-clamp-2'>
                    Shop premium badminton, tennis, padel and squash
                    equipment with fast UK-wide delivery.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveGlobal}
              disabled={savingGlobal}
              className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50'
            >
              {Icons.save} {savingGlobal ? 'Saving...' : 'Save Social Settings'}
            </button>
          </div>
        )}

        {/* ── Robots & Sitemap Tab ── */}
        {activeTab === 'robots' && (
          <div className='p-6 space-y-6 max-w-170'>
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-[12.5px] font-medium text-[#202223] flex items-center gap-2'>
                  <span className='text-[#6D7175]'>{Icons.robot}</span>{' '}
                  robots.txt
                </label>
                <button
                  onClick={() =>
                    setGlobalSettings((s) => ({
                      ...s,
                      robotsTxt: `User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /pos/\nDisallow: /api/\n\nSitemap: https://smashuk.co.uk/sitemap.xml`,
                    }))
                  }
                  className='flex items-center gap-1 text-[12px] text-[#008060] hover:text-[#006e52] bg-transparent border-none cursor-pointer transition-colors'
                >
                  {Icons.refresh} Reset to default
                </button>
              </div>
              <textarea
                value={globalSettings.robotsTxt}
                onChange={(e) =>
                  setGlobalSettings((s) => ({
                    ...s,
                    robotsTxt: e.target.value,
                  }))
                }
                rows={10}
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#202223] font-mono outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
              />
            </div>

            <div className='p-4 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-sora text-[14px] font-semibold text-[#202223] flex items-center gap-2'>
                  <span className='text-[#6D7175]'>{Icons.sitemap}</span> XML
                  Sitemap
                </h3>
                <a
                  href={`${SITE_URL}/sitemap.xml`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1.5 text-[12.5px] text-[#008060] hover:text-[#006e52] bg-transparent border-none cursor-pointer transition-colors font-medium'
                >
                  {Icons.external} View sitemap
                </a>
              </div>
              <p className='text-[12.5px] text-[#6D7175]'>
                Your sitemap is auto-generated at{' '}
                <code className='text-[#202223] bg-white px-1.5 py-0.5 rounded border border-[#E1E3E5] text-[11.5px]'>
                  {SITE_URL}/sitemap.xml
                </code>
              </p>
              <div className='mt-3 space-y-1.5'>
                {[
                  { path: '/', priority: '1.0', freq: 'Daily' },
                  { path: '/shop', priority: '0.9', freq: 'Daily' },
                  { path: '/shop/[sport]', priority: '0.8', freq: 'Weekly' },
                  {
                    path: '/shop/product/[id]',
                    priority: '0.7',
                    freq: 'Weekly',
                  },
                ].map((item) => (
                  <div
                    key={item.path}
                    className='flex items-center justify-between text-[12px]'
                  >
                    <code className='text-[#2C6ECB]'>{item.path}</code>
                    <div className='flex items-center gap-4 text-[#6D7175]'>
                      <span>Priority: {item.priority}</span>
                      <span>{item.freq}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveGlobal}
              disabled={savingGlobal}
              className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50'
            >
              {Icons.save} {savingGlobal ? 'Saving...' : 'Save Robots.txt'}
            </button>
          </div>
        )}

        {/* ── Schema Tab ── */}
        {activeTab === 'schema' && (
          <div className='p-6 space-y-5'>
            <p className='text-[13px] text-[#6D7175]'>
              JSON-LD schemas are auto-generated from your product and store
              data.
            </p>
            {[
              {
                title: 'Organization Schema',
                desc: 'Applied to all pages — identifies your business to Google',
                code: `{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "SmashUK",\n  "url": "https://smashuk.co.uk",\n  "logo": "https://smashuk.co.uk/icons/logo.png"\n}`,
              },
              {
                title: 'WebSite Schema',
                desc: 'Enables Google Sitelinks Searchbox in search results',
                code: `{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "SmashUK",\n  "url": "https://smashuk.co.uk",\n  "potentialAction": {\n    "@type": "SearchAction",\n    "target": "https://smashuk.co.uk/shop?q={search_term_string}"\n  }\n}`,
              },
              {
                title: 'Product Schema',
                desc: 'Auto-generated for each product page — enables rich results',
                code: `{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "Product Name",\n  "offers": { "@type": "Offer", "price": "4999", "priceCurrency": "GBP" }\n}`,
              },
            ].map((schema) => (
              <div
                key={schema.title}
                className='border border-[#E1E3E5] rounded-xl overflow-hidden'
              >
                <div className='flex items-center justify-between px-4 py-3 bg-[#F6F6F7]'>
                  <div className='flex items-center gap-3'>
                    <span className='text-[#008060]'>{Icons.code}</span>
                    <div>
                      <p className='text-[13px] font-semibold text-[#202223]'>
                        {schema.title}
                      </p>
                      <p className='text-[11.5px] text-[#6D7175]'>
                        {schema.desc}
                      </p>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#008060]/10 text-[#008060]'>
                    <span>{Icons.check}</span> Active
                  </span>
                </div>
                <pre className='px-4 py-3 text-[11.5px] text-[#6D7175] font-mono overflow-x-auto bg-white'>
                  {schema.code}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Page Modal ── */}
      {editingPage && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            onClick={() => setEditingPage(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-170 max-h-[90vh] flex flex-col overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5] shrink-0'>
              <div>
                <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                  Edit SEO — {editingPage.title}
                </h2>
                <p className='text-[11.5px] text-[#2C6ECB] mt-0.5'>
                  {SITE_URL}
                  {editingPage.path}
                </p>
              </div>
              <button
                onClick={() => setEditingPage(null)}
                className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>

            <div className='px-6 py-5 space-y-5 overflow-y-auto flex-1'>
              {/* Search preview */}
              <div className='p-4 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl'>
                <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide mb-3'>
                  Google Search Preview
                </p>
                <p className='text-[#2C6ECB] text-[16px] truncate'>
                  {editingPage.metaTitle || 'Page Title'}
                </p>
                <p className='text-[#008060] text-[12px] my-0.5'>
                  {SITE_URL}
                  {editingPage.path}
                </p>
                <p className='text-[#6D7175] text-[13px] leading-relaxed line-clamp-2'>
                  {editingPage.metaDescription ||
                    'Meta description will appear here...'}
                </p>
              </div>

              {/* Meta Title */}
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Meta Title{' '}
                  <span className='ml-2 text-[11px] text-[#8C9196] font-normal'>
                    {editingPage.metaTitle.length}/60
                  </span>
                </label>
                <input
                  type='text'
                  value={editingPage.metaTitle}
                  onChange={(e) => updateEditing('metaTitle', e.target.value)}
                  maxLength={60}
                  placeholder='Page title for search engines'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
                <CharBar
                  value={editingPage.metaTitle.length}
                  max={60}
                  warn={30}
                  danger={55}
                />
                <p className='text-[11px] text-[#8C9196] mt-1 flex items-center gap-1'>
                  {Icons.info} Recommended: 30–60 characters
                </p>
              </div>

              {/* Meta Description */}
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Meta Description{' '}
                  <span className='ml-2 text-[11px] text-[#8C9196] font-normal'>
                    {editingPage.metaDescription.length}/160
                  </span>
                </label>
                <textarea
                  value={editingPage.metaDescription}
                  onChange={(e) =>
                    updateEditing('metaDescription', e.target.value)
                  }
                  maxLength={160}
                  rows={3}
                  placeholder='Brief description for search results...'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all resize-none'
                />
                <CharBar
                  value={editingPage.metaDescription.length}
                  max={160}
                  warn={80}
                  danger={150}
                />
                <p className='text-[11px] text-[#8C9196] mt-1 flex items-center gap-1'>
                  {Icons.info} Recommended: 80–160 characters
                </p>
              </div>

              {/* Keywords */}
              <div>
                <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                  Meta Keywords{' '}
                  <span className='ml-1 text-[11px] text-[#8C9196] font-normal'>
                    (comma separated)
                  </span>
                </label>
                <input
                  type='text'
                  value={editingPage.metaKeywords}
                  onChange={(e) =>
                    updateEditing('metaKeywords', e.target.value)
                  }
                  placeholder='badminton racket, tennis racket, uk'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
                {editingPage.metaKeywords && (
                  <div className='flex flex-wrap gap-1.5 mt-2'>
                    {editingPage.metaKeywords
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean)
                      .map((k) => (
                        <span
                          key={k}
                          className='px-2.5 py-0.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-full text-[11.5px] text-[#6D7175]'
                        >
                          {k}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* OG Image */}
              <div>
                <label className='text-[12.5px] font-medium text-[#202223] mb-1.5 flex items-center gap-1.5'>
                  <span className='text-[#6D7175]'>{Icons.image}</span> OG Image
                  URL
                </label>
                <input
                  type='text'
                  value={editingPage.ogImage}
                  onChange={(e) => updateEditing('ogImage', e.target.value)}
                  placeholder='https://smashuk.co.uk/og-image.jpg (1200×630)'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>

              {/* Canonical */}
              <div>
                <label className='text-[12.5px] font-medium text-[#202223] mb-1.5 flex items-center gap-1.5'>
                  <span className='text-[#6D7175]'>{Icons.link}</span> Canonical
                  URL
                </label>
                <input
                  type='text'
                  value={editingPage.canonical}
                  onChange={(e) => updateEditing('canonical', e.target.value)}
                  placeholder={`${SITE_URL}${editingPage.path}`}
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
              </div>

              {/* No index */}
              <div className='flex items-center justify-between p-3 border border-[#E1E3E5] rounded-lg'>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    No Index
                  </p>
                  <p className='text-[11.5px] text-[#6D7175]'>
                    Prevent search engines from indexing this page
                  </p>
                </div>
                <button
                  onClick={() => updateEditing('noIndex', !editingPage.noIndex)}
                  className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer ${editingPage.noIndex ? 'bg-[#D82C0D]' : 'bg-[#8C9196]'}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editingPage.noIndex ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>

            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E1E3E5] bg-[#F6F6F7]/50 shrink-0'>
              <button
                onClick={() => setEditingPage(null)}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg cursor-pointer transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleSavePage}
                disabled={saving}
                className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-none flex items-center gap-2'
              >
                {saving ? Icons.spinner : Icons.save}
                {saving ? 'Saving...' : 'Save SEO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
