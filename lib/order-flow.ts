export const RETURN_LABEL_FEE = 5.95

export type FlowStage =
  | 'new'
  | 'processing'
  | 'ready_for_pickup'
  | 'despatched'
  | 'delivered'
  | 'completed'
  | 'refund_request_received'
  | 'return_request_received'
  | 'refunded'
  | 'refund_rejected'
  | 'cancelled'

export type FlowTrack = 'order' | 'refund' | 'return'

export const FLOW_LABEL: Record<FlowStage, string> = {
  new: 'NEW',
  processing: 'PROCESSING',
  ready_for_pickup: 'READY FOR PICKUP',
  despatched: 'DESPATCHED',
  delivered: 'DELIVERED',
  completed: 'COMPLETED',
  refund_request_received: 'REFUND REQUEST RECEIVED',
  return_request_received: 'RETURN REQUEST RECEIVED',
  refunded: 'REFUNDED',
  refund_rejected: 'REFUND REJECTED',
  cancelled: 'CANCELLED',
}

export type FlowTone = 'yellow' | 'blue' | 'orange' | 'green' | 'red' | 'gray'

export const FLOW_TONE: Record<FlowStage, FlowTone> = {
  new: 'yellow',
  processing: 'blue',
  ready_for_pickup: 'orange',
  despatched: 'blue',
  delivered: 'green',
  completed: 'green',
  refund_request_received: 'orange',
  return_request_received: 'orange',
  refunded: 'gray',
  refund_rejected: 'red',
  cancelled: 'gray',
}

/** Tailwind pill classes (dashboard / POS / website all share these). */
export const FLOW_PILL_CLASS: Record<FlowStage, string> = {
  new: 'bg-[#FFC453]/20 text-[#916A00]',
  processing: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  ready_for_pickup: 'bg-[#FFEBD0] text-[#B25E09]',
  despatched: 'bg-purple-100 text-purple-700',
  delivered: 'bg-[#008060]/10 text-[#008060]',
  completed: 'bg-[#008060]/10 text-[#008060]',
  refund_request_received: 'bg-[#FFEBD0] text-[#B25E09]',
  return_request_received: 'bg-[#FFEBD0] text-[#B25E09]',
  refunded: 'bg-[#6D7175]/10 text-[#6D7175]',
  refund_rejected: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  cancelled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
}

/** Order of the filter tabs in the dashboard / POS order lists. */
export const FLOW_STAGE_ORDER: FlowStage[] = [
  'new',
  'processing',
  'ready_for_pickup',
  'despatched',
  'delivered',
  'completed',
  'refund_request_received',
  'return_request_received',
  'refunded',
  'refund_rejected',
  'cancelled',
]

export interface FlowOrder {
  status?: string | null
  fulfillment_status?: string | null
  payment_status?: string | null
  metadata?: Record<string, any> | null
  items?: { id: string; quantity: number }[] | null
}

export interface FlowReturnRecord {
  id: string
  status: 'requested' | 'awaiting_return' | 'refunded' | 'rejected'
  refund_amount: number
  items?: { item_id: string; quantity: number }[]
  label_requested?: boolean
  label_fee?: number
  label?: {
    tracking_number?: string
    carrier?: string
    parcel2go_order_id?: string
  }
  [k: string]: any
}

export interface FlowRefundRequest {
  status: 'requested' | 'refunded' | 'declined'
  requested_at?: string
  source?: 'customer' | 'dashboard' | 'pos'
  reason?: string
  note?: string
  processed_at?: string
  amount?: number
  [k: string]: any
}

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export function isPickupOrder(o: FlowOrder): boolean {
  return o.metadata?.fulfillment_type === 'pickup'
}

export function getReturnRecords(o: FlowOrder): FlowReturnRecord[] {
  return Array.isArray(o.metadata?.returns)
    ? (o.metadata!.returns as FlowReturnRecord[])
    : []
}

export function getRefundRequest(o: FlowOrder): FlowRefundRequest | null {
  const rr = o.metadata?.refund_request
  return rr && typeof rr === 'object' ? (rr as FlowRefundRequest) : null
}

/** Newest return that is still waiting on us (requested / awaiting goods). */
export function getOpenReturn(o: FlowOrder): FlowReturnRecord | null {
  const open = getReturnRecords(o).filter(
    (r) => r.status === 'requested' || r.status === 'awaiting_return',
  )
  return open.length ? open[open.length - 1] : null
}

/** Money to send back for a return after taking off the prepaid label fee. */
export function returnLabelFee(record: {
  label_requested?: boolean
  label_fee?: number | null
}): number {
  return record?.label_requested
    ? r2(Number(record.label_fee ?? RETURN_LABEL_FEE))
    : 0
}

