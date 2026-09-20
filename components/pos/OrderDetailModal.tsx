'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  CURRENCY_SYMBOL,
  SITE_NAME,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  CONTACT_PHONE,
  VAT_RATE,
  SITE_LOGO,
  SITE_URL,
} from '@/lib/constants'
import { usePrinterStore } from '@/store/printerStore'
import {
  printReceipt,
  NoPrinterConnectedError,
} from '@/lib/printer/print-receipt'
import { ReceiptBody } from './Receipt'
import EmailReceiptModal from './EmailReceiptModal'
import { waitForPrintImages } from '@/lib/utils'
import type { CartDisplayItem } from '@/types'
import {
  Badge,
  Btn,
  CustomerCard,
  Divider,
  IconBack,
  IconDots,
  IconPrinter,
  ItemRow,
  MoneyRow,
  PopMenu,
  Section,
  SectionTitle,
  TimelineDay,
  TimelineItem,
  roundBtnClass,
  type Tone,
} from '@/components/orders/OrderUI'
const fmt = (n: number) => CURRENCY_SYMBOL + (Number(n) || 0).toFixed(2)
const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}
const isAwaitingPickup = (order: OrderDetailData) =>
  !!order.isPickup &&
  !['fulfilled', 'delivered', 'partially_delivered'].includes(
    order.fulfillmentStatus ?? '',
  )
