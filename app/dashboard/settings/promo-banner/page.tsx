'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'
import { isValidHref } from '@/lib/hero-slides-shared'
import {
  Button,
  Field,
  Icon,
  PageHeader,
  Toggle,
  inputCls,
} from '@/components/dashboard/home/ui'

interface PromoBanner {
  enabled: boolean
  eyebrow: string
  heading: string
  subtext: string
  code: string
  discountLabel: string
  ctaText: string
  ctaLink: string
}

const EMPTY_BANNER: PromoBanner = {
  enabled: true,
  eyebrow: '',
  heading: '',
  subtext: '',
  code: '',
  discountLabel: '',
  ctaText: '',
  ctaLink: '',
}

const inputBad =
  '!border-[#E0A39A] !bg-[#FFFAF9] focus:!border-[#D72C0D] focus:!ring-[#D72C0D]/15'

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className='rounded-xl border border-[#E1E3E5] bg-white'>
      <div className='border-b border-[#E1E3E5] px-5 py-4'>
        <h2 className='text-[15px] font-semibold text-[#202223]'>{title}</h2>
        {description && (
          <p className='text-[12.5px] text-[#6D7175]'>{description}</p>
        )}
      </div>
      <div className='space-y-4 p-5'>{children}</div>
    </section>
  )
}

