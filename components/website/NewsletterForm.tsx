'use client';

import { useState } from 'react';
interface Props {
  variant?: 'light' | 'dark';
}
export default function NewsletterForm({
  variant = 'light'
}: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/store/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setStatus('success');
      setMessage(data.alreadySubscribed ? "You're already subscribed!" : 'Subscribed! Check your email for 10% off.');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message ?? 'Something went wrong');
    }
  };
  if (variant === 'dark') {
    return <form onSubmit={handleSubmit} className='flex gap-2'>
        <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='Enter your email' disabled={status === 'loading'} className='flex-1 bg-white/8 border border-white/12 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/25 outline-none focus:border-[#E8553A]/60 transition-colors font-lato min-w-0' />
        <button type='submit' disabled={status === 'loading'} className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white text-[12px] font-black px-4 py-2 rounded-xl transition-colors font-montserrat whitespace-nowrap'>
          {status === 'loading' ? '...' : 'Join'}
        </button>
        {message && <p className={`text-[11px] mt-1 absolute ${status === 'error' ? 'text-red-300' : 'text-white/60'}`}>
            {message}
          </p>}
      </form>;
  }
  return <div>
      <form onSubmit={handleSubmit} className='flex gap-3 max-w-md mx-auto'>
        <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='Enter your email address' disabled={status === 'loading'} className='flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato' />
        <button type='submit' disabled={status === 'loading'} className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap'>
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && <p className={`text-[12px] mt-2 text-center font-lato ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>}
    </div>;
}
