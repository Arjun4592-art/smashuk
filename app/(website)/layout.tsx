import Navbar from '@/components/website/Navbar'
import Footer from '@/components/website/Footer'
import AuthProvider from '@/components/providers/AuthProvider'
import CookieConsent from '@/components/website/CookieConsent'
import ChatWidget from '@/components/website/ChatWidget'
import RevealInit from '@/components/website/local-store/RevealInit'
import { GoogleReviewBadge } from '@/components/website/GoogleCustomerReviews'
import { getPromoBanner } from '@/lib/promo-banner'
import { getMegaMenuConfig } from '@/lib/mega-menu'
import { toStorefrontMenus, toStorefrontNavLinks } from '@/lib/mega-menu-config'
export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [promoBanner, menuConfig] = await Promise.all([
    getPromoBanner(),
    getMegaMenuConfig(),
  ])
  return (
    <AuthProvider surface='website'>
      <Navbar
        promoCode={promoBanner.code}
        promoDiscountLabel={promoBanner.discountLabel}
        menus={toStorefrontMenus(menuConfig)}
        navLinks={toStorefrontNavLinks(menuConfig)}
      />
      {}
      <main className='ls-luxury min-h-screen'>{children}</main>
      <Footer />
      <CookieConsent />

      <RevealInit />
      <GoogleReviewBadge />
    </AuthProvider>
  )
}
