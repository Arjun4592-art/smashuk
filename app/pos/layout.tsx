import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'SRP POS' },
  robots: { index: false, follow: false, nocache: true },
  manifest: '/api/manifest/pos',
  appleWebApp: { capable: true, title: 'SRP POS', statusBarStyle: 'default' },
  icons: { apple: '/icons/icon-180.png' },
}

export default function POSRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
