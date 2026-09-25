'use client'

import Link from 'next/link'
import CoverImageUpload from '@/components/dashboard/Coverimageupload'
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TRUST_ITEMS,
  HOME_PROMO_THEMES,
  HOME_TRUST_ICONS,
  HOME_TRUST_ICON_LABELS,
  MAX_HOME_CATEGORY_TILES,
  MAX_HOME_TRUST_ITEMS,
  newHomeTile,
  type HomeCategoriesBlock,
  type HomeCategoryTile,
  type HomeNewsletterBlock,
  type HomePromoBlock,
  type HomePromoTheme,
  type HomeTrustBlock,
  type HomeTrustIcon,
  type LegacyPromoBanner,
} from '@/lib/home-layout-shared'
import {
  ToggleRow,
  dangerBtn,
  ghostBtn,
  hintCls,
  iconBtn,
  inputCls,
  labelCls,
  primaryOutlineBtn,
} from './ui'

// ─── Trust strip ─────────────────────────────────────────────────────────────

export function TrustEditor({
  block,
  onChange,
}: {
  block: HomeTrustBlock
  onChange: (changes: Partial<HomeTrustBlock>) => void
}) {
  const patch = (
    i: number,
    changes: Partial<HomeTrustBlock['items'][number]>,
  ) =>
    onChange({
      items: block.items.map((it, idx) =>
        idx === i ? { ...it, ...changes } : it,
      ),
    })

  return (
    <div className='space-y-3'>
      <p className='text-[12px] text-[#6D7175] m-0'>
        The dark strip of short promises under the slider (free shipping,
        returns …). An item with no title is not shown.
      </p>
      {block.items.map((item, i) => (
        <div
          key={i}
          className='grid grid-cols-1 md:grid-cols-[170px_1fr_1.4fr_auto] gap-2.5 items-end p-3 border border-[#E1E3E5] rounded-lg bg-[#FAFBFB]'
        >
          <div>
            <label className={labelCls}>Icon</label>
            <select
              value={item.icon}
              onChange={(e) =>
                patch(i, { icon: e.target.value as HomeTrustIcon })
              }
              className={inputCls}
            >
              {HOME_TRUST_ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {HOME_TRUST_ICON_LABELS[ic]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input
              type='text'
              value={item.title}
              maxLength={40}
              onChange={(e) => patch(i, { title: e.target.value })}
              placeholder='Free Shipping'
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Small text</label>
            <input
              type='text'
              value={item.desc}
              maxLength={80}
              onChange={(e) => patch(i, { desc: e.target.value })}
              placeholder='On orders above £80'
              className={inputCls}
            />
          </div>
          <button
            type='button'
            className={dangerBtn}
            onClick={() =>
              onChange({ items: block.items.filter((_, idx) => idx !== i) })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <div className='flex items-center gap-2.5 flex-wrap'>
        <button
          type='button'
          className={primaryOutlineBtn}
          disabled={block.items.length >= MAX_HOME_TRUST_ITEMS}
          onClick={() =>
            onChange({
              items: [...block.items, { icon: 'check', title: '', desc: '' }],
            })
          }
        >
          + Add item
        </button>
        <button
          type='button'
          className={ghostBtn}
          onClick={() =>
            onChange({ items: DEFAULT_TRUST_ITEMS.map((i) => ({ ...i })) })
          }
        >
          Restore original 4
        </button>
        <span className='text-[12px] text-[#8C9196]'>
          {block.items.length} / {MAX_HOME_TRUST_ITEMS}
        </span>
      </div>
    </div>
  )
}

// ─── Browse-by-sport tiles ───────────────────────────────────────────────────

export function CategoriesEditor({
  block,
  onChange,
}: {
  block: HomeCategoriesBlock
  onChange: (changes: Partial<HomeCategoriesBlock>) => void
}) {
  const patchTile = (i: number, changes: Partial<HomeCategoryTile>) =>
    onChange({
      tiles: block.tiles.map((t, idx) =>
        idx === i ? { ...t, ...changes } : t,
      ),
    })

  const moveTile = (i: number, dir: -1 | 1) => {
    const to = i + dir
    if (to < 0 || to >= block.tiles.length) return
    const next = [...block.tiles]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange({ tiles: next })
  }

  return (
    <div className='space-y-5'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
        <div>
          <label className={labelCls}>Small heading above</label>
          <input
            type='text'
            value={block.eyebrow}
            maxLength={40}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder='Browse by Sport'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Main heading</label>
          <input
            type='text'
            value={block.heading}
            maxLength={80}
            onChange={(e) => onChange({ heading: e.target.value })}
            placeholder='What Do You Play?'
            className={inputCls}
          />
        </div>
        <div className='md:col-span-2'>
          <label className={labelCls}>Sub-text</label>
          <textarea
            value={block.subheading}
            maxLength={200}
            rows={2}
            onChange={(e) => onChange({ subheading: e.target.value })}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div>
          <label className={labelCls}>
            Button — text<span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.ctaLabel}
            maxLength={30}
            onChange={(e) => onChange({ ctaLabel: e.target.value })}
            placeholder='All Products'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Button — link</label>
          <input
            type='text'
            value={block.ctaHref}
            onChange={(e) => onChange({ ctaHref: e.target.value })}
            placeholder='/shop'
            className={inputCls}
          />
        </div>
      </div>

      <div className='space-y-3'>
        {block.tiles.map((tile, i) => (
          <div
            key={tile.id}
            className='grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 p-3.5 border border-[#E1E3E5] rounded-lg bg-[#FAFBFB]'
          >
            <div>
              <label className={labelCls}>
                Photo<span className={hintCls}>(portrait, 3:4)</span>
              </label>
              <CoverImageUpload
                value={tile.image}
                onChange={(url) => patchTile(i, { image: url })}
                label='Upload tile photo'
                aspect={3 / 4}
              />
            </div>
            <div className='space-y-3'>
              <div className='grid grid-cols-1 md:grid-cols-[1fr_90px] gap-3'>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    type='text'
                    value={tile.label}
                    maxLength={40}
                    onChange={(e) => patchTile(i, { label: e.target.value })}
                    placeholder='Badminton'
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Emoji</label>
                  <input
                    type='text'
                    value={tile.icon}
                    maxLength={8}
                    onChange={(e) => patchTile(i, { icon: e.target.value })}
                    placeholder='🏸'
                    className={inputCls}
                  />
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div>
                  <label className={labelCls}>Link</label>
                  <input
                    type='text'
                    value={tile.href}
                    onChange={(e) => patchTile(i, { href: e.target.value })}
                    placeholder='/shop?sport=badminton'
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Small line<span className={hintCls}>(optional)</span>
                  </label>
                  <input
                    type='text'
                    value={tile.countLabel}
                    maxLength={30}
                    onChange={(e) =>
                      patchTile(i, { countLabel: e.target.value })
                    }
                    placeholder='120+ products'
                    className={inputCls}
                  />
                </div>
              </div>
              <div className='flex items-center justify-between gap-3 flex-wrap'>
                <ToggleRow
                  on={tile.popular}
                  onClick={() => patchTile(i, { popular: !tile.popular })}
                  label='Show “Popular” pill'
                />
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    className={iconBtn}
                    disabled={i === 0}
                    onClick={() => moveTile(i, -1)}
                    aria-label='Move tile up'
                  >
                    ↑
                  </button>
                  <button
                    type='button'
                    className={iconBtn}
                    disabled={i === block.tiles.length - 1}
                    onClick={() => moveTile(i, 1)}
                    aria-label='Move tile down'
                  >
                    ↓
                  </button>
                  <button
                    type='button'
                    className={dangerBtn}
                    onClick={() =>
                      onChange({ tiles: block.tiles.filter((_, x) => x !== i) })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='flex items-center gap-2.5 flex-wrap'>
        <button
          type='button'
          className={primaryOutlineBtn}
          disabled={block.tiles.length >= MAX_HOME_CATEGORY_TILES}
          onClick={() => onChange({ tiles: [...block.tiles, newHomeTile()] })}
        >
          + Add tile
        </button>
        <button
          type='button'
          className={ghostBtn}
          onClick={() => {
            if (
              window.confirm(
                'Replace the tiles with the original 8? (Applies when you Save.)',
              )
            )
              onChange({ tiles: DEFAULT_CATEGORY_TILES.map((t) => ({ ...t })) })
          }}
        >
          Restore original tiles
        </button>
        <span className='text-[12px] text-[#8C9196]'>
          {block.tiles.length} / {MAX_HOME_CATEGORY_TILES}
        </span>
      </div>
    </div>
  )
}

// ─── Discount / promo banner ─────────────────────────────────────────────────

export function PromoEditor({
  block,
  legacy,
  onChange,
}: {
  block: HomePromoBlock
  legacy: LegacyPromoBanner | null
  onChange: (changes: Partial<HomePromoBlock>) => void
}) {
  if (block.linkedToPromoBanner) {
    return (
      <div className='space-y-3'>
        <p className='text-[12.5px] text-[#6D7175] m-0'>
          This banner shows your store-wide <b>Promo Banner</b> settings — the
          same offer code that appears in the top bar of the site. Change the
          text there, or make this homepage banner its own.
        </p>
        {legacy && (
          <div className='p-3.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] space-y-0.5'>
            <p className='m-0 text-[11px] uppercase tracking-wide text-[#6D7175]'>
              {legacy.eyebrow}
            </p>
            <p className='m-0 font-semibold'>{legacy.heading}</p>
            <p className='m-0 text-[#6D7175]'>{legacy.subtext}</p>
            <p className='m-0 text-[12px] text-[#6D7175]'>
              {legacy.code ? `Code: ${legacy.code} · ` : ''}
              Button: {legacy.ctaText} → {legacy.ctaLink || '/shop'}
            </p>
            {!legacy.enabled && (
              <p className='m-0 mt-1 text-[12px] text-[#B98900] font-medium'>
                ⚠ The Promo Banner is switched off, so this banner is hidden.
              </p>
            )}
          </div>
        )}
        <div className='flex items-center gap-2.5 flex-wrap'>
          <Link
            href='/dashboard/settings/promo-banner'
            className={`${primaryOutlineBtn} no-underline inline-block`}
          >
            Edit Promo Banner
          </Link>
          <button
            type='button'
            className={ghostBtn}
            onClick={() =>
              onChange({
                linkedToPromoBanner: false,
                eyebrow: legacy?.eyebrow ?? '',
                heading: legacy?.heading ?? '',
                subtext: legacy?.subtext ?? '',
                code: legacy?.code ?? '',
                ctaText: legacy?.ctaText ?? '',
                ctaLink: legacy?.ctaLink ?? '',
              })
            }
          >
            Make this banner separate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
        <div>
          <label className={labelCls}>
            Small heading above<span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.eyebrow}
            maxLength={60}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder='Limited Time Offer'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Big heading</label>
          <input
            type='text'
            value={block.heading}
            maxLength={80}
            onChange={(e) => onChange({ heading: e.target.value })}
            placeholder='UP TO 20% OFF RACKETS'
            className={inputCls}
          />
        </div>
        <div className='md:col-span-2'>
          <label className={labelCls}>
            Sub-text<span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.subtext}
            maxLength={160}
            onChange={(e) => onChange({ subtext: e.target.value })}
            placeholder='On selected sports equipment'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Discount code<span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.code}
            maxLength={30}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder='SMASH10'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Colour</label>
          <select
            value={block.theme}
            onChange={(e) =>
              onChange({ theme: e.target.value as HomePromoTheme })
            }
            className={inputCls}
          >
            {HOME_PROMO_THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            Button — text<span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.ctaText}
            maxLength={40}
            onChange={(e) => onChange({ ctaText: e.target.value })}
            placeholder='Shop Sale Now →'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Button — link</label>
          <input
            type='text'
            value={block.ctaLink}
            onChange={(e) => onChange({ ctaLink: e.target.value })}
            placeholder='/shop?badge=SALE'
            className={inputCls}
          />
        </div>
      </div>
      <div className='flex items-center gap-2.5 flex-wrap'>
        <button
          type='button'
          className={ghostBtn}
          onClick={() => onChange({ linkedToPromoBanner: true })}
        >
          Use the store Promo Banner instead
        </button>
        <span className='text-[11.5px] text-[#8C9196]'>
          This banner only changes the homepage. The offer code in the site’s
          top bar is still set under Marketing → Promo Banner.
        </span>
      </div>
    </div>
  )
}

// ─── Newsletter ──────────────────────────────────────────────────────────────

export function NewsletterEditor({
  block,
  onChange,
}: {
  block: HomeNewsletterBlock
  onChange: (changes: Partial<HomeNewsletterBlock>) => void
}) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
      <div>
        <label className={labelCls}>Small heading above</label>
        <input
          type='text'
          value={block.eyebrow}
          maxLength={40}
          onChange={(e) => onChange({ eyebrow: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Main heading</label>
        <input
          type='text'
          value={block.heading}
          maxLength={80}
          onChange={(e) => onChange({ heading: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className='md:col-span-2'>
        <label className={labelCls}>Text under the heading</label>
        <input
          type='text'
          value={block.subtext}
          maxLength={200}
          onChange={(e) => onChange({ subtext: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  )
}
