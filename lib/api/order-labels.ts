import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { sendMail, notifyOwner } from '@/lib/email'
import { mailInLabelEmail, returnLabelEmail } from '@/lib/email-templates'
import { fulfillOrder, shipOrder } from '@/lib/api/medusa-fulfillment'
import { isSyntheticEmail } from '@/lib/pos/walkin'

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>

export type BookedLabel = {
  trackingNumber?: string
  carrierName?: string
  parcel2goOrderId?: string
  base64?: string
}

/** True when the customer has a real address we can email a label to. */
export function hasEmailableAddress(email?: string | null): email is string {
  return Boolean(email) && !isSyntheticEmail(email as string)
}

/**
 * Books a prepaid Parcel2Go label (customer -> shop) through the Medusa
 * backend's return-label route and returns the PDF. Throws with a readable
 * message when booking fails (low Prepay balance, no address, ...).
 */
export async function bookCustomerLabel(
  orderId: string,
  items: { item_id: string; quantity: number }[],
  fetcher: Fetcher,
  extra: {
    weight_kg?: number
    contents_summary?: string
    /** Reuse an already-paid Parcel2Go order (retry) instead of booking again. */
    parcel2go_order_id?: string
  } = {},
): Promise<BookedLabel> {
  const res = await fetcher(`/admin/orders/${orderId}/return-label`, {
    method: 'POST',
    body: JSON.stringify({ items, ...extra }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      data?.error ?? data?.message ?? 'Could not book the shipping label.',
    )
  }
  return {
    trackingNumber: data.tracking_number ?? undefined,
    carrierName: data.carrier_name ?? data.service_name,
    parcel2goOrderId: data.parcel2go_order_id,
    base64: data.label_base64 ?? undefined,
  }
}

/** Emails an approved-return label. Never throws. */
export async function emailReturnLabel(
  order: any,
  label: BookedLabel,
  orderId: string,
): Promise<{ emailed: boolean; error?: string }> {
  if (!label.base64) {
    return {
      emailed: false,
      error: 'The label PDF was not ready yet — download it from Parcel2Go',
    }
  }
  try {
    const mail = returnLabelEmail(order, {
      carrierName: label.carrierName,
      trackingNumber: label.trackingNumber,
    })
    const sent = await sendMail({
      to: order.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [
        {
          filename: `return-label-${order.display_id ?? orderId}.pdf`,
          content: label.base64,
          contentType: 'application/pdf',
        },
      ],
    })
    return { emailed: sent.sent, error: sent.sent ? undefined : sent.error }
  } catch (err: any) {
    return { emailed: false, error: err?.message ?? 'Email failed' }
  }
}

const isMailInLine = (i: any) =>
  i?.metadata?.mail_in === true || i?.metadata?.mail_in === 'true'

export type MailInLabelResult = {
  ok: boolean
  skipped?: boolean
  error?: string
}

/**
 * Books the customer -> shop label for a mail-in order and emails it.
 * Safe to call more than once per order (it records what it did on the
 * order's metadata) and never throws. If it fails, the owner is emailed so
 * the label can be sent by hand.
 *
 * `boxTrackingNumber` is set when this runs right after the box kit was
 * shipped, so the email can say the box is on its way.
 */
async function deliverMailInLabel(
  orderId: string,
  opts: { boxTrackingNumber?: string; boxShipped?: boolean } = {},
): Promise<MailInLabelResult & { order?: any }> {
  try {
    const res = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,display_id,email,metadata,*items,items.metadata,shipping_address.first_name`,
    )
    if (!res.ok) return { ok: false, error: 'Could not load the order.' }
    const { order } = await res.json()
    const lines: any[] = order?.items ?? []
    const mailInLines = lines.filter(isMailInLine)
    if (!order || mailInLines.length === 0) return { ok: true, skipped: true }

    // Already handled (or being handled by a parallel request): skip.
    const prev = order.metadata?.mail_in_label
    if (prev?.status === 'sent' || prev?.status === 'booked') {
      return { ok: true, skipped: true, order }
    }
    if (
      prev?.status === 'booking' &&
      Date.now() - new Date(prev.at ?? 0).getTime() < 10 * 60 * 1000
    ) {
      return { ok: true, skipped: true, order }
    }

    // A retry of a label that was already booked and paid for reuses that
    // Parcel2Go order, so a retry never pays for a second label.
    const reuseId: string | undefined =
      prev?.status === 'failed' && prev?.parcel2go_order_id
        ? String(prev.parcel2go_order_id)
        : undefined
    let booked: {
      parcel2go_order_id?: string
      tracking_number?: string
      carrier_name?: string
    } = reuseId
      ? {
          parcel2go_order_id: reuseId,
          tracking_number: prev?.tracking_number,
          carrier_name: prev?.carrier_name,
        }
      : {}

    const saveStatus = async (state: Record<string, unknown>) => {
      await medusaServiceFetch(`/admin/orders/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({
          metadata: {
            ...(order.metadata ?? {}),
            mail_in_label: { ...state, at: new Date().toISOString() },
          },
        }),
      }).catch(() => {})
    }

    const fail = async (reason: string): Promise<MailInLabelResult> => {
      console.error(`[mail-in-label] order ${orderId}: ${reason}`)
      await saveStatus({ status: 'failed', error: reason, ...booked })
      const ref = order.display_id ?? orderId
      await notifyOwner({
        subject: `Mail-in label NOT sent for order #${ref}`,
        html: `<p>The automatic mail-in label for order <strong>#${ref}</strong> could not be sent.</p><p>Reason: ${reason}</p><p>Please book the label manually and email it to ${order.email ?? 'the customer'}.</p>`,
        text: `The automatic mail-in label for order #${ref} could not be sent. Reason: ${reason}. Please book it manually and email it to ${order.email ?? 'the customer'}.`,
        customerEmail: order.email,
      }).catch(() => {})
      return { ok: false, error: reason }
    }

    if (!hasEmailableAddress(order.email)) {
      return await fail('The order has no customer email address.')
    }

    await saveStatus({ status: 'booking' })

    const racketLines = mailInLines.filter(
      (i) => i.metadata?.mail_in_part === 'stringing',
    )
    const rackets = Math.max(racketLines.length, 1)
    let label: BookedLabel
    try {
      label = await bookCustomerLabel(
        orderId,
        mailInLines.map((i) => ({ item_id: i.id, quantity: 1 })),
        medusaServiceFetch,
        {
          // ~350 g per racket plus the box.
          weight_kg: Math.round((rackets * 0.35 + 0.5) * 100) / 100,
          contents_summary: 'Badminton/tennis/squash rackets for restringing',
          parcel2go_order_id: reuseId,
        },
      )
    } catch (err: any) {
      return await fail(err?.message ?? 'Label booking failed')
    }

    booked = {
      parcel2go_order_id: label.parcel2goOrderId ?? booked.parcel2go_order_id,
      tracking_number: label.trackingNumber ?? booked.tracking_number,
      carrier_name: label.carrierName ?? booked.carrier_name,
    }
    if (!label.carrierName) label.carrierName = booked.carrier_name

    if (!label.base64) {
      await saveStatus({
        status: 'booked',
        tracking_number: label.trackingNumber,
        parcel2go_order_id: label.parcel2goOrderId,
        error: 'Label PDF was not ready yet',
      })
      return await fail(
        `The label was booked (Parcel2Go order ${label.parcel2goOrderId}) but the PDF was not ready, so it was not emailed. Use "Resend label" in the dashboard: it reuses this booking, so you are not charged again.`,
      )
    }

    const mail = mailInLabelEmail(order, {
      carrierName: label.carrierName,
      trackingNumber: label.trackingNumber,
      boxShipped: opts.boxShipped,
      boxTrackingNumber: opts.boxTrackingNumber,
    })
    const sent = await sendMail({
      to: order.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [
        {
          filename: `mail-in-label-${order.display_id ?? orderId}.pdf`,
          content: label.base64,
          contentType: 'application/pdf',
        },
      ],
    })
    if (!sent.sent) {
      await saveStatus({
        status: 'booked',
        tracking_number: label.trackingNumber,
        parcel2go_order_id: label.parcel2goOrderId,
      })
      return await fail(
        `The label was booked (Parcel2Go order ${label.parcel2goOrderId}) but the email failed: ${sent.error ?? 'unknown error'}. Use "Resend label" in the dashboard: it reuses this booking, so you are not charged again.`,
      )
    }
    await saveStatus({
      status: 'sent',
      tracking_number: label.trackingNumber,
      parcel2go_order_id: label.parcel2goOrderId,
      carrier_name: label.carrierName,
    })
    return { ok: true, order }
  } catch (err: any) {
    console.error('[mail-in-label] unexpected error:', err)
    return { ok: false, error: err?.message ?? 'Unexpected error' }
  }
}

