import LegalPage from '@/components/website/LegalPage';
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants';
export const metadata = {
  title: `Returns Policy | ${SITE_NAME}`
};
export default function ReturnsPage() {
  return <LegalPage title='Returns & Exchanges'>
      <p>
        Not quite right? You can return most items within{' '}
        <strong>30 days</strong> of delivery for a refund or exchange.
      </p>

      <h2>Return conditions</h2>
      <ul className='list-disc pl-5 space-y-1'>
        <li>Item must be unused, in original condition, with tags/packaging intact</li>
        <li>Proof of purchase (order number or receipt) required</li>
        <li>
          Rackets that had a <strong>String Upgrade</strong> applied are
          excluded from returns once strung, since stringing can't be
          undone — this is called out at checkout before you confirm
        </li>
      </ul>

      <h2>How to start a return</h2>
      <p>
        Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className='text-[#E8553A] hover:underline'>
          {CONTACT_EMAIL}
        </a>{' '}
        with your order number, or reach out via our{' '}
        <a href='/contact' className='text-[#E8553A] hover:underline'>Contact page</a>. We'll
        send you a returns address and instructions.
      </p>

      <h2>Refunds</h2>
      <p>
        Once we receive and inspect your return, refunds are processed to
        your original payment method within 5–7 working days.
      </p>

      <h2>Faulty items</h2>
      <p>
        If an item arrives damaged or faulty, contact us within 48 hours of
        delivery with photos and we'll sort a replacement or refund at no
        cost to you.
      </p>
    </LegalPage>;
}
