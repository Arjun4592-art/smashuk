'use client'

/**
 * Shared "Shopify mobile" order UI primitives.
 * Used by: dashboard order page, POS order detail, return modal, timeline.
 *
 * Mobile  → full-bleed white sections separated by grey gaps (like the app)
 * Desktop → the same sections become rounded, bordered cards
 */

import Link from 'next/link'
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ')

/* ────────────────────────── Icons ────────────────────────── */

type IconProps = { size?: number; className?: string }

function Svg({
  size = 20,
  className,
  children,
  sw = 1.7,
}: IconProps & { children: ReactNode; sw?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={sw}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {children}
    </svg>
  )
}

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d='M15 18l-6-6 6-6' />
  </Svg>
)
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d='M18 6L6 18M6 6l12 12' />
  </Svg>
)
export const IconPrinter = (p: IconProps) => (
  <Svg {...p}>
    <path d='M6 9V3h12v6' />
    <path d='M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2' />
    <rect x='6' y='14' width='12' height='7' rx='1' />
  </Svg>
)
export const IconDots = (p: IconProps) => (
  <Svg {...p} sw={0}>
    <circle cx='5' cy='12' r='1.8' fill='currentColor' />
    <circle cx='12' cy='12' r='1.8' fill='currentColor' />
    <circle cx='19' cy='12' r='1.8' fill='currentColor' />
  </Svg>
)
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x='3' y='5' width='18' height='14' rx='2' />
    <path d='M3 7l9 6 9-6' />
  </Svg>
)
export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d='M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z' />
  </Svg>
)
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x='9' y='9' width='12' height='12' rx='2' />
    <path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
  </Svg>
)
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d='M9 18l6-6-6-6' />
  </Svg>
)
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d='M6 9l6 6 6-6' />
  </Svg>
)
export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d='M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z' />
    <path d='M3.3 7L12 12l8.7-5M12 22V12' />
  </Svg>
)
export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d='M22 2L11 13' />
    <path d='M22 2l-7 20-4-9-9-4 20-7z' />
  </Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p} sw={2.2}>
    <path d='M4 12.5l5 5L20 6.5' />
  </Svg>
)

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className='animate-spin'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.4'
      strokeLinecap='round'
      aria-hidden='true'
    >
      <path d='M21 12a9 9 0 11-6.2-8.56' />
    </svg>
  )
}

/* ────────────────────────── Buttons ────────────────────────── */

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline'

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005c45]',
  secondary:
    'bg-white text-[#202223] border border-[#C9CCCF] hover:bg-[#F6F6F7] active:bg-[#F1F2F3]',
  danger: 'bg-[#D82C0D] text-white hover:bg-[#b8250b]',
  dangerOutline:
    'bg-white text-[#D82C0D] border border-[#D82C0D] hover:bg-[#FFF4F4]',
}

export function btnClass(variant: BtnVariant = 'secondary', full = false) {
  return cx(
    'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-[15px] font-semibold',
    'transition-colors select-none cursor-pointer no-underline',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    full && 'w-full',
    BTN_VARIANT[variant],
  )
}

export function Btn({
  variant = 'secondary',
  loading,
  full,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  loading?: boolean
  full?: boolean
}) {
  return (
    <button
      type='button'
      {...rest}
      disabled={disabled || loading}
      className={cx(btnClass(variant, full), className)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

/** Circular grey icon button (back / print / more) */
export const roundBtnClass =
  'w-10 h-10 rounded-full bg-[#F1F2F3] hover:bg-[#E1E3E5] active:bg-[#C9CCCF] text-[#202223] ' +
  'flex items-center justify-center shrink-0 transition-colors cursor-pointer no-underline ' +
  'disabled:opacity-50'

export function RoundButton({
  label,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type='button'
      aria-label={label}
      {...rest}
      className={cx(roundBtnClass, rest.className)}
    >
      {children}
    </button>
  )
}

/* ────────────────────────── Badge ────────────────────────── */

export type Tone = 'yellow' | 'gray' | 'green' | 'blue' | 'red' | 'orange'

const TONES: Record<Tone, string> = {
  yellow: 'bg-[#FFC453]/25 text-[#916A00]',
  gray: 'bg-[#6D7175]/10 text-[#6D7175]',
  green: 'bg-[#008060]/10 text-[#008060]',
  blue: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  red: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  orange: 'bg-[#FFC453]/25 text-[#916A00]',
}

function BadgeGlyph({ kind }: { kind: 'empty' | 'partial' | 'full' }) {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' aria-hidden='true'>
      {kind === 'empty' && (
        <circle
          cx='6'
          cy='6'
          r='4.6'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.4'
          strokeDasharray='2 2'
        />
      )}
      {kind === 'partial' && (
        <>
          <circle
            cx='6'
            cy='6'
            r='4.6'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.4'
          />
          <path d='M6 1.4a4.6 4.6 0 010 9.2z' fill='currentColor' />
        </>
      )}
      {kind === 'full' && <circle cx='6' cy='6' r='5.2' fill='currentColor' />}
    </svg>
  )
}

export function Badge({
  tone = 'gray',
  glyph,
  children,
}: {
  tone?: Tone
  glyph?: 'empty' | 'partial' | 'full'
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 h-6 px-2 rounded-lg text-[12.5px] font-medium whitespace-nowrap',
        TONES[tone],
      )}
    >
      {glyph && <BadgeGlyph kind={glyph} />}
      {children}
    </span>
  )
}

