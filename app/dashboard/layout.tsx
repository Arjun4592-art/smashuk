'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import { SidebarProvider } from '../../context/SidebarContext'
import AuthProvider from '@/components/providers/AuthProvider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname === '/dashboard/login') {
    return <>{children}</>
  }

  return (
    <AuthProvider surface='dashboard'>
      <SidebarProvider>
        <div className='flex h-screen bg-[#F6F6F7] overflow-hidden'>
          <Sidebar />
          <div className='flex flex-col flex-1 min-w-0 overflow-hidden'>
            <Topbar />
            <main className='flex-1 overflow-y-auto p-4 lg:p-6'>{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  )
}
