'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'sp_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (privacy mode etc) — just don't show the
      // banner rather than risk a hydration crash
    }
  }, [])

  const respond = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className='fixed bottom-0 left-0 right-0 z-[90] bg-[#0A1F44] text-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center gap-4'>
        <p className='text-xs sm:text-[13px] text-white/70 font-lato leading-relaxed flex-1 text-center sm:text-left'>
          We use cookies to improve your experience, remember your cart, and
          show you relevant products. Read our{' '}
          <a href='/privacy' className='underline hover:text-white transition-colors'>
            Privacy Policy
          </a>{' '}
          to learn more.
        </p>
        <div className='flex items-center gap-2 shrink-0'>
          <button
            onClick={() => respond('declined')}
            className='px-4 py-2 rounded-full text-xs font-montserrat font-bold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-colors'
          >
            Decline
          </button>
          <button
            onClick={() => respond('accepted')}
            className='px-5 py-2 rounded-full text-xs font-montserrat font-black bg-[#E8553A] hover:bg-[#D4441F] text-white transition-colors'
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