/**
 * Called when a mail-in order is placed. Customers who already have a box
 * get their label straight away. Customers who need a box get nothing yet:
 * their label is sent when the box is shipped (see shipMailInBox).
 */
export async function sendMailInLabelForOrder(orderId: string): Promise<void> {
  try {
    const res = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,metadata,*items,items.metadata`,
    )
    if (!res.ok) return
    const { order } = await res.json()
    const needsBox = (order?.items ?? []).some(
      (i: any) => isMailInLine(i) && i.metadata?.mail_in_part === 'box-kit',
    )
    if (needsBox) return
    await deliverMailInLabel(orderId)
  } catch (err) {
    console.error('[mail-in-label] unexpected error:', err)
  }
}

/**
 * Dashboard "Ship box to customer" button for mail-in orders where the
 * customer has no box. Fulfils and dispatches ONLY the box-kit line (which
 * books the store -> customer Parcel2Go shipment), then automatically books
 * and emails the customer -> store label.
 */
export async function shipMailInBox(
  orderId: string,
  fetcher: Fetcher,
): Promise<{
  alreadyShipped: boolean
  trackingNumber?: string
  label: MailInLabelResult
}> {
  const res = await fetcher(
    `/admin/orders/${orderId}?fields=id,metadata,*items,items.metadata`,
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.order) {
    throw new Error(body?.message ?? 'Could not load the order.')
  }
  const order = body.order
  const boxLine = (order.items ?? []).find(
    (i: any) => isMailInLine(i) && i.metadata?.mail_in_part === 'box-kit',
  )
  if (!boxLine) {
    throw new Error('This order has no mail-in box kit to ship.')
  }
  if (order.metadata?.mail_in_box?.shipped_at) {
    return {
      alreadyShipped: true,
      label: { ok: true, skipped: true },
    }
  }

  // 1) Fulfil just the box kit (books the Parcel2Go shipment for it).
  await fulfillOrder(orderId, fetcher, false, [boxLine.id])

  // 2) Find that fulfilment, then dispatch it.
  const afterRes = await fetcher(
    `/admin/orders/${orderId}?fields=id,metadata,*fulfillments,*fulfillments.labels`,
  )
  const after = (await afterRes.json().catch(() => ({}))).order
  const boxFulfillment = [...(after?.fulfillments ?? [])]
    .filter((f: any) => !f.canceled_at && !f.shipped_at && !f.delivered_at)
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )[0]
  if (!boxFulfillment) {
    throw new Error('The box kit could not be fulfilled.')
  }
  const shipped = await shipOrder(orderId, fetcher)
  const trackingNumber: string | undefined =
    (shipped as any).parcel2goTrackingNumber ??
    boxFulfillment.labels?.[0]?.tracking_number ??
    undefined

  // 3) Remember it, so the button disappears and the return leg can be
  // fulfilled separately.
  await fetcher(`/admin/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        ...(after?.metadata ?? order.metadata ?? {}),
        mail_in_box: {
          shipped_at: new Date().toISOString(),
          fulfillment_id: boxFulfillment.id,
          tracking_number: trackingNumber,
        },
      },
    }),
  })

  // 4) Email the customer -> store label now that the box is on its way.
  const label = await deliverMailInLabel(orderId, {
    boxShipped: true,
    boxTrackingNumber: trackingNumber,
  })
  return { alreadyShipped: false, trackingNumber, label }
}