/* ────────────────────────── Sections ────────────────────────── */

export function Section({
  children,
  className,
  plainOnMobile,
}: {
  children: ReactNode
  className?: string
  /** timeline style: grey (no card) on mobile, card on desktop */
  plainOnMobile?: boolean
}) {
  return (
    <section
      className={cx(
        plainOnMobile ? 'bg-transparent lg:bg-white' : 'bg-white',
        'lg:rounded-xl lg:border lg:border-[#E1E3E5]',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className='flex items-center justify-between gap-3 min-h-9'>
      {typeof children === 'string' ? (
        <h2 className='text-[15px] font-semibold text-[#202223]'>{children}</h2>
      ) : (
        <div>{children}</div>
      )}
      {right}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px bg-[#E1E3E5]', className)} />
}

export function MoneyRow({
  label,
  sub,
  value,
  bold,
  tone,
}: {
  label: ReactNode
  sub?: ReactNode
  value: ReactNode
  bold?: boolean
  tone?: 'red' | 'green'
}) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='min-w-0'>
        <p
          className={cx(
            'text-[15px] text-[#202223]',
            bold && 'font-semibold',
            tone === 'red' && 'text-[#D82C0D]',
          )}
        >
          {label}
        </p>
        {sub && <p className='text-[12.5px] text-[#6D7175] mt-0.5'>{sub}</p>}
      </div>
      <p
        className={cx(
          'text-[15px] text-[#202223] shrink-0 tabular-nums',
          bold && 'font-semibold',
          tone === 'red' && 'text-[#D82C0D]',
          tone === 'green' && 'text-[#008060]',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function ItemRow({
  thumb,
  title,
  chips,
  meta,
  total,
  children,
}: {
  thumb?: string | null
  title: string
  chips?: string[]
  meta?: ReactNode
  total?: ReactNode
  children?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className='flex gap-3 py-3'>
      <div className='w-14 h-14 rounded-lg border border-[#E1E3E5] bg-[#FAFAFA] flex items-center justify-center overflow-hidden shrink-0 text-[#C4C8CC]'>
        {thumb && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=''
            className='w-full h-full object-cover'
            onError={() => setFailed(true)}
          />
        ) : (
          <IconBox size={22} />
        )}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-[15px] font-medium text-[#202223] leading-snug break-words'>
          {title}
        </p>
        {chips && chips.length > 0 && (
          <div className='flex flex-wrap gap-1.5 mt-1'>
            {chips.map((c) => (
              <span
                key={c}
                className='px-2 py-0.5 rounded-md bg-[#F1F2F3] text-[12.5px] text-[#6D7175]'
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {meta && <p className='text-[13px] text-[#6D7175] mt-1'>{meta}</p>}
        {children}
      </div>
      {total && (
        <p className='text-[15px] text-[#202223] shrink-0 tabular-nums'>
          {total}
        </p>
      )}
    </div>
  )
}

/* ────────────────────────── Popover menu ────────────────────────── */

export type MenuItem = {
  label: string
  onClick?: () => void
  href?: string
  danger?: boolean
  hidden?: boolean
  disabled?: boolean
}

export function PopMenu({
  label,
  icon,
  items,
}: {
  label: string
  icon: ReactNode
  items: MenuItem[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const visible = items.filter((i) => !i.hidden)
  if (visible.length === 0) return null

  const itemCls = (i: MenuItem) =>
    cx(
      'w-full text-left px-5 py-3 text-[15px] flex items-center no-underline transition-colors',
      i.danger ? 'text-[#D82C0D]' : 'text-[#202223]',
      i.disabled
        ? 'opacity-40 pointer-events-none'
        : 'hover:bg-[#F6F6F7] active:bg-[#F1F2F3] cursor-pointer',
    )

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        aria-label={label}
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={roundBtnClass}
      >
        {icon}
      </button>
      {open && (
        <div
          role='menu'
          className='absolute right-0 top-full mt-2 z-50 min-w-[220px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-black/5'
        >
          {visible.map((i) =>
            i.href ? (
              <Link
                key={i.label}
                href={i.href}
                role='menuitem'
                className={itemCls(i)}
                onClick={() => setOpen(false)}
              >
                {i.label}
              </Link>
            ) : (
              <button
                key={i.label}
                type='button'
                role='menuitem'
                disabled={i.disabled}
                className={itemCls(i)}
                onClick={() => {
                  setOpen(false)
                  i.onClick?.()
                }}
              >
                {i.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────── Sheet (bottom sheet / dialog) ────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', esc)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  // Portal → escapes any transformed / overflow-hidden ancestor (POS modal etc.)
  return createPortal(
    <div
      className='fixed inset-0 z-[70] flex items-end sm:items-center justify-center'
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <div className='relative w-full sm:max-w-md bg-white rounded-t-[20px] sm:rounded-2xl shadow-2xl max-h-[88dvh] flex flex-col'>
        <div className='flex justify-center pt-2 sm:hidden'>
          <div className='w-10 h-1 rounded-full bg-[#C9CCCF]' />
        </div>
        <div className='flex items-center justify-between px-5 pt-3 pb-2 shrink-0'>
          <h3 className='text-[17px] font-semibold text-[#202223]'>{title}</h3>
          <RoundButton label='Close' onClick={onClose} className='w-9 h-9'>
            <IconClose size={18} />
          </RoundButton>
        </div>
        <div className='px-5 pb-4 overflow-y-auto'>{children}</div>
        {footer && (
          <div className='px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#E1E3E5] shrink-0'>
            {footer}
          </div>
        )}
        {!footer && <div className='pb-[env(safe-area-inset-bottom)]' />}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className='grid grid-cols-2 gap-3'>
          <Btn onClick={onClose}>Go back</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      }
    >
      <p className='text-[15px] text-[#6D7175] leading-relaxed'>{message}</p>
    </Sheet>
  )
}

/* ────────────────────────── Customer card ────────────────────────── */

export async function copyText(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(okMsg)
  } catch {
    toast.error('Could not copy')
  }
}

export function CustomerCard({
  name,
  email,
  phone,
  addressLabel = 'Shipping address',
  addressLines,
  profileHref,
  walkIn,
}: {
  name: string
  email?: string | null
  phone?: string | null
  addressLabel?: string
  addressLines?: string[]
  profileHref?: string
  walkIn?: boolean
}) {
  const [sheet, setSheet] = useState<null | 'email' | 'phone'>(null)
  const lines = (addressLines ?? []).filter(Boolean)

  return (
    <Section className='px-4 py-4 lg:px-5'>
      <SectionTitle
        right={
          profileHref ? (
            <PopMenu
              label='Customer actions'
              icon={<IconDots />}
              items={[{ label: 'View customer profile', href: profileHref }]}
            />
          ) : undefined
        }
      >
        Customer
      </SectionTitle>

      {profileHref ? (
        <Link
          href={profileHref}
          className='flex items-center justify-between gap-2 mt-1 text-[15px] text-[#202223] no-underline'
        >
          <span className='truncate'>{name}</span>
          <IconChevronRight size={18} className='text-[#8C9196] shrink-0' />
        </Link>
      ) : (
        <p
          className={cx(
            'mt-1 text-[15px] truncate',
            walkIn ? 'text-[#6D7175]' : 'text-[#202223]',
          )}
        >
          {name}
        </p>
      )}

      {!walkIn && (
        <div className='grid grid-cols-2 gap-3 mt-4'>
          <Btn disabled={!email} onClick={() => setSheet('email')}>
            <IconMail size={18} />
            <span className='truncate'>
              Email<span className='lg:hidden'> details</span>
            </span>
          </Btn>
          <Btn disabled={!phone} onClick={() => setSheet('phone')}>
            <IconPhone size={18} />
            <span className='truncate'>
              Phone<span className='lg:hidden'> details</span>
            </span>
          </Btn>
        </div>
      )}

      {lines.length > 0 && (
        <div className='flex items-start justify-between gap-3 mt-5'>
          <div className='min-w-0'>
            <p className='text-[13px] text-[#6D7175]'>{addressLabel}</p>
            <div className='mt-0.5 text-[15px] leading-relaxed text-[#202223]'>
              {lines.map((l, i) => (
                <span key={i} className='block'>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <button
            type='button'
            aria-label='Copy address'
            onClick={() => copyText(lines.join('\n'), 'Address copied')}
            className='w-9 h-9 -mr-1.5 flex items-center justify-center rounded-lg text-[#6D7175] hover:bg-[#F6F6F7] cursor-pointer shrink-0'
          >
            <IconCopy size={19} />
          </button>
        </div>
      )}

      <Sheet
        open={sheet === 'email'}
        onClose={() => setSheet(null)}
        title='Email details'
        footer={
          <div className='grid grid-cols-2 gap-3'>
            <Btn onClick={() => copyText(email ?? '', 'Email copied')}>
              <IconCopy size={17} /> Copy
            </Btn>
            <a href={`mailto:${email}`} className={btnClass('primary', true)}>
              <IconMail size={17} /> Send email
            </a>
          </div>
        }
      >
        <p className='text-[13px] text-[#6D7175]'>{name}</p>
        <p className='text-[17px] text-[#202223] break-all mt-0.5'>{email}</p>
      </Sheet>

      <Sheet
        open={sheet === 'phone'}
        onClose={() => setSheet(null)}
        title='Phone details'
        footer={
          <div className='grid grid-cols-2 gap-3'>
            <Btn onClick={() => copyText(phone ?? '', 'Number copied')}>
              <IconCopy size={17} /> Copy
            </Btn>
            <a href={`tel:${phone}`} className={btnClass('primary', true)}>
              <IconPhone size={17} /> Call
            </a>
          </div>
        }
      >
        <p className='text-[13px] text-[#6D7175]'>{name}</p>
        <p className='text-[17px] text-[#202223] mt-0.5'>{phone}</p>
      </Sheet>
    </Section>
  )
}

/* ────────────────────────── Timeline bits ────────────────────────── */

export function TimelineDay({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='mt-5 first:mt-0'>
      <p className='text-[13px] font-semibold text-[#202223] mb-3 pl-6'>
        {label}
      </p>
      <div>{children}</div>
    </div>
  )
}

export function TimelineItem({
  time,
  children,
  sub,
  action,
}: {
  time: string
  children: ReactNode
  sub?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className={cx(
        'relative pl-6 pb-5 last:pb-0',
        'before:absolute before:left-[4px] before:top-[18px] before:bottom-[-2px] before:w-px before:bg-[#C9CCCF] last:before:hidden',
      )}
    >
      <span className='absolute left-0 top-[5px] w-[9px] h-[9px] rounded-full bg-[#8C9196] ring-4 ring-[#F6F6F7] lg:ring-white' />
      <p className='text-[12.5px] font-semibold text-[#6D7175] leading-none pt-1'>
        {time}
      </p>
      <div className='text-[15px] text-[#202223] leading-snug mt-1.5 break-words'>
        {children}
      </div>
      {sub && <p className='text-[13px] text-[#6D7175] mt-0.5'>{sub}</p>}
      {action && <div className='mt-1'>{action}</div>}
    </div>
  )
}

/** "pp_stripe_stripe" → "stripe", "pp_system_default" → "system default" */
export function providerLabel(id?: string | null) {
  if (!id) return 'Payment'
  const parts = id.replace(/^pp_/, '').split('_')
  return parts.length > 1 && parts[0] === parts[1] ? parts[0] : parts.join(' ')
}
