'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MailIcon } from '@/components/ui/Icons'

interface Props {
  productId: string
  productName: string
}

export default function NotifyStockForm({ productId, productName }: Props) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || done) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/store/notify-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productId, productName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      toast.success("We'll email you when it's back!")
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className='flex items-center gap-2 py-3.5 px-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-lato font-semibold'>
        ✓ We&apos;ll email you at {email} when this is back in stock.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex items-stretch gap-2'>
      <div className='relative flex-1'>
        <MailIcon
          size={16}
          className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400'
        />
        <input
          type='email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='Your email address'
          className='w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm font-lato text-[#0A1F44] placeholder:text-gray-400 focus:outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all'
        />
      </div>
      <button
        type='submit'
        disabled={submitting}
        className='shrink-0 px-5 py-3 rounded-xl bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-montserrat font-black text-sm transition-colors disabled:opacity-60'
      >
        {submitting ? 'Sending...' : 'Notify Me'}
      </button>
    </form>
  )
}
