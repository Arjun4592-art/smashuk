import Link from 'next/link';
import NewsletterForm from '@/components/website/NewsletterForm';
import { InstagramIcon, TwitterIcon, FacebookIcon, YoutubeIcon, PhoneIcon, MailIcon, MapPinIcon, TruckIcon, ShieldIcon, RefreshIcon, HeadphonesIcon, ArrowRightIcon } from '@/components/ui/Icons';
import { SITE_NAME, SITE_LOGO, SPORTS, FREE_SHIPPING_THRESHOLD } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { getPublicStoreContact } from '@/lib/store-contact';
import { PAYMENT_METHODS } from '@/components/website/PaymentIcons';
const QUICK_LINKS = [{
  label: 'All Products',
  href: '/shop'
}, {
  label: 'New Arrivals',
  href: '/shop?badge=NEW'
}, {
  label: 'Best Sellers',
  href: '/shop?badge=BESTSELLER'
}, {
  label: 'Sale',
  href: '/shop?badge=SALE'
}, {
  label: 'My Orders',
  href: '/orders'
}, {
  label: 'My Account',
  href: '/login'
}, {
  label: 'Gift Cards',
  href: '/gift-cards'
}, {
  label: 'Contact Us',
  href: '/contact'
}, {
  label: 'Local Store',
  href: '/local-store'
}, {
  label: 'Blog',
  href: '/blog'
}];
const PARTNERSHIP_LINKS = [{
  label: 'Club Partnership Programme',
  href: '/local-store/partnerships'
}, {
  label: 'Club Demo Programme',
  href: '/local-store/club-demo-programme'
}, {
  label: 'Shuttlecock Partnership',
  href: '/local-store/shuttlecock-partnership'
}, {
  label: 'Tennis Ball Partnership',
  href: '/local-store/tennis-ball-partnership'
}, {
  label: 'Club Kit Printing',
  href: '/local-store/kit-printing'
}, {
  label: 'Sponsorship Programme',
  href: '/local-store/sponsorship'
}];
const POLICY_LINKS = [{
  label: 'Privacy Policy',
  href: '/privacy'
}, {
  label: 'Terms of Service',
  href: '/terms'
}, {
  label: 'Shipping Policy',
  href: '/shipping'
}, {
  label: 'Return Policy',
  href: '/returns'
}];
const TRUST_BADGES = [{
  icon: <TruckIcon size={20} />,
  title: 'Free Shipping',
  subtitle: `On orders above ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`
}, {
  icon: <ShieldIcon size={20} />,
  title: '100% Authentic',
  subtitle: 'Genuine products only'
}, {
  icon: <RefreshIcon size={20} />,
  title: 'Easy Returns',
  subtitle: '7-day hassle-free returns'
}, {
  icon: <HeadphonesIcon size={20} />,
  title: 'Expert Support',
  subtitle: 'By sports enthusiasts'
}];
const SOCIAL_LINKS = [{
  icon: <InstagramIcon size={17} />,
  href: 'https://instagram.com/smashpro',
  label: 'Instagram'
}, {
  icon: <FacebookIcon size={17} />,
  href: 'https://facebook.com/smashpro',
  label: 'Facebook'
}, {
  icon: <TwitterIcon size={17} />,
  href: 'https://twitter.com/smashpro',
  label: 'Twitter / X'
}, {
  icon: <YoutubeIcon size={17} />,
  href: 'https://youtube.com/smashpro',
  label: 'YouTube'
}];
export default async function Footer() {
  const contact = await getPublicStoreContact();
  return <footer className='bg-[#2C2C3E]'>
      {}
      <div className='bg-[#E8553A]'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div>
            <p className='font-montserrat font-black text-white text-lg leading-none'>
              Get 10% off your first order!
            </p>
            <p className='text-white/75 text-sm font-lato mt-1'>
              Join 50,000+ athletes already shopping with us
            </p>
          </div>
          <Link href='/register' className='inline-flex items-center gap-2 bg-white text-[#E8553A] font-montserrat font-black text-sm px-7 py-3 rounded-full hover:bg-[#FDF0ED] transition-colors whitespace-nowrap shadow-lg shrink-0'>
            Create Free Account
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>

      {}
      <div className='border-b border-white/8'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-5'>
            {TRUST_BADGES.map(badge => <div key={badge.title} className='flex items-center gap-3 group'>
                <div className='w-10 h-10 rounded-xl bg-[#E8553A]/12 text-[#E8553A] flex items-center justify-center shrink-0 group-hover:bg-[#E8553A] group-hover:text-white transition-all duration-250'>
                  {badge.icon}
                </div>
                <div>
                  <p className='text-[13px] font-bold text-white font-montserrat leading-none'>
                    {badge.title}
                  </p>
                  <p className='text-[11px] text-white/40 font-lato mt-1'>
                    {badge.subtitle}
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </div>

      {}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10'>
          {}
          <div className='lg:col-span-1'>
            {}
            <Link href='/' className='flex items-center gap-2.5 mb-5 group w-fit'>
              <div className='bg-white rounded-lg px-2.5 py-1.5 shadow-md group-hover:scale-105 transition-transform'>
                {}
                <img src={SITE_LOGO} alt={SITE_NAME} className='h-7 w-auto' />
              </div>
            </Link>

            <p className='text-[13px] text-white/40 font-lato leading-relaxed mb-6'>
              Premium racket sports equipment for every player. Badminton,
              Tennis, Padel &amp; Squash — gear to perform at your best.
            </p>

            {}
            <div className='flex items-center gap-2 mb-7'>
              {SOCIAL_LINKS.map(social => <a key={social.label} href={social.href} target='_blank' rel='noopener noreferrer' aria-label={social.label} className='w-9 h-9 rounded-xl bg-white/8 hover:bg-[#E8553A] flex items-center justify-center text-white/40 hover:text-white transition-all duration-200'>
                  {social.icon}
                </a>)}
            </div>
          </div>

          {}
          <div>
            <h4 className='font-montserrat font-black text-[11px] uppercase tracking-[0.15em] text-white/40 mb-5'>
              Shop by Sport
            </h4>
            <ul className='space-y-3'>
              {SPORTS.map(sport => <li key={sport.slug}>
                  <Link href={`/shop?sport=${sport.slug}`} className='flex items-center gap-2.5 text-[13px] text-white/50 hover:text-[#E8553A] transition-colors font-lato group'>
                    <span className='text-base group-hover:scale-110 transition-transform inline-block'>
                      {sport.icon}
                    </span>
                    {sport.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {}
          <div>
            <h4 className='font-montserrat font-black text-[11px] uppercase tracking-[0.15em] text-white/40 mb-5'>
              Quick Links
            </h4>
            <ul className='space-y-3'>
              {QUICK_LINKS.map(link => <li key={link.href + link.label}>
                  <Link href={link.href} className='text-[13px] text-white/50 hover:text-[#E8553A] transition-colors font-lato flex items-center gap-2 group'>
                    <span className='w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#E8553A] transition-colors shrink-0' />
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {}
          <div>
            <h4 className='font-montserrat font-black text-[11px] uppercase tracking-[0.15em] text-white/40 mb-5'>
              Partnership Programmes
            </h4>
            <ul className='space-y-3'>
              {PARTNERSHIP_LINKS.map(link => <li key={link.href}>
                  <Link href={link.href} className='text-[13px] text-white/50 hover:text-[#E8553A] transition-colors font-lato flex items-center gap-2 group'>
                    <span className='w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#E8553A] transition-colors shrink-0' />
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {}
          <div>
            <h4 className='font-montserrat font-black text-[11px] uppercase tracking-[0.15em] text-white/40 mb-5'>
              Contact Us
            </h4>

            <ul className='space-y-3.5 mb-7'>
              <li className='flex items-start gap-3'>
                <MapPinIcon size={15} className='text-[#E8553A] shrink-0 mt-0.5' />
                <span className='text-[13px] text-white/50 font-lato leading-relaxed'>
                  {contact.address.line1}
                  {contact.address.line2 ? `, ${contact.address.line2}` : ''}
                  <br />
                  {contact.address.city}, {contact.address.state}{' '}
                  {contact.address.pincode}
                </span>
              </li>
              <li className='flex items-center gap-3'>
                <PhoneIcon size={15} className='text-[#E8553A] shrink-0' />
                <a href={`tel:${contact.phone}`} className='text-[13px] text-white/50 hover:text-[#E8553A] transition-colors font-lato'>
                  {contact.phone}
                </a>
              </li>
              <li className='flex items-center gap-3'>
                <MailIcon size={15} className='text-[#E8553A] shrink-0' />
                <a href={`mailto:${contact.email}`} className='text-[13px] text-white/50 hover:text-[#E8553A] transition-colors font-lato'>
                  {contact.email}
                </a>
              </li>
            </ul>

            {}
            <div className='bg-white/5 border border-white/8 rounded-2xl p-4'>
              <p className='text-[13px] font-black text-white font-montserrat leading-none'>
                Stay Updated
              </p>
              <p className='text-[11px] text-white/40 font-lato mt-1 mb-3'>
                Deals, new arrivals &amp; tips in your inbox
              </p>
              <NewsletterForm variant='dark' />
            </div>
          </div>
        </div>
      </div>

      {}
      <div className='border-t border-white/8'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            {}
            <p className='text-[11px] text-white/30 font-lato text-center md:text-left'>
              © {new Date().getFullYear()}{' '}
              <span className='text-white/50 font-semibold'>{SITE_NAME}</span>.
              All rights reserved. Made with ❤️ for athletes.
            </p>

            {}
            <div className='flex items-center gap-4 flex-wrap justify-center'>
              {POLICY_LINKS.map(link => <Link key={link.href} href={link.href} className='text-[11px] text-white/30 hover:text-white/60 transition-colors font-lato'>
                  {link.label}
                </Link>)}
            </div>

            {}
            <div className='flex items-center gap-1.5 flex-wrap justify-center'>
              {PAYMENT_METHODS.map(method => <div key={method.name} title={method.name}>
                  {method.render()}
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </footer>;
}
