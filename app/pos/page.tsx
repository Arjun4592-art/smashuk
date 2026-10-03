'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { SITE_NAME, SITE_LOGO } from '@/lib/constants';

const PIN_LENGTH = 6;

function PinDots({
  pin,
  error,
  success,
}: {
  pin: string;
  error: boolean;
  success: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3.5 ${error ? 'pos-shake' : ''}`}
      aria-hidden='true'
    >
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
            success
              ? 'bg-[#008060] border-[#008060]'
              : error
                ? 'bg-red-500 border-red-500'
                : i < pin.length
                  ? 'bg-[#202223] border-[#202223] scale-110'
                  : 'bg-transparent border-[#C9CCCF]'
          }`}
        />
      ))}
    </div>
  );
}

function PinPad({
  onPress,
  onDelete,
  disabled,
}: {
  onPress: (n: string) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <div className='grid grid-cols-3 gap-2.5 w-full max-w-[300px]'>
      {keys.map((k, i) =>
        k === '' ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            type='button'
            aria-label={k === '⌫' ? 'Delete last digit' : k}
            onClick={() => (k === '⌫' ? onDelete() : onPress(k))}
            disabled={disabled}
            className={`h-14 rounded-xl text-lg font-semibold transition-all select-none bg-[#F6F6F7] border border-[#E1E3E5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008060] ${
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer hover:bg-[#EDEEEF] active:scale-95 active:bg-[#008060] active:text-white active:border-[#008060]'
            } ${k === '⌫' ? 'text-[#6D7175]' : 'text-[#202223]'}`}
          >
            {k}
          </button>
        ),
      )}
    </div>
  );
}

interface PosStaffOption {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'staff';
  shift: string;
  isActive: boolean;
}

