import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── HTML → plain text ───────────────────────────────────────────
// product.description comes from the Shopify CSV import as raw HTML
// (e.g. "<p>...</p><h3>Key features</h3><ul><li>...</li></ul>"). Anywhere
// it's shown as a plain text teaser (card blurbs, meta tags) — not the
// full formatted description tab — it needs to be stripped to plain text
// first, or the literal tags show up on the page.
export function stripHtml(html: string, maxLength = 160): string {
  if (!html) return ''
  const text = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

// ─── Tailwind class merger ───────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency formatter ─────────────────────────────────────────
export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ─── Date formatters ────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

// ─── Number formatters ──────────────────────────────────────────
export function formatNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

// ─── String helpers ─────────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return `${text.slice(0, length)}...`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function titleCase(text: string): string {
  return text
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ')
}

// ─── Order helpers ──────────────────────────────────────────────
export function generateOrderNumber(): string {
  return `AS-${Date.now().toString().slice(-6)}`
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-[#FFC453]/15 text-[#916A00]',
    confirmed: 'bg-[#2C6ECB]/15 text-[#2C6ECB]',
    processing: 'bg-[#2C6ECB]/15 text-[#2C6ECB]',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-[#008060]/15 text-[#008060]',
    cancelled: 'bg-[#D82C0D]/15 text-[#D82C0D]',
    refunded: 'bg-gray-100 text-gray-600',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-600'
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-[#FFC453]/15 text-[#916A00]',
    paid: 'bg-[#008060]/15 text-[#008060]',
    failed: 'bg-[#D82C0D]/15 text-[#D82C0D]',
    refunded: 'bg-gray-100 text-gray-600',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-600'
}

// ─── Discount calculator ────────────────────────────────────────
export function calculateDiscount(
  price: number,
  originalPrice: number,
): number {
  if (!originalPrice || originalPrice <= price) return 0
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

// ─── Cart total calculator ──────────────────────────────────────
export function calculateCartTotals(
  subtotal: number,
  discountAmount = 0,
  shippingThreshold = 999,
) {
  const shipping = subtotal >= shippingThreshold ? 0 : 99
  const taxableAmount = subtotal - discountAmount
  const tax = Math.round(taxableAmount * 0.20) // 20% UK VAT
  const total = taxableAmount + shipping + tax
  return { shipping, tax, total }
}

// ─── Local storage helpers ──────────────────────────────────────
export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error('Failed to save to localStorage')
  }
}

// ─── POS scan beep ───────────────────────────────────────────────
// Short synth beep for the "Sound on scan" setting (Settings tab) — no
// audio asset needed, just a WebAudio oscillator. Safe to call from
// anywhere; silently no-ops server-side or if WebAudio isn't available.
export function playScanBeep(): void {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.12)
    oscillator.onended = () => ctx.close()
  } catch {
    // Sound is a nice-to-have, never let it break the sale.
  }
}
