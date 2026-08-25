'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { signOut } from 'next-auth/react';
import type { User } from '@/types';
import type { Surface } from '@/lib/api/auth-cookie';
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  authChecked: boolean;
  login: (user: User) => void;
  logout: (surface: Surface) => void;
  updateUser: (user: Partial<User>) => void;
  syncFromServer: (serverUser: User | null) => void;
  markAuthChecked: () => void;
}
export const useAuthStore = create<AuthState>()(persist(set => ({
  user: null,
  isAuthenticated: false,
  isLoggingOut: false,
  authChecked: false,
  login: (user: User): void => {
    set({
      user,
      isAuthenticated: true,
      authChecked: true
    });
  },
  logout: (surface: Surface): void => {
    set({
      user: null,
      isAuthenticated: false,
      isLoggingOut: true
    });
    const requests: Promise<unknown>[] = [fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        surface
      })
    })];
    if (surface === 'website') {
      requests.push(signOut({
        redirect: false
      }));
    }
    Promise.all(requests).catch(err => console.error('Logout error:', err)).finally(() => set({
      isLoggingOut: false
    }));
  },
  updateUser: (updated: Partial<User>): void => {
    set(state => ({
      user: state.user ? {
        ...state.user,
        ...updated
      } : null
    }));
  },
  syncFromServer: (serverUser: User | null): void => {
    if (!serverUser) {
      set({
        user: null,
        isAuthenticated: false,
        authChecked: true
      });
      return;
    }
    set({
      user: serverUser,
      isAuthenticated: true,
      authChecked: true
    });
  },
  markAuthChecked: (): void => {
    set({
      authChecked: true
    });
  }
}), {
  name: 'auth-store',
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated
  })
}));
