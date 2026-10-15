import { redirect } from 'next/navigation'

// Shipping / out-for-delivery emails link to /orders. Only /orders/[id] exists,
// so without this the 404 handler bounced customers to the sale page.
export default function OrdersIndexPage() {
  redirect('/profile?tab=orders')
}