export default function PromoBannerSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [banner, setBanner] = useState<PromoBanner>(EMPTY_BANNER)
  const [savedSnapshot, setSavedSnapshot] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/promo-banner', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            const loaded = { ...EMPTY_BANNER, ...data.promoBanner }
            setStoreId(data.storeId)
            setBanner(loaded)
            setSavedSnapshot(JSON.stringify(loaded))
          }
        } else {
          toast.error('Failed to load promo banner')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load promo banner')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = useMemo(
    () => !loading && JSON.stringify(banner) !== savedSnapshot,
    [banner, savedSnapshot, loading],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (key: keyof PromoBanner, value: string | boolean) => {
    setBanner((b) => ({ ...b, [key]: value }))
  }

  const linkInvalid = !!banner.ctaLink.trim() && !isValidHref(banner.ctaLink)

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Store not loaded yet')
      return
    }
    if (linkInvalid) {
      toast.error(
        'Button link must start with / (e.g. /shop?badge=SALE) or https://',
      )
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/promo-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, promoBanner: banner }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save promo banner')
      }
      setSavedSnapshot(JSON.stringify(banner))
      toast.success('Promo banner saved — live on your homepage now')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save promo banner')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='w-full'>
      <PageHeader
        icon={<Icon.Tag size={20} />}
        title='Promo Banner'
        description='The sale banner on your homepage — headline, code and link — without touching code.'
        status={loading ? null : dirty ? 'dirty' : 'saved'}
      >
        <a
          href='/'
          target='_blank'
          rel='noreferrer'
          className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2D5D8] bg-white px-3.5 text-[12.5px] font-semibold text-[#202223] no-underline transition-colors hover:bg-[#F6F6F7]'
        >
          <Icon.External size={14} /> View homepage
        </a>
        <Button
          variant='primary'
          onClick={handleSave}
          disabled={saving || loading || !dirty}
        >
          {saving ? <Icon.Spinner size={14} /> : <Icon.Save size={14} />}
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </PageHeader>

      {loading ? (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]'>
          <div className='space-y-4'>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className='h-[150px] animate-pulse rounded-xl border border-[#E1E3E5] bg-[#F6F7F8]'
              />
            ))}
          </div>
          <div className='h-[300px] animate-pulse rounded-xl border border-[#E1E3E5] bg-[#F6F7F8]' />
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_380px]'>
          <div className='space-y-5'>
            <section className='flex items-center justify-between gap-4 rounded-xl border border-[#E1E3E5] bg-white px-5 py-4'>
              <div>
                <h2 className='text-[15px] font-semibold text-[#202223]'>
                  Show banner
                </h2>
                <p className='text-[12.5px] text-[#6D7175]'>
                  Switch this off to remove the sale banner from the homepage
                  entirely.
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <span className='text-[12px] text-[#6D7175]'>
                  {banner.enabled ? 'Visible' : 'Hidden'}
                </span>
                <Toggle
                  on={banner.enabled}
                  onClick={() => update('enabled', !banner.enabled)}
                  label='Show the promo banner on the homepage'
                />
              </div>
            </section>

            <Card
              title='Banner text'
              description='What visitors read on the banner.'
            >
              <Field label='Eyebrow text' hint='Small line above the headline'>
                <input
                  type='text'
                  value={banner.eyebrow}
                  onChange={(e) => update('eyebrow', e.target.value)}
                  placeholder='Limited Time Offer'
                  className={inputCls}
                />
              </Field>
              <Field
                label='Headline'
                hint='Must match the actual discount amount'
              >
                <input
                  type='text'
                  value={banner.heading}
                  onChange={(e) => update('heading', e.target.value)}
                  placeholder='UP TO 10% OFF'
                  className={`${inputCls} !text-[15px] font-bold`}
                />
              </Field>
              <Field label='Subtext'>
                <input
                  type='text'
                  value={banner.subtext}
                  onChange={(e) => update('subtext', e.target.value)}
                  placeholder='On selected sports equipment'
                  className={inputCls}
                />
              </Field>
            </Card>

            <Card
              title='Discount code'
              description='Shown on the banner and in the top announcement bar.'
            >
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Field
                  label='Discount code'
                  hint='Must match the code in Medusa promotions'
                >
                  <input
                    type='text'
                    value={banner.code}
                    onChange={(e) =>
                      update('code', e.target.value.toUpperCase())
                    }
                    placeholder='SMASH10'
                    className={`${inputCls} font-mono tracking-wide`}
                  />
                </Field>
                <Field
                  label='Discount label'
                  hint='Shown in the top announcement bar'
                >
                  <input
                    type='text'
                    value={banner.discountLabel}
                    onChange={(e) => update('discountLabel', e.target.value)}
                    placeholder='10% off'
                    className={inputCls}
                  />
                </Field>
              </div>
            </Card>

            <Card
              title='Button'
              description='Where the banner button takes the visitor.'
            >
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <Field label='Button text'>
                  <input
                    type='text'
                    value={banner.ctaText}
                    onChange={(e) => update('ctaText', e.target.value)}
                    placeholder='Shop Sale Now →'
                    className={inputCls}
                  />
                </Field>
                <Field
                  label='Button link'
                  hint='A page on your site, like /shop?badge=SALE, or a full https:// link'
                >
                  <input
                    type='text'
                    value={banner.ctaLink}
                    onChange={(e) => update('ctaLink', e.target.value)}
                    placeholder='/shop?badge=SALE'
                    className={`${inputCls} ${linkInvalid ? inputBad : ''}`}
                  />
                </Field>
              </div>
              {linkInvalid && (
                <div className='flex items-start gap-2 rounded-lg border border-[#F0C4BC] bg-[#FFF6F4] px-3 py-2 text-[12px] text-[#8E2A18]'>
                  <span className='mt-0.5 shrink-0'>
                    <Icon.Alert size={14} />
                  </span>
                  <span>
                    The link must start with <b>/</b> (a page on your site) or{' '}
                    <b>https://</b>.
                  </span>
                </div>
              )}
            </Card>
          </div>

          <aside className='lg:sticky lg:top-24 lg:self-start'>
            <div className='rounded-xl border border-[#E1E3E5] bg-white p-4'>
              <div className='mb-2.5 flex items-center justify-between'>
                <p className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
                  Preview
                </p>
                <p className='text-[11.5px] text-[#8C9196]'>
                  Updates as you type
                </p>
              </div>
              <div className='space-y-3 rounded-lg border border-[#F1F2F3] bg-[#FAFAFA] p-3'>
                <div className='rounded-lg bg-[#0A1F44] px-3.5 py-2.5'>
                  <p className='m-0 text-[11.5px] leading-snug text-white'>
                    Free shipping on orders above £50 &nbsp;·&nbsp; Use code{' '}
                    <span className='font-bold text-[#E8553A]'>
                      {banner.code || 'SMASH10'}
                    </span>{' '}
                    for {banner.discountLabel || '10% off'}
                  </p>
                </div>
                <div
                  className={`rounded-lg bg-[#E8553A] p-5 transition-opacity ${
                    banner.enabled ? '' : 'opacity-35'
                  }`}
                >
                  <p className='mb-1.5 text-[11px] uppercase tracking-widest text-white/80'>
                    {banner.eyebrow || 'Limited Time Offer'}
                  </p>
                  <p className='mb-1.5 text-2xl font-black text-white'>
                    {banner.heading || 'UP TO 10% OFF'}
                  </p>
                  <p className='mb-3 text-[13px] text-white/80'>
                    {banner.subtext || 'On selected sports equipment'}
                  </p>
                  <div className='flex flex-wrap items-center gap-2'>
                    {banner.code && (
                      <span className='inline-block rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#E8553A]'>
                        {banner.code}
                      </span>
                    )}
                    {banner.ctaText && (
                      <span className='inline-block rounded-full border border-white/70 px-3 py-1 text-[12px] font-semibold text-white'>
                        {banner.ctaText}
                      </span>
                    )}
                  </div>
                </div>
                {!banner.enabled && (
                  <p className='m-0 flex items-center gap-1.5 text-[12px] text-[#8A6116]'>
                    <Icon.Alert size={13} /> The banner is hidden on your
                    homepage.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
