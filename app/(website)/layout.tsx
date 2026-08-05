import Navbar from '@/components/website/Navbar'
import Footer from '@/components/website/Footer'
import AuthProvider from '@/components/providers/AuthProvider'
import CookieConsent from '@/components/website/CookieConsent'
import ChatWidget from '@/components/website/ChatWidget'

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider surface='website'>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieConsent />
      <ChatWidget />
    </AuthProvider>
  )
}