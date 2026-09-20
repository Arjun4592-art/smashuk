import { sendMail } from '@/lib/email'
import {
  orderConfirmationEmail,
  adminNewOrderEmail,
} from '@/lib/email-templates'

// Emails the store owner/admin (address configured in Dashboard > Settings
// > Notifications, falling back to STORE_OWNER_EMAIL / MEDUSA_ADMIN_EMAIL)
// that a new order came in.
export async function notifyNewOrder(
  order: any,
  channel: 'website' | 'pos' = 'website',
) {
  try {
    const { medusaServiceFetch } =
      await import('@/lib/api/medusa-service-token')
    const storeRes = await medusaServiceFetch(
      `/admin/stores?limit=1&fields=id,metadata`,
    )
    if (!storeRes.ok) return
    const storeData = await storeRes.json().catch(() => ({}))
    const notificationSettings = storeData.stores?.[0]?.metadata
      ?.notificationSettings as
      | {
          settings?: Record<string, { email?: boolean }>
          channels?: { email?: string }
        }
      | undefined
    const emailEnabled =
      notificationSettings?.settings?.new_order?.email ?? true
    if (!emailEnabled) return
    const to =
      notificationSettings?.channels?.email ||
      process.env.STORE_OWNER_EMAIL ||
      process.env.MEDUSA_ADMIN_EMAIL
    if (!to) return
    const { subject, html, text, templateVariables } = adminNewOrderEmail(
      order,
      channel,
    )
    await sendMail({ to, subject, html, text, templateVariables })
  } catch (err) {
    console.error('[order-notifications] new-order admin email failed:', err)
  }
}

// Emails the customer their order confirmation.
export async function sendOrderConfirmationEmail(order: any) {
  try {
    if (!order?.email) return
    const { subject, html, text, templateVariables, attachments } =
      orderConfirmationEmail(order)
    await sendMail({
      to: order.email,
      subject,
      html,
      text,
      templateVariables,
      attachments,
    })
  } catch (err) {
    console.error('[order-notifications] order confirmation email failed:', err)
  }
}
