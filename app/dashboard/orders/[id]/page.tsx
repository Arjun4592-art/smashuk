'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  getOrder,
  updateOrderStatus,
  processOrderReturn,
  approveOrderReturn,
  rejectOrderReturn,
  getShippingLabel,
} from '@/lib/api/dashboard'
import ReturnExchangeModal from '@/components/dashboard/ReturnExchangeModal'
import LabelSizeDialog from '@/components/printing/LabelSizeDialog'
import { printReceiptOnLabel } from '@/lib/printer/label-print'
import { printShippingLabel } from '@/lib/printer/print-shipping-label'
import { medusaOrderToReceiptData } from '@/lib/printer/order-to-receipt'
import OrderTimeline from '@/components/dashboard/OrderTimeline'
import {
  Badge,
  Btn,
  ConfirmSheet,
  CustomerCard,
  Divider,
  IconBack,
  IconChevronDown,
  IconDots,
  IconPrinter,
  ItemRow,
  MoneyRow,
  PopMenu,
  providerLabel,
  Section,
  SectionTitle,
  roundBtnClass,
  type Tone,
} from '@/components/orders/OrderUI'

/**
 * Parcel2Go label is only available once the order is fulfilled.
 * If the label can be created on an unfulfilled order too, flip this to
 * `false` and the "Print shipping label" button shows up as the dark
 * primary button on unfulfilled orders (exactly like the Shopify app).
 */
const LABEL_REQUIRES_FULFILLMENT: boolean = true

const ITEM_METADATA_SKIP = new Set(['source', 'isGift'])
const ORDER_METADATA_SKIP = new Set([
  'returns',
  'staff_comments',
  'source',
  'fulfillment_type',
])

type Action =
  | 'confirm'
  | 'cancel'
  | 'archive'
  | 'fulfill'
  | 'capture'
  | 'ship'
  | 'deliver'

const ACTION_VERB: Record<Action, string> = {
  confirm: 'complete',
  cancel: 'cancel',
  archive: 'archive',
  fulfill: 'fulfill',
  capture: 'capture payment for',
  ship: 'dispatch',
  deliver: 'mark as delivered',
}

