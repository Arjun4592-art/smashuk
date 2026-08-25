import LegalPage from '@/components/website/LegalPage';
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants';
export const metadata = {
  title: `Terms & Conditions | ${SITE_NAME}`
};
export default function TermsPage() {
  return <LegalPage title='Terms & Conditions'>
      <h2>Using our site</h2>
      <p>
        By placing an order with {SITE_NAME}, you agree to these terms.
        Prices and product availability are subject to change without
        notice.
      </p>

      <h2>Orders & payment</h2>
      <p>
        We accept payment by card via Stripe. Your order is confirmed once
        payment is successfully processed. We reserve the right to cancel
        an order if a product is out of stock or priced incorrectly.
      </p>

      <h2>Product information</h2>
      <p>
        We do our best to keep product descriptions, images, and
        specifications accurate. Actual products may vary slightly from
        photos (e.g. minor packaging changes from the manufacturer).
      </p>

      <h2>String Upgrade service</h2>
      <p>
        Where offered, the String Upgrade choice at checkout is a service
        preference, not a separate purchase — selecting "Yes" adds roughly
        one extra day of processing time before your racket ships.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        {SITE_NAME} is not liable for indirect or consequential losses
        arising from use of our products, to the extent permitted by law.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className='text-[#E8553A] hover:underline'>
          {CONTACT_EMAIL}
        </a>.
      </p>
    </LegalPage>;
}