export function returnNetRefund(record: {
  refund_amount: number
  label_requested?: boolean
  label_fee?: number | null
}): number {
  return r2(Math.max(0, record.refund_amount - returnLabelFee(record)))
}

/** Units of each line item that can still be returned. */
export function remainingReturnQty(o: FlowOrder): Record<string, number> {
  const remaining: Record<string, number> = {}
  for (const item of o.items ?? []) remaining[item.id] = item.quantity
  for (const rec of getReturnRecords(o)) {
    if (rec.status === 'rejected') continue
    for (const line of rec.items ?? []) {
      remaining[line.item_id] = (remaining[line.item_id] ?? 0) - line.quantity
    }
  }
  return remaining
}

/**
 * Has the order been accepted by staff? Orders that predate this flow
 * (already fulfilled / completed) and POS sales count as accepted so
 * nothing already in progress goes back to NEW.
 */
export function isOrderAccepted(o: FlowOrder): boolean {
  const m = o.metadata ?? {}
  if (m.order_accepted_at) return true
  if (m.source === 'pos') return true
  const fs = o.fulfillment_status ?? ''
  if (fs && fs !== 'not_fulfilled' && fs !== 'canceled') return true
  if (o.status === 'completed') return true
  return false
}

const POST_DESPATCH_DELIVERY_FS = [
  'fulfilled',
  'shipped',
  'partially_shipped',
  'delivered',
  'partially_delivered',
]

/**
 * Has the order left the shop?
 *  - delivery: as soon as the shipping label is bought (fulfilment created)
 *  - pick-up:  only once the customer has collected it
 */
export function isPastDespatch(o: FlowOrder): boolean {
  const fs = o.fulfillment_status ?? ''
  if (isPickupOrder(o)) {
    return fs === 'delivered' || fs === 'partially_delivered'
  }
  return POST_DESPATCH_DELIVERY_FS.includes(fs)
}

export interface OrderFlowState {
  stage: FlowStage
  track: FlowTrack
  label: string
  tone: FlowTone
  isPickup: boolean
  accepted: boolean
  pastDespatch: boolean
}

export function getOrderFlow(o: FlowOrder): OrderFlowState {
  const fs = o.fulfillment_status ?? ''
  const pickup = isPickupOrder(o)
  const accepted = isOrderAccepted(o)
  const pastDespatch = isPastDespatch(o)
  const make = (stage: FlowStage, track: FlowTrack): OrderFlowState => ({
    stage,
    track,
    label: FLOW_LABEL[stage],
    tone: FLOW_TONE[stage],
    isPickup: pickup,
    accepted,
    pastDespatch,
  })

  const rr = getRefundRequest(o)
  if (rr?.status === 'refunded') return make('refunded', 'refund')

  // A return that is still open always wins: that is what staff must act on.
  const open = getOpenReturn(o)
  if (open) {
    return open.status === 'requested'
      ? make('return_request_received', 'return')
      : make('processing', 'return')
  }

  if (o.status === 'canceled' || fs === 'canceled') {
    return make('cancelled', 'order')
  }
  if (rr?.status === 'requested')
    return make('refund_request_received', 'refund')
  if (o.payment_status === 'refunded') return make('refunded', 'order')

  const records = getReturnRecords(o)
  const latest = records.length ? records[records.length - 1] : null
  if (latest?.status === 'rejected') return make('refund_rejected', 'return')
  if (latest?.status === 'refunded') {
    const remaining = remainingReturnQty(o)
    const hasLines = Object.keys(remaining).length > 0
    if (hasLines && Object.values(remaining).every((q) => q <= 0)) {
      return make('refunded', 'return')
    }
  }

  if (fs === 'delivered' || fs === 'partially_delivered') {
    return make(pickup ? 'completed' : 'delivered', 'order')
  }
  if (pickup && (fs === 'fulfilled' || fs === 'partially_fulfilled')) {
    return make('ready_for_pickup', 'order')
  }
  if (!pickup && POST_DESPATCH_DELIVERY_FS.includes(fs)) {
    return make('despatched', 'order')
  }
  return make(accepted ? 'processing' : 'new', 'order')
}

/** The flow label of an order as a plain stage key. */
export function getFlowStage(o: FlowOrder): FlowStage {
  return getOrderFlow(o).stage
}

// ── What may happen next ─────────────────────────────────────────────