function fmt(amount: number, currency = 'GBP') {
  const symbol =
    currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return (
    symbol +
    (Number(amount) || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function prettify(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) +
    ' at ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<Action | ''>('')
  const [labelLoading, setLabelLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<Action | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnActionLoading, setReturnActionLoading] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showLabelSize, setShowLabelSize] = useState(false)

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError('')
      try {
        setOrder(await getOrder(id))
      } catch (err: any) {
        setError(err.message ?? 'Failed to load order')
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  /* ───────────── actions (same functions as before) ───────────── */

  const handlePrintLabel = async () => {
    setLabelLoading(true)
    try {
      const { label_url } = await getShippingLabel(id)
      if (!label_url) {
        toast.error('Parcel2Go has not returned a label URL yet.')
        return
      }
      await printShippingLabel(label_url)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to print shipping label')
    } finally {
      setLabelLoading(false)
    }
  }

  // Receipt for this order (new or old) on the label printer. Label size is
  // the one set in POS → Settings → Printer / "Label size…" below.
  const handlePrintReceiptLabel = async () => {
    if (!order) return
    try {
      await printReceiptOnLabel(medusaOrderToReceiptData(order))
    } catch (err: any) {
      toast.error(err.message ?? 'Could not print receipt')
    }
  }

  const handleAction = async (action: Action) => {
    setActionLoading(action)
    try {
      const result: any = await updateOrderStatus(id, action)
      if (action === 'cancel') {
        if (result?.warning) {
          // Order cancelled but the auto-refund call failed — this needs a
          // human to go refund the payment manually, so it's a warning
          // toast rather than the usual success one.
          toast.warning(result.warning)
        } else if (result?.refunded) {
          toast.success(
            `Order cancelled — £${Number(result.refundAmount).toFixed(2)} refunded to the customer`,
          )
        } else {
          // Either a cash order (nothing to refund electronically) or the
          // order had no captured payment to begin with.
          toast.success('Order cancelled')
        }
      } else {
        toast.success(
          action === 'fulfill'
            ? 'Order marked as fulfilled'
            : action === 'capture'
              ? 'Payment captured'
              : action === 'ship'
                ? 'Order dispatched'
                : action === 'deliver'
                  ? order?.metadata?.fulfillment_type === 'pickup'
                    ? 'Order marked as picked up'
                    : 'Order marked as delivered'
                  : `Order ${ACTION_VERB[action]}d`,
        )
      }
      await fetchOrder(true)
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${ACTION_VERB[action]} order`)
    } finally {
      setActionLoading('')
    }
  }

  const remainingReturnQty: Record<string, number> = {}
  for (const item of order?.items ?? []) {
    remainingReturnQty[item.id] = item.quantity
  }
  for (const record of order?.metadata?.returns ?? []) {
    if (record.status === 'rejected') continue
    for (const line of record.items) {
      remainingReturnQty[line.item_id] =
        (remainingReturnQty[line.item_id] ?? 0) - line.quantity
    }
  }
  const canReturn =
    !!order &&
    order.payment_status !== 'not_paid' &&
    Object.values(remainingReturnQty).some((q) => q > 0)

  const handleProcessReturn = async (
    items: { item_id: string; quantity: number }[],
    reason: string,
    shippingOption: 'label' | 'no_shipping',
    trackingNumber?: string,
    shippingCarrier?: string,
    refundAmount?: number,
  ) => {
    const note = [
      shippingOption === 'no_shipping' ? 'No shipping required' : null,
      trackingNumber ? `Tracking: ${trackingNumber}` : null,
      shippingCarrier ? `Carrier: ${shippingCarrier}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    await processOrderReturn(id, items, reason, note || undefined, refundAmount)
    toast.success('Return processed and refund issued')
    setShowReturnModal(false)
    await fetchOrder(true)
  }

  const handleApproveReturn = async (returnId: string) => {
    setReturnActionLoading(returnId)
    try {
      await approveOrderReturn(id, returnId)
      toast.success('Return approved and refunded')
      await fetchOrder(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to approve return')
    } finally {
      setReturnActionLoading('')
    }
  }

  const handleRejectReturn = async (returnId: string) => {
    setReturnActionLoading(returnId)
    try {
      await rejectOrderReturn(id, returnId)
      toast.success('Return request rejected')
      await fetchOrder(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to reject return')
    } finally {
      setReturnActionLoading('')
    }
  }

  /* ───────────── loading / error ───────────── */

  if (loading) {
    return (
      <div className='-m-4 lg:m-0 lg:max-w-6xl lg:mx-auto animate-pulse'>
        <div className='bg-white h-40 lg:bg-[#E1E3E5] lg:rounded-xl' />
        <div className='mt-3 lg:mt-5 space-y-3 lg:space-y-5'>
          <div className='bg-white h-44 lg:bg-[#E1E3E5] lg:rounded-xl' />
          <div className='bg-white h-64 lg:bg-[#E1E3E5] lg:rounded-xl' />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='lg:max-w-6xl lg:mx-auto'>
        <Link href='/dashboard/orders' className={`${roundBtnClass}`}>
          <IconBack />
        </Link>
        <div className='mt-4 p-5 bg-[#FFF4F4] rounded-xl text-[#D82C0D] text-[14px] flex items-center justify-between gap-3'>
          <span>{error || 'Order not found'}</span>
          <Btn onClick={() => fetchOrder()}>Retry</Btn>
        </div>
      </div>
    )
  }

  /* ───────────── derived state ───────────── */

  const currency = order.currency_code ?? 'gbp'
  const items: any[] = order.items ?? []
  const payments: any[] = order.payments ?? []
  const returns: any[] = order.metadata?.returns ?? []
  const shippingMethod = order.shipping_methods?.[0]

  const fs: string = order.fulfillment_status ?? 'not_fulfilled'
  const isPOS = order.metadata?.source === 'pos'
  const isPickup = order.metadata?.fulfillment_type === 'pickup'
  const isCanceled = order.status === 'canceled' || fs === 'canceled'
  const isArchived = order.status === 'archived'
  const isUnfulfilled =
    (fs === 'not_fulfilled' || fs === 'partially_fulfilled' || !fs) &&
    !isCanceled
  const isReadyToDispatch = fs === 'fulfilled' || fs === 'partially_fulfilled'
  const isShipped = fs === 'shipped' || fs === 'partially_shipped'
  const isDelivered = fs === 'delivered' || fs === 'partially_delivered'

  const customerName =
    `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() ||
    order.email ||
    'Guest'
  const addr = order.shipping_address
  const phone: string | undefined =
    order.customer?.phone || order.shipping_address?.phone || undefined
  const addressLines = addr
    ? [
        [addr.first_name, addr.last_name].filter(Boolean).join(' '),
        [addr.address_1, addr.address_2].filter(Boolean).join(', '),
        addr.city,
        [addr.province, addr.postal_code].filter(Boolean).join(' '),
        addr.country_code
          ? ((
              {
                gb: 'United Kingdom',
                us: 'United States',
                ie: 'Ireland',
                in: 'India',
              } as Record<string, string>
            )[addr.country_code.toLowerCase()] ??
            addr.country_code.toUpperCase())
          : '',
      ].filter(Boolean)
    : []

  // Fulfillment badge
  let fBadge: { tone: Tone; glyph: 'empty' | 'partial' | 'full'; text: string }
  if (isCanceled) fBadge = { tone: 'gray', glyph: 'full', text: 'Cancelled' }
  else if (isDelivered)
    fBadge = {
      tone: 'green',
      glyph: 'full',
      text: isPickup ? 'Picked up' : 'Delivered',
    }
  else if (isShipped)
    fBadge = { tone: 'blue', glyph: 'full', text: 'Dispatched' }
  else if (fs === 'fulfilled')
    fBadge = {
      tone: 'blue',
      glyph: 'full',
      text: isPickup ? 'Ready for pickup' : 'Ready to dispatch',
    }
  else if (fs === 'partially_fulfilled')
    fBadge = { tone: 'yellow', glyph: 'partial', text: 'Partially fulfilled' }
  else fBadge = { tone: 'yellow', glyph: 'empty', text: 'Unfulfilled' }

  // Payment badge
  const ps: string = order.payment_status ?? ''
  const pBadge: {
    tone: Tone
    glyph: 'empty' | 'partial' | 'full'
    text: string
  } =
    ps === 'captured'
      ? { tone: 'green', glyph: 'full', text: 'Paid' }
      : ps === 'refunded'
        ? { tone: 'gray', glyph: 'full', text: 'Refunded' }
        : ps === 'partially_refunded'
          ? { tone: 'gray', glyph: 'partial', text: 'Partially refunded' }
          : ps === 'canceled'
            ? { tone: 'gray', glyph: 'full', text: 'Voided' }
            : { tone: 'orange', glyph: 'empty', text: 'Payment pending' }

  const deliveryLine = [
    shippingMethod
      ? Number(shippingMethod.amount ?? shippingMethod.total ?? 0) === 0
        ? 'Free'
        : fmt(shippingMethod.amount ?? shippingMethod.total, currency)
      : null,
    shippingMethod?.name ?? (isPickup ? 'Store pickup' : 'Delivery'),
  ]
    .filter(Boolean)
    .join(' • ')

  // Buttons — max two, never a wall of them
  type Btns = {
    primary?: { label: string; onClick: () => void; loading?: boolean }
    secondary?: { label: string; onClick: () => void; loading?: boolean }
  }
  const labelBtn =
    !isPickup && !isCanceled && !isDelivered
      ? {
          label: 'Print shipping label',
          onClick: handlePrintLabel,
          loading: labelLoading,
        }
      : undefined
  const canShowLabel =
    labelBtn && (LABEL_REQUIRES_FULFILLMENT ? !isUnfulfilled : true)

  const fulfillBtn = {
    label: 'Mark as fulfilled',
    onClick: () => setConfirmAction('fulfill'),
    loading: actionLoading === 'fulfill',
  }

  let btns: Btns = {}
  if (isCanceled || isDelivered) {
    btns = {}
  } else if (isUnfulfilled) {
    btns =
      canShowLabel && !LABEL_REQUIRES_FULFILLMENT
        ? { primary: labelBtn, secondary: fulfillBtn }
        : { primary: fulfillBtn }
  } else if (isReadyToDispatch) {
    btns = isPickup
      ? {
          primary: {
            label: 'Mark as picked up',
            onClick: () => setConfirmAction('deliver'),
            loading: actionLoading === 'deliver',
          },
        }
      : {
          primary: {
            label: 'Dispatch order',
            onClick: () => setConfirmAction('ship'),
            loading: actionLoading === 'ship',
          },
          secondary: canShowLabel ? labelBtn : undefined,
        }
  } else if (isShipped) {
    btns = {
      primary: {
        label: 'Mark as delivered',
        onClick: () => setConfirmAction('deliver'),
        loading: actionLoading === 'deliver',
      },
      secondary: canShowLabel ? labelBtn : undefined,
    }
  }

  // Money
  const subtotal = order.subtotal ?? 0
  const capturedTotal = payments
    .filter((p) => p.captured_at)
    .reduce((s, p) => s + (p.amount ?? 0), 0)
  const refundedTotal = returns
    .filter((r) => r.status === 'refunded')
    .reduce((s, r) => s + (r.refund_amount ?? 0), 0)
  const hasUncaptured = payments.some((p) => !p.captured_at)
  const qtyTotal = items.reduce((s, i) => s + (i.quantity ?? 0), 0)

  const detailEntries = Object.entries(order.metadata ?? {}).filter(
    ([k, v]) =>
      !ORDER_METADATA_SKIP.has(k) &&
      v !== undefined &&
      v !== null &&
      v !== '' &&
      typeof v !== 'object',
  )

  const confirmCopy: Record<Action, { title: string; body: string }> = {
    confirm: {
      title: 'Complete order?',
      body: "Are you sure you want to complete this order? This action can't be undone from here.",
    },
    cancel: {
      title: 'Cancel order?',
      body: "Are you sure you want to cancel this order? This action can't be undone from here.",
    },
    archive: {
      title: 'Archive order?',
      body: "Are you sure you want to archive this order? This action can't be undone from here.",
    },
    fulfill: {
      title: 'Fulfill order?',
      body: 'This marks all items on this order as fulfilled.',
    },
    capture: {
      title: 'Confirm payment received',
      body: 'Confirm the cash/card payment for this order has been received.',
    },
    ship: {
      title: 'Dispatch this order?',
      body: "Confirm this order has been handed to the courier / left the store. This marks it 'Dispatched' for the customer.",
    },
    deliver: isPickup
      ? {
          title: 'Mark order as picked up?',
          body: 'Confirm the customer has collected this order in-store.',
        }
      : {
          title: 'Mark order as delivered?',
          body: 'Confirm the customer has actually received this order.',
        },
  }

  /* ───────────── render ───────────── */

  return (
    <div className='-m-4 lg:m-0 bg-[#F6F6F7] lg:bg-transparent lg:max-w-6xl lg:mx-auto pb-6 lg:pb-10'>
      {/* Header */}
      <header className='bg-white lg:bg-transparent px-4 pt-3 pb-4 lg:px-0 lg:pt-0 lg:pb-5 grid grid-cols-[auto_1fr_auto] items-center gap-x-3'>
        <Link
          href='/dashboard/orders'
          aria-label='Back to orders'
          className={roundBtnClass}
        >
          <IconBack />
        </Link>

        <div className='col-span-3 row-start-2 mt-3 lg:mt-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 min-w-0'>
          <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5'>
            <h1 className='text-[22px] leading-7 font-bold text-[#202223] font-sora'>
              #{order.display_id ?? order.id.slice(-6)}
            </h1>
            <Badge tone={fBadge.tone} glyph={fBadge.glyph}>
              {fBadge.text}
            </Badge>
            <Badge tone={pBadge.tone} glyph={pBadge.glyph}>
              {pBadge.text}
            </Badge>
            {isArchived && <Badge tone='gray'>Archived</Badge>}
          </div>
          <p className='text-[13px] text-[#6D7175] mt-1.5'>
            {formatWhen(order.created_at)} • {isPOS ? 'POS' : 'Online Store'}
            {isPickup && ' • Pickup'}
          </p>
        </div>

        <div className='col-start-3 row-start-1 flex items-center gap-2'>
          <PopMenu
            label='Print'
            icon={<IconPrinter />}
            items={[
              {
                label: 'Print receipt (label printer)',
                onClick: handlePrintReceiptLabel,
              },
              {
                label: 'Label size…',
                onClick: () => setShowLabelSize(true),
              },
              {
                label: 'Print packing slip',
                onClick: () =>
                  window.open(
                    `/dashboard/orders/${id}/packing-slip`,
                    '_blank',
                    'noopener,noreferrer',
                  ),
              },
            ]}
          />
          <PopMenu
            label='More actions'
            icon={<IconDots />}
            items={[
              {
                label: 'Return or exchange',
                hidden: !canReturn,
                onClick: () => setShowReturnModal(true),
              },
              {
                label: 'Mark as complete',
                hidden: order.status !== 'pending',
                onClick: () => setConfirmAction('confirm'),
              },
              {
                label: 'Archive order',
                hidden: isArchived,
                onClick: () => setConfirmAction('archive'),
              },
              {
                label: 'Cancel order',
                danger: true,
                hidden: isCanceled || isArchived,
                onClick: () => setConfirmAction('cancel'),
              },
            ]}
          />
        </div>
      </header>

      {/* Body: one column on mobile (exact app order), two columns on desktop */}
      <div className='mt-3 lg:mt-0 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:items-start'>
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
                isUnfulfilled ? 'text-[#916A00]' : 'text-[#6D7175]'
              }`}
            >
              {deliveryLine}
            </p>
            {order.metadata?.tracking_number && (
              <p className='text-[13px] text-[#2C6ECB] mt-0.5 break-all'>
                Tracking: {order.metadata.tracking_number}
              </p>
            )}

            <div className='mt-2 divide-y divide-[#F6F6F7]'>
              {items.map((item) => {
                const chips: string[] = []
                if (item.variant_title && item.variant_title !== 'Default')
                  chips.push(item.variant_title)
                const notes = Object.entries(item.metadata ?? {}).filter(
                  ([k, v]) =>
                    !ITEM_METADATA_SKIP.has(k) &&
                    v !== undefined &&
                    v !== null &&
                    v !== '' &&
                    typeof v !== 'object',
                )
                return (
                  <ItemRow
                    key={item.id}
                    thumb={item.thumbnail}
                    title={item.title}
                    chips={chips}
                    meta={`${fmt(item.unit_price, currency)} × ${item.quantity}`}
                    total={fmt(item.unit_price * item.quantity, currency)}
                  >
                    {notes.length > 0 && (
                      <div className='flex flex-wrap gap-1.5 mt-2'>
                        {notes.map(([k, v]) => (
                          <span
                            key={k}
                            className='text-[12px] px-2 py-1 rounded-md bg-[#F2F7F5] text-[#008060]'
                          >
                            {prettify(k)}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </ItemRow>
                )
              })}
            </div>

            {(btns.primary || btns.secondary) && (
              <div className='mt-3 space-y-3'>
                {btns.primary && (
                  <Btn
                    variant='primary'
                    full
                    loading={btns.primary.loading}
                    disabled={!!actionLoading || labelLoading}
                    onClick={btns.primary.onClick}
                  >
                    {btns.primary.label}
                  </Btn>
                )}
                {btns.secondary && (
                  <Btn
                    full
                    loading={btns.secondary.loading}
                    disabled={!!actionLoading || labelLoading}
                    onClick={btns.secondary.onClick}
                  >
                    {btns.secondary.label}
                  </Btn>
                )}
              </div>
            )}
          </Section>

          {/* Returns (only when there are some) */}
          {returns.length > 0 && (
            <Section className='order-3 lg:order-none px-4 py-4 lg:px-5'>
              <SectionTitle>Returns</SectionTitle>
              <div className='mt-2 space-y-3'>
                {[...returns].reverse().map((r) => (
                  <div
                    key={r.id}
                    className='rounded-xl border border-[#E1E3E5] p-3'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <Badge
                        tone={
                          r.status === 'refunded'
                            ? 'green'
                            : r.status === 'rejected'
                              ? 'red'
                              : 'yellow'
                        }
                      >
                        <span className='capitalize'>{r.status}</span>
                      </Badge>
                      <span className='text-[12.5px] text-[#6D7175] capitalize'>
                        {r.source}
                      </span>
                    </div>
                    <p className='text-[14px] text-[#202223] mt-2'>
                      {r.items
                        .map((i: any) => `${i.quantity}× ${i.title}`)
                        .join(', ')}
                    </p>
                    <p className='text-[13px] text-[#6D7175] mt-0.5'>
                      {r.reason} · {fmt(r.refund_amount, currency)}
                    </p>
                    {r.note && (
                      <p className='text-[13px] text-[#6D7175] mt-0.5'>
                        {r.note}
                      </p>
                    )}
                    {r.status === 'requested' && (
                      <div className='grid grid-cols-2 gap-3 mt-3'>
                        <Btn
                          variant='primary'
                          loading={returnActionLoading === r.id}
                          disabled={!!returnActionLoading}
                          onClick={() => handleApproveReturn(r.id)}
                        >
                          Approve & refund
                        </Btn>
                        <Btn
                          variant='dangerOutline'
                          disabled={!!returnActionLoading}
                          onClick={() => handleRejectReturn(r.id)}
                        >
                          Reject
                        </Btn>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Payment */}
          <Section className='order-4 lg:order-none px-4 py-4 lg:px-5'>
            <SectionTitle>
              <Badge tone={pBadge.tone} glyph={pBadge.glyph}>
                {pBadge.text}
              </Badge>
            </SectionTitle>

            <p className='text-[13px] text-[#6D7175] mt-2'>
              {qtyTotal} item{qtyTotal === 1 ? '' : 's'}
            </p>
            <div className='mt-1 space-y-2.5'>
              <MoneyRow label='Subtotal' value={fmt(subtotal, currency)} />
              {order.discount_total > 0 && (
                <MoneyRow
                  label='Discount'
                  tone='red'
                  value={`-${fmt(order.discount_total, currency)}`}
                />
              )}
              <MoneyRow
                label='Shipping'
                sub={shippingMethod?.name}
                value={
                  order.shipping_total > 0
                    ? fmt(order.shipping_total, currency)
                    : 'Free'
                }
              />
              {order.tax_total > 0 && (
                <MoneyRow label='Tax' value={fmt(order.tax_total, currency)} />
              )}
              <MoneyRow
                label='Total'
                bold
                value={fmt(order.total ?? 0, currency)}
              />
            </div>

            <Divider className='my-3' />
            <div className='space-y-2.5'>
              <MoneyRow label='Paid' value={fmt(capturedTotal, currency)} />
              {refundedTotal > 0 && (
                <MoneyRow
                  label='Refunded'
                  tone='red'
                  value={`-${fmt(refundedTotal, currency)}`}
                />
              )}
            </div>

            {payments.length > 0 && (
              <>
                <Divider className='my-3' />
                <div className='space-y-2'>
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center justify-between gap-3 text-[13px] text-[#6D7175]'
                    >
                      <span className='capitalize truncate'>
                        {providerLabel(p.provider_id)} ·{' '}
                        {fmt(p.amount, currency)}
                      </span>
                      <Badge tone={p.captured_at ? 'green' : 'yellow'}>
                        {p.captured_at ? 'Captured' : 'Authorized'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {hasUncaptured && !isCanceled && (
              <div className='mt-4'>
                <Btn
                  variant='primary'
                  full
                  loading={actionLoading === 'capture'}
                  disabled={!!actionLoading}
                  onClick={() => setConfirmAction('capture')}
                >
                  Capture payment
                </Btn>
              </div>
            )}
          </Section>

          {/* Timeline */}
          <div className='order-6 lg:order-none'>
            <OrderTimeline
              order={order}
              onCommentAdded={() => fetchOrder(true)}
            />
          </div>
        </div>

        {/* RIGHT (desktop) */}
        <div className='contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0'>
          <div className='order-1 lg:order-none'>
            <CustomerCard
              name={customerName}
              email={order.email ?? undefined}
              phone={phone}
              addressLines={
                isPickup && addressLines.length === 0
                  ? ['Store pickup']
                  : addressLines
              }
              addressLabel={isPickup ? 'Pickup' : 'Shipping address'}
              profileHref={
                order.customer?.id
                  ? `/dashboard/customers?id=${order.customer.id}`
                  : undefined
              }
            />
          </div>

          {detailEntries.length > 0 && (
            <Section className='order-5 lg:order-none'>
              <button
                type='button'
                onClick={() => setShowDetails((s) => !s)}
                className='w-full flex items-center justify-between px-4 lg:px-5 py-4 text-left cursor-pointer'
                aria-expanded={showDetails}
              >
                <span className='text-[15px] font-semibold text-[#202223]'>
                  Order details
                </span>
                <IconChevronDown
                  size={18}
                  className={`text-[#6D7175] transition-transform ${showDetails ? 'rotate-180' : ''}`}
                />
              </button>
              {showDetails && (
                <dl className='px-4 lg:px-5 pb-4 space-y-3'>
                  {detailEntries.map(([k, v]) => (
                    <div key={k}>
                      <dt className='text-[12.5px] text-[#6D7175]'>
                        {prettify(k)}
                      </dt>
                      <dd className='text-[14px] text-[#202223] break-words'>
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* Confirm sheet */}
      <ConfirmSheet
        open={!!confirmAction}
        title={confirmAction ? confirmCopy[confirmAction].title : ''}
        message={confirmAction ? confirmCopy[confirmAction].body : ''}
        confirmLabel={confirmAction === 'cancel' ? 'Cancel order' : 'Confirm'}
        danger={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const a = confirmAction
          setConfirmAction(null)
          if (a) handleAction(a)
        }}
      />

      {showReturnModal && (
        <ReturnExchangeModal
          order={order}
          remainingQty={remainingReturnQty}
          onSubmit={handleProcessReturn}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      {showLabelSize && (
        <LabelSizeDialog onClose={() => setShowLabelSize(false)} />
      )}
    </div>
  )
}
