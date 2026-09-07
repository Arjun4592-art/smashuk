'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CollectionConfig } from '@/lib/collections-data'
import Accordion from '@/components/website/local-store/Accordion'
import { CloseIcon } from '@/components/ui/Icons'

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

function InfoModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10'>
          <h2 className='font-montserrat font-black text-lg text-[#0A1F44]'>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label='Close'
            className='w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#0A1F44] transition-colors'
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className='px-6 py-6'>{children}</div>
      </div>
    </div>
  )
}

export function CollectionSeoContent({
  collection,
}: {
  collection: CollectionConfig
}) {
  const [showGuide, setShowGuide] = useState(false)
  const [showFaqs, setShowFaqs] = useState(false)
  if (!collection.body?.length && !collection.faqs?.length) return null
  return (
    <div className='bg-[#F5F3EF]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='flex flex-col sm:flex-row gap-4'>
          {collection.body?.length ? (
            <button
              type='button'
              onClick={() => setShowGuide(true)}
              className='flex-1 text-left bg-white rounded-2xl border border-[#0A1F44]/8 p-6 hover:border-[#E8553A]/40 hover:shadow-sm transition-all'
            >
              <Eyebrow>📖 Buying Guide</Eyebrow>
              <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-1'>
                Everything You Need to Know
              </h2>
              <p className='font-lato text-sm text-gray-500 leading-relaxed'>
                Understanding the basics, choosing the right racket, and more —
                tap to read the full guide.
              </p>
              <span className='mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#E8553A] font-montserrat'>
                Read the guide →
              </span>
            </button>
          ) : null}

          {collection.faqs?.length ? (
            <button
              type='button'
              onClick={() => setShowFaqs(true)}
              className='flex-1 text-left bg-white rounded-2xl border border-[#0A1F44]/8 p-6 hover:border-[#E8553A]/40 hover:shadow-sm transition-all'
            >
              <Eyebrow>❓ FAQs</Eyebrow>
              <h2 className='font-montserrat font-black text-lg text-[#0A1F44] mb-1'>
                Your Questions, Answered
              </h2>
              <p className='font-lato text-sm text-gray-500 leading-relaxed'>
                Common questions about sizing, delivery and more — tap to view
                all {collection.faqs.length} answers.
              </p>
              <span className='mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#E8553A] font-montserrat'>
                View FAQs →
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {showGuide && collection.body?.length ? (
        <InfoModal title='Buying Guide' onClose={() => setShowGuide(false)}>
          <div className='grid sm:grid-cols-2 gap-4'>
            {collection.body.map((section, i) => (
              <div
                key={section.heading}
                className='bg-[#F5F3EF] rounded-2xl p-5'
              >
                <div className='flex items-start gap-3 mb-2'>
                  <span className='flex-shrink-0 w-9 h-9 rounded-full bg-[#E8553A]/8 flex items-center justify-center text-base'>
                    {BODY_ICONS[i % BODY_ICONS.length]}
                  </span>
                  <h3 className='font-montserrat font-black text-base text-[#0A1F44] pt-1.5'>
                    {section.heading}
                  </h3>
                </div>
                <p className='font-lato text-sm text-gray-500 leading-relaxed'>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </InfoModal>
      ) : null}

      {showFaqs && collection.faqs?.length ? (
        <InfoModal
          title='Your Questions, Answered'
          onClose={() => setShowFaqs(false)}
        >
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
        </InfoModal>
      ) : null}
    </div>
  )
}
