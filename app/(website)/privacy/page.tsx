import LegalPage from '@/components/website/LegalPage';
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants';
export const metadata = {
  title: `Privacy Policy | ${SITE_NAME}`
};
export default function PrivacyPage() {
  return <LegalPage title='Privacy Policy'>
      <p>
        We collect only what we need to process your orders and improve
        your experience with {SITE_NAME}.
      </p>

      <h2>What we collect</h2>
      <ul className='list-disc pl-5 space-y-1'>
        <li>Name, email, phone, and delivery address for orders</li>
        <li>Order and browsing history to show relevant products</li>
        <li>Payment details are handled entirely by Stripe — we never see or store your full card number</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To fulfil orders, send order/shipping updates, respond to enquiries,
        and — only if you've subscribed — send occasional emails about new
        products and offers. You can unsubscribe from marketing emails any
        time.
      </p>

      <h2>Sharing</h2>
      <p>
        We share data only with services needed to run your order: payment
        processing (Stripe) and delivery couriers. We don't sell your data
        to third parties.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request a copy of your data, ask us to correct it, or ask
        us to delete your account by emailing{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className='text-[#E8553A] hover:underline'>
          {CONTACT_EMAIL}
        </a>.
      </p>
    </LegalPage>;
}
