'use client'
// components/providers/AuthProvider.tsx
//
// Verifies user state against cookies on app mount.
// If localStorage has state but the server cookie has expired,
// clears the stale state.
// If there's no state but a valid cookie exists, restores the state.

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'

type Surface = 'website' | 'dashboard' | 'pos'

interface Props {
  surface: Surface
  children: React.ReactNode
}

export default function AuthProvider({ surface, children }: Props) {
  const syncFromServer = useAuthStore((s) => s.syncFromServer)
  const markAuthChecked = useAuthStore((s) => s.markAuthChecked)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hydrateWishlist = useWishlistStore((s) => s.hydrateFromServer)
  const verified = useRef(false)
  const wasAuthenticated = useRef(isAuthenticated)

  useEffect(() => {
    if (verified.current) return
    verified.current = true

    async function verifySession() {
      try {
        const res = await fetch(`/api/auth/me?surface=${surface}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          markAuthChecked()
          return
        }
        const { user } = await res.json()

        if (
          surface === 'pos' &&
          !user &&
          wasAuthenticated.current
        ) {
          toast.error('Signed out — this account was logged in on another device.')
        }

        // Session is valid on the server — sync the store
        syncFromServer(user ?? null)
        wasAuthenticated.current = Boolean(user)
        // Website customers get their wishlist pulled from Medusa
        // (customer.metadata.wishlist) so it's not just a localStorage list.
        if (surface === 'website' && user) {
          hydrateWishlist()
        }
      } catch {
        // Network error — don't touch localStorage state, but always set
        // authChecked so pages don't get stuck on a skeleton forever.
        markAuthChecked()
      }
    }

    verifySession()

    // POS enforces one active session per staff member (see
    // lib/api/pos-session.ts): logging in on another device invalidates
    // this one server-side. Poll periodically so a terminal left open
    // notices it's been signed out elsewhere, instead of only finding out
    // next time the page happens to reload.
    if (surface === 'pos') {
      const interval = setInterval(verifySession, 20000)
      return () => clearInterval(interval)
    }
  }, [surface, syncFromServer, markAuthChecked, hydrateWishlist])

  return <>{children}</>
}
