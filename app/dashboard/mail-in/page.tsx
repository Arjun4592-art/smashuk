'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getShippingLabel, updateOrderStatus } from '@/lib/api/dashboard'
import { printShippingLabel } from '@/lib/printer/print-shipping-label'
import { formatCurrency } from '@/lib/utils'

type Stage =
  | 'ship_box'
  | 'awaiting_rackets'
  | 'ready_to_dispatch'
  | 'returning'
  | 'completed'
  | 'cancelled'

type Leg = 'box' | 'inbound' | 'return'

interface MailInRow {
  id: string
  display_id: number | null
  email: string | null
  name: string | null
  city: string | null
  created_at: string
  stage: Stage
  needs_box: boolean
  box_shipped: boolean
  sport: string | null
  rackets: number
  priority: boolean
  total: number
  currency_code: string | null
  inbound_label_status: string | null
  inbound_label_error: string | null
  labels: { box: boolean; inbound: boolean; return: boolean }
  tracking: { box: string | null; inbound: string | null }
}

const STAGES: { key: Stage | 'active' | 'all'; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'ship_box', label: 'Ship box' },
  { key: 'awaiting_rackets', label: 'Awaiting rackets' },
  { key: 'ready_to_dispatch', label: 'Ready to dispatch' },
  { key: 'returning', label: 'On the way back' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
]

const STAGE_BADGE: Record<Stage, { text: string; cls: string }> = {
  ship_box: { text: 'Ship box', cls: 'bg-[#FFF1E3] text-[#8A4B00]' },
  awaiting_rackets: {
    text: 'Awaiting rackets',
    cls: 'bg-[#FFF5CC] text-[#7A5A00]',
  },
  ready_to_dispatch: {
    text: 'Ready to dispatch',
    cls: 'bg-[#E3F1FF] text-[#00527C]',
  },
  returning: { text: 'On the way back', cls: 'bg-[#E3F1FF] text-[#00527C]' },
  completed: { text: 'Completed', cls: 'bg-[#E3F5E1] text-[#0D5C28]' },
  cancelled: { text: 'Cancelled', cls: 'bg-[#F1F2F3] text-[#5C5F62]' },
}

const LEG_LABEL: Record<Leg, string> = {
  box: 'Box label',
  inbound: 'Customer label',
  return: 'Return label',
}

const btn =
  'inline-flex items-center justify-center rounded-lg border border-[#C9CCCF] bg-white px-3 py-1.5 text-[13px] font-medium text-[#202223] hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50'
