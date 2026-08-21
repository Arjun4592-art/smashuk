'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getAnalytics } from '@/lib/api/dashboard'
import { useAuthStore } from '@/store/authStore'

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  revenue: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <line x1='12' y1='1' x2='12' y2='23' />
      <path d='M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />
    </svg>
  ),
  orders: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
      <line x1='3' y1='6' x2='21' y2='6' />
      <path d='M16 10a4 4 0 01-8 0' />
    </svg>
  ),
  customers: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 00-3-3.87' />
      <path d='M16 3.13a4 4 0 010 7.75' />
    </svg>
  ),
  avgOrder: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <line x1='18' y1='20' x2='18' y2='10' />
      <line x1='12' y1='20' x2='12' y2='4' />
      <line x1='6' y1='20' x2='6' y2='14' />
      <line x1='2' y1='20' x2='22' y2='20' />
    </svg>
  ),
  conversion: (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />
    </svg>
  ),
  arrowUp: (
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
    >
      <polyline points='18 15 12 9 6 15' />
    </svg>
  ),
  arrowDown: (
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
    >
      <polyline points='6 9 12 15 18 9' />
    </svg>
  ),
  download: (
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
      <path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' />
      <polyline points='7 10 12 15 17 10' />
      <line x1='12' y1='15' x2='12' y2='3' />
    </svg>
  ),
  calendar: (
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
      <rect x='3' y='4' width='18' height='18' rx='2' />
      <line x1='16' y1='2' x2='16' y2='6' />
      <line x1='8' y1='2' x2='8' y2='6' />
      <line x1='3' y1='10' x2='21' y2='10' />
    </svg>
  ),
  trophy: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M6 9H4.5a2.5 2.5 0 010-5H6' />
      <path d='M18 9h1.5a2.5 2.5 0 000-5H18' />
      <path d='M4 22h16' />
      <path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' />
      <path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' />
      <path d='M18 2H6v7a6 6 0 0012 0V2z' />
    </svg>
  ),
  map: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polygon points='3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21' />
      <line x1='9' y1='3' x2='9' y2='18' />
      <line x1='15' y1='6' x2='15' y2='21' />
    </svg>
  ),
  live: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='2' />
      <path d='M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14' />
    </svg>
  ),
  report: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
      <polyline points='14 2 14 8 20 8' />
      <line x1='16' y1='13' x2='8' y2='13' />
      <line x1='16' y1='17' x2='8' y2='17' />
    </svg>
  ),
  user: (
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
      <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  ),
  cart: (
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
      <circle cx='9' cy='21' r='1' />
      <circle cx='20' cy='21' r='1' />
      <path d='M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6' />
    </svg>
  ),
  eye: (
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
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  ),
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ChartMetric = 'revenue' | 'orders' | 'customers'
type ChartType = 'area' | 'bar' | 'line'

interface AnalyticsData {
  stats: {
    totalRevenue: number
    totalOrders: number
    uniqueCustomers: number
    avgOrderValue: number
  }
  chartData: {
    label: string
    revenue: number
    orders: number
    customers: number
  }[]
  topProducts: {
    rank: number
    name: string
    sold: number
    revenue: number
    growth: number
  }[]
  citiesData: { city: string; orders: number; revenue: number; pct: number }[]
  sportData: { name: string; value: number; color: string }[]
}

interface ReportRecord {
  id: string
  name: string
  type: string
  dateRange: string
  downloadedBy: string
  downloadedByEmail: string
  downloadedAt: string
  rowCount: number
  fileName: string
}

interface ScheduledReport {
  name: string
  freq: string
  channel: string
  active: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  // BUG FIX: this used to show "£1.5L" (Indian Lakh notation, 1L =
  // 100,000) past £100k — a leftover from this template's original
  // India-market version. UK/international convention is £ / K / M.
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `£${(n / 1000).toFixed(0)}K`
  return `£${n}`
}

