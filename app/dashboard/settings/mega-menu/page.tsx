'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type {
  MegaMenuColumn,
  MegaMenuConfig,
  MegaMenuEntry,
  MegaMenuFeatured,
  MegaMenuLink,
  NavLinkEntry,
} from '@/lib/mega-menu-config'

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, no emoji / unicode glyphs in the UI chrome)       */
/* ------------------------------------------------------------------ */

function Svg({
  size = 16,
  fill = 'none',
  className,
  children,
}: {
  size?: number
  fill?: string
  className?: string
  children: ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill={fill}
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {children}
    </svg>
  )
}
type IconProps = { size?: number; className?: string }
const Icon = {
  Chevron: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='6 9 12 15 18 9' />
    </Svg>
  ),
  Up: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='19' x2='12' y2='5' />
      <polyline points='5 12 12 5 19 12' />
    </Svg>
  ),
  Down: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <polyline points='19 12 12 19 5 12' />
    </Svg>
  ),
  Left: (p: IconProps) => (
    <Svg {...p}>
      <line x1='19' y1='12' x2='5' y2='12' />
      <polyline points='12 19 5 12 12 5' />
    </Svg>
  ),
  Right: (p: IconProps) => (
    <Svg {...p}>
      <line x1='5' y1='12' x2='19' y2='12' />
      <polyline points='12 5 19 12 12 19' />
    </Svg>
  ),
  Trash: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v6M14 11v6' />
      <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
    </Svg>
  ),
  Plus: (p: IconProps) => (
    <Svg {...p}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <line x1='5' y1='12' x2='19' y2='12' />
    </Svg>
  ),
  Save: (p: IconProps) => (
    <Svg {...p}>
      <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' />
      <polyline points='17 21 17 13 7 13 7 21' />
      <polyline points='7 3 7 8 15 8' />
    </Svg>
  ),
  Reset: (p: IconProps) => (
    <Svg {...p}>
      <polyline points='1 4 1 10 7 10' />
      <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
    </Svg>
  ),
  Columns: (p: IconProps) => (
    <Svg {...p}>
      <rect x='3' y='3' width='18' height='18' rx='2' />
      <line x1='9' y1='3' x2='9' y2='21' />
      <line x1='15' y1='3' x2='15' y2='21' />
    </Svg>
  ),
  Layout: (p: IconProps) => (
    <Svg {...p}>
      <rect x='3' y='3' width='18' height='18' rx='2' />
      <line x1='3' y1='9' x2='21' y2='9' />
      <line x1='9' y1='21' x2='9' y2='9' />
    </Svg>
  ),
  Link: (p: IconProps) => (
    <Svg {...p}>
      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
      <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
    </Svg>
  ),
  Star: ({ filled, ...p }: IconProps & { filled?: boolean }) => (
    <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
      <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
    </Svg>
  ),
  Sparkle: (p: IconProps) => (
    <Svg {...p}>
      <path d='M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z' />
    </Svg>
  ),
  Alert: (p: IconProps) => (
    <Svg {...p}>
      <circle cx='12' cy='12' r='10' />
      <line x1='12' y1='8' x2='12' y2='12' />
      <line x1='12' y1='16' x2='12.01' y2='16' />
    </Svg>
  ),
  Spinner: ({ size = 16 }: IconProps) => (
    <svg
      className='animate-spin'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      aria-hidden='true'
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
  ),
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */

const inputBase =
  'w-full h-9 px-3 rounded-lg border bg-white text-[13px] text-[#202223] placeholder-[#8C9196] outline-none transition-all focus:ring-2'
const inputOk =
  'border-[#E1E3E5] focus:border-[#008060] focus:ring-[#008060]/15'
const inputBad =
  'border-[#E0A39A] bg-[#FFFAF9] focus:border-[#D72C0D] focus:ring-[#D72C0D]/15'

const isValidHref = (h: string) =>
  !h.trim() || /^(\/|https?:\/\/|mailto:|tel:)/i.test(h.trim())

