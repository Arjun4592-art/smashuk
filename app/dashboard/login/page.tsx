'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { loginAdminUser } from '@/lib/api/auth'
import { SITE_NAME, SITE_LOGO } from '@/lib/constants'
import { toast } from 'sonner'

export default function DashboardLoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await loginAdminUser(email, password)

      // Redirect non-dashboard roles
      if (user.role === 'customer') {
        setError('This account does not have dashboard access.')
        setLoading(false)
        return
      }

      login(user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#F6F6F7] flex flex-col'>
      {/* Top bar */}
      <div className='flex items-center justify-between px-8 py-4'>
        <Link href='/' className='flex items-center gap-2.5 no-underline'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_LOGO} alt={SITE_NAME} className='h-6 w-auto' />
        </Link>
        <Link
          href='/'
          className='text-[13px] text-[#6D7175] hover:text-[#202223] no-underline transition-colors'
        >
          ← Back to store
        </Link>
      </div>

      {/* Main */}
      <div className='flex-1 flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          <div className='bg-white border border-[#E1E3E5] rounded-xl shadow-sm overflow-hidden'>
            {/* Header */}
            <div className='px-8 pt-8 pb-6 border-b border-[#E1E3E5]'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 bg-[#008060] rounded-lg flex items-center justify-center shrink-0'>
                  <svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
                    <path
                      d='M12 2L2 7l10 5 10-5-10-5z'
                      stroke='white'
                      strokeWidth='2'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M2 17l10 5 10-5'
                      stroke='white'
                      strokeWidth='2'
                      strokeLinejoin='round'
                    />
                    <path
                      d='M2 12l10 5 10-5'
                      stroke='white'
                      strokeWidth='2'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <div>
                  <h1 className='font-sora text-[18px] font-semibold text-[#202223] leading-tight'>
                    Dashboard Login
                  </h1>
                  <p className='text-[12px] text-[#6D7175] mt-0.5'>
                    Admin access
                  </p>
                </div>
              </div>
              <p className='text-[13px] text-[#6D7175] leading-relaxed'>
                Sign in to manage your store, orders, products, and customers.
              </p>
            </div>

            {/* Form */}
            <div className='px-8 py-6'>
              {error && (
                <div className='flex items-start gap-2.5 p-3 mb-5 bg-red-50 border border-red-200 rounded-lg'>
                  <span className='text-red-600 text-sm shrink-0'>⚠</span>
                  <p className='text-[12.5px] text-red-600'>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-[12.5px] font-medium text-[#202223] mb-1.5'>
                    Email address
                  </label>
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='admin@smashuk.co.uk'
                    required
                    className='w-full px-3.5 py-2.5 bg-white border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none transition-all focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                  />
                </div>

                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <label className='block text-[12.5px] font-medium text-[#202223]'>
                      Password
                    </label>
                    {/* BUG FIX: this used to link to /dashboard/forgot-password,
                        a page that doesn't exist — a straight 404. Self-serve
                        password reset needs a Medusa-backend email subscriber
                        that lives outside this Next.js app (see
                        app/api/admin/account/route.ts and the same note on
                        Settings > Account > Update Password); until that's
                        added on the backend, be honest about it here instead
                        of linking to a dead page. */}
                    <button
                      type='button'
                      onClick={() =>
                        toast.info(
                          "Self-serve password reset needs a Medusa-backend change (an email notification subscriber) that isn't set up yet. Ask whoever manages your Medusa backend to add it, or reset your password directly from the Medusa admin.",
                          { duration: 10000 },
                        )
                      }
                      className='text-[12px] text-[#008060] hover:text-[#006e52] no-underline transition-colors bg-transparent border-none cursor-pointer p-0'
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className='relative'>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='••••••••••'
                      required
                      className='w-full px-3.5 py-2.5 pr-10 bg-white border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] placeholder-[#8C9196] outline-none transition-all focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9196] hover:text-[#6D7175] transition-colors bg-transparent border-none cursor-pointer p-0'
                    >
                      {showPassword ? (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94' />
                          <path d='M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19' />
                          <line x1='1' y1='1' x2='23' y2='23' />
                        </svg>
                      ) : (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                          <circle cx='12' cy='12' r='3' />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className='w-full py-2.5 bg-[#008060] hover:bg-[#006e52] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-all mt-2 flex items-center justify-center gap-2'
                >
                  {loading ? (
                    <>
                      <svg
                        className='animate-spin w-4 h-4'
                        viewBox='0 0 24 24'
                        fill='none'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        />
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8v8H4z'
                        />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in to Dashboard'
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className='flex items-center justify-center gap-2 mt-4'>
            {['Admin', 'Staff'].map((role) => (
              <span
                key={role}
                className='px-2.5 py-1 bg-white border border-[#E1E3E5] rounded-full text-[11px] text-[#6D7175]'
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='px-8 py-4 border-t border-[#E1E3E5] flex items-center justify-between'>
        <p className='text-[11.5px] text-[#8C9196]'>
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <div className='flex items-center gap-4'>
          <Link
            href='/privacy'
            className='text-[11.5px] text-[#8C9196] hover:text-[#6D7175] no-underline transition-colors'
          >
            Privacy
          </Link>
          <Link
            href='/terms'
            className='text-[11.5px] text-[#8C9196] hover:text-[#6D7175] no-underline transition-colors'
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  )
}
