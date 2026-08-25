'use client';
import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { PlusIcon, ShieldIcon } from '@/components/ui/Icons';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');
interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}
function AddCardForm({
  onSaved,
  onCancel
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');
    const {
      error: confirmError
    } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required'
    });
    if (confirmError) {
      setError(confirmError.message ?? 'Could not save card');
      setSaving(false);
      return;
    }
    toast.success('Card saved');
    setSaving(false);
    onSaved();
  };
  return <form onSubmit={handleSubmit} className='mt-5 border-t border-gray-100 pt-5 space-y-4'>
      <PaymentElement />
      {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}
      <div className='flex gap-3'>
        <button type='submit' disabled={!stripe || saving} className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'>
          {saving ? 'Saving…' : 'Save Card'}
        </button>
        <button type='button' onClick={onCancel} className='text-sm font-semibold text-gray-500 hover:text-gray-700 font-lato'>
          Cancel
        </button>
      </div>
    </form>;
}
export default function PaymentMethodsTab() {
  const [methods, setMethods] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/store/stripe/payment-methods', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) setMethods(data.paymentMethods ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);
  const openAddCard = async () => {
    setLoadingIntent(true);
    try {
      const res = await fetch('/api/store/stripe/setup-intent', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start card setup');
      setClientSecret(data.client_secret);
      setShowForm(true);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start card setup');
    } finally {
      setLoadingIntent(false);
    }
  };
  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this card?')) return;
    try {
      const res = await fetch('/api/store/stripe/payment-methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_method_id: id
        })
      });
      if (!res.ok) throw new Error('Failed to remove card');
      toast.success('Card removed');
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove card');
    }
  };
  return <div className='bg-white rounded-2xl border border-gray-100 p-6'>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
          Payment Methods
        </h2>
        <button onClick={() => showForm ? setShowForm(false) : openAddCard()} disabled={loadingIntent} className='flex items-center gap-1.5 bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-4 py-2 rounded-full text-xs transition-colors'>
          <PlusIcon size={14} /> {loadingIntent ? 'Loading…' : 'Add Card'}
        </button>
      </div>

      <div className='flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-5'>
        <ShieldIcon size={16} className='text-gray-400 shrink-0 mt-0.5' />
        <p className='text-xs text-gray-500 font-lato leading-relaxed'>
          Your card is saved securely by Stripe — we never see or store your
          full card number. Only the card brand and last 4 digits are shown
          here.
        </p>
      </div>

      {loading ? <div className='py-8 flex justify-center'>
          <div className='w-6 h-6 border-2 border-[#E8553A] border-t-transparent rounded-full animate-spin' />
        </div> : methods.length === 0 && !showForm ? <p className='text-sm text-gray-400 font-lato py-6 text-center'>
          No saved payment methods yet.
        </p> : <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {methods.map(m => <div key={m.id} className='border rounded-xl p-4 relative border-gray-100'>
              <p className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1 capitalize'>
                {m.brand}
              </p>
              <p className='text-xs text-gray-500 font-lato'>
                •••• {m.last4}
                {m.expMonth && m.expYear ? ` · Exp ${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)}` : ''}
              </p>
              <div className='flex gap-3 mt-3'>
                <button onClick={() => handleRemove(m.id)} className='text-xs font-semibold text-red-500 hover:underline font-lato'>
                  Remove
                </button>
              </div>
            </div>)}
        </div>}

      {showForm && clientSecret && <Elements stripe={stripePromise} options={{
      clientSecret
    }}>
          <AddCardForm onSaved={() => {
        setShowForm(false);
        fetchMethods();
      }} onCancel={() => setShowForm(false)} />
        </Elements>}
    </div>;
}