function Input({
  value,
  onChange,
  placeholder,
  invalid,
  className = '',
  maxLength,
  center,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  invalid?: boolean
  className?: string
  maxLength?: number
  center?: boolean
}) {
  return (
    <input
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} ${invalid ? inputBad : inputOk} ${center ? 'text-center' : ''} ${className}`}
    />
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className='block text-[12px] font-medium text-[#4A4F55] mb-1.5'>
        {label}
      </label>
      {children}
      {hint && <p className='mt-1 text-[11.5px] text-[#8C9196]'>{hint}</p>}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-[#8C9196] hover:bg-[#FFF1EF] hover:text-[#D72C0D]'
          : active
            ? 'text-[#E8553A] bg-[#FFF3F0]'
            : 'text-[#6D7175] hover:bg-[#F1F2F3] hover:text-[#202223]'
      }`}
    >
      {children}
    </button>
  )
}

// First click arms it ("Delete?"), second click confirms — no browser popups.
function DeleteButton({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  if (!armed) {
    return (
      <IconButton danger label={label} onClick={() => setArmed(true)}>
        <Icon.Trash size={15} />
      </IconButton>
    )
  }
  return (
    <button
      type='button'
      autoFocus
      onBlur={() => setArmed(false)}
      onClick={() => {
        setArmed(false)
        onConfirm()
      }}
      className='h-8 shrink-0 rounded-lg border-none bg-[#D72C0D] px-2.5 text-[12px] font-semibold text-white cursor-pointer hover:bg-[#BC2200]'
    >
      Delete?
    </button>
  )
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={() => onChange(!on)}
      className={`relative block h-5 w-9 shrink-0 rounded-full border-none p-0 cursor-pointer transition-colors ${on ? 'bg-[#008060]' : 'bg-[#C9CCCF]'}`}
    >
      <span
        className='absolute left-0 top-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200'
        style={{ transform: `translateX(${on ? 18 : 2}px)` }}
      />
    </button>
  )
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'subtle'
}) {
  const styles = {
    default: 'border-[#D2D5D8] bg-white text-[#202223] hover:bg-[#F6F6F7]',
    primary:
      'border-[#008060] bg-[#008060] text-white hover:bg-[#006E52] hover:border-[#006E52]',
    subtle:
      'border-dashed border-[#C9CCCF] bg-transparent text-[#4A4F55] hover:bg-[#F6F6F7] hover:border-[#8C9196]',
  }[variant]
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[12.5px] font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  )
}

