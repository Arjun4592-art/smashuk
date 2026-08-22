'use client'

// StringingBookNowTrigger
//
// Thin client wrapper so the "Book Now" buttons on
// app/(website)/local-store/stringing/page.tsx (a server component) can
// open <StringingServiceModal /> without turning the whole page client-side.
// Renders its children as the trigger — pass the exact same className the
// old <a href='#book'> used, so nothing visually changes until it's clicked.

import { useState } from 'react'
import type { ReactNode } from 'react'
import StringingServiceModal from './StringingServiceModal'

interface Props {
  className?: string
  children: ReactNode
}

export default function StringingBookNowTrigger({
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  // Chosen "40-Minute Express" in the modal — close it, then scroll down to
  // the existing #book section, which renders <StringingBookingForm />.
  // The tiny delay lets the modal unmount before the scroll runs so it
  // doesn't fight the modal's own layout shift.
  const goToBookingForm = () => {
    setOpen(false)
    setTimeout(() => {
      document
        .getElementById('book')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  return (
    <>
      <button type='button' onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && (
        <StringingServiceModal
          onClose={() => setOpen(false)}
          onBookExpress={goToBookingForm}
        />
      )}
    </>
  )
}
