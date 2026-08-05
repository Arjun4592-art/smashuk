import Navbar from '@/components/website/Navbar'
import Footer from '@/components/website/Footer'
import BottomNav, { BOTTOM_NAV_HEIGHT } from '@/components/website/BottomNav'

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen flex flex-col bg-white'>
      <Navbar />
      <main className='flex-1'>{children}</main>
      <Footer />
      {/* Spacer so fixed BottomNav doesn't overlap the last bit of the
          footer/page content. Mobile/tablet only — BottomNav itself is
          hidden at lg+ since the top Navbar has the same mega menus. */}
      <div
        className='lg:hidden'
        style={{ height: BOTTOM_NAV_HEIGHT }}
        aria-hidden='true'
      />
      <BottomNav />
    </div>
  )
}
