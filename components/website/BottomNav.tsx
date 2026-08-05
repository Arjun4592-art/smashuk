'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, ArrowRightIcon } from '@/components/ui/Icons'
import { MEGA_MENUS, type MegaMenuKey } from '@/lib/mega-menu-data'

const menuKeys = Object.keys(MEGA_MENUS) as MegaMenuKey[]

// The site's own height for this bar — exported so WebsiteLayout can add a
// matching spacer and nothing ends up hidden behind the fixed bar.
export const BOTTOM_NAV_HEIGHT = 64

export default function BottomNav() {
  const [activeMenu, setActiveMenu] = useState<MegaMenuKey | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click-to-toggle (not hover) so this works the same with a mouse on
  // desktop and a finger on mobile — this bar is now shown on both.
  const toggleMenu = (key: MegaMenuKey) =>
    setActiveMenu((prev) => (prev === key ? null : key))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{ height: BOTTOM_NAV_HEIGHT }}
      // Desktop (lg+) now has the same mega menus available via hover in
      // the top Navbar — keeping this bar there too would just duplicate
      // it, so it's mobile/tablet-only from here down.
      className='lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'
    >
      <div className='max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 h-full'>
        <div className='flex items-stretch justify-around sm:justify-center sm:gap-2 h-full'>
          {menuKeys.map((key) => {
            const menu = MEGA_MENUS[key]
            const isActive = activeMenu === key
            return (
              <div key={key} className='relative flex-1 sm:flex-initial'>
                <button
                  type='button'
                  onClick={() => toggleMenu(key)}
                  className={`w-full h-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-4 py-1.5 sm:py-2 text-[10.5px] sm:text-sm font-medium font-lato transition-all ${
                    isActive
                      ? 'text-[#E8553A]'
                      : 'text-[#0A1F44] hover:text-[#E8553A]'
                  }`}
                >
                  <span className='text-lg sm:text-base leading-none'>
                    {menu.icon}
                  </span>
                  <span className='truncate'>{menu.label}</span>
                  <ChevronDownIcon
                    size={12}
                    className={`hidden sm:block transition-transform duration-200 ${isActive ? 'rotate-180 text-[#E8553A]' : 'text-[#9CA3AF]'}`}
                  />
                </button>

                {/* Mega-menu panel — opens UPWARD (bottom-full) since this
                    bar lives at the bottom of the viewport, unlike the old
                    top-nav version which opened downward. */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.14)] border border-[#E5E7EB] transition-all duration-200 z-50 ${
                    isActive
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                  style={{
                    width: `min(92vw, ${
                      menu.columns.length >= 4
                        ? '680px'
                        : menu.columns.length === 3
                          ? '520px'
                          : '380px'
                    })`,
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                >
                  <div className='absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-[#E5E7EB] rotate-45' />
                  <div className='p-5'>
                    <div
                      className='grid gap-x-6 gap-y-4'
                      style={{
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      }}
                    >
                      {menu.columns.map((col) => (
                        <div key={col.heading}>
                          <p className='font-montserrat font-black text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] mb-3'>
                            {col.heading}
                          </p>
                          <ul className='space-y-1'>
                            {col.links.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  className='flex items-center gap-1.5 text-[13px] font-lato text-[#4B5563] hover:text-[#E8553A] py-1 transition-colors group/link'
                                  onClick={() => setActiveMenu(null)}
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
                    <div className='mt-5 pt-4 border-t border-[#F2F4F7]'>
                      <Link
                        href={menu.featured.href}
                        onClick={() => setActiveMenu(null)}
                        className='flex items-center justify-between px-4 py-3 bg-[#F2F4F7] hover:bg-[#E8553A]/6 rounded-xl border border-transparent hover:border-[#E8553A]/20 transition-all group/feat'
                      >
                        <div>
                          <p className='font-montserrat font-black text-[13px] text-[#0A1F44] group-hover/feat:text-[#E8553A] transition-colors'>
                            {menu.featured.label}
                          </p>
                          <p className='font-lato text-[11px] text-[#9CA3AF] mt-0.5'>
                            {menu.featured.description}
                          </p>
                        </div>
                        <span className='flex items-center gap-1 text-[12px] font-bold font-montserrat text-[#E8553A] whitespace-nowrap ml-4'>
                          {menu.featured.cta}
                          <ArrowRightIcon
                            size={11}
                            className='group-hover/feat:translate-x-1 transition-transform'
                          />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
