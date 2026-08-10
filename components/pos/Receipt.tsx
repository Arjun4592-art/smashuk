import { CURRENCY_SYMBOL, SITE_NAME } from '@/lib/constants'
import type { CartDisplayItem } from '@/types'

interface Props {
  orderId: string
  items: CartDisplayItem[]
  subtotal: number
  discountAmount: number
  gst: number
  total: number
  payMethod: string
  splitPayments?: { method: string; amount: number }[] | null
  cashier: string
  onNewSale: () => void
  onPrint: () => void
  onEmail: () => void
}

const fmt = (n: number) =>
  CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-GB')

const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}

export default function Receipt({
  orderId,
  items,
  subtotal,
  discountAmount,
  gst,
  total,
  payMethod,
  splitPayments,
  cashier,
  onNewSale,
  onPrint,
  onEmail,
}: Props) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const change = payMethod === 'cash' ? Math.ceil(total) - total : 0

  return (
    <div
      className='flex flex-col h-full items-center justify-center p-6 print:p-0'
      style={{ background: '#F6F6F7' }}
    >
      {/* ── On-screen card (hidden when printing) ─────────────────────── */}
      <div
        className='w-full max-w-sm rounded-xl overflow-hidden print:hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Success header */}
        <div
          className='flex flex-col items-center py-6 px-4'
          style={{ background: '#F2F7F5', borderBottom: '1px solid #E1E3E5' }}
        >
          <div
            className='w-14 h-14 rounded-full flex items-center justify-center mb-3'
            style={{ background: '#008060' }}
          >
            <svg
              width='28'
              height='28'
              viewBox='0 0 24 24'
              fill='none'
              stroke='white'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M20 6L9 17l-5-5' />
            </svg>
          </div>
          <h2
            className='text-lg font-semibold mb-0.5'
            style={{ color: '#202223' }}
          >
            Payment successful
          </h2>
          <p className='text-sm' style={{ color: '#6D7175' }}>
            {PAY_LABELS[payMethod] || payMethod}
            {change > 0 && (
              <span style={{ color: '#008060' }}> · Change: {fmt(change)}</span>
            )}
          </p>
          {payMethod === 'split' &&
            splitPayments &&
            splitPayments.length > 0 && (
              <div className='flex gap-2 mt-1.5 flex-wrap justify-center'>
                {splitPayments.map((s) => (
                  <span
                    key={s.method}
                    className='text-[11px] px-2 py-0.5 rounded-full font-medium'
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E1E3E5',
                      color: '#6D7175',
                    }}
                  >
                    {PAY_LABELS[s.method] || s.method}: {fmt(s.amount)}
                  </span>
                ))}
              </div>
            )}
        </div>

        {/* Receipt body (preview) */}
        <div className='px-5 py-4'>
          <ReceiptBody
            orderId={orderId}
            items={items}
            subtotal={subtotal}
            discountAmount={discountAmount}
            gst={gst}
            total={total}
            payMethod={payMethod}
            splitPayments={splitPayments}
            cashier={cashier}
            dateStr={dateStr}
            timeStr={timeStr}
          />
        </div>

        {/* Actions */}
        <div
          className='px-4 pb-4 space-y-2'
          style={{ borderTop: '1px solid #E1E3E5', paddingTop: '12px' }}
        >
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={onPrint}
              className='flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-[#F6F6F7]'
              style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
              >
                <polyline points='6 9 6 2 18 2 18 9' />
                <path d='M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2' />
                <rect x='6' y='14' width='12' height='8' />
              </svg>
              Print
            </button>
            <button
              onClick={onEmail}
              className='flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-[#F6F6F7]'
              style={{ borderColor: '#E1E3E5', color: '#6D7175' }}
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
              >
                <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
                <polyline points='22,6 12,13 2,6' />
              </svg>
              Email
            </button>
          </div>

          <button
            onClick={onNewSale}
            className='w-full py-2.5 rounded-lg text-sm font-semibold transition-colors'
            style={{ background: '#008060', color: '#FFFFFF' }}
          >
            New sale
          </button>
        </div>
      </div>

      {/* ── Print-only thermal receipt (hidden on screen) ──────────────── */}
      <div className='hidden print:block print-receipt'>
        <ReceiptBody
          orderId={orderId}
          items={items}
          subtotal={subtotal}
          discountAmount={discountAmount}
          gst={gst}
          total={total}
          payMethod={payMethod}
          splitPayments={splitPayments}
          cashier={cashier}
          dateStr={dateStr}
          timeStr={timeStr}
          printMode
        />
      </div>

      {/* ── Print styles ────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: #fff !important;
          }
          /* Hide everything outside the print receipt */
          body * {
            visibility: hidden;
          }
          .print-receipt, .print-receipt * {
            visibility: visible;
          }
          .print-receipt {
            position: absolute;
            top: 0;
            left: 0;
            width: 80mm;
          }
        }
      `}</style>
    </div>
  )
}

// ─── Shared receipt body — used for both on-screen preview and print ─────────
function ReceiptBody({
  orderId,
  items,
  subtotal,
  discountAmount,
  gst,
  total,
  payMethod,
  splitPayments,
  cashier,
  dateStr,
  timeStr,
  printMode = false,
}: {
  orderId: string
  items: CartDisplayItem[]
  subtotal: number
  discountAmount: number
  gst: number
  total: number
  payMethod: string
  splitPayments?: { method: string; amount: number }[] | null
  cashier: string
  dateStr: string
  timeStr: string
  printMode?: boolean
}) {
  if (printMode) {
    // ── Thermal receipt layout: monospace, dashed separators, 80mm ──────────
    return (
      <div
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          color: '#000',
          width: '80mm',
          padding: '4mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Store header */}
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div
            style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '1px' }}
          >
            {SITE_NAME}
          </div>
          <div style={{ fontSize: '10px', marginTop: '1mm' }}>Tax Invoice</div>
          <div style={{ fontSize: '10px', marginTop: '1mm' }}>
            {dateStr} &nbsp;·&nbsp; {timeStr}
          </div>
          <div style={{ fontSize: '10px' }}>
            Order: {orderId} &nbsp;·&nbsp; Staff: {cashier}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Items header */}
        <div
          style={{
            display: 'flex',
            fontSize: '10px',
            fontWeight: 700,
            marginBottom: '1mm',
          }}
        >
          <span style={{ flex: 1 }}>ITEM</span>
          <span style={{ width: '20mm', textAlign: 'center' }}>QTY</span>
          <span style={{ width: '22mm', textAlign: 'right' }}>AMOUNT</span>
        </div>

        <div style={{ borderTop: '1px dashed #000', marginBottom: '1mm' }} />

        {/* Items */}
        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: '1.5mm' }}>
            <div style={{ fontSize: '11px', fontWeight: 600 }}>{item.name}</div>
            <div style={{ display: 'flex', fontSize: '11px' }}>
              <span style={{ flex: 1, color: '#555' }}>
                {fmt(item.price)} x {item.quantity}
              </span>
              <span style={{ width: '20mm', textAlign: 'center' }}>
                {item.quantity}
              </span>
              <span
                style={{ width: '22mm', textAlign: 'right', fontWeight: 600 }}
              >
                {fmt(item.price * item.quantity)}
              </span>
            </div>
          </div>
        ))}

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '11px' }}>
          <Row label='Subtotal' value={fmt(subtotal)} />
          {discountAmount > 0 && (
            // BUG FIX: `discount` here is `customDiscount`, a currency
            // AMOUNT (which may also combine a coupon), not a percentage —
            // labelling it "(X%)" was misleading. Keep the receipt to the
            // one unambiguous number: the £ amount actually taken off.
            <Row label='Discount' value={`-${fmt(discountAmount)}`} />
          )}
          <Row label='VAT (20%)' value={fmt(gst)} />
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Grand total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '2mm',
          }}
        >
          <span>TOTAL</span>
          <span>{fmt(total)}</span>
        </div>

        {/* Payment method / split breakdown */}
        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
        <div style={{ fontSize: '11px' }}>
          {payMethod === 'split' &&
          splitPayments &&
          splitPayments.length > 0 ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: '1mm' }}>
                PAYMENT (SPLIT)
              </div>
              {splitPayments.map((s) => (
                <Row
                  key={s.method}
                  label={PAY_LABELS[s.method] || s.method}
                  value={fmt(s.amount)}
                />
              ))}
            </>
          ) : (
            <Row
              label='Payment mode'
              value={PAY_LABELS[payMethod] || payMethod}
            />
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            marginTop: '3mm',
            lineHeight: 1.6,
          }}
        >
          <div>Thank you for shopping with us!</div>
          <div>Goods once sold will not be taken back</div>
          <div style={{ marginTop: '2mm' }}>* * *</div>
        </div>
      </div>
    )
  }

  // ── On-screen preview layout (existing style) ────────────────────────────
  return (
    <>
      {/* Store + order info */}
      <div
        className='text-center pb-3 mb-3'
        style={{ borderBottom: '1px dashed #E1E3E5' }}
      >
        <p className='text-sm font-semibold' style={{ color: '#202223' }}>
          {SITE_NAME}
        </p>
        <p className='text-xs mt-0.5' style={{ color: '#8C9196' }}>
          {dateStr} · {timeStr}
        </p>
        <p className='text-xs mt-0.5' style={{ color: '#8C9196' }}>
          {orderId} · {cashier}
        </p>
      </div>

      {/* Items */}
      <div
        className='space-y-1.5 pb-3 mb-3'
        style={{ borderBottom: '1px dashed #E1E3E5' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className='flex justify-between text-xs'
            style={{ color: '#6D7175' }}
          >
            <span className='flex-1 truncate pr-2'>
              {item.name}{' '}
              <span style={{ color: '#8C9196' }}>×{item.quantity}</span>
            </span>
            <span className='flex-shrink-0'>
              {fmt(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className='space-y-1.5'>
        <div
          className='flex justify-between text-xs'
          style={{ color: '#6D7175' }}
        >
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div
            className='flex justify-between text-xs'
            style={{ color: '#008060' }}
          >
            {/* BUG FIX: same issue as the printable receipt above —
                `discount` is a currency amount, not a percentage. */}
            <span>Discount</span>
            <span>-{fmt(discountAmount)}</span>
          </div>
        )}
        <div
          className='flex justify-between text-xs'
          style={{ color: '#6D7175' }}
        >
          <span>VAT (20%)</span>
          <span>{fmt(gst)}</span>
        </div>
        <div
          className='flex justify-between pt-2 mt-1'
          style={{ borderTop: '1px solid #E1E3E5' }}
        >
          <span className='text-sm font-semibold' style={{ color: '#202223' }}>
            Total
          </span>
          <span className='text-base font-bold' style={{ color: '#202223' }}>
            {fmt(total)}
          </span>
        </div>
      </div>

      <p className='text-center text-xs mt-4' style={{ color: '#8C9196' }}>
        Thank you for shopping at {SITE_NAME}!
      </p>
    </>
  )
}

// Small helper for print rows
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1mm',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
