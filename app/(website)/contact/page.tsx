'use client'

import { useState } from 'react'
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from '@/lib/constants'
import {
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  MessageIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
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

  const CONTACT_CARDS = [
    {
      icon: <MailIcon size={20} />,
      label: 'Email',
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: <PhoneIcon size={20} />,
      label: 'Phone',
      value: CONTACT_PHONE,
      href: `tel:${CONTACT_PHONE}`,
    },
    {
      icon: <MapPinIcon size={20} />,
      label: 'Address',
      value: '112A Hulme High Street, Manchester, M15 5JP',
      href:
        'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent('112A Hulme High Street, Manchester, M15 5JP'),
      external: true,
    },
    {
      icon: <ClockIcon size={20} />,
      label: 'Hours',
      value: 'Mon–Fri 11am–7pm · Sat 11am–5pm · Sun closed',
    },
  ]

  return (
    <div className='bg-[#F8F9FB]'>
      {/* Header */}
      <div className='bg-[#0A1F44]'>
        <div className='max-w-5xl mx-auto px-4 py-14'>
          <div className='inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-lato font-semibold px-3 py-1.5 rounded-full mb-4'>
            <MessageIcon size={14} />
            We usually reply within 24 hours
          </div>
          <h1 className='font-montserrat font-black text-3xl md:text-4xl text-white mb-2'>
            Get in touch
          </h1>
          <p className='text-white/60 font-lato max-w-lg'>
            Questions about an order, a product, or our stringing service? We'd
            love to hear from you.
          </p>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 -mt-8 pb-16'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Form */}
          <div className='md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(10,31,68,0.06)] p-6 md:p-8'>
            {status === 'success' ? (
              <div className='flex flex-col items-center text-center py-10'>
                <div className='w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4'>
                  <CheckCircleIcon size={28} />
                </div>
                <p className='font-montserrat font-bold text-lg text-[#0A1F44]'>
                  Message sent!
                </p>
                <p className='text-sm text-gray-500 font-lato mt-1.5 max-w-xs'>
                  Thanks for reaching out — we'll get back to you soon.
                </p>
                <button
                  type='button'
                  onClick={() => setStatus('idle')}
                  className='mt-6 text-sm font-montserrat font-semibold text-[#E8553A] hover:underline'
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-5'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
                      Name
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder='Your name'
                      className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all font-lato'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
                      Email
                    </label>
                    <input
                      type='email'
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder='you@example.com'
                      className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all font-lato'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
                    Subject
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    placeholder='Order enquiry, stringing service, etc.'
                    className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all font-lato'
                  />
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
                    Message
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="Tell us what's up..."
                    className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all font-lato resize-none'
                  />
                </div>
                {error && (
                  <p className='text-xs text-red-500 font-lato bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
                    {error}
                  </p>
                )}
                <button
                  type='submit'
                  disabled={status === 'loading'}
                  className='w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-8 py-3 rounded-full text-sm transition-colors'
                >
                  {status === 'loading' ? (
                    <>
                      <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Send message'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact info sidebar */}
          <div className='space-y-4'>
            <div className='bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(10,31,68,0.06)] p-2 divide-y divide-gray-50'>
              {CONTACT_CARDS.map((c) => {
                const inner = (
                  <div className='flex items-start gap-3.5 p-4 group'>
                    <div className='w-10 h-10 rounded-xl bg-[#0A1F44]/[0.06] text-[#0A1F44] flex items-center justify-center shrink-0 group-hover:bg-[#E8553A] group-hover:text-white transition-colors duration-200'>
                      {c.icon}
                    </div>
                    <div className='min-w-0'>
                      <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider font-lato mb-0.5'>
                        {c.label}
                      </p>
                      <p
                        className={`text-sm font-montserrat font-bold text-[#0A1F44] leading-snug break-words ${
                          c.href
                            ? 'group-hover:text-[#E8553A] transition-colors'
                            : ''
                        }`}
                      >
                        {c.value}
                      </p>
                    </div>
                  </div>
                )

                return c.href ? (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.external ? '_blank' : undefined}
                    rel={c.external ? 'noopener noreferrer' : undefined}
                    className='block'
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={c.label}>{inner}</div>
                )
              })}
            </div>

            <div className='bg-[#0A1F44] rounded-2xl p-5'>
              <p className='font-montserrat font-bold text-sm text-white mb-1'>
                Prefer to talk stringing?
              </p>
              <p className='text-xs text-white/60 font-lato leading-relaxed mb-4'>
                Book a restring slot online or visit {SITE_NAME}'s Manchester
                store in person.
              </p>
              <a
                href='/local-store'
                className='inline-flex items-center gap-1.5 text-xs font-montserrat font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors'
              >
                Visit our store
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
