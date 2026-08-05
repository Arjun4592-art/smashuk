'use client'

// This used to be a fake "SaaS subscription plan" page (Starter/Growth
// plans, "Upgrade", "Cancel Plan") — leftover admin-template scaffolding
// that never applied to this business (a single store doesn't have a
// subscription relationship with itself). Replaced with real Stripe
// account status, balance, and payout history.

import { useState, useEffect } from 'react'

const Icons = {
  card: (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='1' y='4' width='22' height='16' rx='2' ry='2' />
      <line x1='1' y1='10' x2='23' y2='10' />
    </svg>
  ),
  external: (
    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6' />
      <polyline points='15 3 21 3 21 9' />
      <line x1='10' y1='14' x2='21' y2='3' />
    </svg>
  ),
  check: (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  ),
  alert: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
      <line x1='12' y1='9' x2='12' y2='13' />
      <line x1='12' y1='17' x2='12.01' y2='17' />
    </svg>
  ),
}

interface StripeAccountStatus {
  connected: boolean
  mode?: 'live' | 'test'
  accountName?: string
  balance?: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
  }
  error?: string
}

interface Payout {
  id: string
  amount: number
  currency: string
  status: string
  arrivalDate: number
  created: number
  method: string
}

function fmt(amount: number, currency: string) {
  const symbol = currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return symbol + (amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-[#008060]/10 text-[#008060]',
  pending: 'bg-[#FFC453]/20 text-[#916A00]',
  in_transit: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  canceled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  failed: 'bg-[#D82C0D]/10 text-[#D82C0D]',
}

export default function BillingPage() {
  const [account, setAccount] = useState<StripeAccountStatus | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stripe/account', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/stripe/payouts', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([accountData, payoutsData]) => {
        setAccount(accountData)
        setPayouts(payoutsData.payouts ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='space-y-5 max-w-3xl'>
      <div>
        <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>Payments</h1>
        <p className='text-[13px] text-[#6D7175] mt-0.5'>
          Your store's Stripe connection, balance, and payouts
        </p>
      </div>

      {loading ? (
        <div className='flex justify-center py-16'>
          <div className='w-7 h-7 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
        </div>
      ) : !account?.connected ? (
        <div className='bg-white border border-[#E1E3E5] rounded-xl p-6 flex items-start gap-3'>
          <span className='text-[#D82C0D] mt-0.5'>{Icons.alert}</span>
          <div>
            <p className='text-[14px] font-semibold text-[#202223]'>Stripe not connected</p>
            <p className='text-[13px] text-[#6D7175] mt-1'>
              {account?.error ?? 'Set STRIPE_SECRET_KEY in .env.local to connect your Stripe account.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Connection status */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-[#008060]/10 flex items-center justify-center text-[#008060]'>
                  {Icons.card}
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='text-[14px] font-semibold text-[#202223]'>{account.accountName}</p>
                    <span className='flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#008060]/10 text-[#008060] font-medium'>
                      {Icons.check} Connected
                    </span>
                    {account.mode === 'test' && (
                      <span className='text-[11px] px-2 py-0.5 rounded-full bg-[#FFC453]/20 text-[#916A00] font-medium'>
                        Test mode
                      </span>
                    )}
                  </div>
                  <p className='text-[12.5px] text-[#6D7175] mt-0.5'>
                    Payments are processed through Stripe
                  </p>
                </div>
              </div>
              <a
                href='https://dashboard.stripe.com'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1.5 px-3.5 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors'
              >
                {Icons.external} Open Stripe Dashboard
              </a>
            </div>
          </div>

          {/* Balance */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <p className='text-[12px] text-[#8C9196] uppercase tracking-wide mb-1.5'>Available balance</p>
              {account.balance?.available.map((b) => (
                <p key={b.currency} className='text-[24px] font-semibold text-[#202223] font-sora'>
                  {fmt(b.amount, b.currency)}
                </p>
              ))}
            </div>
            <div className='bg-white border border-[#E1E3E5] rounded-xl p-5'>
              <p className='text-[12px] text-[#8C9196] uppercase tracking-wide mb-1.5'>Pending balance</p>
              {account.balance?.pending.map((b) => (
                <p key={b.currency} className='text-[24px] font-semibold text-[#202223] font-sora'>
                  {fmt(b.amount, b.currency)}
                </p>
              ))}
            </div>
          </div>

          {/* Payouts */}
          <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
            <div className='px-5 py-3.5 border-b border-[#E1E3E5]'>
              <h2 className='text-[14px] font-semibold text-[#202223]'>Recent payouts</h2>
            </div>
            {payouts.length === 0 ? (
              <p className='text-[13px] text-[#8C9196] px-5 py-8 text-center'>
                No payouts yet.
              </p>
            ) : (
              <div className='divide-y divide-[#F1F1F1]'>
                {payouts.map((p) => (
                  <div key={p.id} className='px-5 py-3.5 flex items-center justify-between'>
                    <div>
                      <p className='text-[13.5px] font-medium text-[#202223]'>
                        {fmt(p.amount, p.currency)}
                      </p>
                      <p className='text-[12px] text-[#8C9196]'>
                        Arrives {new Date(p.arrivalDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${PAYOUT_STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
