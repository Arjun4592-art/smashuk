import Navbar from '@/components/website/Navbar'
import Footer from '@/components/website/Footer'
import AuthProvider from '@/components/providers/AuthProvider'
import CookieConsent from '@/components/website/CookieConsent'
import ChatWidget from '@/components/website/ChatWidget'
import RevealInit from '@/components/website/local-store/RevealInit'
import { getPromoBanner } from '@/lib/promo-banner'
export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const promoBanner = await getPromoBanner()
  return (
    <AuthProvider surface='website'>
      <Navbar
        promoCode={promoBanner.code}
        promoDiscountLabel={promoBanner.discountLabel}
      />
      {}
      <main className='ls-luxury min-h-screen'>{children}</main>
      <Footer />
      <CookieConsent />
      <ChatWidget />
      <RevealInit />
    </AuthProvider>
  )
}
