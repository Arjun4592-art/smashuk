import { redirect } from 'next/navigation'

// Footer "Track your order" link in every email points to /track (no order id).
// There is no public lookup form (tracking links need a signed token), so send
// the customer to their orders list. proxy.ts sends logged-out users to /login.
export default function TrackIndexPage() {
  redirect('/profile?tab=orders')
}
