'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface SidebarContextValue {
  mobileOpen: boolean
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  mobileOpen: false,
  openMobileSidebar: () => {},
  closeMobileSidebar: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // Memoized so consumers can safely depend on these in useEffect deps
  // arrays without the effect re-firing on every unrelated re-render.
  const openMobileSidebar = useCallback(() => setMobileOpen(true), [])
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), [])

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        openMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
