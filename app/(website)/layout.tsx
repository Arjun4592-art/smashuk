import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import AuthProvider from '@/components/providers/AuthProvider';
import CookieConsent from '@/components/website/CookieConsent';
import ChatWidget from '@/components/website/ChatWidget';
import RevealInit from '@/components/website/local-store/RevealInit';
export default function WebsiteLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider surface='website'>
      <Navbar />
      {}
      <main className="ls-luxury min-h-screen">{children}</main>
      <Footer />
      <CookieConsent />
      <ChatWidget />
      <RevealInit />
    </AuthProvider>;
}
