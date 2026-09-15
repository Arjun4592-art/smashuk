import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `We'll be right back | ${SITE_NAME}`,
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center bg-navy px-6 text-center'>
      <img src='/icons/logo.png' alt={SITE_NAME} className='mb-8 h-14 w-auto' />

      <span className='mb-6 rounded-full border border-coral/40 bg-coral-light/10 px-4 py-1 text-xs font-semibold tracking-widest text-coral uppercase'>
        Under Construction
      </span>

      <h1 className='max-w-2xl font-poppins text-3xl font-bold text-white sm:text-4xl'>
        We&apos;re upgrading the store
      </h1>

      <p className='mt-4 max-w-md text-base text-white/70'>
        {SITE_NAME} is offline for a bit while we make things better. We&apos;ll
        be back up and running shortly — thanks for your patience.
      </p>

      <div className='mt-10 h-1 w-24 rounded-full bg-coral' />
    </main>
  )
}