export interface OrderDetailData {
  id: string
  medusaOrderId?: string
  items: {
    id: string
    name: string
    brand?: string
    price: number
    quantity: number
  }[]
  customer: {
    name: string
    phone?: string
    email?: string
  } | null
  subtotal: number
  discountTotal: number
  tax: number
  total: number
  paymentMethod: string
  splitPayments?:
    | {
        method: string
        amount: number
      }[]
    | null
  note?: string
  cashier: string
  completedAt: string
  returned: boolean
  isPickup?: boolean
  fulfillmentStatus?: string
}
interface Props {
  order: OrderDetailData
  onClose: () => void
  onReturn: () => void
  onFulfill?: () => void
}
export default function OrderDetailModal({
  order,
  onClose,
  onReturn,
  onFulfill,
}: Props) {
  const [fulfilling, setFulfilling] = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)
  const [fulfillError, setFulfillError] = useState('')
  const [showEmailReceipt, setShowEmailReceipt] = useState(false)
  const handleFulfill = async () => {
    setFulfilling(true)
    setFulfillError('')
    try {
      const action = order.isPickup ? 'pickup' : 'dispatch'
      const res = await fetch(
        `/api/pos/orders/${order.medusaOrderId ?? order.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (data.deliverError) {
        setFulfillError(
          `Order fulfilled, but Medusa wasn't marked delivered: ${data.deliverError}. Try again, or check the order in Medusa admin.`,
        )
        onFulfill?.()
        return
      }
      onFulfill?.()
      onClose()
    } catch (err: unknown) {
      setFulfillError(
        err instanceof Error ? err.message : 'Failed to update order',
      )
    } finally {
      setFulfilling(false)
    }
  }
  const handlePrintLabel = async () => {
    setLabelLoading(true)
    try {
      const res = await fetch(
        `/api/pos/orders/${order.medusaOrderId ?? order.id}/label`,
        { credentials: 'include' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? 'Failed to fetch label')
      }
      const labelUrl: string | undefined = data.label_url
      if (!labelUrl) {
        toast.error('Parcel2Go has not returned a label URL yet.')
        return
      }
      // Parcel2Go returns a data: URI; browsers block window.open on those,
      // so convert it into a blob: URL first.
      let target: string = labelUrl
      if (labelUrl.startsWith('data:')) {
        const blob = await (await fetch(labelUrl)).blob()
        target = URL.createObjectURL(blob)
      }
      window.open(target, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      toast.error('Could not fetch shipping label', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLabelLoading(false)
    }
  }
  const canFulfill =
    !order.returned &&
    (order.isPickup
      ? order.fulfillmentStatus !== 'delivered' &&
        order.fulfillmentStatus !== 'partially_delivered'
      : order.fulfillmentStatus === 'not_fulfilled' ||
        order.fulfillmentStatus === 'requires_action' ||
        !order.fulfillmentStatus)
  useEffect(() => {
    const scrollEl = document.getElementById('pos-orders-scroll-area')
    const prevBodyOverflow = document.body.style.overflow
    const prevElOverflow = scrollEl?.style.overflow ?? ''
    document.body.style.overflow = 'hidden'
    if (scrollEl) scrollEl.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      if (scrollEl) scrollEl.style.overflow = prevElOverflow
    }
  }, [])
  const date = new Date(order.completedAt)
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const receiptItems: CartDisplayItem[] = order.items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand ?? '',
    price: i.price,
    quantity: i.quantity,
    sku: '',
    stock: 0,
    category: '',
  }))
  const rounding =
    order.paymentMethod === 'cash' ? Math.ceil(order.total) - order.total : 0
  const adjustedTotal = order.total + rounding
  const change = order.paymentMethod === 'cash' ? rounding : 0
  const canPrintReceipt = !!(order.medusaOrderId || order.id)
  const handlePrintReceipt = async () => {
    const { connectionType } = usePrinterStore.getState()
    if (connectionType === 'none') {
      // No hardware printer configured — use the browser's print dialog.
      await waitForPrintImages()
      window.print()
      return
    }
    try {
      await printReceipt({
        storeName: STORE_DISPLAY_NAME,
        addressLine1: STORE_ADDRESS_LINE1,
        addressLine2: STORE_ADDRESS_LINE2,
        phone: CONTACT_PHONE,
        orderId: order.medusaOrderId ?? order.id,
        dateStr,
        timeStr,
        cashier: order.cashier,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          lineTotal: i.price * i.quantity,
        })),
        subtotal: order.subtotal,
        discountAmount: order.discountTotal,
        discountLabel: 'Discount',
        giftCardAmount: 0,
        tax: order.tax,
        vatPct: Math.round(VAT_RATE * 100),
        total: order.total,
        rounding: 0,
        payMethodLabel: PAY_LABELS[order.paymentMethod] || order.paymentMethod,
        change: 0,
        splitPayments: order.splitPayments?.map((s) => ({
          label: PAY_LABELS[s.method] || s.method,
          amount: s.amount,
        })),
        orderNote: order.note,
        currencySymbol: CURRENCY_SYMBOL,
        logoUrl: SITE_LOGO,
        trackingUrl: `${SITE_URL}/orders/${encodeURIComponent(order.medusaOrderId ?? order.id)}`,
      })
    } catch (err: unknown) {
      if (err instanceof NoPrinterConnectedError) {
        await waitForPrintImages()
        window.print()
        return
      }
      toast.error('Could not print to receipt printer', {
        description:
          err instanceof Error
            ? err.message
            : 'Unknown error — falling back to browser print.',
      })
      await waitForPrintImages()
      window.print()
    }
  }
  const isShippedStatus = ['shipped', 'partially_shipped'].includes(
    order.fulfillmentStatus ?? '',
  )
  const showReturn = !order.returned && !isAwaitingPickup(order) && !canFulfill
  const canPrintLabel =
    !order.isPickup &&
    !order.returned &&
    !canFulfill &&
    !['delivered', 'partially_delivered'].includes(
      order.fulfillmentStatus ?? '',
    )

  let fBadge: { tone: Tone; glyph: 'empty' | 'partial' | 'full'; text: string }
  if (order.returned) fBadge = { tone: 'gray', glyph: 'full', text: 'Returned' }
  else if (isAwaitingPickup(order))
    fBadge = { tone: 'yellow', glyph: 'empty', text: 'Awaiting pickup' }
  else if (canFulfill)
    fBadge = { tone: 'yellow', glyph: 'empty', text: 'Unfulfilled' }
  else if (isShippedStatus)
    fBadge = { tone: 'blue', glyph: 'full', text: 'Dispatched' }
  else fBadge = { tone: 'gray', glyph: 'full', text: 'Fulfilled' }

  const deliveryLine = order.isPickup
    ? `Store pickup • ${STORE_DISPLAY_NAME}`
    : 'Home delivery'
  const qtyTotal = order.items.reduce((s, i) => s + i.quantity, 0)

  const handleEmailReceipt = () => {
    if (!order.medusaOrderId && !order.id) {
      toast.error('Could not email receipt', {
        description: 'This order has no ID to email a receipt for.',
      })
      return
    }
    setShowEmailReceipt(true)
  }

  return (
    <>
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
          /* The POS shell locks itself to 100dvh with overflow hidden so
             the app fits the screen — that fixed height confuses Chrome's
             print pagination and forces a full Letter/A4 page even though
             @page above says 80mm. Free it up during print. */
          .pos-terminal-shell,
          .pos-terminal-main {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #pos-orders-scroll-area {
            display: none !important;
          }
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

      {/* Full-screen on phones, centred dialog on desktop */}
      <div
        className='order-detail-backdrop fixed inset-0 z-50 lg:flex lg:items-center lg:justify-center lg:bg-black/40 lg:p-6'
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className='bg-[#F6F6F7] w-full h-full lg:h-auto lg:max-h-[92vh] lg:max-w-[1200px] lg:rounded-2xl flex flex-col overflow-hidden'>
          <div className='flex-1 overflow-y-auto overscroll-contain'>
            {/* Sticky top bar */}
            <div className='sticky top-0 z-20 bg-white flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3 pb-3'>
              <button
                type='button'
                aria-label='Back to orders'
                onClick={onClose}
                className={roundBtnClass}
              >
                <IconBack />
              </button>
              <div className='flex items-center gap-2'>
                <PopMenu
                  label='Print'
                  icon={<IconPrinter />}
                  items={[
                    {
                      label: 'Print receipt',
                      disabled: !canPrintReceipt,
                      onClick: handlePrintReceipt,
                    },
                    {
                      label: 'Email receipt',
                      disabled: !canPrintReceipt,
                      onClick: handleEmailReceipt,
                    },
                  ]}
                />
                <PopMenu
                  label='More actions'
                  icon={<IconDots />}
                  items={[
                    {
                      label: 'Return or exchange',
                      hidden: !showReturn,
                      onClick: onReturn,
                    },
                  ]}
                />
              </div>
            </div>

            {/* Title */}
            <div className='bg-white px-4 pb-4 lg:pt-1'>
              <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5'>
                <h3 className='text-[22px] leading-7 font-bold text-[#202223]'>
                  #{order.id}
                </h3>
                <Badge tone={fBadge.tone} glyph={fBadge.glyph}>
                  {fBadge.text}
                </Badge>
                <Badge tone='green' glyph='full'>
                  Paid
                </Badge>
              </div>
              <p className='text-[13px] text-[#6D7175] mt-1.5'>
                {dateStr} at {timeStr} • {SITE_NAME} POS
              </p>
            </div>

            {/* Body — one column on phones (same order as the Shopify app),
                two columns on desktop */}
            <div className='mt-3 lg:mt-5 lg:px-5 lg:pb-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start'>
              {/* LEFT (desktop) */}
              <div className='contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0'>
                {/* Fulfillment + items */}
                <Section className='order-2 lg:order-none px-4 pt-4 pb-4 lg:px-5'>
                  <SectionTitle>
                    <Badge tone={fBadge.tone} glyph={fBadge.glyph}>
                      {fBadge.text}
                    </Badge>
                  </SectionTitle>
                  <p
                    className={`mt-1 text-[14px] ${
                      canFulfill || isAwaitingPickup(order)
                        ? 'text-[#916A00]'
                        : 'text-[#6D7175]'
                    }`}
                  >
                    {deliveryLine}
                  </p>

                  <div className='mt-2 divide-y divide-[#F6F6F7]'>
                    {order.items.map((item, i) => (
                      <ItemRow
                        key={`${item.id}-${i}`}
                        title={item.name}
                        chips={item.brand ? [item.brand] : undefined}
                        meta={`${fmt(item.price)} × ${item.quantity}`}
                        total={fmt(item.price * item.quantity)}
                      />
                    ))}
                  </div>

                  {canFulfill && (
                    <div className='mt-3 space-y-2'>
                      <Btn
                        variant='primary'
                        full
                        loading={fulfilling}
                        onClick={handleFulfill}
                      >
                        {order.isPickup
                          ? 'Confirm pickup'
                          : 'Mark as fulfilled'}
                      </Btn>
                      {fulfillError && (
                        <p className='text-[12.5px] text-center text-[#D82C0D]'>
                          {fulfillError}
                        </p>
                      )}
                    </div>
                  )}
                  {canPrintLabel && (
                    <div className='mt-3'>
                      <Btn
                        variant='primary'
                        full
                        loading={labelLoading}
                        onClick={handlePrintLabel}
                      >
                        Print shipping label
                      </Btn>
                    </div>
                  )}
                  {!canFulfill && fulfillError && (
                    <p className='mt-3 text-[12.5px] text-[#D82C0D]'>
                      {fulfillError}
                    </p>
                  )}
                </Section>

                {/* Payment */}
                <Section className='order-3 lg:order-none px-4 py-4 lg:px-5'>
                  <SectionTitle>
                    <Badge tone='green' glyph='full'>
                      Paid
                    </Badge>
                  </SectionTitle>
                  <p className='text-[13px] text-[#6D7175] mt-2'>
                    {qtyTotal} item{qtyTotal === 1 ? '' : 's'}
                  </p>
                  <div className='mt-1 space-y-2.5'>
                    <MoneyRow label='Subtotal' value={fmt(order.subtotal)} />
                    {order.discountTotal > 0 && (
                      <MoneyRow
                        label='Discount'
                        tone='red'
                        value={`-${fmt(order.discountTotal)}`}
                      />
                    )}
                    <MoneyRow
                      label={`VAT (${Math.round(VAT_RATE * 100)}%)`}
                      value={fmt(order.tax)}
                    />
                    <MoneyRow label='Total' bold value={fmt(order.total)} />
                  </div>
                  <Divider className='my-3' />
                  <div className='space-y-2.5'>
                    <MoneyRow label='Paid' value={fmt(order.total)} />
                    <MoneyRow
                      label='Payment method'
                      value={
                        PAY_LABELS[order.paymentMethod] || order.paymentMethod
                      }
                    />
                    {order.paymentMethod === 'split' &&
                      order.splitPayments?.map((s, i) => (
                        <div
                          key={`${s.method}-${i}`}
                          className='flex justify-between text-[13px] text-[#6D7175] pl-3'
                        >
                          <span>{PAY_LABELS[s.method] || s.method}</span>
                          <span className='tabular-nums'>{fmt(s.amount)}</span>
                        </div>
                      ))}
                  </div>
                </Section>

                {/* Timeline */}
                <Section
                  plainOnMobile
                  className='order-5 lg:order-none px-4 pt-4 pb-4 lg:px-5 lg:pb-5'
                >
                  <SectionTitle>Timeline</SectionTitle>
                  <div className='mt-3'>
                    <TimelineDay label={dateStr}>
                      <TimelineItem
                        time={timeStr}
                        sub={`Sold by ${order.cashier} • ${SITE_NAME}`}
                      >
                        Order was placed at the register
                      </TimelineItem>
                    </TimelineDay>
                  </div>
                </Section>
              </div>

              {/* RIGHT (desktop) */}
              <div className='contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0'>
                <div className='order-1 lg:order-none'>
                  <CustomerCard
                    name={order.customer?.name ?? 'Walk-in customer'}
                    email={order.customer?.email}
                    phone={order.customer?.phone}
                    walkIn={!order.customer}
                  />
                </div>

                {order.note && (
                  <Section className='order-4 lg:order-none px-4 py-4 lg:px-5'>
                    <SectionTitle>Note</SectionTitle>
                    <p className='mt-1 text-[15px] text-[#202223] whitespace-pre-wrap break-words'>
                      {order.note}
                    </p>
                  </Section>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden receipt used by window.print() */}
      <div className='hidden print:block print-receipt'>
        <ReceiptBody
          orderId={order.medusaOrderId ?? order.id}
          items={receiptItems}
          subtotal={order.subtotal}
          discountAmount={order.discountTotal}
          gst={order.tax}
          total={order.total}
          payMethod={order.paymentMethod}
          splitPayments={order.splitPayments}
          cashier={order.cashier}
          dateStr={dateStr}
          timeStr={timeStr}
          rounding={rounding}
          adjustedTotal={adjustedTotal}
          change={change}
          printMode
        />
      </div>

      {showEmailReceipt && (
        <EmailReceiptModal
          onClose={() => setShowEmailReceipt(false)}
          defaultEmail={order.customer?.email ?? ''}
          receipt={{
            orderId: order.medusaOrderId ?? order.id,
            items: receiptItems,
            subtotal: order.subtotal,
            discountAmount: order.discountTotal,
            tax: order.tax,
            total: order.total,
            payMethod: order.paymentMethod,
            splitPayments: order.splitPayments,
            cashier: order.cashier,
          }}
        />
      )}
    </>
  )
}
