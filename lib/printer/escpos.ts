// Minimal ESC/POS command builder for 58mm/80mm thermal receipt printers.
// Produces raw bytes that any ESC/POS-compatible printer (USB, Bluetooth SPP,
// or network/Ethernet on port 9100) understands — no vendor SDK required.

import { imageUrlToMonochromeRaster } from './escpos-image'

const ESC = 0x1b
const GS = 0x1d

export type PaperWidth = '58mm' | '80mm'

// Character columns per paper width at the default (Font A, 12x24) size.
const COLS: Record<PaperWidth, number> = {
  '58mm': 32,
  '80mm': 48,
}

export interface ReceiptLineItem {
  name: string
  variantTitle?: string | null
  quantity: number
  lineTotal: number // already formatted amount for the line (price*qty - discount)
}

export interface ReceiptData {
  storeName: string
  addressLine1: string
  addressLine2: string
  phone: string
  orderId: string
  dateStr: string
  timeStr: string
  cashier: string
  items: ReceiptLineItem[]
  subtotal: number
  discountAmount: number
  discountLabel: string
  giftCardAmount: number
  giftCardMasked?: string
  tax: number
  vatPct: number
  total: number
  rounding: number
  payMethodLabel: string
  change: number
  splitPayments?: { label: string; amount: number }[] | null
  shipTo?: {
    name: string
    address1: string
    cityPostcode: string
  } | null
  orderNote?: string | null
  currencySymbol: string
  footerLine1?: string
  footerLine2?: string
  // Optional extras — omit either to skip them on the printed receipt.
  logoUrl?: string | null
  trackingUrl?: string | null
}

class Builder {
  private bytes: number[] = []
  private cols: number

  constructor(width: PaperWidth) {
    this.cols = COLS[width]
    // Initialize printer
    this.bytes.push(ESC, 0x40)
  }

  raw(...b: number[]) {
    this.bytes.push(...b)
    return this
  }

  text(str: string) {
    // Printers expect a single-byte code page; strip characters outside
    // basic Latin-1 range to avoid garbled output, then encode.
    const cleaned = str.replace(/[^\x00-\xFF]/g, '?')
    for (let i = 0; i < cleaned.length; i++) {
      this.bytes.push(cleaned.charCodeAt(i) & 0xff)
    }
    return this
  }

  line(str = '') {
    this.text(str)
    this.bytes.push(0x0a)
    return this
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0a)
    return this
  }

  align(mode: 'left' | 'center' | 'right') {
    const n = mode === 'left' ? 0 : mode === 'center' ? 1 : 2
    return this.raw(ESC, 0x61, n)
  }

  bold(on: boolean) {
    return this.raw(ESC, 0x45, on ? 1 : 0)
  }

  doubleSize(on: boolean) {
    // GS ! n — width/height multiplier. 0x11 = double both, 0x00 = normal.
    return this.raw(GS, 0x21, on ? 0x11 : 0x00)
  }

  hr(char = '-') {
    return this.line(char.repeat(this.cols))
  }

  // Two-column row: label left, value right, padded to full width.
  row(label: string, value: string) {
    const space = Math.max(1, this.cols - label.length - value.length)
    return this.line(label + ' '.repeat(space) + value)
  }

  cut() {
    // GS V 1 — partial cut
    return this.raw(GS, 0x56, 1)
  }

  openDrawer() {
    // ESC p 0 25 250 — standard pulse to pin 2, common on receipt printers
    // with an attached cash drawer.
    return this.raw(ESC, 0x70, 0, 25, 250)
  }

  // ---- QR code ----
  // Uses the printer's own built-in QR renderer (GS ( k function set) —
  // we only send the text data, no pixel generation needed on our side.
  qrCode(text: string, moduleSize = 6, ecLevel: 'L' | 'M' | 'Q' | 'H' = 'M') {
    const EC: Record<string, number> = { L: 48, M: 49, Q: 50, H: 51 }

    const gsK = (cn: number, fn: number, params: number[]) => {
      const len = params.length + 2 // cn + fn + params
      this.raw(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, cn, fn, ...params)
    }

    // Model 2 (standard QR), size 0
    gsK(49, 65, [50, 0])
    // Module size (dot size per QR "pixel", 1-16)
    gsK(49, 67, [moduleSize])
    // Error correction level
    gsK(49, 69, [EC[ecLevel]])

    // Store QR data: GS ( k pL pH cn(49) fn(80) m(48) d1..dk
    const dataBytes = Array.from(new TextEncoder().encode(text))
    const storeLen = dataBytes.length + 3
    this.raw(
      GS,
      0x28,
      0x6b,
      storeLen & 0xff,
      (storeLen >> 8) & 0xff,
      49,
      80,
      48,
      ...dataBytes,
    )

    // Print the stored QR code
    gsK(49, 81, [48])
    return this
  }

  // ---- Raster image (logo / bitmap) ----
  // Expects a 1-bit-per-pixel raster already packed 8 pixels per byte
  // (MSB = leftmost pixel), matching escpos-image.ts's toMonochromeRaster().
  image(widthPx: number, heightPx: number, raster: Uint8Array) {
    const widthBytes = Math.ceil(widthPx / 8)
    this.raw(
      GS,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      heightPx & 0xff,
      (heightPx >> 8) & 0xff,
    )
    this.bytes.push(...Array.from(raster))
    return this
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes)
  }

  get width() {
    return this.cols
  }
}