export type FlowActionKey =
  | 'accept'
  | 'fulfill'
  | 'despatch'
  | 'ship'
  | 'deliver'
  | 'accept-refund'
  | 'decline-refund'

export interface FlowAction {
  action: FlowActionKey
  label: string
  /** Text for the confirmation dialog. */
  confirm: { title: string; body: string }
  variant: 'primary' | 'secondary' | 'danger'
}

/**
 * Forward-flow buttons for an order (return buttons live on each return
 * record). Same list for dashboard and POS, so both behave identically.
 *
 * `hasMailIn` orders (mail-in stringing) keep their own box / label logic
 * in the dashboard, so no forward buttons are offered for them here.
 */
export function getFlowActions(
  o: FlowOrder,
  opts: { hasMailIn?: boolean } = {},
): FlowAction[] {
  const flow = getOrderFlow(o)
  const fs = o.fulfillment_status ?? ''

  if (flow.stage === 'refund_request_received') {
    return [
      {
        action: 'accept-refund',
        label: 'Accept refund',
        variant: 'primary',
        confirm: {
          title: 'Accept this refund request?',
          body: 'The customer is refunded in full and the order is marked REFUNDED. This can’t be undone from here.',
        },
      },
      {
        action: 'decline-refund',
        label: 'Dismiss request',
        variant: 'danger',
        confirm: {
          title: 'Dismiss the refund request?',
          body: 'No money moves. The order goes back to its previous status.',
        },
      },
    ]
  }

  if (flow.track !== 'order' || opts.hasMailIn) return []

  switch (flow.stage) {
    case 'new':
      return [
        {
          action: 'accept',
          label: 'Accept order',
          variant: 'primary',
          confirm: {
            title: 'Accept this order?',
            body: 'The order moves to PROCESSING and the customer is emailed.',
          },
        },
      ]
    case 'processing':
      return flow.isPickup
        ? [
            {
              action: 'fulfill',
              label: 'Mark ready for pickup',
              variant: 'primary',
              confirm: {
                title: 'Order ready for pick-up?',
                body: 'The order moves to READY FOR PICKUP and the customer is emailed.',
              },
            },
          ]
        : [
            {
              action: 'despatch',
              label: 'Buy label & despatch',
              variant: 'primary',
              confirm: {
                title: 'Buy the shipping label and despatch?',
                body: 'This buys the shipping label and marks the order DESPATCHED.',
              },
            },
          ]
    case 'ready_for_pickup':
      return [
        {
          action: 'deliver',
          label: 'Mark as picked up',
          variant: 'primary',
          confirm: {
            title: 'Mark order as picked up?',
            body: 'Confirm the customer has collected this order in-store. The order moves to COMPLETED.',
          },
        },
      ]
    case 'despatched':
      // fulfilled = label bought but the shipment not confirmed yet
      return fs === 'fulfilled' || fs === 'partially_fulfilled'
        ? [
            {
              action: 'ship',
              label: 'Confirm handed to courier',
              variant: 'primary',
              confirm: {
                title: 'Confirm despatch?',
                body: 'Confirm this order has been handed to the courier. The customer is emailed their tracking details.',
              },
            },
          ]
        : [
            {
              action: 'deliver',
              label: 'Mark as delivered',
              variant: 'primary',
              confirm: {
                title: 'Mark order as delivered?',
                body: 'Confirm the customer has actually received this order.',
              },
            },
          ]
    default:
      return []
  }
}

// ── Who may ask for what, and when ───────────────────────────────────

function isPaid(o: FlowOrder) {
  return (
    o.payment_status === 'captured' ||
    o.payment_status === 'partially_refunded' ||
    o.payment_status === 'partially_captured'
  )
}

/** Refund request BEFORE the order is despatched / picked up. */
export function canRequestRefund(o: FlowOrder): boolean {
  if (!isPaid(o)) return false
  if (o.status === 'canceled') return false
  if (isPastDespatch(o)) return false
  const rr = getRefundRequest(o)
  if (rr && (rr.status === 'requested' || rr.status === 'refunded'))
    return false
  if (getOpenReturn(o)) return false
  if (getReturnRecords(o).some((r) => r.status === 'refunded')) return false
  return true
}

/** Return request AFTER the order is despatched / picked up. */
export function canRequestReturn(o: FlowOrder): boolean {
  if (!isPaid(o) && o.payment_status !== 'refunded') return false
  if (o.status === 'canceled') return false
  if (!isPastDespatch(o)) return false
  if (getOpenReturn(o)) return false
  if (getRefundRequest(o)?.status === 'refunded') return false
  return Object.values(remainingReturnQty(o)).some((q) => q > 0)
}
