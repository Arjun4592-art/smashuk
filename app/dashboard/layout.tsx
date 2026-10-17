import type { Metadata } from 'next'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const metadata: Metadata = {
  title: { absolute: 'SRP Dashboard' },
  robots: { index: false, follow: false, nocache: true },
  manifest: '/api/manifest/dashboard',
  appleWebApp: {
    capable: true,
    title: 'SRP Dashboard',
    statusBarStyle: 'default',
  },
  icons: { apple: '/icons/icon-180.png' },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
