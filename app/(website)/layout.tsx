import Navbar from '@/components/website/Navbar'
import Footer from '@/components/website/Footer'
import AuthProvider from '@/components/providers/AuthProvider'
import CookieConsent from '@/components/website/CookieConsent'
import ChatWidget from '@/components/website/ChatWidget'
import RevealInit from '@/components/website/local-store/RevealInit'

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider surface='website'>
      <Navbar />
      {/* ls-luxury activates the scroll-reveal / hover-motion CSS scope
          (see app/globals.css) for every page under (website), and
          RevealInit is the IntersectionObserver that actually toggles
          it on — previously the CSS + RevealInit both existed but were
          never wired together (RevealInit was looking for a different,
          unused class name, and nothing rendered it), so nothing ever
          animated. */}
      <main className="ls-luxury min-h-screen">{children}</main>
      <Footer />
      <CookieConsent />
      <ChatWidget />
      <RevealInit />
    </AuthProvider>
  )
}