'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CloseIcon, PhoneIcon, MailIcon } from '@/components/ui/Icons';
import { CONTACT_PHONE, CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/store/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          subject: 'Live chat widget message',
          message
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setSent(true);
      toast.success("Message sent — we'll reply by email shortly");
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong');
    } finally {
      setSending(false);
    }
  };
  return <>
      {}
      <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Close chat' : 'Chat with us'} className='fixed bottom-5 right-5 z-[95] w-14 h-14 rounded-full bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105'>
        {open ? <CloseIcon size={22} /> : <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
            <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          </svg>}
      </button>

      {}
      {open && <div className='fixed bottom-24 right-5 z-[95] w-[calc(100vw-2.5rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden'>
          <div className='bg-[#0A1F44] text-white px-5 py-4 flex items-start justify-between gap-3'>
            <div>
              <p className='font-montserrat font-black text-sm'>
                Chat with {SITE_NAME}
              </p>
              <p className='text-white/60 text-xs font-lato mt-0.5'>
                We typically reply within a few hours
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label='Close chat' className='shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors'>
              <CloseIcon size={15} />
            </button>
          </div>

          <div className='flex border-b border-gray-100'>
            <a href={`tel:${CONTACT_PHONE}`} className='flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-lato font-semibold text-[#0A1F44] hover:bg-gray-50 transition-colors border-r border-gray-100'>
              <PhoneIcon size={13} /> Call
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className='flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-lato font-semibold text-[#0A1F44] hover:bg-gray-50 transition-colors'>
              <MailIcon size={13} /> Email
            </a>
          </div>

          <div className='p-5'>
            {sent ? <div className='text-center py-4'>
                <p className='text-sm font-montserrat font-bold text-[#0A1F44] mb-1'>
                  Message sent ✓
                </p>
                <p className='text-xs text-gray-500 font-lato'>
                  We&apos;ll get back to you at {email}
                </p>
              </div> : <form onSubmit={handleSend} className='space-y-2.5'>
                <input type='text' required value={name} onChange={e => setName(e.target.value)} placeholder='Your name' className='w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-lato focus:outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all' />
                <input type='email' required value={email} onChange={e => setEmail(e.target.value)} placeholder='Your email' className='w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-lato focus:outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all' />
                <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder='How can we help?' rows={3} className='w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-lato resize-none focus:outline-none focus:border-[#E8553A] focus:ring-2 focus:ring-[#E8553A]/10 transition-all' />
                <button type='submit' disabled={sending} className='w-full py-2.5 rounded-xl bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black text-sm transition-colors disabled:opacity-60'>
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>}
          </div>
        </div>}
    </>;
}
