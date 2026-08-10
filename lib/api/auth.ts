// lib/api/auth.ts — All auth flows via server-side API routes (no CORS, no token in JS)

import { signIn, signOut } from 'next-auth/react'
import type { User } from '@/types'

// ── Customer: Email/Password Login ────────────────────────────────────────────
export async function loginCustomer(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/customer-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Login failed.')
  return data.user as User
}

// ── Customer: Register ────────────────────────────────────────────────────────
export async function registerCustomer(name: string, email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/customer-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Registration failed.')
  return data.user as User
}

// ── Customer: Google OAuth ────────────────────────────────────────────────────
export async function loginWithGoogle() {
  await signIn('google', { callbackUrl: '/profile' })
}

// ── Admin Login ───────────────────────────────────────────────────────────────
export async function loginAdminUser(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Login failed.')
  return data.user as User
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
  await signOut({ callbackUrl: '/' })
}
