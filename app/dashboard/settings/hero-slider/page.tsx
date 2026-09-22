'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import CoverImageUpload from '@/components/dashboard/Coverimageupload'
import { SPORTS } from '@/lib/constants'
import {
  DEFAULT_HERO_SLIDES,
  HERO_THIRD_STAT_OPTIONS,
  MAX_HERO_SLIDES,
  isValidHref,
  newHeroSlide,
  type HeroSlide,
  type HeroThirdStat,
} from '@/lib/hero-slides-shared'

const inputCls =
  'w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all bg-white'
const labelCls = 'block text-[12.5px] font-medium text-[#202223] mb-1.5'
const hintCls = 'ml-1 text-[11px] text-[#8C9196] font-normal'
const iconBtn =
  'w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg bg-white text-[#202223] hover:bg-[#F6F6F7] text-[14px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={`relative w-10 h-6 rounded-full transition-colors border-none cursor-pointer shrink-0 ${
        on ? 'bg-[#008060]' : 'bg-[#8C9196]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? '-translate-x-0.5' : '-translate-x-4.5'
        }`}
      />
    </button>
  )
}

function splitHeading(h: string): [string, string] {
  const [a = '', b = ''] = h.split('\n')
  return [a, b]
}

function SlidePreview({ slide }: { slide: HeroSlide }) {
  const [l1, l2] = splitHeading(slide.heading)
  return (
    <div className='relative w-full h-44 rounded-lg overflow-hidden bg-[#0A1F44]'>
      {slide.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.image}
          alt=''
          className='absolute inset-0 w-full h-full object-cover'
        />
      )}
      <div className='absolute inset-0 bg-gradient-to-r from-[#0A1F44]/90 via-[#0A1F44]/55 to-[#0A1F44]/10' />
      <div className='relative h-full flex flex-col justify-center px-5 gap-1.5'>
        {slide.badge && (
          <span className='self-start text-[10px] text-white/90 bg-white/15 border border-white/20 rounded-full px-2.5 py-0.5'>
            {slide.badge}
          </span>
        )}
        <p className='text-white font-black text-[20px] leading-tight m-0'>
          {l1 || 'Heading line 1'}
          {l2 && (
            <>
              <br />
              <span className='text-[#E8553A]'>{l2}</span>
            </>
          )}
        </p>
        {slide.subheading && (
          <p className='text-white/65 text-[11px] leading-snug max-w-[260px] m-0'>
            {slide.subheading}
          </p>
        )}
        <div className='flex gap-2 mt-1'>
          {slide.ctaLabel && (
            <span className='bg-[#E8553A] text-white text-[10px] font-bold rounded-full px-3 py-1'>
              {slide.ctaLabel}
            </span>
          )}
          {slide.secondaryLabel && (
            <span className='bg-white/10 border border-white/25 text-white text-[10px] font-semibold rounded-full px-3 py-1'>
              {slide.secondaryLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HeroSliderSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [slides, setSlides] = useState<HeroSlide[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/hero-slides', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setStoreId(data.storeId)
            setSlides(data.heroSlides)
          }
        } else {
          toast.error('Failed to load home slider')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load home slider')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (index: number, changes: Partial<HeroSlide>) =>
    setSlides((all) =>
      all.map((s, i) => (i === index ? { ...s, ...changes } : s)),
    )

  const move = (index: number, dir: -1 | 1) =>
    setSlides((all) => {
      const to = index + dir
      if (to < 0 || to >= all.length) return all
      const next = [...all]
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })

  const remove = (index: number) => {
    if (!window.confirm(`Delete slide ${index + 1}? (Applies when you Save.)`))
      return
    setSlides((all) => all.filter((_, i) => i !== index))
  }

  const resetToDefault = () => {
    if (
      !window.confirm(
        'Replace all slides with the original 4 sport slides? (Applies when you Save.)',
      )
    )
      return
    setSlides(DEFAULT_HERO_SLIDES.map((s) => ({ ...s })))
  }

  const validate = (): string | null => {
    if (!slides.some((s) => s.enabled)) {
      return 'Keep at least one slide switched on'
    }
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]
      if (!s.enabled) continue
      const n = i + 1
      if (!s.image) return `Slide ${n}: add a background image`
      if (!splitHeading(s.heading)[0].trim())
        return `Slide ${n}: heading line 1 is required`
      if (!!s.ctaLabel.trim() !== !!s.ctaHref.trim())
        return `Slide ${n}: main button needs both a label and a link`
      if (!!s.secondaryLabel.trim() !== !!s.secondaryHref.trim())
        return `Slide ${n}: second button needs both a label and a link`
      for (const link of [s.ctaHref, s.secondaryHref]) {
        if (link.trim() && !isValidHref(link))
          return `Slide ${n}: links must start with / (e.g. /shop?sport=padel) or https://`
      }
    }
    return null
  }

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Store not loaded yet')
      return
    }
    const problem = validate()
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/hero-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, heroSlides: slides }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save home slider')
      }
      toast.success('Home slider saved — homepage is being refreshed')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save home slider')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-5 max-w-[980px]'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Home Slider
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            The big slider at the top of your homepage — images, headings and
            buttons — without touching code.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/'
            target='_blank'
            className='px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] text-[#202223] font-medium rounded-lg no-underline'
          >
            View homepage
          </Link>
          <button
            type='button'
            onClick={handleSave}
            disabled={saving || loading}
            className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 border-none cursor-pointer'
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 text-[13px] text-[#6D7175]'>
          Loading...
        </div>
      ) : (
        <>
          {slides.map((slide, i) => {
            const [l1, l2] = splitHeading(slide.heading)
            const setHeading = (a: string, b: string) =>
              patch(i, { heading: b ? `${a}\n${b}` : a })
            return (
              <div
                key={slide.id}
                className={`bg-white border rounded-xl p-5 space-y-4 ${
                  slide.enabled ? 'border-[#E1E3E5]' : 'border-[#F5C26B]'
                }`}
              >
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <Toggle
                      on={slide.enabled}
                      onClick={() => patch(i, { enabled: !slide.enabled })}
                      label={`Show slide ${i + 1}`}
                    />
                    <div>
                      <p className='text-[14px] font-semibold text-[#202223] m-0'>
                        Slide {i + 1}
                      </p>
                      {slide.enabled ? (
                        <p className='text-[11.5px] text-[#6D7175] m-0'>
                          Shown on homepage
                        </p>
                      ) : (
                        <p className='text-[11.5px] text-[#B98900] font-medium m-0'>
                          Switched off — turn the toggle on and Save to show it
                          on the homepage
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <button
                      type='button'
                      className={iconBtn}
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title='Move up'
                      aria-label='Move slide up'
                    >
                      ↑
                    </button>
                    <button
                      type='button'
                      className={iconBtn}
                      onClick={() => move(i, 1)}
                      disabled={i === slides.length - 1}
                      title='Move down'
                      aria-label='Move slide down'
                    >
                      ↓
                    </button>
                    <button
                      type='button'
                      onClick={() => remove(i)}
                      className='px-2.5 h-8 border border-[#D82C0D] text-[#D82C0D] text-[12px] font-medium rounded-lg bg-transparent hover:bg-[#FFF4F4] cursor-pointer'
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5'>
                  <div className='space-y-3'>
                    <div>
                      <label className={labelCls}>
                        Background image
                        <span className={hintCls}>
                          (wide photo, crops to 16:9)
                        </span>
                      </label>
                      <CoverImageUpload
                        value={slide.image}
                        onChange={(url) => patch(i, { image: url })}
                        label='Click to upload slide image'
                      />
                    </div>
                  </div>

                  <div className='space-y-3.5'>
                    <div>
                      <label className={labelCls}>
                        Badge
                        <span className={hintCls}>
                          (small pill above the heading, emoji allowed)
                        </span>
                      </label>
                      <input
                        type='text'
                        value={slide.badge}
                        maxLength={60}
                        onChange={(e) => patch(i, { badge: e.target.value })}
                        placeholder='🏸 New Season Collection'
                        className={inputCls}
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className={labelCls}>Heading — line 1</label>
                        <input
                          type='text'
                          value={l1}
                          maxLength={60}
                          onChange={(e) => setHeading(e.target.value, l2)}
                          placeholder='Play Like'
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Heading — line 2
                          <span className={hintCls}>(orange)</span>
                        </label>
                        <input
                          type='text'
                          value={l2}
                          maxLength={60}
                          onChange={(e) => setHeading(l1, e.target.value)}
                          placeholder='A Champion'
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Sub-text</label>
                      <textarea
                        value={slide.subheading}
                        maxLength={200}
                        rows={2}
                        onChange={(e) =>
                          patch(i, { subheading: e.target.value })
                        }
                        placeholder='Premium badminton gear for every level — from beginner to pro.'
                        className={`${inputCls} resize-y`}
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className={labelCls}>Main button — text</label>
                        <input
                          type='text'
                          value={slide.ctaLabel}
                          maxLength={40}
                          onChange={(e) =>
                            patch(i, { ctaLabel: e.target.value })
                          }
                          placeholder='Shop Badminton'
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Main button — link</label>
                        <input
                          type='text'
                          value={slide.ctaHref}
                          onChange={(e) =>
                            patch(i, { ctaHref: e.target.value })
                          }
                          placeholder='/shop?sport=badminton'
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Second button — text
                          <span className={hintCls}>(optional)</span>
                        </label>
                        <input
                          type='text'
                          value={slide.secondaryLabel}
                          maxLength={40}
                          onChange={(e) =>
                            patch(i, { secondaryLabel: e.target.value })
                          }
                          placeholder='View All'
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Second button — link</label>
                        <input
                          type='text'
                          value={slide.secondaryHref}
                          onChange={(e) =>
                            patch(i, { secondaryHref: e.target.value })
                          }
                          placeholder='/shop'
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-3 p-3 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg items-end'>
                  <div>
                    <label className={labelCls}>
                      Sport
                      <span className={hintCls}>
                        (stats numbers + highlighted “Browse” pill)
                      </span>
                    </label>
                    <select
                      value={slide.sport}
                      onChange={(e) => patch(i, { sport: e.target.value })}
                      className={inputCls}
                    >
                      <option value=''>None (whole store)</option>
                      {SPORTS.map((sp) => (
                        <option key={sp.slug} value={sp.slug}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Stats row</label>
                    <div className='flex items-center gap-2 h-[42px]'>
                      <Toggle
                        on={slide.showStats}
                        onClick={() =>
                          patch(i, { showStats: !slide.showStats })
                        }
                        label='Show stats row'
                      />
                      <span className='text-[12.5px] text-[#6D7175]'>
                        {slide.showStats ? 'Shown' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Third stat</label>
                    <select
                      value={slide.thirdStat}
                      disabled={!slide.showStats}
                      onChange={(e) =>
                        patch(i, {
                          thirdStat: e.target.value as HeroThirdStat,
                        })
                      }
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      {HERO_THIRD_STAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide mb-2'>
                    Preview
                  </p>
                  <SlidePreview slide={slide} />
                </div>
              </div>
            )
          })}

          <div className='flex items-center gap-3 flex-wrap'>
            <button
              type='button'
              disabled={slides.length >= MAX_HERO_SLIDES}
              onClick={() => setSlides((all) => [...all, newHeroSlide()])}
              className='px-4 py-2 border border-[#008060] text-[#008060] text-[13px] font-semibold rounded-lg bg-white hover:bg-[#F1F8F5] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              + Add slide
            </button>
            <button
              type='button'
              onClick={resetToDefault}
              className='px-4 py-2 border border-[#E1E3E5] text-[#6D7175] text-[13px] font-medium rounded-lg bg-white hover:bg-[#F6F6F7] cursor-pointer'
            >
              Reset to original slides
            </button>
            <span className='text-[12px] text-[#8C9196]'>
              {slides.length} / {MAX_HERO_SLIDES} slides · changes go live when
              you click Save
            </span>
          </div>
        </>
      )}
    </div>
  )
}