function Chip({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: 'gray' | 'amber'
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tone === 'amber'
          ? 'bg-[#FFF1D6] text-[#8A6116]'
          : 'bg-[#F1F2F3] text-[#6D7175]'
      }`}
    >
      {children}
    </span>
  )
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/* ------------------------------------------------------------------ */
/* Editors                                                              */
/* ------------------------------------------------------------------ */

function FeaturedEditor({
  title,
  value,
  onChange,
}: {
  title: string
  value?: MegaMenuFeatured
  onChange: (v: MegaMenuFeatured | undefined) => void
}) {
  const f = value
  const set = (patch: Partial<MegaMenuFeatured>) =>
    onChange({
      label: '',
      description: '',
      href: '',
      cta: 'Shop Now',
      ...f,
      ...patch,
    })
  return (
    <div
      className={`rounded-xl border p-4 ${f ? 'border-[#D2D5D8] bg-white' : 'border-dashed border-[#D2D5D8] bg-[#FAFBFB]'}`}
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='text-[#6D7175]'>
            <Icon.Sparkle size={15} />
          </span>
          <div className='min-w-0'>
            <p className='text-[13px] font-semibold text-[#202223]'>{title}</p>
            {!f && <p className='text-[11.5px] text-[#8C9196]'>Not shown</p>}
          </div>
        </div>
        <Toggle
          on={!!f}
          label={`Show ${title}`}
          onChange={(v) =>
            onChange(
              v
                ? { label: '', description: '', href: '', cta: 'Shop Now' }
                : undefined,
            )
          }
        />
      </div>
      {f && (
        <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Field label='Title'>
            <Input
              value={f.label}
              onChange={(v) => set({ label: v })}
              placeholder='New Arrivals'
            />
          </Field>
          <Field label='Link'>
            <Input
              value={f.href}
              invalid={!isValidHref(f.href)}
              onChange={(v) => set({ href: v })}
              placeholder='/collections/new'
            />
          </Field>
          <div className='sm:col-span-2'>
            <Field label='Short description'>
              <Input
                value={f.description}
                onChange={(v) => set({ description: v })}
                placeholder='Check out the latest gear'
              />
            </Field>
          </div>
          <Field label='Button text'>
            <Input
              value={f.cta}
              onChange={(v) => set({ cta: v })}
              placeholder='Shop Now'
            />
          </Field>
          <Field label='Image URL (optional)'>
            <Input
              value={f.image ?? ''}
              invalid={!isValidHref(f.image ?? '')}
              onChange={(v) => set({ image: v })}
              placeholder='/local-store/banner.jpg'
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function ColumnEditor({
  col,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  col: MegaMenuColumn
  index: number
  total: number
  onChange: (c: MegaMenuColumn) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const setLink = (i: number, patch: Partial<MegaMenuLink>) =>
    onChange({
      ...col,
      links: col.links.map((l, li) => (li === i ? { ...l, ...patch } : l)),
    })
  return (
    <div className='rounded-xl border border-[#D2D5D8] bg-white overflow-hidden'>
      <div className='flex items-center gap-2.5 border-b border-[#E1E3E5] bg-[#F6F7F8] px-3 py-2.5'>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[#6D7175] border border-[#E1E3E5]'>
          <Icon.Columns size={14} />
        </span>
        <Input
          value={col.heading}
          onChange={(v) => onChange({ ...col, heading: v })}
          placeholder='Column heading, e.g. Rackets'
          invalid={col.links.length > 0 && !col.heading.trim()}
          className='!h-8 font-semibold'
        />
        <span className='hidden sm:inline'>
          <Chip>
            {col.links.length} {col.links.length === 1 ? 'link' : 'links'}
          </Chip>
        </span>
        <div className='flex items-center'>
          <IconButton
            label='Move column left'
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <Icon.Left size={15} />
          </IconButton>
          <IconButton
            label='Move column right'
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <Icon.Right size={15} />
          </IconButton>
          <DeleteButton label='Delete column' onConfirm={onRemove} />
        </div>
      </div>

      <div className='p-3 space-y-2'>
        {col.links.length > 0 && (
          <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_104px] gap-2 px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8C9196]'>
            <span>Link name</span>
            <span>Page link</span>
            <span />
          </div>
        )}
        {col.links.map((l, i) => (
          <div
            key={i}
            className='grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_104px] gap-2 items-center'
          >
            <Input
              value={l.label}
              onChange={(v) => setLink(i, { label: v })}
              placeholder='Yonex'
            />
            <Input
              value={l.href}
              invalid={!isValidHref(l.href)}
              onChange={(v) => setLink(i, { href: v })}
              placeholder='/collections/yonex-rackets'
            />
            <div className='flex items-center justify-end'>
              <IconButton
                label='Move link up'
                disabled={i === 0}
                onClick={() =>
                  onChange({ ...col, links: move(col.links, i, i - 1) })
                }
              >
                <Icon.Up size={14} />
              </IconButton>
              <IconButton
                label='Move link down'
                disabled={i === col.links.length - 1}
                onClick={() =>
                  onChange({ ...col, links: move(col.links, i, i + 1) })
                }
              >
                <Icon.Down size={14} />
              </IconButton>
              <IconButton
                danger
                label='Remove link'
                onClick={() =>
                  onChange({
                    ...col,
                    links: col.links.filter((_, li) => li !== i),
                  })
                }
              >
                <Icon.Trash size={14} />
              </IconButton>
            </div>
          </div>
        ))}
        {col.links.length === 0 && (
          <p className='py-2 text-center text-[12.5px] text-[#8C9196]'>
            No links yet. Columns without links are not shown on the website.
          </p>
        )}
        <Button
          variant='subtle'
          onClick={() =>
            onChange({ ...col, links: [...col.links, { label: '', href: '' }] })
          }
        >
          <Icon.Plus size={14} /> Add link
        </Button>
      </div>
    </div>
  )
}

function MenuEditor({
  menu,
  index,
  total,
  open,
  onToggleOpen,
  onChange,
  onMove,
  onRemove,
}: {
  menu: MegaMenuEntry
  index: number
  total: number
  open: boolean
  onToggleOpen: () => void
  onChange: (m: MegaMenuEntry) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const linkCount = menu.columns.reduce((n, c) => n + c.links.length, 0)
  const setCol = (i: number, c: MegaMenuColumn) =>
    onChange({
      ...menu,
      columns: menu.columns.map((x, xi) => (xi === i ? c : x)),
    })
  return (
    <div
      id={`menu-${menu.key}`}
      className={`scroll-mt-24 rounded-xl border bg-white transition-shadow ${open ? 'border-[#B8BCC0] shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'border-[#E1E3E5]'} ${menu.visible ? '' : 'bg-[#FAFBFB]'}`}
    >
      <div className='flex items-center gap-3 px-4 py-3'>
        <button
          type='button'
          onClick={onToggleOpen}
          aria-expanded={open}
          className='flex min-w-0 flex-1 items-center gap-3 border-none bg-transparent p-0 text-left cursor-pointer'
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[18px] ${menu.visible ? 'border-[#E1E3E5] bg-[#F6F7F8]' : 'border-dashed border-[#C9CCCF] bg-white opacity-60'}`}
          >
            {menu.icon ? (
              menu.icon
            ) : (
              <Icon.Layout size={18} className='text-[#8C9196]' />
            )}
          </span>
          <span className='min-w-0'>
            <span
              className={`block truncate text-[14px] font-semibold ${menu.visible ? 'text-[#202223]' : 'text-[#8C9196]'}`}
            >
              {menu.label || 'Untitled menu'}
            </span>
            <span className='mt-0.5 flex flex-wrap items-center gap-1.5'>
              <Chip>
                {menu.columns.length}{' '}
                {menu.columns.length === 1 ? 'column' : 'columns'}
              </Chip>
              <Chip>
                {linkCount} {linkCount === 1 ? 'link' : 'links'}
              </Chip>
              {!menu.visible && <Chip tone='amber'>Hidden on website</Chip>}
            </span>
          </span>
        </button>

        <div className='flex shrink-0 items-center gap-1'>
          <span className='mr-1.5 hidden items-center gap-2 sm:flex'>
            <span className='text-[12px] text-[#6D7175]'>
              {menu.visible ? 'Visible' : 'Hidden'}
            </span>
            <Toggle
              on={menu.visible}
              label='Show this menu on the website'
              onChange={(v) => onChange({ ...menu, visible: v })}
            />
          </span>
          <span className='sm:hidden'>
            <Toggle
              on={menu.visible}
              label='Show this menu on the website'
              onChange={(v) => onChange({ ...menu, visible: v })}
            />
          </span>
          <span className='mx-1 h-5 w-px bg-[#E1E3E5]' />
          <IconButton
            label='Move menu up'
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <Icon.Up size={15} />
          </IconButton>
          <IconButton
            label='Move menu down'
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <Icon.Down size={15} />
          </IconButton>
          <DeleteButton label='Delete menu' onConfirm={onRemove} />
          <IconButton
            label={open ? 'Collapse' : 'Expand'}
            onClick={onToggleOpen}
          >
            <Icon.Chevron
              size={16}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </IconButton>
        </div>
      </div>

      {open && (
        <div className='space-y-7 border-t border-[#E1E3E5] px-5 py-5'>
          <section>
            <h3 className='mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
              Menu details
            </h3>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_110px_1.6fr]'>
              <Field label='Menu name'>
                <Input
                  value={menu.label}
                  onChange={(v) => onChange({ ...menu, label: v })}
                  placeholder='Squash'
                  maxLength={40}
                />
              </Field>
              <Field label='Icon' hint='Emoji'>
                <Input
                  center
                  value={menu.icon}
                  onChange={(v) => onChange({ ...menu, icon: v })}
                  placeholder='🏸'
                  maxLength={8}
                />
              </Field>
              <Field
                label='Opens when clicked'
                hint='Where the menu name itself takes the visitor'
              >
                <Input
                  value={menu.href}
                  invalid={!isValidHref(menu.href)}
                  onChange={(v) => onChange({ ...menu, href: v })}
                  placeholder='/shop?sport=squash'
                />
              </Field>
            </div>
          </section>

          <section>
            <div className='mb-3 flex items-center justify-between'>
              <h3 className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
                Dropdown columns{' '}
                <span className='ml-1 font-medium normal-case tracking-normal text-[#8C9196]'>
                  ({menu.columns.length}/6)
                </span>
              </h3>
            </div>
            <div className='space-y-3'>
              {menu.columns.map((c, i) => (
                <ColumnEditor
                  key={i}
                  col={c}
                  index={i}
                  total={menu.columns.length}
                  onChange={(next) => setCol(i, next)}
                  onMove={(dir) =>
                    onChange({
                      ...menu,
                      columns: move(menu.columns, i, i + dir),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...menu,
                      columns: menu.columns.filter((_, xi) => xi !== i),
                    })
                  }
                />
              ))}
              <Button
                variant='subtle'
                disabled={menu.columns.length >= 6}
                onClick={() =>
                  onChange({
                    ...menu,
                    columns: [
                      ...menu.columns,
                      { heading: '', links: [{ label: '', href: '' }] },
                    ],
                  })
                }
              >
                <Icon.Plus size={14} /> Add column
              </Button>
            </div>
          </section>

          <section>
            <h3 className='mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
              Highlight cards
            </h3>
            <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
              <FeaturedEditor
                title='Highlight card 1'
                value={menu.featured}
                onChange={(v) => onChange({ ...menu, featured: v })}
              />
              <FeaturedEditor
                title='Highlight card 2'
                value={menu.featured2}
                onChange={(v) => onChange({ ...menu, featured2: v })}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live preview of the header menu bar                                  */
/* ------------------------------------------------------------------ */

function HeaderPreview({
  config,
  onPick,
}: {
  config: MegaMenuConfig
  onPick: (key: string) => void
}) {
  const menus = config.menus.filter((m) => m.visible)
  const links = config.navLinks.filter((l) => l.visible && l.label)
  return (
    <div className='rounded-xl border border-[#E1E3E5] bg-white p-4'>
      <div className='mb-2.5 flex items-center justify-between'>
        <p className='text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6D7175]'>
          Preview
        </p>
        <p className='text-[11.5px] text-[#8C9196]'>Click a menu to edit it</p>
      </div>
      <div className='flex flex-wrap items-center justify-center gap-1 rounded-lg border border-[#F1F2F3] bg-[#FAFAFA] px-3 py-2'>
        {menus.map((m) => (
          <button
            key={m.key}
            type='button'
            onClick={() => onPick(m.key)}
            className='inline-flex items-center gap-1 rounded-lg border-none bg-transparent px-3 py-1.5 text-[13px] font-medium text-[#0A1F44] cursor-pointer hover:bg-[#E8553A]/5 hover:text-[#E8553A]'
          >
            {m.label || 'Untitled'}
            <Icon.Chevron size={12} className='text-[#9CA3AF]' />
          </button>
        ))}
        {menus.length > 0 && links.length > 0 && (
          <span className='mx-1 h-4 w-px bg-[#E1E3E5]' />
        )}
        {links.map((l, i) => (
          <span
            key={i}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${l.highlight ? 'bg-[#E8553A]/5 font-bold text-[#E8553A]' : 'text-[#0A1F44]'}`}
          >
            {l.label}
          </span>
        ))}
        {menus.length === 0 && links.length === 0 && (
          <span className='py-1 text-[12.5px] text-[#8C9196]'>
            Nothing visible
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function MegaMenuSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isCustomised, setIsCustomised] = useState(false)
  const [config, setConfig] = useState<MegaMenuConfig>({
    menus: [],
    navLinks: [],
  })
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/mega-menu', {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load menu')
        const data = await res.json()
        if (cancelled) return
        setStoreId(data.storeId)
        setIsCustomised(!!data.isCustomised)
        setConfig(data.config)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load menu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 4000)
    return () => clearTimeout(t)
  }, [confirmReset])

  const edit = (fn: (c: MegaMenuConfig) => MegaMenuConfig) => {
    setConfig(fn)
    setDirty(true)
  }
  const setMenu = (i: number, m: MegaMenuEntry) =>
    edit((c) => ({ ...c, menus: c.menus.map((x, xi) => (xi === i ? m : x)) }))
  const setNav = (i: number, patch: Partial<NavLinkEntry>) =>
    edit((c) => ({
      ...c,
      navLinks: c.navLinks.map((x, xi) => (xi === i ? { ...x, ...patch } : x)),
    }))

  const openAndScroll = (key: string) => {
    setOpenKey(key)
    setTimeout(
      () =>
        document
          .getElementById(`menu-${key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60,
    )
  }

  const addMenu = () => {
    const key = `menu-${Date.now().toString(36)}`
    edit((c) => ({
      ...c,
      menus: [
        ...c.menus,
        {
          key,
          visible: true,
          label: 'New menu',
          icon: '',
          href: '/shop',
          columns: [
            {
              heading: 'Shop',
              links: [{ label: 'All products', href: '/shop' }],
            },
          ],
        },
      ],
    }))
    openAndScroll(key)
  }

  const hasInvalid =
    config.menus.some(
      (m) =>
        !isValidHref(m.href) ||
        m.columns.some((c) => c.links.some((l) => !isValidHref(l.href))) ||
        [m.featured, m.featured2].some(
          (f) => f && (!isValidHref(f.href) || !isValidHref(f.image ?? '')),
        ),
    ) || config.navLinks.some((l) => !isValidHref(l.href))

  const save = async () => {
    if (!storeId) return toast.error('Store not loaded yet')
    if (hasInvalid)
      return toast.error(
        'Fix the highlighted links first. They must start with / or https://',
      )
    setSaving(true)
    try {
      const res = await fetch('/api/admin/mega-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, config }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to save menu')
      setConfig(data.config)
      setIsCustomised(true)
      setDirty(false)
      toast.success(
        'Menu saved. It will be live on the website within a minute',
      )
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save menu')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!storeId) return
    setConfirmReset(false)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/mega-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeId, reset: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset')
      setConfig(data.config)
      setIsCustomised(false)
      setDirty(false)
      setOpenKey(null)
      toast.success('Menu reset to the default')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='w-full'>
      {/* Sticky header with the save controls */}
      <div className='sticky -top-4 z-20 -mx-4 -mt-4 mb-5 border-b border-[#E1E3E5] bg-white px-4 py-3 lg:-top-6 lg:-mx-6 lg:-mt-6 lg:px-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#008060]/10 text-[#008060]'>
              <Icon.Layout size={20} />
            </span>
            <div className='min-w-0'>
              <h1 className='font-sora text-[20px] font-semibold leading-tight text-[#202223]'>
                Website Menu
              </h1>
              <p className='text-[12.5px] text-[#6D7175]'>
                The menu at the top of your website.{' '}
                {isCustomised
                  ? 'Using your custom menu.'
                  : 'Showing the original default menu.'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {dirty ? (
              <span className='mr-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8A6116]'>
                <span className='h-2 w-2 rounded-full bg-[#F5A623]' /> Unsaved
                changes
              </span>
            ) : (
              !loading && (
                <span className='mr-1 inline-flex items-center gap-1.5 text-[12px] text-[#6D7175]'>
                  <span className='h-2 w-2 rounded-full bg-[#2EAD7A]' /> All
                  changes saved
                </span>
              )
            )}
            {isCustomised &&
              (confirmReset ? (
                <Button onClick={reset} disabled={saving}>
                  <span className='text-[#D72C0D]'>Confirm reset?</span>
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmReset(true)}
                  disabled={saving || loading}
                >
                  <Icon.Reset size={14} /> Reset to default
                </Button>
              ))}
            <Button
              variant='primary'
              onClick={save}
              disabled={saving || loading || !dirty}
            >
              {saving ? <Icon.Spinner size={14} /> : <Icon.Save size={14} />}
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className='space-y-3'>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className='h-[66px] animate-pulse rounded-xl border border-[#E1E3E5] bg-[#F6F7F8]'
            />
          ))}
        </div>
      ) : (
        <div className='space-y-6 pb-10'>
          <HeaderPreview config={config} onPick={openAndScroll} />

          {hasInvalid && (
            <div className='flex items-start gap-2 rounded-xl border border-[#F0C4BC] bg-[#FFF6F4] px-4 py-3 text-[12.5px] text-[#8E2A18]'>
              <span className='mt-0.5 shrink-0'>
                <Icon.Alert size={15} />
              </span>
              <span>
                Some links are highlighted in red. A link must start with{' '}
                <b>/</b> (a page on your site) or <b>https://</b>.
              </span>
            </div>
          )}

          <section className='space-y-3'>
            <div className='flex items-end justify-between gap-3'>
              <div>
                <h2 className='text-[15px] font-semibold text-[#202223]'>
                  Main menus
                </h2>
                <p className='text-[12.5px] text-[#6D7175]'>
                  Sports and categories with a dropdown. Use the arrows to
                  reorder, the switch to show or hide.
                </p>
              </div>
              <Button onClick={addMenu} disabled={config.menus.length >= 12}>
                <Icon.Plus size={14} /> Add menu
              </Button>
            </div>
            {config.menus.map((m, i) => (
              <MenuEditor
                key={m.key}
                menu={m}
                index={i}
                total={config.menus.length}
                open={openKey === m.key}
                onToggleOpen={() =>
                  setOpenKey(openKey === m.key ? null : m.key)
                }
                onChange={(next) => setMenu(i, next)}
                onMove={(dir) =>
                  edit((c) => ({ ...c, menus: move(c.menus, i, i + dir) }))
                }
                onRemove={() =>
                  edit((c) => ({
                    ...c,
                    menus: c.menus.filter((_, xi) => xi !== i),
                  }))
                }
              />
            ))}
            {config.menus.length === 0 && (
              <div className='rounded-xl border border-dashed border-[#C9CCCF] py-8 text-center text-[13px] text-[#8C9196]'>
                No menus yet. Add one to get started.
              </div>
            )}
          </section>

          <section className='rounded-xl border border-[#E1E3E5] bg-white'>
            <div className='flex items-end justify-between gap-3 border-b border-[#E1E3E5] px-5 py-4'>
              <div>
                <h2 className='text-[15px] font-semibold text-[#202223]'>
                  Top links
                </h2>
                <p className='text-[12.5px] text-[#6D7175]'>
                  Simple links next to the menus, like New Arrivals or Sale.
                </p>
              </div>
              <Button
                disabled={config.navLinks.length >= 10}
                onClick={() =>
                  edit((c) => ({
                    ...c,
                    navLinks: [
                      ...c.navLinks,
                      { label: '', href: '', visible: true },
                    ],
                  }))
                }
              >
                <Icon.Plus size={14} /> Add link
              </Button>
            </div>
            <div className='space-y-2 p-4'>
              {config.navLinks.length > 0 && (
                <div className='hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-2 px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8C9196] md:grid'>
                  <span>Link name</span>
                  <span>Page link</span>
                  <span className='w-[196px]' />
                </div>
              )}
              {config.navLinks.map((l, i) => (
                <div
                  key={i}
                  className='grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]'
                >
                  <Input
                    value={l.label}
                    onChange={(v) => setNav(i, { label: v })}
                    placeholder='Sale'
                    maxLength={40}
                  />
                  <Input
                    value={l.href}
                    invalid={!isValidHref(l.href)}
                    onChange={(v) => setNav(i, { href: v })}
                    placeholder='/shop?badge=SALE'
                  />
                  <div className='flex items-center justify-end gap-0.5'>
                    <IconButton
                      label={
                        l.highlight
                          ? 'Highlighted (click to remove)'
                          : 'Highlight this link'
                      }
                      active={!!l.highlight}
                      onClick={() => setNav(i, { highlight: !l.highlight })}
                    >
                      <Icon.Star size={15} filled={!!l.highlight} />
                    </IconButton>
                    <span className='mx-1.5'>
                      <Toggle
                        on={l.visible}
                        label='Show this link on the website'
                        onChange={(v) => setNav(i, { visible: v })}
                      />
                    </span>
                    <IconButton
                      label='Move up'
                      disabled={i === 0}
                      onClick={() =>
                        edit((c) => ({
                          ...c,
                          navLinks: move(c.navLinks, i, i - 1),
                        }))
                      }
                    >
                      <Icon.Up size={14} />
                    </IconButton>
                    <IconButton
                      label='Move down'
                      disabled={i === config.navLinks.length - 1}
                      onClick={() =>
                        edit((c) => ({
                          ...c,
                          navLinks: move(c.navLinks, i, i + 1),
                        }))
                      }
                    >
                      <Icon.Down size={14} />
                    </IconButton>
                    <DeleteButton
                      label='Delete link'
                      onConfirm={() =>
                        edit((c) => ({
                          ...c,
                          navLinks: c.navLinks.filter((_, xi) => xi !== i),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
              {config.navLinks.length === 0 && (
                <p className='py-3 text-center text-[12.5px] text-[#8C9196]'>
                  No top links.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