export default function POSLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [staffList, setStaffList] = useState<PosStaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<PosStaffOption | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pinPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingStaff(true);
    setLoadError('');
    (async () => {
      try {
        const res = await fetch('/api/pos/staff');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load staff');
        if (!cancelled) {
          setStaffList(data.staff ?? []);
          setSelected(data.staff?.[0] ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled)
          setLoadError(
            err instanceof Error ? err.message : 'Could not reach the server.',
          );
      } finally {
        if (!cancelled) setLoadingStaff(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleSelect = (staff: PosStaffOption) => {
    if (verifying || pinSuccess) return;
    setSelected(staff);
    setPin('');
    setPinError('');
    setPinSuccess(false);
    // On stacked (mobile) layout, bring the PIN pad into view.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    ) {
      pinPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handlePress = useCallback(
    (num: string) => {
      if (!selected || pin.length >= PIN_LENGTH || pinSuccess || verifying)
        return;
      const newPin = pin + num;
      setPin(newPin);
      setPinError('');
      if (newPin.length === PIN_LENGTH) {
        const staff = selected;
        setTimeout(async () => {
          setVerifying(true);
          try {
            const res = await fetch('/api/auth/pos-pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ staffId: staff.id, pin: newPin }),
              credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) {
              setPinError(data.error ?? 'Incorrect PIN. Please try again.');
              setVerifying(false);
              setTimeout(() => {
                setPin('');
                setPinError('');
              }, 1200);
              return;
            }
            setPinSuccess(true);
            login(data.user);
            setTimeout(() => router.push('/pos/terminal'), 600);
          } catch {
            setPinError('Cannot connect to server. Check your connection.');
            setVerifying(false);
            setTimeout(() => {
              setPin('');
              setPinError('');
            }, 1200);
          }
        }, 150);
      }
    },
    [selected, pin, pinSuccess, verifying, login, router],
  );

  const handleDelete = useCallback(() => {
    if (pinSuccess || verifying) return;
    setPin((p) => p.slice(0, -1));
    setPinError('');
  }, [pinSuccess, verifying]);

  // Physical keyboard support (useful on desktop / tablet keyboards)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) handlePress(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape' && !verifying && !pinSuccess) {
        setPin('');
        setPinError('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePress, handleDelete, verifying, pinSuccess]);

  const statusCard = (children: React.ReactNode) => (
    <div className='py-14 px-6 flex flex-col items-center gap-3 text-center'>
      {children}
    </div>
  );

  return (
    <div className='min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F6F6F7]'>
      <style>{`
        @keyframes pos-shake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        .pos-shake{animation:pos-shake .4s}
        @media (prefers-reduced-motion:reduce){.pos-shake{animation:none}}
      `}</style>

      <div className='w-full max-w-3xl'>
        <div className='flex items-center justify-center gap-2 mb-6'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_LOGO} alt={SITE_NAME} className='h-8 w-auto' />
          <span className='text-lg font-semibold text-[#202223]'>POS</span>
        </div>

        <div className='bg-white rounded-2xl border border-[#E1E3E5] shadow-sm overflow-hidden'>
          {loadingStaff ? (
            statusCard(
              <>
                <div className='w-6 h-6 border-2 border-[#008060] border-t-transparent rounded-full animate-spin' />
                <p className='text-xs text-[#8C9196]'>Loading staff…</p>
              </>,
            )
          ) : loadError ? (
            statusCard(
              <>
                <p className='text-sm text-red-600'>{loadError}</p>
                <button
                  type='button'
                  onClick={() => setReloadKey((k) => k + 1)}
                  className='px-4 py-2 rounded-lg text-[13px] font-semibold text-[#202223] bg-[#F6F6F7] border border-[#E1E3E5] hover:bg-[#EDEEEF] cursor-pointer'
                >
                  Try again
                </button>
              </>,
            )
          ) : staffList.length === 0 ? (
            statusCard(
              <p className='text-sm text-[#6D7175]'>
                No active staff found. Please add staff from the dashboard.
              </p>,
            )
          ) : (
            <div className='grid md:grid-cols-[5fr_6fr]'>
              {/* LEFT: profiles */}
              <section
                aria-label='Select your profile'
                className='p-5 sm:p-6 bg-[#FAFBFB] border-b md:border-b-0 md:border-r border-[#E1E3E5]'
              >
                <h1 className='text-xl font-semibold text-[#202223] mb-1'>
                  Select your profile
                </h1>
                <p className='text-sm text-[#6D7175] mb-4'>
                  Choose your account to continue
                </p>
                <div className='flex flex-col gap-2.5 md:max-h-[420px] md:overflow-y-auto pr-0.5'>
                  {staffList.map((staff) => {
                    const active = selected?.id === staff.id;
                    return (
                      <button
                        key={staff.id}
                        type='button'
                        onClick={() => handleSelect(staff)}
                        disabled={verifying}
                        aria-pressed={active}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008060] disabled:cursor-not-allowed ${
                          active
                            ? 'border-[#008060] bg-[#008060]/5 ring-2 ring-[#008060]/10'
                            : 'border-[#E1E3E5] bg-white hover:border-[#008060]/60 hover:bg-[#F6F6F7]'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${
                            active
                              ? 'bg-[#008060] text-white'
                              : 'bg-[#F1F2F3] text-[#6D7175]'
                          }`}
                        >
                          {staff.initials}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-[13px] font-semibold text-[#202223] truncate'>
                            {staff.name}
                          </p>
                          <p className='text-[11px] text-[#6D7175]'>
                            {staff.shift || 'Full access'}
                          </p>
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                            staff.role === 'admin'
                              ? 'bg-[#008060]/10 text-[#008060]'
                              : 'bg-[#F1F2F3] text-[#6D7175]'
                          }`}
                        >
                          {staff.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* RIGHT: PIN entry */}
              <section
                ref={pinPanelRef}
                aria-label='Enter PIN'
                className='p-5 pt-6 sm:p-8 flex flex-col items-center justify-center'
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    pinError
                      ? 'bg-red-50 text-red-600'
                      : 'bg-[#008060]/10 text-[#008060]'
                  }`}
                >
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    aria-hidden='true'
                  >
                    <rect x='4' y='11' width='16' height='10' rx='2' />
                    <path d='M8 11V7a4 4 0 0 1 8 0v4' />
                  </svg>
                </div>

                <p className='text-sm text-[#6D7175] mb-1 text-center'>
                  Enter PIN for{' '}
                  <span className='font-semibold text-[#202223]'>
                    {selected?.name}
                  </span>
                </p>
                <p className='text-xs text-[#8C9196] mb-5'>
                  Enter your {PIN_LENGTH}-digit PIN
                </p>

                <PinDots pin={pin} error={!!pinError} success={pinSuccess} />

                <div
                  className='min-h-5 flex items-center justify-center my-3.5'
                  aria-live='polite'
                >
                  {pinError && (
                    <p className='text-xs font-medium text-red-600 text-center px-4'>
                      {pinError}
                    </p>
                  )}
                  {verifying && !pinError && !pinSuccess && (
                    <p className='text-xs font-medium text-[#6D7175]'>
                      Verifying…
                    </p>
                  )}
                  {pinSuccess && (
                    <p className='text-xs font-medium text-[#008060]'>
                      Access granted! Opening terminal...
                    </p>
                  )}
                </div>

                <PinPad
                  onPress={handlePress}
                  onDelete={handleDelete}
                  disabled={pinSuccess || verifying || !selected}
                />
              </section>
            </div>
          )}
        </div>

        <p className='text-xs text-center mt-4 text-[#8C9196]'>
          {SITE_NAME} · POS Terminal
        </p>
      </div>
    </div>
  );
}