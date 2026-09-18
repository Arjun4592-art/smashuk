'use client'

import { useState } from 'react'

interface TimelineEvent {
  id: string
  type:
    | 'order_placed'
    | 'payment_captured'
    | 'fulfilled'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'archived'
    | 'return_requested'
    | 'return_approved'
    | 'return_rejected'
    | 'refunded'
    | 'comment'
  message: string
  timestamp: string
  extra?: string
}

function buildTimeline(order: any): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (order.created_at) {
    events.push({
      id: 'placed',
      type: 'order_placed',
      message: `Order #${order.display_id ?? order.id?.slice(-6)} was placed`,
      timestamp: order.created_at,
      extra: order.email ?? undefined,
    })
  }

  if (order.payment_status === 'captured' && order.payments?.length) {
    const p = order.payments.find((p: any) => p.captured_at)
    if (p?.captured_at) {
      events.push({
        id: 'payment',
        type: 'payment_captured',
        message: 'Payment was captured',
        timestamp: p.captured_at,
        extra: `via ${p.provider_id?.replace('pp_', '').replace('_', ' ') ?? 'payment provider'}`,
      })
    }
  }

  for (const fulfillment of order.fulfillments ?? []) {
    if (fulfillment.created_at) {
      events.push({
        id: `fulfill-${fulfillment.id}`,
        type: 'fulfilled',
        message: 'Order was fulfilled',
        timestamp: fulfillment.created_at,
      })
    }
    if (fulfillment.shipped_at) {
      events.push({
        id: `ship-${fulfillment.id}`,
        type: 'shipped',
        message: 'Order was shipped',
        timestamp: fulfillment.shipped_at,
        extra: fulfillment.tracking_numbers?.join(', ') || undefined,
      })
    }
    if (fulfillment.delivered_at) {
      events.push({
        id: `deliver-${fulfillment.id}`,
        type: 'delivered',
        message: 'Order was delivered',
        timestamp: fulfillment.delivered_at,
      })
    }
  }

  for (const ret of order.metadata?.returns ?? []) {
    if (ret.created_at || ret.requested_at) {
      events.push({
        id: `return-req-${ret.id}`,
        type: 'return_requested',
        message: 'Return was requested',
        timestamp: ret.created_at ?? ret.requested_at,
        extra: ret.reason ?? undefined,
      })
    }
    if (ret.status === 'refunded' && ret.refunded_at) {
      events.push({
        id: `return-approved-${ret.id}`,
        type: 'return_approved',
        message: `Return approved — refund of £${(ret.refund_amount / 100).toFixed(2)} issued`,
        timestamp: ret.refunded_at,
      })
    }
    if (ret.status === 'rejected' && ret.rejected_at) {
      events.push({
        id: `return-rejected-${ret.id}`,
        type: 'return_rejected',
        message: 'Return request was rejected',
        timestamp: ret.rejected_at,
      })
    }
  }

  if (order.status === 'canceled' && order.canceled_at) {
    events.push({
      id: 'cancelled',
      type: 'cancelled',
      message: 'Order was cancelled',
      timestamp: order.canceled_at,
    })
  }

  if (order.status === 'archived') {
    events.push({
      id: 'archived',
      type: 'archived',
      message: 'Order was archived',
      timestamp: order.updated_at ?? order.created_at,
    })
  }

  // Sort by timestamp descending (newest first, like Shopify)
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

