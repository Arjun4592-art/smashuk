'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { emailPOSReceipt, type EmailReceiptPayload } from '@/lib/api/pos';
interface Props {
  onClose: () => void;
  receipt: Omit<EmailReceiptPayload, 'email'>;
  defaultEmail?: string;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function EmailReceiptModal({
  onClose,
  receipt,
  defaultEmail = ''
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const handleSend = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setSending(true);
    try {
      await emailPOSReceipt({
        ...receipt,
        email: trimmed
      });
      toast.success(`Receipt sent to ${trimmed}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send receipt';
      setError(msg);
      toast.error('Could not send receipt', {
        description: msg
      });
    } finally {
      setSending(false);
    }
  };
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.4)'
  }} onClick={e => e.target === e.currentTarget && !sending && onClose()}>
      <div className='w-full max-w-sm rounded-xl overflow-hidden' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
    }}>
        {}
        <div className='flex items-center justify-between px-5 py-4' style={{
        borderBottom: '1px solid #E1E3E5'
      }}>
          <h3 className='text-base font-semibold' style={{
          color: '#202223'
        }}>
            Email receipt
          </h3>
          <button onClick={onClose} disabled={sending} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7] disabled:opacity-40' style={{
          color: '#6D7175'
        }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='p-5'>
          <label className='text-[11px] font-medium uppercase tracking-wide block mb-2' style={{
          color: '#6D7175'
        }}>
            Send this receipt to
          </label>
          <input autoFocus type='email' inputMode='email' value={email} onChange={e => {
          setEmail(e.target.value);
          if (error) setError('');
        }} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder='customer@example.com' disabled={sending} className='w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-[#008060] disabled:opacity-60' style={{
          borderColor: error ? '#D82C0D' : '#E1E3E5',
          color: '#202223'
        }} />
          {error && <p className='text-xs mt-1.5' style={{
          color: '#D82C0D'
        }}>
              {error}
            </p>}
        </div>

        <div className='px-5 pb-5 flex gap-2'>
          <button onClick={onClose} disabled={sending} className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7] disabled:opacity-50' style={{
          borderColor: '#E1E3E5',
          color: '#6D7175'
        }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || !email.trim()} className='flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50' style={{
          background: '#008060',
          color: '#FFFFFF'
        }}>
            {sending ? 'Sending…' : 'Send receipt'}
          </button>
        </div>
      </div>
    </div>;
}
