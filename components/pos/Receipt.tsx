import {
  CURRENCY_SYMBOL,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  CONTACT_PHONE,
  SITE_URL,
  VAT_RATE,
} from '@/lib/constants'
import type { CartDisplayItem } from '@/types'

interface ShippingAddress {
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone: string
}

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
  // Order-level discount source — lets the receipt label the discount row
  // with the coupon name (e.g. "sale") instead of a generic "Discount".
  couponCode?: string | null
  // Gift card redeemed against this sale (a tender, not a subtotal
  // discount — shown in the payment section with a masked code).
  giftCardCode?: string | null
  giftCardAmount?: number
  fulfillmentType?: 'pickup' | 'ship'
  shippingAddress?: ShippingAddress | null
  orderNote?: string
  onNewSale: () => void
  onPrint: () => void
  onEmail: () => void
}

const fmt = (n: number) =>
  CURRENCY_SYMBOL + (Math.round(n * 100) / 100).toFixed(2)

const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}

// Cash sales are collected rounded up to the nearest whole pound (no 1p/2p
// coins handled at the till) — the few pence difference is "cash rounding",
// refunded as part of the change. Card/split aren't rounded since the exact
// amount is charged electronically.
function cashRounding(total: number) {
  return Math.ceil(total) - total
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
  couponCode,
  giftCardCode,
  giftCardAmount = 0,
  fulfillmentType,
  shippingAddress,
  orderNote,
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
  const rounding = payMethod === 'cash' ? cashRounding(total) : 0
  const adjustedTotal = total + rounding
  const change = payMethod === 'cash' ? rounding : 0

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
            couponCode={couponCode}
            giftCardCode={giftCardCode}
            giftCardAmount={giftCardAmount}
            fulfillmentType={fulfillmentType}
            shippingAddress={shippingAddress}
            orderNote={orderNote}
            dateStr={dateStr}
            timeStr={timeStr}
            rounding={rounding}
            adjustedTotal={adjustedTotal}
            change={change}
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
          couponCode={couponCode}
          giftCardCode={giftCardCode}
          giftCardAmount={giftCardAmount}
          fulfillmentType={fulfillmentType}
          shippingAddress={shippingAddress}
          orderNote={orderNote}
          dateStr={dateStr}
          timeStr={timeStr}
          rounding={rounding}
          adjustedTotal={adjustedTotal}
          change={change}
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
  couponCode,
  giftCardCode,
  giftCardAmount = 0,
  fulfillmentType,
  shippingAddress,
  orderNote,
  dateStr,
  timeStr,
  rounding,
  adjustedTotal,
  change,
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
  couponCode?: string | null
  giftCardCode?: string | null
  giftCardAmount?: number
  fulfillmentType?: 'pickup' | 'ship'
  shippingAddress?: ShippingAddress | null
  orderNote?: string
  dateStr: string
  timeStr: string
  rounding: number
  adjustedTotal: number
  change: number
  printMode?: boolean
}) {
  const discountLabel = couponCode ? couponCode : 'Discount'
  const taxable = Math.max(0, subtotal - discountAmount)
  const vatPct = Math.round(VAT_RATE * 100)
  const maskedGiftCard = giftCardCode
    ? `**** **** ${giftCardCode.slice(-4)}`
    : ''
  const showShipTo = fulfillmentType === 'ship' && !!shippingAddress?.address_1
  const trackingUrl = `${SITE_URL}/orders/${encodeURIComponent(orderId)}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(trackingUrl)}`

  if (printMode) {
    // ── Thermal receipt layout: 80mm, matches the reference design ──────
    return (
      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: '11px',
          color: '#000',
          width: '80mm',
          padding: '4mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Store header */}
        <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
          <div
            style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}
          >
            {STORE_DISPLAY_NAME}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2mm', lineHeight: 1.5 }}>
            <div>{STORE_ADDRESS_LINE1}</div>
            <div>{STORE_ADDRESS_LINE2}</div>
            <div style={{ marginTop: '1mm' }}>{CONTACT_PHONE}</div>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '2px',
            margin: '3mm 0 2mm',
          }}
        >
          SALE
        </div>

        <div style={{ borderTop: '1px solid #000', margin: '2mm 0' }} />

        {/* Items */}
        {items.map((item) => {
          const hasCompareAt =
            !!item.originalPrice && item.originalPrice > item.price
          return (
            <div key={item.id} style={{ marginBottom: '2.5mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '11px' }}>
                  {item.name}
                </span>
                <span style={{ fontWeight: 700, fontSize: '11px' }}>
                  {fmt(item.price * item.quantity - (item.discount ?? 0))}
                </span>
              </div>
              {item.variantTitle && (
                <div style={{ fontSize: '10px', color: '#555' }}>
                  {item.variantTitle}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#555',
                }}
              >
                <span>
                  {item.quantity} x {fmt(item.price)}
                  {hasCompareAt && (
                    <span
                      style={{
                        textDecoration: 'line-through',
                        marginLeft: '2mm',
                        color: '#999',
                      }}
                    >
                      {fmt(item.originalPrice!)}
                    </span>
                  )}
                </span>
              </div>
              {!!item.discount && item.discount > 0 && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#555',
                    fontStyle: 'italic',
                  }}
                >
                  Discount (-{fmt(item.discount)})
                </div>
              )}
            </div>
          )
        })}

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '11px' }}>
          <Row label='Subtotal' value={fmt(subtotal)} />
          {discountAmount > 0 && (
            <Row
              label={discountLabel}
              value={`-${fmt(discountAmount)}`}
              green
            />
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Tax table */}
        <div style={{ fontSize: '9.5px' }}>
          <div
            style={{ display: 'flex', fontWeight: 700, marginBottom: '1mm' }}
          >
            <span style={{ flex: 1.4 }}>Tax</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Base</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Amount</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ flex: 1.4 }}>VAT ({vatPct}%)</span>
            <span style={{ flex: 1, textAlign: 'right' }}>{fmt(taxable)}</span>
            <span style={{ flex: 1, textAlign: 'right' }}>{fmt(gst)}</span>
            <span style={{ flex: 1, textAlign: 'right' }}>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Order total — boxed */}
        <div
          style={{
            border: '1px solid #000',
            borderRadius: '2mm',
            padding: '2mm 3mm',
            textAlign: 'center',
            margin: '2mm 0 3mm',
          }}
        >
          <div style={{ fontSize: '9px', letterSpacing: '1px' }}>
            ORDER TOTAL
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800 }}>{fmt(total)}</div>
        </div>

        {/* Payment */}
        <div style={{ fontSize: '11px' }}>
          {giftCardAmount > 0 && (
            <Row
              label={`Gift card (${maskedGiftCard})`}
              value={`-${fmt(giftCardAmount)}`}
              green
            />
          )}
          {payMethod === 'cash' && rounding > 0 && (
            <>
              <Row label='Cash rounding' value={fmt(rounding)} />
              <Row label='Adjusted total' value={fmt(adjustedTotal)} />
            </>
          )}
          <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
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
          ) : payMethod === 'cash' ? (
            <>
              <div style={{ fontWeight: 700 }}>
                <Row label='Cash · PAID' value={fmt(adjustedTotal)} />
              </div>
              {change > 0 && <Row label='Change due' value={fmt(change)} />}
            </>
          ) : (
            <Row
              label='Payment mode'
              value={PAY_LABELS[payMethod] || payMethod}
            />
          )}
        </div>

        {/* Ship to */}
        {showShipTo && shippingAddress && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
            <div style={{ fontSize: '11px' }}>
              <div style={{ fontWeight: 700, marginBottom: '1mm' }}>
                Ship to:
              </div>
              <div style={{ lineHeight: 1.6 }}>
                <div>
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </div>
                <div>{shippingAddress.address_1}</div>
                {shippingAddress.address_2 && (
                  <div>{shippingAddress.address_2}</div>
                )}
                <div>
                  {shippingAddress.city}
                  {shippingAddress.province
                    ? `, ${shippingAddress.province}`
                    : ''}{' '}
                  {shippingAddress.postal_code}
                </div>
                <div>{shippingAddress.country_code?.toUpperCase()}</div>
                {shippingAddress.phone && <div>{shippingAddress.phone}</div>}
              </div>
            </div>
          </>
        )}

        {/* Order note */}
        {orderNote && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
            <div style={{ fontSize: '11px' }}>
              <div style={{ fontWeight: 700, marginBottom: '1mm' }}>
                Order Note:
              </div>
              <div>{orderNote}</div>
            </div>
          </>
        )}

        <div
          style={{
            borderTop: '1px dashed #000',
            margin: '3mm 0 2mm',
          }}
        />

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            lineHeight: 1.7,
          }}
        >
          <div>
            {dateStr}, {timeStr}
          </div>
          <div>Receipt: {orderId}</div>
          <div style={{ marginTop: '1mm' }}>Staff: {cashier}</div>
          <div style={{ marginTop: '2mm', fontWeight: 600 }}>
            Thank you for shopping with us!
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt='Order tracking QR code'
            width={90}
            height={90}
            style={{ margin: '3mm auto 1mm', display: 'block' }}
          />
          <div>Track Your Order & Join Our</div>
          <div>Loyalty Programme Here</div>
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
          {STORE_DISPLAY_NAME}
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
          <div key={item.id} className='text-xs' style={{ color: '#6D7175' }}>
            <div className='flex justify-between'>
              <span className='flex-1 truncate pr-2'>
                {item.name}{' '}
                <span style={{ color: '#8C9196' }}>×{item.quantity}</span>
              </span>
              <span className='flex-shrink-0'>
                {fmt(item.price * item.quantity - (item.discount ?? 0))}
              </span>
            </div>
            {item.variantTitle && (
              <div className='text-[11px]' style={{ color: '#8C9196' }}>
                {item.variantTitle}
              </div>
            )}
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
            <span>{discountLabel}</span>
            <span>-{fmt(discountAmount)}</span>
          </div>
        )}
        {giftCardAmount > 0 && (
          <div
            className='flex justify-between text-xs'
            style={{ color: '#008060' }}
          >
            <span>Gift card ({maskedGiftCard})</span>
            <span>-{fmt(giftCardAmount)}</span>
          </div>
        )}
        <div
          className='flex justify-between text-xs'
          style={{ color: '#6D7175' }}
        >
          <span>VAT ({vatPct}%)</span>
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
        {payMethod === 'cash' && rounding > 0 && (
          <div
            className='flex justify-between text-xs'
            style={{ color: '#8C9196' }}
          >
            <span>Cash rounding</span>
            <span>{fmt(rounding)}</span>
          </div>
        )}
      </div>

      {showShipTo && shippingAddress && (
        <div
          className='mt-3 pt-3 text-xs'
          style={{ borderTop: '1px dashed #E1E3E5', color: '#6D7175' }}
        >
          <p className='font-semibold mb-1' style={{ color: '#202223' }}>
            Ship to
          </p>
          <p>
            {shippingAddress.first_name} {shippingAddress.last_name}
          </p>
          <p>{shippingAddress.address_1}</p>
          <p>
            {shippingAddress.city} {shippingAddress.postal_code}
          </p>
        </div>
      )}

      {orderNote && (
        <div
          className='mt-3 pt-3 text-xs'
          style={{ borderTop: '1px dashed #E1E3E5', color: '#6D7175' }}
        >
          <p className='font-semibold mb-1' style={{ color: '#202223' }}>
            Order note
          </p>
          <p>{orderNote}</p>
        </div>
      )}

      <p className='text-center text-xs mt-4' style={{ color: '#8C9196' }}>
        Thank you for shopping with {STORE_DISPLAY_NAME}!
      </p>
    </>
  )
}

// Small helper for print rows
function Row({
  label,
  value,
  green = false,
}: {
  label: string
  value: string
  green?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1mm',
        color: green ? '#008060' : undefined,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
