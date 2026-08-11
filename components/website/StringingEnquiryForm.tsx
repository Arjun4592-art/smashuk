'use client'

import { useState } from 'react'

export default function StringingEnquiryForm({ sport }: { sport: string }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/store/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: `${sport} stringing enquiry` }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')
      setStatus('success')
      setForm({ name: '', email: '', message: '' })
    } catch (err: any) {
      setStatus('error')
      setError(err.message ?? 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className='bg-green-50 border border-green-200 rounded-2xl p-8 max-w-xl mx-auto text-center'>
        <div className='w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3'>
          <svg
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M20 6L9 17l-5-5' />
          </svg>
        </div>
        <p className='font-montserrat font-bold text-[#0A1F44]'>
          Message sent!
        </p>
        <p className='text-sm text-gray-500 font-lato mt-1'>
          Thanks for reaching out — we&rsquo;ll get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='ls-card bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(10,31,68,0.06)] p-6 md:p-8 space-y-5 max-w-xl mx-auto'
    >
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            Your name
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='Your name'
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-4 focus:ring-[#E8553A]/10 transition-all font-lato'
          />
        </div>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            Your email
          </label>
          <input
            type='email'
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder='you@example.com'
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-4 focus:ring-[#E8553A]/10 transition-all font-lato'
          />
        </div>
      </div>
      <div>
        <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
          Your message
        </label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder={`Tell us about your racket, preferred string/tension, or drop-off time...`}
          className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-4 focus:ring-[#E8553A]/10 transition-all font-lato resize-none'
        />
      </div>
      {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}
      <div className='text-center pt-1'>
        <button
          type='submit'
          disabled={status === 'loading'}
          className='ls-btn-shine ls-tap bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-8 py-3 rounded-full text-sm transition-colors'
        >
          {status === 'loading' ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