const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-[#202223] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50'

const PAGE_SIZE = 15

const iconBtn =
  'w-8 h-8 flex items-center justify-center text-[#6D7175] hover:text-[#202223] border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] rounded-lg no-underline transition-all'
const btnWarn =
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#F3B8AE] bg-[#FFF4F2] px-3 py-1.5 text-[13px] font-semibold text-[#B42318] hover:bg-[#FDE7E3] disabled:cursor-not-allowed disabled:opacity-50'

function PrinterIcon() {
  return (
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
      <path d='M6 9V2h12v7' />
      <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' />
      <rect x='6' y='14' width='12' height='8' />
    </svg>
  )
}

// Dropdown that lists the printable labels for one order. Rendered with
// position:fixed so the table's overflow-x-auto wrapper can't clip it.
function LabelsMenu({
  legs,
  busyLeg,
  onPrint,
}: {
  legs: Leg[]
  busyLeg: Leg | null
  onPrint: (leg: Leg) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{
    top?: number
    bottom?: number
    right: number
  }>({ right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const menuHeight = legs.length * 40 + 40
      const right = Math.max(8, window.innerWidth - rect.right)
      setPos(
        rect.bottom + menuHeight > window.innerHeight
          ? { bottom: window.innerHeight - rect.top + 6, right }
          : { top: rect.bottom + 6, right },
      )
    }
    setOpen((o) => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        type='button'
        className={`${btn} gap-1.5 whitespace-nowrap`}
        onClick={toggle}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        <PrinterIcon />
        Labels
        <span className='rounded-full bg-[#F1F2F3] px-1.5 text-[11px] leading-4 text-[#5C5F62]'>
          {legs.length}
        </span>
        <svg
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d='m6 9 6 6 6-6' />
        </svg>
      </button>
      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div
            role='menu'
            className='fixed z-50 w-52 rounded-xl border border-[#E1E3E5] bg-white p-1.5 shadow-lg'
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          >
            <p className='px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8C9196]'>
              Print label
            </p>
            {legs.map((leg) => (
              <button
                key={leg}
                type='button'
                role='menuitem'
                disabled={busyLeg !== null}
                onClick={() => {
                  setOpen(false)
                  onPrint(leg)
                }}
                className='flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-[13px] text-[#202223] hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50'
              >
                <span className='text-[#6D7175]'>
                  <PrinterIcon />
                </span>
                {busyLeg === leg ? 'Printing…' : LEG_LABEL[leg]}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom range' },
]

// Returns [start, end] as epoch ms (null = open ended), in the viewer's local time.
function dateRange(
  preset: DatePreset,
  from: string,
  to: string,
): { start: number | null; end: number | null } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (preset) {
    case 'today':
      return { start: new Date(y, m, d).getTime(), end: null }
    case '7d':
      return { start: new Date(y, m, d - 6).getTime(), end: null }
    case '30d':
      return { start: new Date(y, m, d - 29).getTime(), end: null }
    case 'month':
      return { start: new Date(y, m, 1).getTime(), end: null }
    case 'custom':
      return {
        start: from ? new Date(`${from}T00:00:00`).getTime() : null,
        end: to ? new Date(`${to}T23:59:59.999`).getTime() : null,
      }
    default:
      return { start: null, end: null }
  }
}

const dateInput =
  'h-9 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7] px-3 text-[13px] text-[#202223] outline-none focus:border-[#008060] focus:bg-white'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export default function MailInOrdersPage() {
  const [rows, setRows] = useState<MailInRow[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Stage | 'active' | 'all'>('active')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [page, setPage] = useState(1)
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mail-in-orders', {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Could not load orders')
      setRows(data.orders ?? [])
      setError('')
    } catch (err: any) {
      setError(err.message ?? 'Could not load orders')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Orders inside the selected date range. Everything below (tab counts,
  // stat boxes, table) is based on this list.
  const dated = useMemo(() => {
    const { start, end } = dateRange(datePreset, dateFrom, dateTo)
    if (start === null && end === null) return rows ?? []
    return (rows ?? []).filter((r) => {
      const t = new Date(r.created_at).getTime()
      if (start !== null && t < start) return false
      if (end !== null && t > end) return false
      return true
    })
  }, [rows, datePreset, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, all: dated.length }
    for (const r of dated) {
      c[r.stage] = (c[r.stage] ?? 0) + 1
      if (r.stage !== 'completed' && r.stage !== 'cancelled') c.active += 1
    }
    return c
  }, [dated])

  const amounts = useMemo(() => {
    const a: Record<string, number> = { active: 0 }
    for (const r of dated) {
      a[r.stage] = (a[r.stage] ?? 0) + (r.total ?? 0)
      if (r.stage !== 'completed' && r.stage !== 'cancelled')
        a.active += r.total ?? 0
    }
    return a
  }, [dated])

  // Orders that needed a box and whose box has already been posted out.
  const boxesShipped = useMemo(
    () =>
      dated.filter(
        (r) => r.needs_box && r.box_shipped && r.stage !== 'cancelled',
      ).length,
    [dated],
  )

  // Revenue = every order in the date range that is not cancelled.
  const revenue = useMemo(() => {
    let total = 0
    let n = 0
    for (const r of dated) {
      if (r.stage === 'cancelled') continue
      total += r.total ?? 0
      n += 1
    }
    return { total, n }
  }, [dated])

  const currency = (
    rows?.find((r) => r.currency_code)?.currency_code ?? 'gbp'
  ).toUpperCase()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dated.filter((r) => {
      if (filter === 'active') {
        if (r.stage === 'completed' || r.stage === 'cancelled') return false
      } else if (filter !== 'all' && r.stage !== filter) return false
      if (!q) return true
      return [String(r.display_id ?? ''), r.name ?? '', r.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [dated, filter, query])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = visible.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const stats = [
    {
      label: 'Active',
      main: String(counts.active ?? 0),
      sub: formatCurrency(amounts.active ?? 0, currency),
      color: 'text-[#202223]',
    },
    {
      label: 'Ship box',
      main: String(counts.ship_box ?? 0),
      sub: `${formatCurrency(amounts.ship_box ?? 0, currency)} · ${boxesShipped} shipped`,
      color: 'text-[#8A4B00]',
    },
    {
      label: 'Awaiting rackets',
      main: String(counts.awaiting_rackets ?? 0),
      sub: formatCurrency(amounts.awaiting_rackets ?? 0, currency),
      color: 'text-[#7A5A00]',
    },
    {
      label: 'Completed',
      main: String(counts.completed ?? 0),
      sub: formatCurrency(amounts.completed ?? 0, currency),
      color: 'text-[#008060]',
    },
    {
      label: 'Revenue',
      main: formatCurrency(revenue.total, currency),
      sub: `${revenue.n} ${revenue.n === 1 ? 'order' : 'orders'} · excl. cancelled`,
      color: 'text-[#2C6ECB]',
    },
  ]

  const legsFor = (row: MailInRow): Leg[] =>
    (['box', 'inbound', 'return'] as Leg[]).filter(
      (leg) => row.labels[leg] && !(leg === 'box' && !row.needs_box),
    )

  const printLeg = async (row: MailInRow, leg: Leg) => {
    const key = `${row.id}:${leg}`
    setBusy(key)
    try {
      const { label_url } = await getShippingLabel(row.id, leg)
      if (!label_url) {
        toast.error('Parcel2Go has not returned a label yet.')
        return
      }
      await printShippingLabel(
        `/api/admin/orders/${row.id}/shipping-label/file?leg=${leg}`,
      )
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to print label')
    } finally {
      setBusy('')
    }
  }

  const shipBox = async (row: MailInRow) => {
    if (
      !window.confirm(
        `Ship the box for order #${row.display_id}? The customer will be emailed a prepaid label to send their rackets back.`,
      )
    )
      return
    setBusy(`${row.id}:ship-box`)
    try {
      const result: any = await updateOrderStatus(row.id, 'ship-box')
      if (result?.mail_in_label?.ok === false) {
        toast.warning(
          `Box shipped, but the label was not emailed: ${result.mail_in_label.error ?? 'unknown error'}`,
        )
      } else {
        toast.success('Box shipped — label emailed to the customer')
      }
      await load()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to ship the box')
    } finally {
      setBusy('')
    }
  }

  const resendLabel = async (row: MailInRow) => {
    setBusy(`${row.id}:resend`)
    try {
      await updateOrderStatus(row.id, 'resend-mail-in-label')
      toast.success('Label emailed to the customer')
      await load()
    } catch (err: any) {
      toast.error(err.message ?? 'Could not send the label')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Mail-in stringing
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            {rows ? `${rows.length} mail-in orders total` : 'Loading…'} ·
            customers post their rackets to be restrung
          </p>
        </div>
        <button
          onClick={load}
          className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors'
        >
          Refresh
        </button>
      </div>

      <div className='grid grid-cols-2 xl:grid-cols-5 gap-4'>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className='bg-white border border-[#E1E3E5] rounded-xl p-5'
          >
            <p className='text-[12.5px] text-[#6D7175] mb-1'>{stat.label}</p>
            <p
              className={`font-sora text-[22px] font-bold leading-tight ${stat.color}`}
            >
              {rows ? stat.main : '—'}
            </p>
            <p className='mt-1 text-[13px] font-medium text-[#6D7175]'>
              {rows ? stat.sub : ' '}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          ⚠ Failed to load mail-in orders: {error}. Check Medusa backend
          connection.
        </div>
      )}

      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        <div className='flex items-center border-b border-[#E1E3E5] px-4 overflow-x-auto scrollbar-none'>
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setFilter(s.key)
                setPage(1)
              }}
              className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${filter === s.key ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
            >
              {s.label}{' '}
              <span className='ml-1.5 text-[10.5px] text-[#8C9196]'>
                {rows ? (counts[s.key] ?? 0) : ''}
              </span>
            </button>
          ))}
        </div>

        <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#8C9196'
              strokeWidth='2'
            >
              <circle cx='11' cy='11' r='8' />
              <path d='m21 21-4.3-4.3' />
            </svg>
            <input
              type='text'
              placeholder='Search order, name or email...'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none'
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className='text-[#8C9196] bg-transparent border-none cursor-pointer'
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value as DatePreset)
              setPage(1)
            }}
            aria-label='Filter by date'
            className={`${dateInput} cursor-pointer pr-8`}
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          {datePreset === 'custom' && (
            <div className='flex items-center gap-2'>
              <input
                type='date'
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                aria-label='From date'
                className={dateInput}
              />
              <span className='text-[12.5px] text-[#8C9196]'>to</span>
              <input
                type='date'
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                aria-label='To date'
                className={dateInput}
              />
            </div>
          )}
          {datePreset !== 'all' && (
            <button
              type='button'
              onClick={() => {
                setDatePreset('all')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
              className='h-9 cursor-pointer rounded-lg border border-[#C9CCCF] bg-white px-3 text-[13px] font-medium text-[#6D7175] hover:bg-[#F6F6F7]'
            >
              Clear
            </button>
          )}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                {['Order', 'Customer', 'Date', 'Stage', 'Box', 'Actions'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide ${i === 5 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className='divide-y divide-[#F1F1F1]'>
              {!rows && !error ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className='animate-pulse'>
                    {[24, 32, 20, 24, 16, 28].map((w, j) => (
                      <td key={j} className='px-4 py-3'>
                        <div
                          className='h-3 bg-[#E1E3E5] rounded'
                          style={{ width: w * 4 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-4 py-16 text-center'>
                    <p className='text-[14px] font-medium text-[#202223]'>
                      No mail-in orders found
                    </p>
                    <p className='text-[13px] text-[#6D7175]'>
                      Try adjusting your filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  const badge = STAGE_BADGE[r.stage]
                  const labelFailed =
                    r.inbound_label_status === 'failed' ||
                    (!r.inbound_label_status &&
                      !r.labels.inbound &&
                      r.stage !== 'ship_box' &&
                      r.stage !== 'cancelled')
                  const href = `/dashboard/orders/${r.id}?from=mail-in`
                  return (
                    <tr
                      key={r.id}
                      className='hover:bg-[#F6F6F7] transition-colors'
                    >
                      <td className='px-4 py-3 align-top'>
                        <Link
                          href={href}
                          className='text-[13px] font-semibold text-[#2C6ECB] hover:text-[#1a4f9e] no-underline'
                        >
                          #{r.display_id ?? r.id.slice(-6)}
                        </Link>
                        <p className='text-[11px] text-[#8C9196]'>
                          {r.rackets || '?'} {r.sport ? `${r.sport} ` : ''}
                          {r.rackets === 1 ? 'racket' : 'rackets'}
                        </p>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='flex items-center gap-2.5'>
                          <div className='w-7 h-7 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] text-[11px] font-bold shrink-0'>
                            {(r.name ?? r.email ?? 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className='min-w-0'>
                            <p className='text-[13px] font-medium text-[#202223] truncate'>
                              {r.name ?? r.email ?? 'Customer'}
                            </p>
                            <p className='text-[11px] text-[#8C9196]'>
                              {r.city ?? ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <span className='text-[12.5px] text-[#6D7175]'>
                          {fmtDate(r.created_at)}
                        </span>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                        {r.priority && (
                          <span className='ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#FFF1E3] text-[#8A4B00]'>
                            Priority
                          </span>
                        )}
                        {(r.tracking.box || r.tracking.inbound) && (
                          <p className='text-[10.5px] text-[#8C9196] mt-0.5'>
                            {r.tracking.box ? `Box: ${r.tracking.box}` : ''}
                            {r.tracking.box && r.tracking.inbound ? ' · ' : ''}
                            {r.tracking.inbound
                              ? `Customer: ${r.tracking.inbound}`
                              : ''}
                          </p>
                        )}
                        {labelFailed && r.stage !== 'ship_box' && (
                          <p className='text-[11px] text-[#D82C0D] mt-0.5 max-w-60'>
                            Customer label not emailed
                            {r.inbound_label_error
                              ? `: ${r.inbound_label_error}`
                              : '.'}
                          </p>
                        )}
                      </td>
                      <td className='px-4 py-3 align-top'>
                        {r.needs_box && r.box_shipped ? (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#E3F5E1] text-[#0D5C28]'>
                            Box shipped
                          </span>
                        ) : r.needs_box ? (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#FFF1E3] text-[#8A4B00]'>
                            Needs box
                          </span>
                        ) : (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F1F2F3] text-[#5C5F62]'>
                            Has box
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='flex items-center justify-end gap-2 whitespace-nowrap'>
                          {r.stage === 'ship_box' && (
                            <button
                              className={btnPrimary}
                              disabled={busy === `${r.id}:ship-box`}
                              onClick={() => shipBox(r)}
                            >
                              {busy === `${r.id}:ship-box`
                                ? 'Shipping…'
                                : 'Ship box'}
                            </button>
                          )}
                          {labelFailed && r.stage !== 'ship_box' && (
                            <button
                              className={btnWarn}
                              disabled={busy === `${r.id}:resend`}
                              onClick={() => resendLabel(r)}
                            >
                              {busy === `${r.id}:resend`
                                ? 'Sending…'
                                : 'Resend label'}
                            </button>
                          )}
                          {legsFor(r).length > 0 && (
                            <LabelsMenu
                              legs={legsFor(r)}
                              busyLeg={
                                (['box', 'inbound', 'return'] as Leg[]).find(
                                  (l) => busy === `${r.id}:${l}`,
                                ) ?? null
                              }
                              onPrint={(leg) => printLeg(r, leg)}
                            />
                          )}
                          <Link
                            href={href}
                            title='Open order'
                            aria-label='Open order'
                            className={iconBtn}
                          >
                            <svg
                              width='14'
                              height='14'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                              <circle cx='12' cy='12' r='3' />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className='flex items-center justify-between px-4 py-3 border-t border-[#E1E3E5]'>
          <p className='text-[12.5px] text-[#6D7175]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, visible.length)}
            </span>{' '}
            of{' '}
            <span className='font-medium text-[#202223]'>{visible.length}</span>
          </p>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 transition-colors'
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${safePage === i + 1 ? 'bg-[#008060] text-white border-none' : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 transition-colors'
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