function wrapText(str: string, cols: number): string[] {
  if (str.length <= cols) return [str]
  const words = str.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > cols) {
      if (cur) lines.push(cur.trim())
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur.trim())
  return lines
}

export async function buildReceiptEscPos(
  data: ReceiptData,
  width: PaperWidth = '80mm',
  openDrawer = false,
): Promise<Uint8Array> {
  const b = new Builder(width)
  const fmt = (n: number) =>
    data.currencySymbol + (Math.round(n * 100) / 100).toFixed(2)

  // Logo, if provided — printed before the store name, centered.
  if (data.logoUrl) {
    try {
      const logoMaxWidth = width === '80mm' ? 300 : 200
      const { widthPx, heightPx, raster } = await imageUrlToMonochromeRaster(
        data.logoUrl,
        logoMaxWidth,
      )
      b.align('center')
      b.image(widthPx, heightPx, raster)
      b.feed(1)
    } catch {
      // Logo fetch/convert failed (offline, CORS, bad URL, etc) — skip it
      // rather than failing the whole receipt print.
    }
  }

  b.align('center')
  b.bold(true)
  b.doubleSize(true)
  b.line(data.storeName)
  b.doubleSize(false)
  b.bold(false)
  b.line(data.addressLine1)
  b.line(data.addressLine2)
  b.line(data.phone)
  b.feed(1)
  b.bold(true)
  b.line('SALE')
  b.bold(false)
  b.hr()

  b.align('left')
  for (const item of data.items) {
    const amount = fmt(item.lineTotal)
    const nameLines = wrapText(
      `${item.name} x${item.quantity}`,
      b.width - amount.length - 1,
    )
    nameLines.forEach((ln, idx) => {
      if (idx === nameLines.length - 1) {
        b.row(ln, amount)
      } else {
        b.line(ln)
      }
    })
    if (item.variantTitle) {
      b.line(`  ${item.variantTitle}`)
    }
  }
  b.hr()

  b.row('Subtotal', fmt(data.subtotal))
  if (data.discountAmount > 0) {
    b.row(data.discountLabel, `-${fmt(data.discountAmount)}`)
  }
  if (data.giftCardAmount > 0) {
    b.row(
      `Gift card${data.giftCardMasked ? ` (${data.giftCardMasked})` : ''}`,
      `-${fmt(data.giftCardAmount)}`,
    )
  }
  b.hr()
  b.bold(true)
  b.doubleSize(true)
  b.row('TOTAL', fmt(data.total))
  b.doubleSize(false)
  b.bold(false)
  b.row(`Incl. VAT (${data.vatPct}%)`, fmt(data.tax))
  if (data.rounding > 0) {
    b.row('Cash rounding', fmt(data.rounding))
  }
  b.feed(1)

  b.row('Payment', data.payMethodLabel)
  if (data.splitPayments && data.splitPayments.length > 0) {
    for (const s of data.splitPayments) {
      b.row(`  ${s.label}`, fmt(s.amount))
    }
  }
  if (data.change > 0) {
    b.row('Change', fmt(data.change))
  }

  if (data.shipTo) {
    b.feed(1)
    b.hr()
    b.bold(true)
    b.line('Ship to')
    b.bold(false)
    b.line(data.shipTo.name)
    b.line(data.shipTo.address1)
    b.line(data.shipTo.cityPostcode)
  }

  if (data.orderNote) {
    b.feed(1)
    b.hr()
    b.bold(true)
    b.line('Order note')
    b.bold(false)
    for (const ln of wrapText(data.orderNote, b.width)) b.line(ln)
  }

  if (data.trackingUrl) {
    b.feed(1)
    b.align('center')
    b.qrCode(data.trackingUrl)
    b.feed(1)
    b.line('Scan to track your order')
  }

  b.feed(1)
  b.hr()
  b.align('center')
  b.line(`${data.dateStr}, ${data.timeStr}`)
  b.line(`Receipt: ${data.orderId}`)
  b.line(`Staff: ${data.cashier}`)
  b.feed(1)
  b.bold(true)
  b.line(data.footerLine1 ?? 'Thank you for shopping with us!')
  b.bold(false)
  if (data.footerLine2) b.line(data.footerLine2)

  b.feed(3)
  if (openDrawer) b.openDrawer()
  b.cut()

  return b.toBytes()
}

export function buildTestPrintEscPos(width: PaperWidth = '80mm'): Uint8Array {
  const b = new Builder(width)
  b.align('center')
  b.bold(true)
  b.doubleSize(true)
  b.line('TEST PRINT')
  b.doubleSize(false)
  b.bold(false)
  b.hr()
  b.align('left')
  b.line('If you can read this clearly,')
  b.line('your printer is connected and')
  b.line('working correctly.')
  b.feed(1)
  b.line(new Date().toLocaleString())
  b.feed(3)
  b.cut()
  return b.toBytes()
}
