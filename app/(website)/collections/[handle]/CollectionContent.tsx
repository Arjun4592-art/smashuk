'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CollectionConfig } from '@/lib/collections-data'
import Accordion from '@/components/website/local-store/Accordion'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-block font-montserrat text-[10px] font-bold tracking-[0.2em] uppercase text-[#E8553A] bg-[#E8553A]/8 px-3 py-1 rounded-full mb-4'>
      {children}
    </span>
  )
}

function GridTexture() {
  return (
    <svg
      className='absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none'
      preserveAspectRatio='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={'v' + i}
          x1={`${i * 5.5}%`}
          y1='0'
          x2={`${i * 5.5 + 3}%`}
          y2='100%'
          stroke='white'
          strokeWidth='1'
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={'h' + i}
          x1='0'
          y1={`${i * 9}%`}
          x2='100%'
          y2={`${i * 9 + 2}%`}
          stroke='white'
          strokeWidth='1'
        />
      ))}
    </svg>
  )
}

export function CollectionHero({
  collection,
}: {
  collection: CollectionConfig
}) {
  return (
    <div className='relative bg-[#0A1F44] py-12 overflow-hidden'>
      <GridTexture />
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-4'>
          <Link href='/' className='hover:text-white/70 transition-colors'>
            Home
          </Link>
          &nbsp;/&nbsp;
          <Link href='/shop' className='hover:text-white/70 transition-colors'>
            Shop
          </Link>
          &nbsp;/&nbsp;
          <span className='text-white/70'>{collection.breadcrumb}</span>
        </p>
        <h1 className='reveal font-montserrat font-black text-3xl sm:text-4xl text-white mb-2'>
          {collection.h1}
        </h1>
        <p className='text-white/60 font-lato max-w-2xl'>{collection.intro}</p>
      </div>
    </div>
  )
}

const BODY_ICONS = ['📖', '🎯', '⚖️', '🎾', '🏷️', '💡']

export function CollectionSeoContent({
  collection,
}: {
  collection: CollectionConfig
}) {
  const [expanded, setExpanded] = useState(false)
  if (!collection.body?.length && !collection.faqs?.length) return null
  return (
    <div className='bg-[#F5F3EF]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div
          className={`relative overflow-hidden ${expanded ? '' : 'max-h-[26rem]'}`}
        >
          {collection.body?.length ? (
            <div className='mb-8'>
              <Eyebrow>📖 Buying Guide</Eyebrow>
              <div className='grid sm:grid-cols-2 gap-4'>
                {collection.body.map((section, i) => (
                  <div
                    key={section.heading}
                    className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6'
                  >
                    <div className='flex items-start gap-3 mb-2'>
                      <span className='flex-shrink-0 w-9 h-9 rounded-full bg-[#E8553A]/8 flex items-center justify-center text-base'>
                        {BODY_ICONS[i % BODY_ICONS.length]}
                      </span>
                      <h2 className='font-montserrat font-black text-base text-[#0A1F44] pt-1.5'>
                        {section.heading}
                      </h2>
                    </div>
                    <p className='font-lato text-sm text-gray-500 leading-relaxed'>
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {collection.faqs?.length ? (
            <div className='bg-white rounded-2xl border border-[#0A1F44]/8 p-6 sm:p-8'>
              <Eyebrow>❓ FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-4'>
                Your Questions, Answered
              </h2>
              <Accordion
                defaultOpenId={collection.faqs[0]?.q}
                containerClassName='divide-y divide-[#0A1F44]/8 border-t border-b border-[#0A1F44]/8'
                rowClassName='py-4'
                triggerClassName='font-montserrat font-semibold text-sm text-[#0A1F44]'
                contentClassName='text-sm text-gray-500 leading-relaxed pt-2 font-lato'
                items={collection.faqs.map((faq) => ({
                  id: faq.q,
                  title: faq.q,
                  content: faq.a,
                }))}
              />
            </div>
          ) : null}

          {!expanded && (
            <div className='absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#F5F3EF] to-transparent' />
          )}
        </div>
        <button
          type='button'
          onClick={() => setExpanded((e) => !e)}
          className='mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#E8553A] font-montserrat px-[22px] py-2.5 rounded-full border border-[#E8553A]/25 bg-white hover:bg-[#E8553A]/[0.06] hover:border-[#E8553A]/50 transition-all duration-200'
        >
          {expanded ? 'View less' : 'View more'}
        </button>
      </div>
    </div>
  )
}
