import LegalPage from '@/components/website/LegalPage'
import { CONTACT_EMAIL } from '@/lib/constants'
export const metadata = {
  title: `Returns Policy`,
}
export default function ReturnsPage() {
  return (
    <LegalPage title='Returns & Exchanges'>
      <p>
        Not quite right? You can return most items within{' '}
        <strong>30 days</strong> of delivery for a refund or exchange.
      </p>

      <h2>Return conditions</h2>
      <ul className='list-disc pl-5 space-y-1'>
        <li>
          Item must be{' '}
          <strong className='text-red-600'>unused, in original condition</strong>
          , with tags/packaging intact
        </li>
        <li>Proof of purchase (order number or receipt) required</li>
        <li>
          Rackets with a <strong>String Upgrade</strong> can be returned, but a{' '}
          <strong>£30 restocking fee</strong> applies — see below
        </li>
      </ul>

      <h2>Rackets with a String Upgrade</h2>
      <p>
        Rackets that have a string upgrade can be returned, but a{' '}
        <strong>restocking fee of £30</strong> will apply. However, the{' '}
        <strong className='text-red-600'>
          manufacturer&rsquo;s plastic covering on the handle MUST be intact
        </strong>
        .
      </p>
      <p>
        Once the manufacturer&rsquo;s plastic covering has been removed,{' '}
        <strong className='text-red-600'>returns won&rsquo;t be accepted</strong>
        .
      </p>

      <h2>How to start a return</h2>
      <p>
        Email us at{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className='text-[#E8553A] hover:underline'
        >
          {CONTACT_EMAIL}
        </a>{' '}
        with your order number, or reach out via our{' '}
        <a href='/contact' className='text-[#E8553A] hover:underline'>
          Contact page
        </a>
        . We'll send you a returns address and instructions.
      </p>

      <h2>Refunds</h2>
      <p>
        Once we receive and inspect your return, refunds are processed to your
        original payment method within 5–7 working days.
      </p>

      <h2>Faulty items</h2>
      <p>
        If an item arrives damaged or faulty, contact us within 48 hours of
        delivery with photos and we'll sort a replacement or refund at no cost
        to you.
      </p>
    </LegalPage>
  )
}