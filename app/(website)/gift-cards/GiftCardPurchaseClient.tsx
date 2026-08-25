'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';
import toast from 'react-hot-toast';
import { GiftIcon, MailIcon, UserIcon, CalendarIcon, CheckCircleIcon, SparkleIcon } from '@/components/ui/Icons';
interface Props {
  product: Product;
  variants: ProductVariant[];
}
function getVariantAmount(v: ProductVariant): number {
  const calcAmount = v.calculated_price?.calculated_amount;
  const gbpPrices = (v.prices ?? []).filter(p => p.currency_code === 'gbp').map(p => p.amount);
  const gbpPrice = gbpPrices.length ? Math.min(...gbpPrices) : undefined;
  const anyPrice = v.prices?.[0]?.amount;
  return calcAmount ?? gbpPrice ?? anyPrice ?? 0;
}
const MESSAGE_MAX = 200;
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export default function GiftCardPurchaseClient({
  product,
  variants
}: Props) {
  const addItem = useCartStore(s => s.addItem);
  const sortedVariants = [...variants].sort((a, b) => getVariantAmount(a) - getVariantAmount(b));
  const [selectedVariantId, setSelectedVariantId] = useState(sortedVariants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const selectedVariant = sortedVariants.find(v => v.id === selectedVariantId);
  const selectedAmount = selectedVariant ? getVariantAmount(selectedVariant) : 0;
  const today = new Date().toISOString().split('T')[0];
  const emailError = isGift && touched && !isValidEmail(recipientEmail);
  const canAdd = !!selectedVariant && !adding && (!isGift || isValidEmail(recipientEmail));
  const handleAddToCart = () => {
    if (!selectedVariant || adding) return;
    if (isGift && !isValidEmail(recipientEmail)) {
      setTouched(true);
      toast.error("Enter the recipient's email to send this as a gift");
      return;
    }
    setAdding(true);
    addItem({
      ...product,
      price: selectedAmount
    }, quantity, {
      id: selectedVariant.id,
      size: selectedVariant.title
    }, isGift ? {
      isGift: true,
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName.trim() || undefined,
      sendDate: sendDate || undefined,
      giftMessage: message.trim() || undefined
    } : undefined);
    toast.success(isGift ? `£${selectedAmount} gift card queued for ${recipientEmail.trim()}!` : `£${selectedAmount} gift card added to cart!`);
    setTimeout(() => setAdding(false), 400);
  };
  return <div className='max-w-6xl mx-auto px-4 py-12'>
      <div className='grid md:grid-cols-2 gap-12'>
        {}
        <div>
          <div className='sticky top-28'>
            <div className='relative aspect-[1.6/1] rounded-2xl overflow-hidden shadow-xl bg-linear-to-br from-[#0A1F44] via-[#132a5c] to-[#E8553A]'>
              {}
              <div className='absolute inset-0 opacity-[0.07]'>
                <div className='absolute -right-8 -top-8 w-56 h-56 rounded-full border-[24px] border-white' />
                <div className='absolute -left-10 -bottom-16 w-64 h-64 rounded-full border-[24px] border-white' />
              </div>

              <div className='relative h-full flex flex-col justify-between p-6 sm:p-8 text-white'>
                <div className='flex items-center justify-between'>
                  <span className='font-montserrat font-black text-lg tracking-tight'>
                    {product.name}
                  </span>
                  <GiftIcon size={26} className='text-white/70' />
                </div>

                <div>
                  <p className='font-montserrat font-black text-4xl sm:text-5xl tracking-tight'>
                    {formatCurrency(selectedAmount)}
                  </p>
                  {isGift && recipientName.trim() && <p className='mt-2 font-lato text-sm text-white/80'>
                      For {recipientName.trim()}
                    </p>}
                </div>

                <div className='flex items-center justify-between text-[11px] font-lato text-white/60 uppercase tracking-widest'>
                  <span>Racket Sports Store</span>
                  <span>Never Expires</span>
                </div>
              </div>
            </div>

            {isGift && message.trim() && <div className='mt-4 p-4 rounded-xl bg-[#F2F4F7] border border-[#E5E7EB]'>
                <p className='text-[11px] font-montserrat font-bold text-[#9CA3AF] uppercase tracking-wide mb-1'>
                  Your message
                </p>
                <p className='text-sm font-lato text-[#0A1F44] italic'>
                  “{message.trim()}”
                </p>
              </div>}

            <div className='mt-6 grid grid-cols-2 gap-3'>
              {[{
              icon: <SparkleIcon size={16} />,
              label: 'Instant delivery'
            }, {
              icon: <CheckCircleIcon size={16} />,
              label: 'No expiry date'
            }, {
              icon: <GiftIcon size={16} />,
              label: 'Use in-store or online'
            }, {
              icon: <MailIcon size={16} />,
              label: 'Emailed at checkout'
            }].map(f => <div key={f.label} className='flex items-center gap-2 text-xs font-lato text-gray-500'>
                  <span className='text-[#E8553A]'>{f.icon}</span>
                  {f.label}
                </div>)}
            </div>
          </div>
        </div>

        {}
        <div>
          <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-2'>
            {product.name}
          </h1>
          <p className='text-gray-500 font-lato mb-8'>
            Let them choose their perfect racket, shoes, or gear — the gift of
            choice, for any racket sport.
          </p>

          {}
          <p className='font-montserrat font-bold text-[#0A1F44] text-sm mb-3'>
            Choose an amount
          </p>
          <div className='grid grid-cols-4 gap-2.5 mb-8'>
            {sortedVariants.map(v => {
            const amount = getVariantAmount(v);
            const active = v.id === selectedVariantId;
            return <button key={v.id} type='button' onClick={() => setSelectedVariantId(v.id)} className={`py-3.5 rounded-xl border-2 font-montserrat font-bold text-sm transition-all duration-150 ${active ? 'border-[#E8553A] bg-[#E8553A]/6 text-[#E8553A] shadow-sm scale-[1.03]' : 'border-gray-200 text-[#0A1F44] hover:border-[#0A1F44]/30 hover:scale-[1.02]'}`}>
                  {formatCurrency(amount)}
                </button>;
          })}
          </div>

          {}
          <button type='button' onClick={() => setIsGift(v => !v)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 mb-3 ${isGift ? 'border-[#E8553A]/30 bg-[#E8553A]/4' : 'border-[#E5E7EB] bg-[#F2F4F7] hover:border-[#0A1F44]/20'}`}>
            <span className='flex items-center gap-2.5'>
              <GiftIcon size={18} className={isGift ? 'text-[#E8553A]' : 'text-gray-400'} />
              <span className={`text-[14px] font-lato font-semibold ${isGift ? 'text-[#0A1F44]' : 'text-[#4B5563]'}`}>
                I want to send this as a gift
              </span>
            </span>
            <div className={`w-10 h-5 rounded-full relative shrink-0 transition-colors duration-300 ${isGift ? 'bg-[#E8553A]' : 'bg-[#E5E7EB]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${isGift ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>

          <div className={`grid transition-all duration-300 ease-out ${isGift ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className='overflow-hidden'>
              <div className='space-y-4 p-4 rounded-xl bg-[#F8F9FB] border border-[#E5E7EB]'>
                <div>
                  <label className='flex items-center gap-1.5 text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                    <MailIcon size={13} /> Recipient email
                    <span className='text-[#E8553A]'>*</span>
                  </label>
                  <input type='email' value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder='them@example.com' className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-lato focus:outline-none transition-colors ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#E8553A]'}`} />
                  {emailError && <p className='mt-1 text-xs text-red-500 font-lato'>
                      Enter a valid email address
                    </p>}
                </div>

                <div>
                  <label className='flex items-center gap-1.5 text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                    <UserIcon size={13} /> Recipient name{' '}
                    <span className='text-gray-400 font-normal'>
                      (optional)
                    </span>
                  </label>
                  <input type='text' value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder='Their name' className='w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm font-lato focus:outline-none focus:border-[#E8553A] transition-colors' />
                </div>

                <div>
                  <label className='flex items-center gap-1.5 text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                    <CalendarIcon size={13} /> Send on{' '}
                    <span className='text-gray-400 font-normal'>
                      (optional)
                    </span>
                  </label>
                  <input type='date' min={today} value={sendDate} onChange={e => setSendDate(e.target.value)} className='w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm font-lato focus:outline-none focus:border-[#E8553A] transition-colors' />
                  <p className='mt-1 text-[11px] text-gray-400 font-lato'>
                    Leave blank to send right after checkout
                  </p>
                </div>

                <div>
                  <label className='flex items-center justify-between text-xs font-montserrat font-bold text-[#0A1F44] mb-1.5'>
                    <span>
                      Message{' '}
                      <span className='text-gray-400 font-normal'>
                        (optional)
                      </span>
                    </span>
                    <span className='text-gray-400 font-normal'>
                      {message.length}/{MESSAGE_MAX}
                    </span>
                  </label>
                  <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, MESSAGE_MAX))} rows={3} placeholder='A short note for them goes here.' className='w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm font-lato focus:outline-none focus:border-[#E8553A] transition-colors resize-none' />
                </div>
              </div>
            </div>
          </div>

          {}
          <p className='font-montserrat font-bold text-[#0A1F44] text-sm mb-3'>
            Quantity
          </p>
          <div className='flex items-center border border-gray-200 rounded-xl overflow-hidden w-fit mb-8'>
            <button type='button' onClick={() => setQuantity(q => Math.max(1, q - 1))} className='w-10 h-10 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'>
              −
            </button>
            <span className='w-12 text-center font-montserrat font-bold text-[#0A1F44]'>
              {quantity}
            </span>
            <button type='button' onClick={() => setQuantity(q => q + 1)} className='w-10 h-10 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'>
              +
            </button>
          </div>

          <button type='button' onClick={handleAddToCart} disabled={!canAdd} className='w-full bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60'>
            {adding ? 'Adding…' : `Add to Cart — ${formatCurrency(selectedAmount * quantity)}`}
          </button>

          <div className='mt-8 space-y-2 text-sm text-gray-500 font-lato'>
            <p>✓ Delivered by email after checkout — use in minutes</p>
            <p>✓ Valid on anything in-store or online</p>
            <p>✓ No expiry date</p>
            <p>✓ Enter the code at checkout to redeem</p>
          </div>
        </div>
      </div>
    </div>;
}