/**
 * Dashboard "Resend label" for mail-in orders whose customer -> store label
 * did not go out (booking or email failed). For customers without a box the
 * box must have been shipped first.
 */
export async function resendMailInLabel(
  orderId: string,
  fetcher: Fetcher,
): Promise<MailInLabelResult> {
  const res = await fetcher(
    `/admin/orders/${orderId}?fields=id,metadata,*items,items.metadata`,
  )
  const body = await res.json().catch(() => ({}))
  const order = body.order
  if (!res.ok || !order) throw new Error('Could not load the order.')
  const needsBox = (order.items ?? []).some(
    (i: any) => isMailInLine(i) && i.metadata?.mail_in_part === 'box-kit',
  )
  if (needsBox && !order.metadata?.mail_in_box?.shipped_at) {
    throw new Error('Ship the box first — the label is sent with it.')
  }
  if (order.metadata?.mail_in_label?.status === 'sent') {
    throw new Error('The label has already been emailed to the customer.')
  }
  // Reset the failed/booking marker so deliverMailInLabel runs again, but keep
  // the id of a label that was already booked and paid for: the retry then
  // reuses it instead of buying another one.
  const prevLabel = order.metadata?.mail_in_label
  await fetcher(`/admin/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        ...(order.metadata ?? {}),
        mail_in_label: prevLabel?.parcel2go_order_id
          ? {
              status: 'failed',
              error: 'Resend requested',
              parcel2go_order_id: prevLabel.parcel2go_order_id,
              tracking_number: prevLabel.tracking_number,
              carrier_name: prevLabel.carrier_name,
              at: new Date().toISOString(),
            }
          : null,
      },
    }),
  })
  return deliverMailInLabel(orderId, {
    boxShipped: needsBox,
    boxTrackingNumber: order.metadata?.mail_in_box?.tracking_number,
  })
}
