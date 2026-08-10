'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { SITE_NAME } from '@/lib/constants'

// ── PIN Dots ──────────────────────────────────────────────────────────────────
function PinDots({ pin, error, success }: { pin: string; error: boolean; success: boolean }) {
  return (
    <div className='flex items-center justify-center gap-3'>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-150 ${
          success ? 'bg-[#008060] border-[#008060]'
            : error ? 'bg-red-500 border-red-500'
            : i < pin.length ? 'bg-[#202223] border-[#202223]'
            : 'bg-transparent border-[#C9CCCF]'
        }`} />
      ))}
    </div>
  )
}

// ── PIN Pad ───────────────────────────────────────────────────────────────────
function PinPad({ onPress, onDelete, disabled }: { onPress: (n: string) => void; onDelete: () => void; disabled: boolean }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  return (
    <div className='grid grid-cols-3 gap-2'>
      {keys.map((k, i) =>
        k === '' ? <div key={i} /> : (
          <button key={i} onClick={() => k === '⌫' ? onDelete() : onPress(k)}
            disabled={disabled}
            className={`h-12 rounded-lg text-[15px] font-semibold transition-all select-none
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:bg-[#F1F2F3] cursor-pointer'}
              ${k === '⌫' ? 'text-[#6D7175]' : 'text-[#202223]'}
              bg-[#F6F6F7] border border-[#E1E3E5]`}>
            {k}
          </button>
        )
      )}
    </div>
  )
}

const logoBadge = SITE_NAME.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

interface PosStaffOption {
  id: string
  name: string
  initials: string
  role: 'admin' | 'staff'
  shift: string
  isActive: boolean
}

// ── Main Page ─────────────────────────────────────────────────────────────────
// PIN-only login. Staff list comes straight from Medusa (via /api/pos/staff)
// — no local mock data, no separate email/password step. The PIN itself is
// verified server-side in /api/auth/pos-pin against the real Medusa record.
export default function POSLoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [staffList, setStaffList] = useState<PosStaffOption[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selected, setSelected] = useState<PosStaffOption | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // ── Load real staff from Medusa on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/pos/staff')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load staff')
        if (!cancelled) {
          setStaffList(data.staff ?? [])
          setSelected(data.staff?.[0] ?? null)
        }
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not reach the server.')
      } finally {
        if (!cancelled) setLoadingStaff(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Staff selection ───────────────────────────────────────────────────────
  const handleSelect = (staff: PosStaffOption) => {
    setSelected(staff)
    setPin('')
    setPinError('')
    setPinSuccess(false)
  }

  // ── PIN entry & verification (server-side against Medusa) ────────────────
  const handlePress = (num: string) => {
    if (!selected || pin.length >= 6 || pinSuccess || verifying) return
    const newPin = pin + num
    setPin(newPin)
    setPinError('')

    if (newPin.length === 6) {
      setTimeout(async () => {
        if (!selected) return
        setVerifying(true)

        try {
          const res = await fetch('/api/auth/pos-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: selected.id, pin: newPin }),
            credentials: 'include',
          })

          const data = await res.json()

          if (!res.ok) {
            setPinError(data.error ?? 'Incorrect PIN. Please try again.')
            setVerifying(false)
            setTimeout(() => { setPin(''); setPinError('') }, 1200)
            return
          }

          setPinSuccess(true)
          login(data.user)
          setTimeout(() => router.push('/pos/terminal'), 600)
        } catch {
          setPinError('Cannot connect to server. Check your connection.')
          setVerifying(false)
          setTimeout(() => { setPin(''); setPinError('') }, 1200)
        }
      }, 150)
    }
  }

  const handleDelete = () => {
    if (pinSuccess || verifying) return
    setPin((p) => p.slice(0, -1))
    setPinError('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-[#F6F6F7]'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-6'>
          <div className='flex items-center justify-center gap-2 mb-3'>
            <div className='w-8 h-8 bg-[#008060] rounded-md flex items-center justify-center'>
              <span className='text-white text-[11px] font-bold'>{logoBadge}</span>
            </div>
            <span className='text-lg font-semibold text-[#202223]'>{SITE_NAME} POS</span>
          </div>
          <h1 className='text-xl font-semibold text-[#202223] mb-1'>Select your profile</h1>
          <p className='text-sm text-[#6D7175]'>Choose your account then enter your 6-digit PIN</p>
        </div>

        <div className='bg-white rounded-xl border border-[#E1E3E5] shadow-sm p-5'>
          {loadingStaff ? (
            <div className='py-8 flex flex-col items-center gap-2'>
              <div className='w-6 h-6 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
              <p className='text-xs text-[#8C9196]'>Loading staff…</p>
            </div>
          ) : loadError ? (
            <p className='text-sm text-center text-red-600 py-4'>{loadError}</p>
          ) : staffList.length === 0 ? (
            <p className='text-sm text-center text-[#6D7175] py-4'>
              No active staff found. Please add staff from the dashboard.
            </p>
          ) : (
            <>
              <div className='flex flex-col gap-2 mb-4'>
                {staffList.map((staff) => (
                  <button key={staff.id} onClick={() => handleSelect(staff)}
                    disabled={verifying}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left cursor-pointer ${
                      selected?.id === staff.id
                        ? 'border-[#008060] bg-[#008060]/5'
                        : 'border-[#E1E3E5] bg-white hover:bg-[#F6F6F7]'
                    }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                      selected?.id === staff.id ? 'bg-[#008060] text-white' : 'bg-[#F1F2F3] text-[#6D7175]'
                    }`}>
                      {staff.initials}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[13px] font-semibold text-[#202223] truncate'>{staff.name}</p>
                      <p className='text-[11px] text-[#6D7175] capitalize'>
                        {staff.role === 'admin' ? 'Admin' : 'Staff'}{staff.shift ? ` · ${staff.shift}` : ''}
                      </p>
                    </div>
                    {selected?.id === staff.id && (
                      <div className='w-2 h-2 rounded-full bg-[#008060] shrink-0' />
                    )}
                  </button>
                ))}
              </div>

              <div className='h-px bg-[#E1E3E5] mb-4' />

              <p className='text-xs text-center text-[#6D7175] mb-3'>
                Enter PIN for <span className='font-semibold text-[#202223]'>{selected?.name}</span>
              </p>

              <div className='mb-2'><PinDots pin={pin} error={!!pinError} success={pinSuccess} /></div>

              <div className='h-5 flex items-center justify-center mb-3'>
                {pinError && <p className='text-xs font-medium text-red-600 text-center px-4'>{pinError}</p>}
                {pinSuccess && <p className='text-xs font-medium text-[#008060]'>Access granted! Opening terminal...</p>}
              </div>

              <PinPad onPress={handlePress} onDelete={handleDelete} disabled={pinSuccess || verifying || !selected} />
            </>
          )}
        </div>

        <p className='text-xs text-center mt-4 text-[#8C9196]'>{SITE_NAME} · POS Terminal</p>
      </div>
    </div>
  )
}
