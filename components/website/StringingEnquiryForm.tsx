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
      <div className='bg-green-50 border border-green-200 rounded-2xl p-6 max-w-xl mx-auto text-center'>
        <p className='font-montserrat font-bold text-[#0A1F44]'>Message sent!</p>
        <p className='text-sm text-gray-600 font-lato mt-1'>
          Thanks for reaching out — we&rsquo;ll get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4 max-w-xl mx-auto'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            Your name
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
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
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
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
          className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato resize-none'
        />
      </div>
      {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}
      <div className='text-center'>
        <button
          type='submit'
          disabled={status === 'loading'}
          className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-8 py-3 rounded-full text-sm transition-colors'
        >
          {status === 'loading' ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
