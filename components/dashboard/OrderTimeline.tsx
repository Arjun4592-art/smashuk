'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { resendOrderConfirmation } from '@/lib/api/dashboard'
import {
  ConfirmSheet,
  IconSend,
  providerLabel,
  Section,
  SectionTitle,
  Spinner,
  TimelineDay,
  TimelineItem,
  cx,
} from '@/components/orders/OrderUI'

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
    | 'comment'
  message: string
  timestamp: string
  extra?: string
}

const money = (n: number) =>
  '£' +
  (Number(n) || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

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

  const captured = (order.payments ?? []).find((p: any) => p.captured_at)
  if (captured?.captured_at) {
    events.push({
      id: 'payment',
      type: 'payment_captured',
      message: 'Payment was captured',
      timestamp: captured.captured_at,
      extra: captured.provider_id
        ? `via ${providerLabel(captured.provider_id)}`
        : undefined,
    })
  }

  for (const f of order.fulfillments ?? []) {
    if (f.created_at) {
      events.push({
        id: `fulfill-${f.id}`,
        type: 'fulfilled',
        message: 'Order was fulfilled',
        timestamp: f.created_at,
      })
    }
    if (f.shipped_at) {
      events.push({
        id: `ship-${f.id}`,
        type: 'shipped',
        message: 'Order was dispatched',
        timestamp: f.shipped_at,
        extra: f.tracking_numbers?.join(', ') || undefined,
      })
    }
    if (f.delivered_at) {
      events.push({
        id: `deliver-${f.id}`,
        type: 'delivered',
        message:
          order.metadata?.fulfillment_type === 'pickup'
            ? 'Order was picked up'
            : 'Order was delivered',
        timestamp: f.delivered_at,
      })
    }
  }

  for (const r of order.metadata?.returns ?? []) {
    const requestedAt = r.requested_at ?? r.created_at
    if (requestedAt) {
      events.push({
        id: `return-req-${r.id}`,
        type: 'return_requested',
        message:
          r.status === 'refunded' && r.source !== 'customer'
            ? 'Return was created'
            : 'Return was requested',
        timestamp: requestedAt,
        extra: [r.reason, r.note].filter(Boolean).join(' · ') || undefined,
      })
    }
    const doneAt = r.processed_at ?? r.refunded_at
    if (r.status === 'refunded' && doneAt) {
      events.push({
        id: `return-ok-${r.id}`,
        type: 'return_approved',
        // refund_amount is stored in major units (£), not pence
        message: `Refund of ${money(r.refund_amount)} was issued`,
        timestamp: doneAt,
      })
    }
    if (r.status === 'rejected') {
      const at = r.processed_at ?? r.rejected_at
      if (at) {
        events.push({
          id: `return-no-${r.id}`,
          type: 'return_rejected',
          message: 'Return request was rejected',
          timestamp: at,
        })
      }
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

  for (const c of order.metadata?.staff_comments ?? []) {
    events.push({
      id: c.id,
      type: 'comment',
      message: c.text,
      timestamp: c.created_at,
      extra: c.author ?? 'Staff',
    })
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

const timeOf = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

function dayLabel(ts: string) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface Props {
  order: any
  onCommentAdded?: () => void
}

export default function OrderTimeline({ order, onCommentAdded }: Props) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)
  const [resending, setResending] = useState(false)

  const events = buildTimeline(order)

  const groups: { label: string; events: TimelineEvent[] }[] = []
  for (const ev of events) {
    const label = dayLabel(ev.timestamp)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.events.push(ev)
    else groups.push({ label, events: [ev] })
  }

  const handleComment = async () => {
    const text = comment.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save comment')
      }
      setComment('')
      onCommentAdded?.()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setConfirmResend(false)
    setResending(true)
    try {
      const r = await resendOrderConfirmation(order.id)
      toast.success(`Confirmation email sent to ${r.to}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to resend email')
    } finally {
      setResending(false)
    }
  }

  return (
    <Section plainOnMobile className='px-4 pt-4 lg:px-5 lg:pb-5'>
      <SectionTitle>Timeline</SectionTitle>
      <p className='text-[13px] text-[#6D7175] -mt-1 mb-4'>
        Only you and other staff can see comments
      </p>

      <div className='flex flex-col'>
        {/* Events */}
        <div className='order-1 lg:order-2 pb-4 lg:pb-0 lg:mt-5'>
          {groups.length === 0 ? (
            <p className='text-[13px] text-[#6D7175] py-4'>No activity yet</p>
          ) : (
            groups.map((g) => (
              <TimelineDay key={g.label} label={g.label}>
                {g.events.map((ev) => (
                  <TimelineItem
                    key={ev.id}
                    time={timeOf(ev.timestamp)}
                    sub={ev.extra}
                    action={
                      ev.type === 'order_placed' && order.email ? (
                        <button
                          type='button'
                          disabled={resending}
                          onClick={() => setConfirmResend(true)}
                          className='text-[14px] text-[#2C6ECB] hover:underline disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5'
                        >
                          {resending && <Spinner size={13} />}
                          Resend confirmation email
                        </button>
                      ) : undefined
                    }
                  >
                    {ev.message}
                  </TimelineItem>
                ))}
              </TimelineDay>
            ))
          )}
        </div>

        {/* Composer — pinned to the bottom on mobile, on top on desktop */}
        <div
          className={cx(
            'order-2 lg:order-1 sticky bottom-0 lg:static z-10',
            '-mx-4 px-4 py-3 bg-[#F6F6F7] lg:bg-transparent lg:mx-0 lg:px-0 lg:py-0',
          )}
        >
          <div className='flex items-center gap-2'>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleComment()
                }
              }}
              placeholder='Leave a comment…'
              maxLength={2000}
              className='flex-1 min-w-0 h-11 px-4 rounded-xl bg-white lg:bg-[#FAFAFA] border border-[#E1E3E5] text-[15px] text-[#202223] placeholder:text-[#8C9196] outline-none focus:border-[#008060] transition-colors'
            />
            <button
              type='button'
              aria-label='Post comment'
              onClick={handleComment}
              disabled={!comment.trim() || submitting}
              className='w-11 h-11 rounded-xl bg-[#008060] text-white flex items-center justify-center shrink-0 disabled:opacity-30 cursor-pointer transition-opacity'
            >
              {submitting ? <Spinner /> : <IconSend size={18} />}
            </button>
          </div>
        </div>
      </div>

      <ConfirmSheet
        open={confirmResend}
        title='Resend confirmation email?'
        message={`The order confirmation will be sent again to ${order.email}.`}
        confirmLabel='Resend'
        onConfirm={handleResend}
        onClose={() => setConfirmResend(false)}
      />
    </Section>
  )
}
