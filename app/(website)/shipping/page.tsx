import LegalPage from '@/components/website/LegalPage'
import { FREE_SHIPPING_THRESHOLD, SITE_NAME } from '@/lib/constants'

export const metadata = { title: `Delivery Information | ${SITE_NAME}` }

export default function DeliveryPage() {
  return (
    <LegalPage title='Delivery Information'>
      <p>
        We aim to get your order to you as quickly as possible. Here's how
        shipping works at {SITE_NAME}.
      </p>

      <h2>Shipping costs</h2>
      <p>
        Orders above £{FREE_SHIPPING_THRESHOLD} ship free. Orders below that
        threshold have a flat shipping fee calculated at checkout.
      </p>

      <h2>Delivery times</h2>
      <ul className='list-disc pl-5 space-y-1'>
        <li>Standard delivery: 2–5 working days</li>
        <li>Express delivery: 1–2 working days (where available)</li>
      </ul>
      <p>
        Orders placed after 2pm are processed the next working day. If your
        order includes a racket with a{' '}
        <strong>String Upgrade</strong> selected, please allow one extra day
        for stringing before dispatch.
      </p>

      <h2>Tracking your order</h2>
      <p>
        Once your order ships, you'll receive a tracking link by email. You
        can also see order status any time under{' '}
        <a href='/profile?tab=orders' className='text-[#E8553A] hover:underline'>My Orders</a>.
      </p>

      <h2>International delivery</h2>
      <p>
        Currently we ship within the UK only. Get in touch via our{' '}
        <a href='/contact' className='text-[#E8553A] hover:underline'>Contact page</a>{' '}
        if you're ordering from elsewhere and we'll see what we can do.
      </p>
    </LegalPage>
  )
}
