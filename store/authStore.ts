'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import type { Surface } from '@/lib/api/auth-cookie'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoggingOut: boolean
  authChecked: boolean

  login: (user: User) => void
  logout: (surface: Surface) => void
  updateUser: (user: Partial<User>) => void
  syncFromServer: (serverUser: User | null) => void
  markAuthChecked: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoggingOut: false,
      authChecked: false,

      login: (user: User): void => {
        set({ user, isAuthenticated: true, authChecked: true })
      },

      // `surface` tells the server which single session to end (dashboard,
      // pos, or website) — previously this cleared ALL three regardless of
      // which one was actually logging out, so logging out of the POS
      // silently logged the dashboard out too (and vice versa).
      logout: (surface: Surface): void => {
        set({ user: null, isAuthenticated: false, isLoggingOut: true })
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surface }),
        })
          .catch((err) => console.error('Logout error:', err))
          .finally(() => set({ isLoggingOut: false }))
      },

      updateUser: (updated: Partial<User>): void => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updated } : null,
        }))
      },

      syncFromServer: (serverUser: User | null): void => {
        if (!serverUser) {
          set({ user: null, isAuthenticated: false, authChecked: true })
          return
        }
        set({ user: serverUser, isAuthenticated: true, authChecked: true })
      },

      // Used when the server check itself fails (e.g. network error) so the
      // UI doesn't hang on a loading skeleton forever. Keeps whatever
      // optimistic state was already persisted from localStorage.
      markAuthChecked: (): void => {
        set({ authChecked: true })
      },
    }),
    {
      name: 'auth-store', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user and isAuthenticated — not isLoggingOut
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
