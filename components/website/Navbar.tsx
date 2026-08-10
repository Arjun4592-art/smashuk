'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import {
  SITE_NAME,
  FREE_SHIPPING_THRESHOLD,
  CONTACT_PHONE,
  CONTACT_EMAIL,
} from '@/lib/constants'
import {
  SearchIcon,
  CartIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
  ChevronDownIcon,
  HeartIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useMedusaProducts } from '@/hooks/useProducts'
import { MEGA_MENUS, type MegaMenuKey } from '@/lib/mega-menu-data'

const NAV_LINKS = [
  { label: 'New Arrivals', href: '/shop?badge=NEW' },
  { label: 'Sale 🔥', href: '/shop?badge=SALE', highlight: true },
  { label: 'Gift Cards', href: '/gift-cards' },
  { label: 'Blog', href: '/blog' },
]

// ── Categories bar hook ───────────────────────────────────────────────────────
function useMedusaCategories() {
  const [categories, setCategories] = useState<
    { id: string; name: string; handle: string }[]
  >([])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { medusaStore } = await import('@/lib/medusa')
        const { product_categories } = await medusaStore.store.category.list({
          limit: 20,
          fields: 'id,name,handle',
        })
        setCategories(
          (product_categories ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            handle: c.handle ?? c.id,
          })),
        )
      } catch {
        setCategories([])
      }
    }
    fetchCategories()
  }, [])

  return categories
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [activeMegaMenu, setActiveMegaMenu] = useState<MegaMenuKey | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const itemCount = useCartStore((s) => s.itemCount)
  const setTaxRate = useCartStore((s) => s.setTaxRate)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const categories = useMedusaCategories()

  // Pull the real VAT rate from Medusa's tax-region config (Navbar mounts
  // on every website page, so this runs once per session) instead of the
  // cart using a hardcoded 20% that could drift from what's actually
  // configured/charged. Silently keeps the store's default on failure.
  useEffect(() => {
    fetch('/api/admin/store-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.taxRate === 'number') setTaxRate(data.taxRate)
      })
      .catch(() => {})
  }, [setTaxRate])

  // Small delay before closing on mouse-leave so moving the cursor from
  // the trigger link down into the panel doesn't close it mid-move.
  const openMenu = (key: MegaMenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMegaMenu(key)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setActiveMegaMenu(null), 150)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [searchOpen])

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/shop?q=${encodeURIComponent(searchQuery.trim())}`
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const menuKeys = Object.keys(MEGA_MENUS) as MegaMenuKey[]

  return (
    <>
      {/* ── Announcement Bar ──
          Promo text auto-scrolls (marquee) on the left; contact info
          (phone/email) stays fixed on the right, desktop only. */}
      <div className='bg-[#0A1F44] text-white text-xs font-lato tracking-wide'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center'>
          {/* Scrolling promo */}
          <div className='flex-1 min-w-0 overflow-hidden py-2.5'>
            <div className='flex items-center w-max animate-scroll'>
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className='flex items-center gap-2 shrink-0 whitespace-nowrap pr-16'
                >
                  🚚 Free shipping on orders above £{FREE_SHIPPING_THRESHOLD}
                  &nbsp;·&nbsp; Use code{' '}
                  <span className='text-[#E8553A] font-bold'>SMASH10</span> for
                  10% off &nbsp;·&nbsp; 🏆 UK&apos;s #1 Racket Sports Store
                </span>
              ))}
            </div>
          </div>

          {/* Fixed contact info — desktop only */}
          <div className='hidden lg:flex items-center gap-5 pl-6 ml-4 py-1.5 shrink-0 text-white/70 border-l border-white/10'>
            <a
              href={`tel:${CONTACT_PHONE}`}
              className='hover:text-white transition-colors whitespace-nowrap'
            >
              Need help? Call us {CONTACT_PHONE}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className='hover:text-white transition-colors whitespace-nowrap'
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <header
        className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-white shadow-sm'
        }`}
      >
        <nav className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* Logo */}
            <Link href='/' className='flex items-center gap-2.5 shrink-0 group'>
              <div className='w-9 h-9 bg-[#E8553A] rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform'>
                <span className='text-white font-montserrat font-black text-base'>
                  S
                </span>
              </div>
              <div className='flex flex-col leading-none'>
                <span className='font-montserrat font-black text-xl text-[#0A1F44] tracking-tight'>
                  {SITE_NAME}
                </span>
                <span className='text-[10px] text-[#E8553A] font-lato font-medium tracking-widest uppercase'>
                  Racket Sports Store
                </span>
              </div>
            </Link>

            {/* Desktop Nav + Actions — grouped together on the right side.
                The sport/local-store mega menus live in their own
                category bar below the header (see CategoryBar). */}
            <div className='hidden lg:flex items-center gap-1 ml-auto'>
              <div className='flex items-center gap-0.5 mr-2'>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all font-lato ${
                      (link as any).highlight
                        ? 'text-[#E8553A] hover:bg-[#E8553A]/8 font-bold'
                        : 'text-[#0A1F44] hover:text-[#E8553A] hover:bg-[#E8553A]/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                className='p-2.5 text-[#4B5563] hover:text-[#E8553A] hover:bg-[#E8553A]/5 rounded-lg transition-all'
                aria-label='Search'
              >
                <SearchIcon size={19} />
              </button>
              <Link
                href='/wishlist'
                className='relative p-2.5 text-[#4B5563] hover:text-[#E8553A] hover:bg-[#E8553A]/5 rounded-lg transition-all'
                aria-label='Wishlist'
              >
                <HeartIcon size={19} />
                {mounted && wishlistCount > 0 && (
                  <span className='absolute top-0.5 right-0.5 w-4 h-4 bg-[#E8553A] text-white text-[9px] font-black rounded-full flex items-center justify-center'>
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>
              {isAuthenticated ? (
                <Link
                  href='/profile'
                  className='p-2 text-[#0A1F44] hover:text-[#E8553A] hover:bg-[#E8553A]/5 rounded-lg transition-all'
                >
                  <div className='w-7 h-7 bg-[#0A1F44] text-white rounded-full flex items-center justify-center text-xs font-montserrat font-black'>
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
                  </div>
                </Link>
              ) : (
                <Link
                  href='/login'
                  className='p-2.5 text-[#4B5563] hover:text-[#E8553A] hover:bg-[#E8553A]/5 rounded-lg transition-all'
                  aria-label='Account'
                >
                  <UserIcon size={19} />
                </Link>
              )}
              <Link
                href='/cart'
                className='relative flex items-center gap-2 ml-1 bg-[#0A1F44] hover:bg-[#E8553A] text-white px-4 py-2.5 rounded-xl transition-all duration-200 group'
                aria-label='Cart'
              >
                <CartIcon size={17} />
                <span className='text-sm font-black font-montserrat'>Cart</span>
                {mounted && itemCount > 0 && (
                  <span className='absolute -top-2 -right-2 w-5 h-5 bg-[#E8553A] group-hover:bg-white group-hover:text-[#E8553A] text-white text-[10px] font-black rounded-full flex items-center justify-center transition-colors'>
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className='flex lg:hidden items-center gap-2'>
              <button
                onClick={() => setSearchOpen(true)}
                className='p-2 text-[#0A1F44]'
                aria-label='Search'
              >
                <SearchIcon size={20} />
              </button>
              <Link href='/cart' className='relative p-2 text-[#0A1F44]'>
                <CartIcon size={20} />
                {mounted && itemCount > 0 && (
                  <span className='absolute -top-1 -right-1 w-5 h-5 bg-[#E8553A] text-white text-[10px] font-black rounded-full flex items-center justify-center'>
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className='p-2 text-[#0A1F44]'
                aria-label='Toggle menu'
              >
                {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
              </button>
            </div>
          </div>
        </nav>

        {/* Category Bar — sport/local-store mega menus, moved below the
            main header row (hover to open). */}
        <div className='hidden lg:block border-t border-[#F2F4F7] bg-[#FAFAFA]'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-center gap-0.5 h-11'>
              {menuKeys.map((key) => {
                const menu = MEGA_MENUS[key]
                const isActive = activeMegaMenu === key
                return (
                  <div
                    key={key}
                    className='relative'
                    onMouseEnter={() => openMenu(key)}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      href={menu.href}
                      className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all font-lato ${
                        isActive
                          ? 'text-[#E8553A] bg-[#E8553A]/8'
                          : 'text-[#0A1F44] hover:text-[#E8553A] hover:bg-[#E8553A]/5'
                      }`}
                    >
                      {menu.label}
                      <ChevronDownIcon
                        size={12}
                        className={`transition-transform duration-200 ${isActive ? 'rotate-180 text-[#E8553A]' : 'text-[#9CA3AF]'}`}
                      />
                    </Link>

                    {/* Mega-menu panel */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200 z-50 ${
                        isActive
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1 pointer-events-none'
                      }`}
                      style={{
                        width: `min(94vw, ${
                          menu.columns.length >= 4
                            ? '820px'
                            : menu.columns.length === 3
                              ? '640px'
                              : // 2-column menus that also carry a second
                                // featured card (e.g. Local Store's "Our
                                // Store" + "Emergency Restring Service" tiles)
                                // were cramped at 480px — the two image cards
                                // barely had room to breathe. Give those the
                                // same width as a 3-column menu.
                                'featured2' in menu && menu.featured2
                                ? '640px'
                                : '480px'
                        })`,
                      }}
                    >
                      <div className='bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.14)] border border-[#E5E7EB] p-6'>
                        <div
                          className='grid gap-x-6 gap-y-4'
                          style={{
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(140px, 1fr))',
                          }}
                        >
                          {menu.columns.map((col) => (
                            <div key={col.heading}>
                              <p className='font-montserrat font-black text-[11px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-3.5'>
                                {col.heading}
                              </p>
                              <ul className='space-y-1.5'>
                                {col.links.map((link) => (
                                  <li key={link.href}>
                                    <Link
                                      href={link.href}
                                      onClick={() => setActiveMegaMenu(null)}
                                      className='flex items-center gap-1.5 text-sm font-lato text-[#4B5563] hover:text-[#E8553A] py-1 transition-colors group/link'
                                    >
                                      <span className='w-1 h-1 rounded-full bg-[#E5E7EB] group-hover/link:bg-[#E8553A] transition-colors shrink-0' />
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div
                          className={`mt-5 pt-4 border-t border-[#F2F4F7] grid gap-3 ${
                            'featured2' in menu && menu.featured2
                              ? 'grid-cols-1 sm:grid-cols-2'
                              : 'grid-cols-1'
                          }`}
                        >
                          {[menu.featured, (menu as any).featured2]
                            .filter(Boolean)
                            .map((feat: any) =>
                              feat.image ? (
                                // Image-card style tile (used by Local Store —
                                // matches the photo + label + description promo
                                // cards from the original store's mega menu).
                                <Link
                                  key={feat.href}
                                  href={feat.href}
                                  onClick={() => setActiveMegaMenu(null)}
                                  className='block rounded-xl overflow-hidden border border-transparent hover:border-[#E8553A]/20 transition-all group/feat bg-[#F2F4F7]'
                                >
                                  {/* TODO: replace src in mega-menu-data.ts with your own photo */}
                                  <img
                                    src={feat.image}
                                    alt={feat.label}
                                    className='w-full h-32 object-cover'
                                  />
                                  <div className='px-4 py-3'>
                                    <p className='font-montserrat font-black text-sm text-[#0A1F44] group-hover/feat:text-[#E8553A] transition-colors'>
                                      {feat.label}
                                    </p>
                                    <p className='font-lato text-[12px] text-[#9CA3AF] mt-0.5 line-clamp-2'>
                                      {feat.description}
                                    </p>
                                  </div>
                                </Link>
                              ) : (
                                <Link
                                  key={feat.href}
                                  href={feat.href}
                                  onClick={() => setActiveMegaMenu(null)}
                                  className='flex items-center justify-between gap-3 px-4 py-3.5 bg-[#F2F4F7] hover:bg-[#E8553A]/6 rounded-xl border border-transparent hover:border-[#E8553A]/20 transition-all group/feat'
                                >
                                  <div>
                                    <p className='font-montserrat font-black text-sm text-[#0A1F44] group-hover/feat:text-[#E8553A] transition-colors'>
                                      {feat.label}
                                    </p>
                                    <p className='font-lato text-[12px] text-[#9CA3AF] mt-0.5'>
                                      {feat.description}
                                    </p>
                                  </div>
                                  <span className='flex items-center gap-1 text-[13px] font-bold font-montserrat text-[#E8553A] whitespace-nowrap shrink-0'>
                                    {feat.cta}
                                    <ArrowRightIcon
                                      size={11}
                                      className='group-hover/feat:translate-x-1 transition-transform'
                                    />
                                  </span>
                                </Link>
                              ),
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden bg-white border-t border-[#E5E7EB] overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className='px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto'>
            {/* Mobile — Categories from Medusa */}
            {categories.length > 0 && (
              <div className='pb-3 mb-1 border-b border-[#E5E7EB]'>
                <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] font-montserrat px-4 mb-2'>
                  Categories
                </p>
                <div className='flex flex-wrap gap-1.5 px-2'>
                  <Link
                    href='/shop'
                    onClick={() => setMobileOpen(false)}
                    className='px-3 py-1.5 bg-[#0A1F44] text-white rounded-full text-[12px] font-semibold font-lato'
                  >
                    All
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/shop?category_id=${cat.id}`}
                      onClick={() => setMobileOpen(false)}
                      className='px-3 py-1.5 bg-[#F2F4F7] text-[#4B5563] hover:bg-[#E8553A]/10 hover:text-[#E8553A] rounded-full text-[12px] font-semibold font-lato transition-colors'
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {menuKeys.map((key) => {
              const menu = MEGA_MENUS[key]
              const isExpanded = mobileExpanded === key
              return (
                <div key={key}>
                  <button
                    onClick={() => setMobileExpanded(isExpanded ? null : key)}
                    className='flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium text-[#0A1F44] hover:bg-[#F2F4F7] transition-colors font-lato'
                  >
                    <span className='flex items-center gap-2'>
                      <span>{menu.icon}</span>
                      <span>{menu.label}</span>
                    </span>
                    <ChevronDownIcon
                      size={15}
                      className={`transition-transform duration-200 text-[#9CA3AF] ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className='mx-2 mb-2 bg-[#F2F4F7] rounded-xl overflow-hidden'>
                      {menu.columns.map((col) => (
                        <div
                          key={col.heading}
                          className='px-4 py-3 border-b border-[#E5E7EB] last:border-0'
                        >
                          <p className='font-montserrat font-black text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-2'>
                            {col.heading}
                          </p>
                          <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
                            {col.links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className='text-[13px] font-lato text-[#4B5563] hover:text-[#E8553A] py-0.5 transition-colors'
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className='px-4 py-3'>
                        <Link
                          href={menu.href}
                          onClick={() => setMobileOpen(false)}
                          className='flex items-center justify-center gap-2 w-full py-2.5 bg-[#0A1F44] text-white text-sm font-black rounded-xl font-montserrat'
                        >
                          All {menu.label}
                          <ArrowRightIcon size={13} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <div className='border-t border-[#E5E7EB] my-2' />

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors font-lato ${
                  (link as any).highlight
                    ? 'text-[#E8553A] bg-[#E8553A]/5 font-bold'
                    : 'text-[#0A1F44] hover:bg-[#F2F4F7]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className='border-t border-[#E5E7EB] pt-3 mt-3 space-y-1'>
              <Link
                href={isAuthenticated ? '/profile' : '/login'}
                onClick={() => setMobileOpen(false)}
                className='flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#0A1F44] hover:bg-[#F2F4F7] transition-colors font-lato'
              >
                <UserIcon size={17} />
                {isAuthenticated ? 'My Profile' : 'My Account'}
              </Link>
              <Link
                href='/wishlist'
                onClick={() => setMobileOpen(false)}
                className='flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#0A1F44] hover:bg-[#F2F4F7] transition-colors font-lato'
              >
                <HeartIcon size={17} />
                Wishlist
                {mounted && wishlistCount > 0 && (
                  <span className='bg-[#E8553A] text-white text-xs font-black px-2 py-0.5 rounded-full'>
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href='/cart'
                onClick={() => setMobileOpen(false)}
                className='flex items-center justify-center gap-2 w-full py-3 bg-[#0A1F44] hover:bg-[#E8553A] text-white rounded-xl text-sm font-black font-montserrat mt-2 transition-colors'
              >
                <CartIcon size={17} />
                View Cart
                {mounted && itemCount > 0 && (
                  <span className='bg-[#E8553A] text-white text-xs font-black px-2 py-0.5 rounded-full'>
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div
          className='fixed inset-0 z-60 bg-[#0A1F44]/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4'
          onClick={() => setSearchOpen(false)}
        >
          <div
            className='w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-3 px-5 py-4'>
              <SearchIcon size={19} className='text-[#9CA3AF] shrink-0' />
              <input
                ref={searchRef}
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search rackets, brands, sports...'
                className='flex-1 text-base outline-none text-[#0A1F44] placeholder-[#9CA3AF] font-lato'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className='p-1 text-[#9CA3AF] hover:text-[#0A1F44]'
                >
                  <CloseIcon size={15} />
                </button>
              )}
              <button
                onClick={() => setSearchOpen(false)}
                className='p-1.5 text-[#9CA3AF] hover:text-[#0A1F44] border-l border-[#E5E7EB] pl-3'
              >
                <CloseIcon size={17} />
              </button>
            </div>

            <div className='px-5 pb-5 border-t border-[#E5E7EB] pt-4'>
              <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-3 font-montserrat'>
                Popular Categories
              </p>
              <div className='flex flex-wrap gap-2 mb-5'>
                {menuKeys.map((key) => {
                  const menu = MEGA_MENUS[key]
                  return (
                    <Link
                      key={key}
                      href={menu.href}
                      onClick={() => setSearchOpen(false)}
                      className='flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F4F7] hover:bg-[#E8553A]/8 hover:text-[#E8553A] border border-[#E5E7EB] hover:border-[#E8553A]/30 rounded-full text-sm text-[#0A1F44] transition-all font-lato'
                    >
                      <span>{menu.icon}</span>
                      <span>{menu.label}</span>
                    </Link>
                  )
                })}
              </div>

              <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 font-montserrat'>
                Popular Searches
              </p>
              <div className='flex flex-wrap gap-2'>
                {[
                  'Yonex Racket',
                  'Babolat Tennis',
                  'Badminton Shoes',
                  'Padel Racket',
                  'Victor Bag',
                ].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term)
                      setTimeout(handleSearch, 100)
                    }}
                    className='px-3 py-1.5 text-[13px] text-[#4B5563] hover:text-[#E8553A] transition-colors font-lato'
                  >
                    🔍 {term}
                  </button>
                ))}
              </div>
            </div>

            {searchQuery && (
              <div className='px-5 pb-4'>
                <button
                  onClick={handleSearch}
                  className='w-full bg-[#E8553A] hover:bg-[#D4441F] text-white py-3 rounded-xl text-sm font-black font-montserrat transition-colors'
                >
                  Search for &quot;{searchQuery}&quot;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