const EVENT_ICON: Record<string, { icon: string; color: string; dot: string }> =
  {
    order_placed: { icon: '🛍️', color: 'text-[#2C6ECB]', dot: 'bg-[#2C6ECB]' },
    payment_captured: {
      icon: '💳',
      color: 'text-[#008060]',
      dot: 'bg-[#008060]',
    },
    fulfilled: { icon: '📦', color: 'text-[#008060]', dot: 'bg-[#008060]' },
    shipped: { icon: '🚚', color: 'text-[#2C6ECB]', dot: 'bg-[#2C6ECB]' },
    delivered: { icon: '✅', color: 'text-[#008060]', dot: 'bg-[#008060]' },
    cancelled: { icon: '✕', color: 'text-[#D82C0D]', dot: 'bg-[#D82C0D]' },
    archived: { icon: '🗄️', color: 'text-[#6D7175]', dot: 'bg-[#6D7175]' },
    return_requested: {
      icon: '↩️',
      color: 'text-[#916A00]',
      dot: 'bg-[#FFC453]',
    },
    return_approved: {
      icon: '💰',
      color: 'text-[#008060]',
      dot: 'bg-[#008060]',
    },
    return_rejected: {
      icon: '✕',
      color: 'text-[#D82C0D]',
      dot: 'bg-[#D82C0D]',
    },
    refunded: { icon: '💰', color: 'text-[#008060]', dot: 'bg-[#008060]' },
    comment: { icon: '💬', color: 'text-[#6D7175]', dot: 'bg-[#6D7175]' },
  }

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  order: any
  onCommentAdded?: () => void
}

export default function OrderTimeline({ order, onCommentAdded }: Props) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const events = buildTimeline(order)
  const comments: TimelineEvent[] = (order.metadata?.staff_comments ?? []).map(
    (c: any) => ({
      id: c.id,
      type: 'comment' as const,
      message: c.text,
      timestamp: c.created_at,
      extra: c.author ?? 'Staff',
    }),
  )

  const allEvents = [...events, ...comments].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await fetch(`/api/admin/orders/${order.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment.trim() }),
      })
      setComment('')
      onCommentAdded?.()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  // Group events by date
  const grouped: { label: string; events: TimelineEvent[] }[] = []
  const dateMap = new Map<string, TimelineEvent[]>()
  for (const ev of allEvents) {
    const d = new Date(ev.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    let label: string
    if (d.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    if (!dateMap.has(label)) dateMap.set(label, [])
    dateMap.get(label)!.push(ev)
  }
  dateMap.forEach((evs, label) => grouped.push({ label, events: evs }))

  return (
    <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
      <h2 className='text-[14px] font-semibold text-[#202223] mb-4'>
        Timeline
      </h2>

      {/* Comment box */}
      <div className='flex gap-2 mb-5'>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder='Leave a comment…'
          rows={2}
          className='flex-1 text-[13px] text-[#202223] placeholder:text-[#8C9196] border border-[#E1E3E5] rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#008060] transition-colors'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment()
          }}
        />
        <button
          onClick={handleComment}
          disabled={!comment.trim() || submitting}
          className='self-end px-3 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[12px] font-medium rounded-lg transition-colors disabled:opacity-40'
        >
          {submitting ? '…' : '→'}
        </button>
      </div>

      {/* Events */}
      {allEvents.length === 0 ? (
        <p className='text-[12.5px] text-[#8C9196] text-center py-4'>
          No activity yet
        </p>
      ) : (
        <div className='space-y-4'>
          {grouped.map((group) => (
            <div key={group.label}>
              <p className='text-[11px] font-semibold text-[#8C9196] uppercase tracking-wider mb-2'>
                {group.label}
              </p>
              <div className='space-y-3'>
                {group.events.map((ev) => {
                  const style = EVENT_ICON[ev.type] ?? EVENT_ICON['comment']
                  return (
                    <div key={ev.id} className='flex gap-3 items-start'>
                      <div className='flex flex-col items-center pt-0.5'>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-1 ${style.dot}`}
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[12.5px] text-[#202223] leading-snug'>
                          {ev.message}
                        </p>
                        {ev.extra && (
                          <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                            {ev.extra}
                          </p>
                        )}
                        <p className='text-[11px] text-[#8C9196] mt-0.5'>
                          {formatTime(ev.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className='text-[11px] text-[#8C9196] mt-4 text-center'>
        Only you and other staff can see comments
      </p>
    </div>
  )
}
