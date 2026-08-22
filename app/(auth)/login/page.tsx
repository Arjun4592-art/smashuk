'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { SITE_NAME, SITE_LOGO } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { loginCustomer } from '@/lib/api/auth'

// ── Google Icon ───────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 48 48'>
      <path
        fill='#FFC107'
        d='M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z'
      />
      <path
        fill='#FF3D00'
        d='M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z'
      />
      <path
        fill='#4CAF50'
        d='M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z'
      />
      <path
        fill='#1976D2'
        d='M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z'
      />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect')
  // SECURITY: only allow same-site relative paths. Without this check, a
  // link like /login?redirect=https://evil.example.com or
  // /login?redirect=//evil.example.com (protocol-relative — still leaves
  // the site) could send a customer who just authenticated straight to an
  // attacker's page, e.g. via signIn()'s callbackUrl below.
  const redirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/profile'
  const { data: session } = useSession()
  const login = useAuthStore((s) => s.login)
  const syncFromServer = useAuthStore((s) => s.syncFromServer)

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // After Google login, once the session arrives, set the website surface cookie + sync Zustand
  useEffect(() => {
    if (!session?.user) return

    async function syncWebsiteSession() {
      try {
        const res = await fetch('/api/auth/website-session', {
          method: 'POST',
          credentials: 'include',
        })
        if (res.ok) {
          const { user } = await res.json()
          if (user) {
            syncFromServer(user)
            router.push(redirect)
            return
          }
        }
      } catch {
        // fallback — just update Zustand
      }

      // Fallback: sync directly from the session
      syncFromServer({
        id: (session?.user as any)?.id ?? session?.user?.email ?? '',
        name: session?.user?.name ?? session?.user?.email ?? '',
        email: session?.user?.email ?? '',
        role: 'customer',
        createdAt: new Date().toISOString(),
        avatar: session?.user?.image ?? undefined,
      })
      router.push(redirect)
    }

    syncWebsiteSession()
  }, [session, redirect, router, syncFromServer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await loginCustomer(form.email, form.password)
      login(user)
      router.push(redirect)
    } catch (err: any) {
      setError(err?.message ?? 'Invalid email or password.')
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: redirect })
  }

  return (
    <div className='min-h-screen bg-[#F2F4F7] flex items-center justify-center px-4 py-16'>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <Link href='/' className='inline-flex items-center gap-2 mb-4'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_LOGO} alt={SITE_NAME} className='h-10 w-auto' />
          </Link>
          <h1 className='font-montserrat font-black text-2xl text-[#0A1F44]'>
            Welcome back
          </h1>
          <p className='text-gray-500 font-lato text-sm mt-1'>
            Sign in to your account
          </p>
        </div>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8'>
          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className='w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-montserrat font-bold text-[#0A1F44] text-sm mb-6 disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className='flex items-center gap-3 mb-6'>
            <div className='flex-1 h-px bg-gray-200' />
            <span className='text-xs text-gray-400 font-lato'>
              or sign in with email
            </span>
            <div className='flex-1 h-px bg-gray-200' />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                Email Address
              </label>
              <input
                type='email'
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder='you@example.com'
                className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                Password
              </label>
              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder='••••••••'
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
                  required
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className='text-right mt-1.5'>
                <Link
                  href='/forgot-password'
                  className='text-xs text-[#E8553A] hover:underline font-lato'
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className='bg-red-50 border border-red-200 rounded-xl p-3'>
                <p className='text-xs text-red-600 font-lato'>{error}</p>
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-montserrat font-black text-white transition-all ${
                loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#E8553A] hover:bg-[#D4441F] shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-500 font-lato'>
              Don&apos;t have an account?{' '}
              <Link
                href='/register'
                className='text-[#E8553A] font-semibold hover:underline'
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-[#F2F4F7]' />}>
      <LoginForm />
    </Suspense>
  )
}