function formatCurrencyFull(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-xl shadow-lg p-3 min-w-[150px]'>
      <p className='text-[11.5px] font-semibold text-[#6D7175] mb-2'>{label}</p>
      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          className='flex items-center justify-between gap-4'
        >
          <div className='flex items-center gap-1.5'>
            <span
              className='w-2 h-2 rounded-full'
              style={{ background: entry.color }}
            />
            <span className='text-[11.5px] text-[#6D7175] capitalize'>
              {entry.dataKey}
            </span>
          </div>
          <span className='text-[12px] font-semibold text-[#202223]'>
            {['revenue', 'website', 'pos', 'dashboard'].includes(entry.dataKey)
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  change,
  icon,
  color,
  loading,
}: {
  title: string
  value: string
  change: number
  icon: React.ReactNode
  color: string
  loading?: boolean
}) {
  const isPos = change >= 0
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
      <div className='flex items-start justify-between mb-4'>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
        >
          {icon}
        </div>
        {change !== 0 && (
          <span
            className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${isPos ? 'bg-[#008060]/10 text-[#008060]' : 'bg-[#D82C0D]/10 text-[#D82C0D]'}`}
          >
            {isPos ? Icons.arrowUp : Icons.arrowDown}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className='text-[12.5px] text-[#6D7175] mb-1'>{title}</p>
      {loading ? (
        <div className='h-7 w-28 bg-[#F1F1F1] rounded animate-pulse' />
      ) : (
        <p className='font-sora text-[24px] font-bold text-[#202223] leading-tight'>
          {value}
        </p>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return <div className='h-[260px] bg-[#F6F6F7] rounded-xl animate-pulse' />
}

// ── Scheduled Reports ─────────────────────────────────────────────────────────
function ScheduledReports() {
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
      <h3 className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
        Scheduled Reports
      </h3>
      <div className='flex flex-col items-center justify-center gap-1 py-8 px-5 text-center'>
        <p className='text-[13.5px] font-medium text-[#202223]'>
          Scheduled reports aren't set up yet
        </p>
        <p className='text-[12.5px] text-[#8C9196] max-w-sm'>
          This needs an email-scheduling backend (e.g. a cron job or queue) to
          actually send reports on a recurring basis.
        </p>
      </div>
    </div>
  )
}

// ── Main Content ──────────────────────────────────────────────────────────────
function SalesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') ?? 'overview'

  const { user } = useAuthStore()
  const [dateRange, setDateRange] = useState('last30')
  const [chartType, setChartType] = useState<ChartType>('area')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportHistory, setReportHistory] = useState<ReportRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [liveData, setLiveData] = useState<{
    connected: boolean
    activeVisitors?: number
    cartsActive?: number
    checkouts?: number
    todaysOrders?: { count: number; amount: number }
    error?: string
  } | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAnalytics(dateRange)
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    if (view !== 'live') return

    let cancelled = false

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/admin/analytics/live')
        const data = await res.json()
        if (!cancelled) setLiveData(data)
      } catch {
        if (!cancelled)
          setLiveData({ connected: false, error: 'Failed to fetch' })
      }
    }

    fetchLive()
    const interval = setInterval(fetchLive, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [view])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/admin/report-history', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setReportHistory(data.history ?? [])
      }
    } catch {
      // non-critical, silent fail
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    if (view === 'reports') fetchHistory()
  }, [view, fetchHistory])

  // Record a download in server-side history
  async function recordDownload(
    name: string,
    type: string,
    rowCount: number,
    fileName: string,
  ) {
    try {
      await fetch('/api/admin/report-history', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          dateRange,
          downloadedBy: user?.name ?? 'Admin',
          downloadedByEmail: user?.email ?? '',
          rowCount,
          fileName,
        }),
      })
      // Refresh history after recording
      fetchHistory()
    } catch {
      // non-critical
    }
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'reports', label: 'Reports' },
    { id: 'live', label: 'Live View', isLive: true },
  ]

  function setTab(id: string) {
    router.push(
      id === 'overview' ? '/dashboard/sales' : `/dashboard/sales?view=${id}`,
    )
  }

  const stats = analytics?.stats
  const chartData = analytics?.chartData ?? []
  const topProducts = analytics?.topProducts ?? []
  const citiesData = analytics?.citiesData ?? []
  const sportData = analytics?.sportData ?? []

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Sales & Analytics
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            Track your store performance and growth
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1.5 px-3 py-2 border border-[#E1E3E5] bg-white rounded-lg text-[#6D7175]'>
            {Icons.calendar}
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className='px-3 py-2 border border-[#E1E3E5] bg-white rounded-lg text-[13px] text-[#202223] outline-none cursor-pointer hover:border-[#8C9196] transition-colors'
          >
            <option value='today'>Today</option>
            <option value='last7'>Last 7 days</option>
            <option value='last30'>Last 30 days</option>
            <option value='last90'>Last 90 days</option>
            <option value='thisyear'>This year</option>
          </select>
          <button
            onClick={async () => {
              if (!analytics) {
                toast.error('Nothing to export yet')
                return
              }
              const rows = analytics.chartData.map((d) => ({
                Date: d.label,
                Revenue: d.revenue,
                Orders: d.orders,
                Customers: d.customers,
              }))
              const csv = Papa.unparse(rows)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `sales-export-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              toast.success('Exported sales data')
              const fileName2 = `sales-export-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
              await recordDownload(
                'Sales Export',
                'sales-export',
                rows.length,
                fileName2,
              )
            }}
            className='flex items-center gap-1.5 px-3 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors cursor-pointer'
          >
            {Icons.download} Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard
          title='Total Revenue'
          value={stats ? formatCurrencyFull(stats.totalRevenue) : '—'}
          change={0}
          icon={Icons.revenue}
          color='bg-[#008060]/10 text-[#008060]'
          loading={loading}
        />
        <StatCard
          title='Total Orders'
          value={stats ? stats.totalOrders.toLocaleString() : '—'}
          change={0}
          icon={Icons.orders}
          color='bg-[#2C6ECB]/10 text-[#2C6ECB]'
          loading={loading}
        />
        <StatCard
          title='Unique Customers'
          value={stats ? stats.uniqueCustomers.toLocaleString() : '—'}
          change={0}
          icon={Icons.customers}
          color='bg-purple-100 text-purple-700'
          loading={loading}
        />
        <StatCard
          title='Avg Order Value'
          value={stats ? formatCurrencyFull(stats.avgOrderValue) : '—'}
          change={0}
          icon={Icons.avgOrder}
          color='bg-[#FFC453]/20 text-[#916A00]'
          loading={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className='px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          Failed to load analytics: {error}
          <button
            onClick={fetchAnalytics}
            className='ml-3 underline cursor-pointer bg-transparent border-none text-red-600'
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabbed card */}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        <div className='flex items-center border-b border-[#E1E3E5] px-4 overflow-x-auto [scrollbar-width:none]'>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${view === tab.id ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
            >
              {tab.label}
              {tab.isLive && (
                <span className='flex items-center gap-1 px-1.5 py-0.5 bg-[#D82C0D] text-white text-[9px] font-bold rounded-full'>
                  <span className='w-1 h-1 rounded-full bg-white animate-pulse' />{' '}
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {view === 'overview' && (
          <div className='p-5 space-y-5'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
              <div className='flex items-center gap-2'>
                {(['revenue', 'orders', 'customers'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-3 py-1.5 text-[12.5px] font-medium rounded-lg transition-colors capitalize cursor-pointer border ${chartMetric === m ? 'bg-[#008060] text-white border-[#008060]' : 'bg-white text-[#6D7175] border-[#E1E3E5] hover:bg-[#F6F6F7]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className='flex items-center border border-[#E1E3E5] rounded-lg overflow-hidden'>
                {(['area', 'bar', 'line'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`px-3 py-1.5 text-[12px] font-medium capitalize transition-colors cursor-pointer border-none ${chartType === t ? 'bg-[#008060] text-white' : 'bg-white text-[#6D7175] hover:bg-[#F6F6F7]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <ChartSkeleton />
            ) : chartData.length === 0 ? (
              <div className='h-[260px] flex items-center justify-center text-[13px] text-[#8C9196]'>
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={260}>
                {chartType === 'bar' ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke='#F1F1F1'
                      vertical={false}
                    />
                    <XAxis
                      dataKey='label'
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        chartMetric === 'revenue' ? formatCurrency(v) : v
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey={chartMetric}
                      fill='#008060'
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke='#F1F1F1'
                      vertical={false}
                    />
                    <XAxis
                      dataKey='label'
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        chartMetric === 'revenue' ? formatCurrency(v) : v
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type='monotone'
                      dataKey={chartMetric}
                      stroke='#008060'
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#008060' }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id='grad' x1='0' y1='0' x2='0' y2='1'>
                        <stop
                          offset='5%'
                          stopColor='#008060'
                          stopOpacity={0.12}
                        />
                        <stop
                          offset='95%'
                          stopColor='#008060'
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke='#F1F1F1'
                      vertical={false}
                    />
                    <XAxis
                      dataKey='label'
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8C9196' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        chartMetric === 'revenue' ? formatCurrency(v) : v
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type='monotone'
                      dataKey={chartMetric}
                      stroke='#008060'
                      strokeWidth={2}
                      fill='url(#grad)'
                      dot={false}
                      activeDot={{ r: 4, fill: '#008060' }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-[#E1E3E5]'>
              <div>
                <p className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
                  Orders by Sport
                </p>
                {loading ? (
                  <div className='h-36 bg-[#F6F6F7] rounded-xl animate-pulse' />
                ) : sportData.length === 0 ? (
                  <p className='text-[13px] text-[#8C9196]'>No data</p>
                ) : (
                  <div className='flex items-center gap-4'>
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={sportData}
                          cx='50%'
                          cy='50%'
                          innerRadius={40}
                          outerRadius={65}
                          dataKey='value'
                          paddingAngle={2}
                        >
                          {sportData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [
                            (v as number).toLocaleString(),
                            'Orders',
                          ]}
                          contentStyle={{
                            fontSize: 12,
                            border: '1px solid #E1E3E5',
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className='flex-1 space-y-2'>
                      {sportData.map((item) => {
                        const total = sportData.reduce((s, d) => s + d.value, 0)
                        return (
                          <div
                            key={item.name}
                            className='flex items-center gap-2'
                          >
                            <span
                              className='w-2.5 h-2.5 rounded-full shrink-0'
                              style={{ background: item.color }}
                            />
                            <span className='text-[12px] text-[#202223] flex-1'>
                              {item.name}
                            </span>
                            <span className='text-[12px] font-semibold text-[#202223]'>
                              {item.value}
                            </span>
                            <span className='text-[11px] text-[#8C9196] w-8 text-right'>
                              {Math.round((item.value / total) * 100)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className='font-sora text-[14px] font-semibold text-[#202223] mb-4'>
                  Period Summary
                </p>
                <div className='space-y-3'>
                  {[
                    {
                      label: 'Gross Revenue',
                      value: stats
                        ? formatCurrencyFull(stats.totalRevenue)
                        : '—',
                      sub: 'from captured orders',
                    },
                    {
                      label: 'Total Orders',
                      value: stats ? stats.totalOrders.toLocaleString() : '—',
                      sub: 'paid orders',
                    },
                    {
                      label: 'Avg Order Value',
                      value: stats
                        ? formatCurrencyFull(stats.avgOrderValue)
                        : '—',
                      sub: 'per order',
                      bold: true,
                    },
                    {
                      label: 'Unique Customers',
                      value: stats
                        ? stats.uniqueCustomers.toLocaleString()
                        : '—',
                      sub: 'in this period',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between py-2 ${item.bold ? 'border-t border-[#E1E3E5] pt-3' : ''}`}
                    >
                      <div>
                        <p
                          className={`text-[13px] ${item.bold ? 'font-semibold text-[#202223]' : 'text-[#6D7175]'}`}
                        >
                          {item.label}
                        </p>
                        <p className='text-[11px] text-[#8C9196]'>{item.sub}</p>
                      </div>
                      {loading ? (
                        <div className='h-4 w-20 bg-[#F1F1F1] rounded animate-pulse' />
                      ) : (
                        <p
                          className={`text-[13px] ${item.bold ? 'font-bold text-[#008060]' : 'font-medium text-[#202223]'}`}
                        >
                          {item.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='pt-4 border-t border-[#E1E3E5]'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='text-[#008060]'>{Icons.trophy}</div>
                <p className='font-sora text-[14px] font-semibold text-[#202223]'>
                  Top Products
                </p>
              </div>
              {loading ? (
                <div className='space-y-3'>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className='h-10 bg-[#F6F6F7] rounded-lg animate-pulse'
                    />
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <p className='text-[13px] text-[#8C9196]'>
                  No product data for this period
                </p>
              ) : (
                <div className='divide-y divide-[#F1F1F1]'>
                  {topProducts.map((product) => (
                    <div
                      key={product.rank}
                      className='flex items-center gap-4 py-3 hover:bg-[#F6F6F7] px-2 rounded-lg transition-colors'
                    >
                      <span className='w-6 text-[13px] font-bold text-[#8C9196] shrink-0 text-center'>
                        {product.rank}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[13px] font-medium text-[#202223] truncate'>
                          {product.name}
                        </p>
                        <div className='flex items-center gap-2 mt-1.5'>
                          <div className='flex-1 h-1.5 bg-[#E1E3E5] rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-[#008060] rounded-full'
                              style={{
                                width: `${(product.revenue / (topProducts[0]?.revenue || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className='text-[11px] text-[#8C9196] shrink-0'>
                            {product.sold} sold
                          </span>
                        </div>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-[13px] font-semibold text-[#202223]'>
                          {formatCurrencyFull(product.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='pt-4 border-t border-[#E1E3E5]'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='text-[#6D7175]'>{Icons.map}</div>
                <p className='font-sora text-[14px] font-semibold text-[#202223]'>
                  Sales by City
                </p>
              </div>
              {loading ? (
                <div className='space-y-3'>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className='h-7 bg-[#F6F6F7] rounded animate-pulse'
                    />
                  ))}
                </div>
              ) : citiesData.length === 0 ? (
                <p className='text-[13px] text-[#8C9196]'>
                  No city data available
                </p>
              ) : (
                <div className='space-y-3'>
                  {citiesData.map((city) => (
                    <div key={city.city} className='flex items-center gap-4'>
                      <p className='text-[13px] font-medium text-[#202223] w-24 shrink-0'>
                        {city.city}
                      </p>
                      <div className='flex-1 h-2 bg-[#E1E3E5] rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-[#008060] rounded-full'
                          style={{ width: `${city.pct}%` }}
                        />
                      </div>
                      <span className='text-[12px] text-[#8C9196] w-8 text-right shrink-0'>
                        {city.pct}%
                      </span>
                      <span className='text-[12.5px] font-semibold text-[#202223] w-28 text-right shrink-0'>
                        {formatCurrencyFull(city.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='pt-4 border-t border-[#E1E3E5]'>
              <div className='flex items-center justify-between mb-4'>
                <p className='font-sora text-[14px] font-semibold text-[#202223]'>
                  Revenue Trend
                </p>
              </div>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart
                  data={analytics?.chartData ?? []}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='#F1F1F1'
                    vertical={false}
                  />
                  <XAxis
                    dataKey='label'
                    tick={{ fontSize: 11, fill: '#8C9196' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8C9196' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey='revenue'
                    fill='#008060'
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Reports ── */}
        {view === 'reports' && (
          <div className='p-5 space-y-5'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
                  Generated Reports
                </h2>
                <p className='text-[12.5px] text-[#6D7175] mt-0.5'>
                  Download detailed reports for your store
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!analytics) {
                    toast.error('Nothing to export yet')
                    return
                  }
                  const sections = [
                    '=== Sales ===',
                    Papa.unparse(
                      analytics.chartData.map((d) => ({
                        Date: d.label,
                        Revenue: d.revenue,
                        Orders: d.orders,
                        Customers: d.customers,
                      })),
                    ),
                    '',
                    '=== Top Products ===',
                    Papa.unparse(
                      analytics.topProducts.map((p) => ({
                        Rank: p.rank,
                        Product: p.name,
                        'Units Sold': p.sold,
                        Revenue: p.revenue,
                        'Growth %': p.growth,
                      })),
                    ),
                    '',
                    '=== Orders by City ===',
                    Papa.unparse(
                      analytics.citiesData.map((c) => ({
                        City: c.city,
                        Orders: c.orders,
                        Revenue: c.revenue,
                        '% of total': c.pct,
                      })),
                    ),
                  ]
                  const csv = sections.join('\n')
                  const blob = new Blob([csv], {
                    type: 'text/csv;charset=utf-8;',
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `full-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  toast.success('Report generated')
                  await recordDownload(
                    'Full Report',
                    'full',
                    analytics.chartData.length +
                      analytics.topProducts.length +
                      analytics.citiesData.length,
                    `full-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`,
                  )
                }}
                className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors'
              >
                {Icons.report} Generate Report
              </button>
            </div>
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              {[
                {
                  label: 'Sales Report',
                  icon: Icons.revenue,
                  color: 'bg-[#008060]/10 text-[#008060]',
                  desc: 'Revenue & orders',
                  rows: () =>
                    analytics?.chartData.map((d) => ({
                      Date: d.label,
                      Revenue: d.revenue,
                      Orders: d.orders,
                      Customers: d.customers,
                    })),
                },
                {
                  label: 'Product Report',
                  icon: Icons.trophy,
                  color: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
                  desc: 'Performance metrics',
                  rows: () =>
                    analytics?.topProducts.map((p) => ({
                      Rank: p.rank,
                      Product: p.name,
                      'Units Sold': p.sold,
                      Revenue: p.revenue,
                      'Growth %': p.growth,
                    })),
                },
                {
                  label: 'Customer Report',
                  icon: Icons.customers,
                  color: 'bg-purple-100 text-purple-700',
                  desc: 'Acquisition & retention',
                  rows: null, // needs a dedicated customers-analytics endpoint — not available on this page yet
                },
                {
                  label: 'Inventory Report',
                  icon: Icons.avgOrder,
                  color: 'bg-[#FFC453]/20 text-[#916A00]',
                  desc: 'Stock levels & value',
                  rows: null, // use the Inventory page's own "Export CSV" for this instead
                },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={async () => {
                    const rows = r.rows?.()
                    if (!rows || rows.length === 0) {
                      toast.info(
                        rows === undefined
                          ? 'Not available on this page yet — check the Inventory page for stock exports.'
                          : 'No data to export for this range yet.',
                      )
                      return
                    }
                    // BUG FIX: each report in this list returns a differently
                    // shaped row object, so TS infers a union type here that
                    // Papa.unparse's generic can't satisfy (TS2345), failing
                    // `next build`. The CSV export works fine with any of
                    // these shapes at runtime — only the type needed relaxing.
                    const fileName = `${r.label.toLowerCase().replace(/ /g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
                    const csv = Papa.unparse(rows as Record<string, unknown>[])
                    const blob = new Blob([csv], {
                      type: 'text/csv;charset=utf-8;',
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success(`${r.label} exported`)
                    await recordDownload(
                      r.label,
                      r.label.toLowerCase().replace(/ /g, '-'),
                      rows.length,
                      fileName,
                    )
                  }}
                  className='flex flex-col items-start gap-3 p-4 border border-[#E1E3E5] rounded-xl hover:border-[#008060]/30 hover:bg-[#F2F7F5] transition-all cursor-pointer bg-white text-left'
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${r.color}`}
                  >
                    {r.icon}
                  </div>
                  <div>
                    <p className='text-[13px] font-semibold text-[#202223]'>
                      {r.label}
                    </p>
                    <p className='text-[11.5px] text-[#6D7175]'>{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className='border border-[#E1E3E5] rounded-xl overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-3 bg-[#F6F6F7] border-b border-[#E1E3E5]'>
                <p className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                  Recent Downloads
                </p>
                {reportHistory.length > 0 && (
                  <button
                    onClick={async () => {
                      setClearingHistory(true)
                      try {
                        await fetch('/api/admin/report-history', {
                          method: 'DELETE',
                          credentials: 'include',
                        })
                        setReportHistory([])
                        toast.success('History cleared')
                      } catch {
                        toast.error('Failed to clear history')
                      } finally {
                        setClearingHistory(false)
                      }
                    }}
                    disabled={clearingHistory}
                    className='text-[11.5px] text-[#D82C0D] hover:text-[#b02209] bg-transparent border-none cursor-pointer disabled:opacity-50'
                  >
                    {clearingHistory ? 'Clearing…' : 'Clear all'}
                  </button>
                )}
              </div>

              {historyLoading ? (
                <div className='divide-y divide-[#F1F1F1]'>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className='flex items-center gap-4 px-5 py-3.5 animate-pulse'
                    >
                      <div className='w-8 h-8 bg-[#F1F1F1] rounded-lg shrink-0' />
                      <div className='flex-1 space-y-2'>
                        <div className='w-40 h-2.5 bg-[#F1F1F1] rounded-full' />
                        <div className='w-28 h-2 bg-[#F1F1F1] rounded-full' />
                      </div>
                      <div className='w-24 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </div>
                  ))}
                </div>
              ) : reportHistory.length === 0 ? (
                <div className='flex flex-col items-center justify-center gap-1.5 py-10 px-5 text-center'>
                  <svg
                    width='28'
                    height='28'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#D1D5DB'
                    strokeWidth='1.5'
                  >
                    <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
                    <polyline points='14 2 14 8 20 8' />
                    <line x1='16' y1='13' x2='8' y2='13' />
                    <line x1='16' y1='17' x2='8' y2='17' />
                  </svg>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    No downloads yet
                  </p>
                  <p className='text-[12px] text-[#8C9196]'>
                    Reports you download above will appear here
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-[#F1F1F1]'>
                  {reportHistory.map((r) => {
                    const RANGE_LABELS: Record<string, string> = {
                      today: 'Today',
                      last7: 'Last 7 days',
                      last30: 'Last 30 days',
                      last90: 'Last 90 days',
                      thisyear: 'This year',
                    }
                    const TYPE_COLORS: Record<string, string> = {
                      full: 'bg-[#008060]/10 text-[#008060]',
                      'sales-report': 'bg-[#008060]/10 text-[#008060]',
                      'product-report': 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
                      'customer-report': 'bg-purple-100 text-purple-700',
                      'inventory-report': 'bg-[#FFC453]/20 text-[#916A00]',
                    }
                    const typeColor =
                      TYPE_COLORS[r.type] ?? 'bg-[#F1F1F1] text-[#6D7175]'
                    const downloadedAt = new Date(r.downloadedAt)
                    const timeAgo = (() => {
                      const diff = Date.now() - downloadedAt.getTime()
                      const mins = Math.floor(diff / 60000)
                      if (mins < 1) return 'Just now'
                      if (mins < 60) return `${mins}m ago`
                      const hrs = Math.floor(mins / 60)
                      if (hrs < 24) return `${hrs}h ago`
                      const days = Math.floor(hrs / 24)
                      if (days < 7) return `${days}d ago`
                      return downloadedAt.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    })()

                    // avatar initials from downloader name
                    const initials = r.downloadedBy
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <div
                        key={r.id}
                        className='flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors'
                      >
                        {/* Report type icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}
                        >
                          <svg
                            width='13'
                            height='13'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                          >
                            <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
                            <polyline points='14 2 14 8 20 8' />
                          </svg>
                        </div>

                        {/* Report info */}
                        <div className='flex-1 min-w-0'>
                          <p className='text-[13px] font-medium text-[#202223] truncate'>
                            {r.name}
                          </p>
                          <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
                            <span className='text-[11px] text-[#8C9196]'>
                              {r.rowCount} rows
                            </span>
                            <span className='text-[#D1D5DB] text-[10px]'>
                              ·
                            </span>
                            <span className='text-[11px] text-[#8C9196]'>
                              {RANGE_LABELS[r.dateRange] ?? r.dateRange}
                            </span>
                            <span className='text-[#D1D5DB] text-[10px]'>
                              ·
                            </span>
                            <span className='text-[11px] text-[#B0B5BA] font-mono truncate max-w-[160px]'>
                              {r.fileName}
                            </span>
                          </div>
                        </div>

                        {/* Who downloaded */}
                        <div className='flex items-center gap-2 shrink-0'>
                          <div
                            className='w-6 h-6 rounded-full bg-[#008060] flex items-center justify-center text-white text-[9px] font-bold'
                            title={r.downloadedByEmail || r.downloadedBy}
                          >
                            {initials || 'A'}
                          </div>
                          <div className='text-right hidden sm:block'>
                            <p className='text-[12px] font-medium text-[#202223]'>
                              {r.downloadedBy}
                            </p>
                            <p className='text-[11px] text-[#8C9196]'>
                              {timeAgo}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <ScheduledReports />
          </div>
        )}

        {/* ── Live View ── */}
        {view === 'live' && (
          <div className='p-5 space-y-5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {liveData?.connected ? (
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-[#008060]/10 border border-[#008060]/20 rounded-full'>
                    <span className='w-2 h-2 rounded-full bg-[#008060] animate-pulse' />
                    <span className='text-[12px] font-semibold text-[#008060]'>
                      LIVE
                    </span>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-[#8C9196]/10 border border-[#8C9196]/20 rounded-full'>
                    <span className='w-2 h-2 rounded-full bg-[#8C9196]' />
                    <span className='text-[12px] font-semibold text-[#6D7175]'>
                      {liveData === null ? 'CONNECTING…' : 'NOT CONNECTED'}
                    </span>
                  </div>
                )}
                <p className='text-[13px] text-[#6D7175]'>
                  Real-time store activity
                </p>
              </div>
            </div>
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              {[
                {
                  label: 'Active Visitors',
                  value: liveData?.connected
                    ? (liveData.activeVisitors ?? 0)
                    : '—',
                  icon: Icons.eye,
                },
                {
                  label: 'Carts Active',
                  value: liveData?.connected
                    ? (liveData.cartsActive ?? 0)
                    : '—',
                  icon: Icons.cart,
                },
                {
                  label: 'Checkouts',
                  value: liveData?.connected ? (liveData.checkouts ?? 0) : '—',
                  icon: Icons.orders,
                },
                {
                  label: "Today's Orders",
                  value: liveData?.todaysOrders?.count ?? 0,
                  sub: liveData?.todaysOrders
                    ? formatCurrencyFull(liveData.todaysOrders.amount)
                    : undefined,
                  icon: Icons.revenue,
                  color: 'text-[#2C6ECB]',
                  bg: 'bg-[#2C6ECB]/10',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className='bg-white border border-[#E1E3E5] rounded-xl p-4 flex items-center gap-3'
                >
                  <div
                    className={`w-10 h-10 ${stat.bg ?? 'bg-[#F6F6F7]'} ${stat.color ?? 'text-[#8C9196]'} rounded-lg flex items-center justify-center shrink-0`}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p
                      className={`font-sora text-[24px] font-bold ${stat.color ?? 'text-[#8C9196]'} leading-none`}
                    >
                      {stat.value}
                    </p>
                    <p className='text-[11.5px] text-[#6D7175] mt-0.5'>
                      {stat.label}
                      {stat.sub ? ` · ${stat.sub}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className='border border-[#E1E3E5] rounded-xl overflow-hidden'>
              <div className='flex items-center gap-2 px-5 py-3 bg-[#F6F6F7] border-b border-[#E1E3E5]'>
                <p className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide'>
                  Active Visitors
                </p>
              </div>
              {liveData?.connected ? (
                <div className='flex flex-col items-center justify-center gap-2 py-12 px-5 text-center'>
                  <p className='font-sora text-[32px] font-bold text-[#008060]'>
                    {liveData.activeVisitors ?? 0}
                  </p>
                  <p className='text-[12.5px] text-[#8C9196]'>
                    people on smashuk.co right now, via Google Analytics
                  </p>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center gap-2 py-12 px-5 text-center'>
                  <p className='text-[13.5px] font-medium text-[#202223]'>
                    {liveData?.error
                      ? 'Could not reach Google Analytics'
                      : "Live visitor tracking isn't connected yet"}
                  </p>
                  <p className='text-[12.5px] text-[#8C9196] max-w-sm'>
                    {liveData?.error ??
                      'This requires a real-time analytics/session-tracking integration on the storefront (e.g. Google Analytics Realtime API or PostHog). Once connected, live visitor activity will show up here.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Fallback ──────────────────────────────────────────────────────────────────
function SalesPageFallback() {
  return (
    <div className='space-y-5 animate-pulse'>
      <div className='h-8 w-56 bg-[#E1E3E5] rounded-lg' />
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='h-28 bg-[#E1E3E5] rounded-xl' />
        ))}
      </div>
      <div className='h-96 bg-[#E1E3E5] rounded-xl' />
    </div>
  )
}

export default function DashboardSalesPage() {
  return (
    <Suspense fallback={<SalesPageFallback />}>
      <SalesPageContent />
    </Suspense>
  )
}
