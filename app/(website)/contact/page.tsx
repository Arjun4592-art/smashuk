'use client'

import { useState } from 'react'
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from '@/lib/constants'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
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
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')
      setStatus('success')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err: any) {
      setStatus('error')
      setError(err.message ?? 'Something went wrong')
    }
  }

  return (
    <div className='max-w-5xl mx-auto px-4 py-12'>
      <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-2'>Get in touch</h1>
      <p className='text-gray-500 font-lato mb-10'>
        Questions about an order, a product, or our stringing service? We usually reply within 24 hours.
      </p>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-10'>
        <div className='md:col-span-2'>
          {status === 'success' ? (
            <div className='bg-green-50 border border-green-200 rounded-2xl p-6'>
              <p className='font-montserrat font-bold text-[#0A1F44]'>Message sent!</p>
              <p className='text-sm text-gray-600 font-lato mt-1'>
                Thanks for reaching out — we'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
                  />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>Email</label>
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
                <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder='Order enquiry, stringing service, etc.'
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>Message</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato resize-none'
                />
              </div>
              {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}
              <button
                type='submit'
                disabled={status === 'loading'}
                className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-8 py-3 rounded-full text-sm transition-colors'
              >
                {status === 'loading' ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        <div className='space-y-6'>
          <div>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide font-lato mb-1'>Email</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className='text-[#0A1F44] font-montserrat font-bold hover:text-[#E8553A]'>
              {CONTACT_EMAIL}
            </a>
          </div>
          <div>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide font-lato mb-1'>Phone</p>
            <a href={`tel:${CONTACT_PHONE}`} className='text-[#0A1F44] font-montserrat font-bold hover:text-[#E8553A]'>
              {CONTACT_PHONE}
            </a>
          </div>
          <div>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide font-lato mb-1'>Hours</p>
            <p className='text-sm text-gray-600 font-lato'>Mon–Sat, 10am–7pm</p>
          </div>
        </div>
      </div>
    </div>
  )
}
