'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ShieldIcon } from '@/components/ui/Icons';
import { addShippingAddress, listShippingOptions, addShippingMethod, initiatePayment, placeOrder, getAddresses, createCart, addToCart, getCart } from '@/lib/api/store';
import { useAuthStore } from '@/store/authStore';
import { trackBeginCheckout } from '@/lib/analytics-events';
import { FREE_SHIPPING_THRESHOLD, GIFT_CARD_PRODUCT_HANDLE } from '@/lib/constants';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');
const PAYMENT_METHOD = 'card';
const DELIVERY_INFO_SECTIONS: {
  heading: string;
  body: string;
}[] = [{
  heading: '',
  body: 'We offer a 2-3 day delivery on most goods purchased to a UK address, excluding Northern Ireland, Isle of Man, Scottish Islands and the Channel Islands, which may take up to 7 days to deliver.'
}, {
  heading: '1. General Information',
  body: 'All orders are subject to product availability. If an item is not in stock at the time you place your order, we will notify you and refund you the total amount of your order, using the original method of payment.'
}, {
  heading: '2. Delivery Time',
  body: 'An estimated delivery time will be provided to you once your order is placed. Delivery times are estimates and commence from the date of shipping, rather than the date of order. Delivery times are to be used as a guide only and are subject to the acceptance and approval of your order.\n\nUnless there are exceptional circumstances, we make every effort to fulfil your order within 10 business days of the date of your order. Business days mean Monday to Friday, except holidays. Please note we do not ship on Sundays.\n\nDate of delivery may vary due to carrier shipping practices, delivery location, method of delivery, and the items ordered. Products may also be delivered in separate shipments.'
}, {
  heading: '3. Next Working Day Delivery',
  body: 'For an additional cost we can deliver next working day: £5.99 for a spend value of less than £80.00, and £3.50 for a spend value greater than £80.00. To ensure availability of next working day delivery, orders have to be placed before 2:30pm. Orders placed on Friday will be delivered on Monday. Orders received on Saturday and Sunday requesting next day delivery will not be delivered until Tuesday.'
}, {
  heading: '4. Additional Delivery Instructions',
  body: 'You can provide special delivery instructions on the checkout page of our website.'
}, {
  heading: '5. Shipping Costs',
  body: 'Shipping costs are based on the weight of your order and the delivery method. To find out how much your order will cost, simply add the items you would like to purchase to your cart, and proceed to the checkout page. Once at the checkout screen, shipping charges will be displayed.\n\nAdditional shipping charges may apply to remote areas or for large or heavy items. You will be advised of any charges on the checkout page.'
}, {
  heading: '6. Damaged Items In Transport',
  body: 'If there is any damage to the packaging on delivery, contact us immediately at info@smashuk.co'
}, {
  heading: '7. Questions',
  body: 'If you have any questions about the delivery and shipment or your order, please contact us at info@smashuk.co'
}];
const StripeCardBlock = forwardRef(function StripeCardBlock({
  onReady,
  onMethodChange,
  returnUrl
}: {
  onReady?: () => void;
  onMethodChange?: (type: string) => void;
  returnUrl: string;
}, ref) {
  const stripe = useStripe();
  const elements = useElements();
  useImperativeHandle(ref, () => ({
    confirmPayment: async () => {
      if (!stripe || !elements) {
        throw new Error('Payment form is still loading — try again in a moment.');
      }
      const {
        error
      } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl
        }
      });
      if (error) {
        throw new Error(error.message ?? 'Card payment failed.');
      }
    }
  }));
  return <PaymentElement onReady={onReady} onChange={e => onMethodChange?.(e.value.type)} options={{
    wallets: {
      applePay: 'never',
      googlePay: 'never'
    },
    paymentMethodOrder: ['card', 'amazon_pay', 'revolut_pay']
  }} />;
});
export default function CheckoutPage() {
  const {
    items,
    subtotal,
    shipping,
    tax,
    taxRate,
    total,
    discountAmount,
    couponCode,
    giftCards,
    giftCardTotal,
    cartId,
    clearCart,
    applyCoupon,
    removeCoupon,
    applyGiftCard,
    removeGiftCard
  } = useCartStore();
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError('');
    const couponResult = await applyCoupon(code);
    if (couponResult.success) {
      setPromoInput('');
      setPromoLoading(false);
      return;
    }
    const giftCardResult = await applyGiftCard(code);
    setPromoLoading(false);
    if (giftCardResult.success) {
      setPromoInput('');
    } else {
      setPromoError(giftCardResult.error ?? couponResult.error ?? 'Invalid code');
    }
  };
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [cardClientSecret, setCardClientSecret] = useState('');
  const [cardLoading, setCardLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [deliveryMode, setDeliveryMode] = useState<'ship' | 'pickup'>('ship');
  const [storeContact, setStoreContact] = useState<{
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
  } | null>(null);
  useEffect(() => {
    fetch('/api/store/store-info').then(r => r.json()).then(setStoreContact).catch(() => {});
  }, []);
  useEffect(() => {
    if (items.length === 0) return;
    trackBeginCheckout({
      value: total,
      items: items.map(i => ({
        itemId: i.variant?.id ?? i.product.id,
        itemName: i.product.name ?? 'Product',
        price: i.product.price,
        quantity: i.quantity
      }))
    });
  }, []);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState('card');
  const cardRef = useRef<{
    confirmPayment: () => Promise<void>;
  }>(null);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(FREE_SHIPPING_THRESHOLD);
  useEffect(() => {
    fetch('/api/store/shipping-settings').then(r => r.json()).then(data => {
      if (typeof data.freeShippingThreshold === 'number') {
        setFreeShippingThreshold(data.freeShippingThreshold);
      }
    }).catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingForm, setBillingForm] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: ''
  });
  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };
  const {
    user,
    isAuthenticated
  } = useAuthStore();
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setForm(f => ({
      ...f,
      name: f.name || user.name || '',
      email: f.email || user.email || '',
      phone: f.phone || user.phone || ''
    }));
    getAddresses().then(addresses => {
      const preferred = addresses.find(a => a.is_default_shipping) ?? addresses[0];
      if (!preferred) return;
      setForm(f => ({
        ...f,
        name: f.name || `${preferred.first_name} ${preferred.last_name}`.trim(),
        phone: f.phone || preferred.phone || '',
        line1: f.line1 || preferred.address_1 || '',
        line2: f.line2 || preferred.address_2 || '',
        city: f.city || preferred.city || '',
        state: f.state || preferred.province || '',
        pincode: f.pincode || preferred.postal_code || ''
      }));
    }).catch(() => {});
  }, [isAuthenticated, user?.id]);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const {
    setCartId
  } = useCartStore();
  const cartValidatedRef = useRef(false);
  useEffect(() => {
    if (!cartId || items.length === 0) return;
    if (cartValidatedRef.current) return;
    cartValidatedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const medusaCart = await getCart(cartId);
        if (!medusaCart || !medusaCart.items?.length) {
          const newCart = await createCart();
          if (cancelled || !newCart?.id) return;
          setCartId(newCart.id);
          for (const item of items) {
            const variantId = item.variant?.id ?? (item.product as any).variants?.[0]?.id;
            if (variantId) {
              await addToCart(newCart.id, variantId, item.quantity).catch(() => {});
            }
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [cartId, items.length, items, setCartId]);
  useEffect(() => {
    if (!cartId) return;
    let cancelled = false;
    setShippingLoading(true);
    listShippingOptions(cartId).then(opts => {
      if (cancelled) return;
      setShippingOptions(opts);
    }).catch(() => {
      if (!cancelled) setShippingOptions([]);
    }).finally(() => {
      if (!cancelled) setShippingLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cartId]);
  const physicalSubtotal = items.filter(i => i.product.slug !== GIFT_CARD_PRODUCT_HANDLE).reduce((s, i) => s + i.product.price * i.quantity, 0);
  const isPickupOption = (name: string) => /pickup|store|collect/i.test(name);
  const pickupOption = shippingOptions.find(o => isPickupOption(o.name ?? ''));
  const isFreeDeliveryOption = (opt: any) => !isPickupOption(opt.name ?? '') && /free/i.test(opt.name ?? '');
  const isPaidDeliveryOption = (opt: any) => !isPickupOption(opt.name ?? '') && !isFreeDeliveryOption(opt);
  const freeDeliveryOption = shippingOptions.find(isFreeDeliveryOption);
  const paidDeliveryOption = shippingOptions.find(isPaidDeliveryOption);
  const resolvedDeliveryOption = (physicalSubtotal >= freeShippingThreshold ? freeDeliveryOption : paidDeliveryOption) ?? freeDeliveryOption ?? paidDeliveryOption;
  const resolvedDeliveryAmount = resolvedDeliveryOption === freeDeliveryOption ? 0 : resolvedDeliveryOption?.calculated_price?.calculated_amount ?? resolvedDeliveryOption?.amount ?? 0;
  const isPickupSelected = !!pickupOption && selectedShippingOptionId === pickupOption.id;
  const displayShipping = isPickupSelected ? 0 : resolvedDeliveryOption ? resolvedDeliveryAmount : shipping;
  const displayTotal = Math.max(0, subtotal - discountAmount + displayShipping + tax - giftCardTotal);
  useEffect(() => {
    if (deliveryMode === 'pickup') {
      if (pickupOption && selectedShippingOptionId !== pickupOption.id) {
        setSelectedShippingOptionId(pickupOption.id);
      }
      return;
    }
    if (!resolvedDeliveryOption) return;
    if (selectedShippingOptionId !== resolvedDeliveryOption.id) {
      setSelectedShippingOptionId(resolvedDeliveryOption.id);
    }
  }, [deliveryMode, resolvedDeliveryOption?.id, pickupOption, selectedShippingOptionId]);
  useEffect(() => {
    if (!cardClientSecret || paymentElementReady) return;
    const timer = setTimeout(() => setPaymentElementReady(true), 4000);
    return () => clearTimeout(timer);
  }, [cardClientSecret, paymentElementReady]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }));
  };
  useEffect(() => {
    if (cardClientSecret || !cartId || checkoutStep !== 'payment') return;
    let cancelled = false;
    setCardLoading(true);
    (async () => {
      try {
        const collectionRes = await fetch('/api/store/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'create-collection',
            cartId
          })
        });
        const collectionData = await collectionRes.json();
        const collectionId = collectionData?.payment_collection?.id;
        if (!collectionId) {
          throw new Error(collectionData?.error ?? collectionData?.message ?? 'Could not start payment — the cart may be empty or the backend unreachable.');
        }
        const sessionRes = await fetch('/api/store/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'create-session',
            cartId,
            collectionId,
            providerId: 'pp_stripe_stripe'
          })
        });
        const sessionData = await sessionRes.json();
        const secret = sessionData?.payment_collection?.payment_sessions?.[0]?.data?.client_secret ?? sessionData?.payment_session?.data?.client_secret;
        if (!secret) {
          const reason = sessionData?.error ?? sessionData?.message ?? 'the "Stripe" payment provider is not enabled for this region in Medusa Admin → Settings → Regions, or STRIPE_API_KEY is missing on the Medusa backend';
          throw new Error(`Could not start card payment — ${reason}`);
        }
        if (!cancelled) setCardClientSecret(secret);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message ?? 'Could not load card payment form', {
            duration: 6000
          });
        }
      } finally {
        if (!cancelled) setCardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartId, cardClientSecret, checkoutStep]);
  const handleContinueToPayment = async () => {
    if (!cartId) {
      toast.error('Cart not found. Please add items again.');
      return;
    }
    const contactFieldsMissing = !form.name || !form.email;
    const shipAddressFieldsMissing = deliveryMode === 'ship' && (!form.line1 || !form.city || !form.pincode);
    if (contactFieldsMissing || shipAddressFieldsMissing) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (deliveryMode === 'pickup' && !storeContact) {
      toast.error('Could not load the pickup location — please try again in a moment.');
      return;
    }
    if (deliveryMode !== 'pickup' && !billingSameAsShipping && (!billingForm.name || !billingForm.line1 || !billingForm.city || !billingForm.pincode)) {
      toast.error('Please fill all required billing address fields.');
      return;
    }
    setPlacing(true);
    try {
      const [firstName, ...rest] = form.name.split(' ');
      const shippingAddress = deliveryMode === 'pickup' && storeContact ? {
        first_name: firstName,
        last_name: rest.join(' ') || '',
        address_1: storeContact.address.line1,
        address_2: storeContact.address.line2 || undefined,
        city: storeContact.address.city,
        province: storeContact.address.state,
        postal_code: storeContact.address.pincode,
        country_code: 'gb',
        phone: form.phone || undefined
      } : {
        first_name: firstName,
        last_name: rest.join(' ') || '',
        address_1: form.line1,
        address_2: form.line2 || undefined,
        city: form.city,
        province: form.state,
        postal_code: form.pincode,
        country_code: 'gb',
        phone: form.phone || undefined
      };
      const billingAddress = deliveryMode === 'pickup' || billingSameAsShipping ? undefined : (() => {
        const [billingFirstName, ...billingRest] = billingForm.name.split(' ');
        return {
          first_name: billingFirstName,
          last_name: billingRest.join(' ') || '',
          address_1: billingForm.line1,
          address_2: billingForm.line2 || undefined,
          city: billingForm.city,
          province: billingForm.state,
          postal_code: billingForm.pincode,
          country_code: 'gb'
        };
      })();
      await addShippingAddress(cartId, shippingAddress, billingAddress, form.email);
      const optionId = selectedShippingOptionId || shippingOptions[0]?.id;
      if (optionId) {
        await addShippingMethod(cartId, optionId);
      }
      setCheckoutStep('payment');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save your details. Please try again.');
    } finally {
      setPlacing(false);
    }
  };
  const handlePlaceOrder = async () => {
    if (!cartId) {
      toast.error('Cart not found. Please add items again.');
      return;
    }
    setPlacing(true);
    try {
      if (!cardClientSecret) {
        throw new Error('Card payment form is still loading — please wait a moment and try again.');
      }
      if (!cardRef.current) {
        throw new Error('Card payment form not ready.');
      }
      await cardRef.current.confirmPayment();
      const selectedOption = shippingOptions.find(o => o.id === (selectedShippingOptionId || shippingOptions[0]?.id));
      const isPickupOrder = isPickupOption(selectedOption?.name ?? '');
      const completeRes = await fetch('/api/store/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete',
          cartId,
          metadata: {
            payment_method: selectedPaymentType || PAYMENT_METHOD,
            ...(isPickupOrder ? {
              fulfillment_type: 'pickup',
              pickup_contact_name: form.name,
              pickup_contact_phone: form.phone || undefined
            } : {})
          }
        })
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData?.message ?? 'Order placement failed');
      }
      clearCart();
      toast.success('Order placed successfully! 🎉');
      router.push('/profile?tab=orders');
    } catch (err: any) {
      toast.error(err?.message ?? 'Order placement failed. Try again.');
    } finally {
      setPlacing(false);
    }
  };
  if (items.length === 0) {
    return <div className='min-h-screen bg-white flex flex-col items-center justify-center py-20 px-4 text-center'>
        <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-3'>
          Cart is empty
        </h1>
        <Link href='/shop' className='bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full'>
          Shop Now →
        </Link>
      </div>;
  }
  return <div className='min-h-screen bg-[#F2F4F7]'>
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-3'>
            <Link href='/' className='hover:text-white'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <Link href='/cart' className='hover:text-white'>
              Cart
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-white'>Checkout</span>
          </div>
          <h1 className='font-montserrat font-black text-3xl text-white'>
            Checkout
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {}
          <div className='lg:col-span-2 space-y-5'>
            {}
            <div className='grid grid-cols-2 gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white'>
              <button type='button' onClick={() => setDeliveryMode('ship')} className={`flex items-center justify-center gap-2 py-3.5 font-montserrat font-bold text-sm transition-colors ${deliveryMode === 'ship' ? 'bg-[#0A1F44] text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                🚚 Ship
              </button>
              <button type='button' onClick={() => setDeliveryMode('pickup')} disabled={!pickupOption} className={`flex items-center justify-center gap-2 py-3.5 font-montserrat font-bold text-sm transition-colors border-l border-gray-200 ${deliveryMode === 'pickup' ? 'bg-[#0A1F44] text-white' : 'text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'}`}>
                🏬 Pickup
              </button>
            </div>

            <div className='bg-white rounded-2xl p-6 border border-gray-100'>
              <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                {deliveryMode === 'pickup' ? 'Contact Details' : 'Shipping Address'}
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {[{
                name: 'name',
                label: 'Full Name *',
                placeholder: 'John Smith'
              }, {
                name: 'email',
                label: 'Email *',
                placeholder: 'john@example.com'
              }, {
                name: 'phone',
                label: 'Phone',
                placeholder: '+44 7700 900000'
              }, ...(deliveryMode === 'ship' ? [{
                name: 'pincode',
                label: 'Postcode *',
                placeholder: 'SW1A 1AA'
              }, {
                name: 'line1',
                label: 'Address Line 1 *',
                placeholder: '10 Downing Street',
                colSpan: true
              }, {
                name: 'line2',
                label: 'Address Line 2 (Optional)',
                placeholder: 'Flat / Apartment',
                colSpan: true
              }, {
                name: 'city',
                label: 'City *',
                placeholder: 'London'
              }, {
                name: 'state',
                label: 'County',
                placeholder: 'Greater London'
              }] : [])].map(field => <div key={field.name} className={(field as any).colSpan ? 'sm:col-span-2' : ''}>
                    <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                      {field.label}
                    </label>
                    <input type='text' name={field.name} value={(form as any)[field.name]} onChange={handleChange} placeholder={field.placeholder} className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44]' />
                  </div>)}
              </div>

              {}
              {deliveryMode === 'pickup' && <div className='mt-4 pt-4 border-t border-gray-100'>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-montserrat'>
                    Pickup Location
                  </p>
                  {storeContact ? <div className='flex items-start gap-3 p-4 rounded-xl bg-[#F2F4F7]'>
                      <span className='text-xl'>🏬</span>
                      <div>
                        <p className='font-lato font-semibold text-sm text-[#0A1F44]'>
                          {storeContact.name}
                        </p>
                        <p className='text-xs text-gray-500 font-lato mt-0.5 leading-relaxed'>
                          {storeContact.address.line1}
                          {storeContact.address.line2 ? `, ${storeContact.address.line2}` : ''}
                          <br />
                          {[storeContact.address.city, storeContact.address.pincode].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div> : <p className='text-sm text-gray-400 font-lato'>
                      Loading pickup location…
                    </p>}
                </div>}
            </div>

            {}
            {deliveryMode !== 'pickup' && <div className='bg-white rounded-2xl p-6 border border-gray-100'>
                <div className='flex items-center justify-between mb-5'>
                  <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                    Billing Address
                  </h2>
                  <label className='flex items-center gap-2 text-xs font-lato text-gray-500 cursor-pointer'>
                    <input type='checkbox' checked={billingSameAsShipping} onChange={e => setBillingSameAsShipping(e.target.checked)} className='rounded border-gray-300 text-[#E8553A] focus:ring-[#E8553A]' />
                    Same as shipping address
                  </label>
                </div>
                {!billingSameAsShipping && <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    {[{
                name: 'name',
                label: 'Full Name *',
                placeholder: 'John Smith',
                colSpan: true
              }, {
                name: 'pincode',
                label: 'Postcode *',
                placeholder: 'SW1A 1AA'
              }, {
                name: 'line1',
                label: 'Address Line 1 *',
                placeholder: '10 Downing Street',
                colSpan: true
              }, {
                name: 'line2',
                label: 'Address Line 2 (Optional)',
                placeholder: 'Flat / Apartment',
                colSpan: true
              }, {
                name: 'city',
                label: 'City *',
                placeholder: 'London'
              }, {
                name: 'state',
                label: 'County',
                placeholder: 'Greater London'
              }].map(field => <div key={field.name} className={field.colSpan ? 'sm:col-span-2' : ''}>
                        <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                          {field.label}
                        </label>
                        <input type='text' name={field.name} value={(billingForm as any)[field.name]} onChange={handleBillingChange} placeholder={field.placeholder} className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44]' />
                      </div>)}
                  </div>}
              </div>}
          </div>

          {}
          <div>
            <div className='bg-white rounded-2xl p-5 border border-gray-100 sticky top-28'>
              <h3 className='font-montserrat font-bold text-[#0A1F44] mb-4'>
                Order Summary
              </h3>

              {}
              <div className='mb-5'>
                {couponCode || giftCards.length > 0 ? <div className='space-y-2'>
                    {couponCode && <div className='flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2'>
                        <p className='font-montserrat font-bold text-green-700 text-xs'>
                          {couponCode}
                        </p>
                        <button onClick={removeCoupon} className='text-red-400 hover:text-red-600 text-xs font-lato'>
                          Remove
                        </button>
                      </div>}
                    {giftCards.map(gc => <div key={gc.code} className='flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2'>
                        <p className='font-montserrat font-bold text-green-700 text-xs'>
                          {gc.code}
                        </p>
                        <button onClick={() => removeGiftCard(gc.code)} className='text-red-400 hover:text-red-600 text-xs font-lato'>
                          Remove
                        </button>
                      </div>)}
                  </div> : <div className='flex gap-2'>
                    <input type='text' value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder='Discount code or gift card' disabled={promoLoading} onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} className='flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato disabled:opacity-60' />
                    <button onClick={handleApplyPromo} disabled={promoLoading} className='bg-gray-100 hover:bg-gray-200 text-[#0A1F44] font-montserrat font-bold px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60 shrink-0'>
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  </div>}
                {promoError && <p className='text-xs text-red-500 font-lato mt-1.5'>
                    {promoError}
                  </p>}
              </div>

              <div className='space-y-3 mb-5 max-h-48 overflow-y-auto'>
                {items.map(item => <div key={`${item.product.id}-${item.variant?.id}`} className='flex items-center gap-3'>
                    <div className='w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100'>
                      <img src={item.product.images[0]} alt={item.product.name} className='w-full h-full object-cover' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-[#0A1F44] font-montserrat truncate'>
                        {item.product.name}
                      </p>
                      <p className='text-xs text-gray-400 font-lato'>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className='text-sm font-black font-montserrat text-[#0A1F44]'>
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>)}
              </div>

              <div className='space-y-2.5 text-sm font-lato border-t border-gray-100 pt-4'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Subtotal</span>
                  <span className='font-semibold'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {discountAmount > 0 && <div className='flex justify-between text-green-600'>
                    <span>Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>}
                {giftCardTotal > 0 && <div className='flex justify-between text-green-600'>
                    <span>Gift card</span>
                    <span>-{formatCurrency(giftCardTotal)}</span>
                  </div>}
                <div className='flex justify-between'>
                  <span className='text-gray-500 flex items-center gap-1.5'>
                    Shipping
                    <button type='button' onClick={() => setShowDeliveryInfo(true)} aria-label='Delivery information' className='w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] leading-none flex items-center justify-center hover:border-gray-400 hover:text-gray-600 transition-colors'>
                      ?
                    </button>
                  </span>
                  {!cartId || shippingLoading && shippingOptions.length === 0 ? <span className='text-gray-400 text-xs'>
                      Enter shipping address to view methods
                    </span> : <span className={displayShipping === 0 ? 'text-green-600 font-semibold' : 'font-semibold'}>
                      {displayShipping === 0 ? 'FREE' : formatCurrency(displayShipping)}
                    </span>}
                </div>
                <div className='flex justify-between border-t border-gray-100 pt-3 text-base'>
                  <span className='font-montserrat font-black text-[#0A1F44]'>
                    Total
                  </span>
                  <span className='font-montserrat font-black text-[#0A1F44] text-xl'>
                    GBP {formatCurrency(displayTotal)}
                  </span>
                </div>
                <p className='text-xs text-gray-400 font-lato text-right -mt-1'>
                  Including {formatCurrency(tax)} in taxes
                </p>
              </div>

              {checkoutStep === 'details' && <button onClick={handleContinueToPayment} disabled={placing} className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-montserrat font-black text-base mt-5 transition-all ${placing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:-translate-y-0.5'}`}>
                  {placing ? 'Saving details...' : 'Continue to Payment'}
                </button>}

              <div className='flex items-center justify-center gap-1.5 mt-3'>
                <ShieldIcon size={14} className='text-gray-400' />
                <p className='text-xs text-gray-400 font-lato'>
                  Secured by 256-bit SSL encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      {checkoutStep === 'payment' && <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => {
        setCheckoutStep('details');
        setPaymentElementReady(false);
      }} />
          <div className='relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-5'>
                <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                  Payment
                </h2>
                <button onClick={() => {
              setCheckoutStep('details');
              setPaymentElementReady(false);
            }} className='text-sm font-lato font-semibold text-[#E8553A] hover:underline'>
                  ← Edit details
                </button>
              </div>

              <div className='flex items-center gap-3 p-4 rounded-xl border-2 border-[#E8553A] bg-[#E8553A]/5'>
                <span className='text-2xl'>
                  {selectedPaymentType === 'amazon_pay' ? '🅰️' : selectedPaymentType === 'revolut_pay' ? '💠' : '💳'}
                </span>
                <span className='font-lato font-semibold text-sm text-[#E8553A]'>
                  {selectedPaymentType === 'amazon_pay' ? 'Amazon Pay (Stripe — secure checkout)' : selectedPaymentType === 'revolut_pay' ? 'Revolut Pay (Stripe — secure checkout)' : 'Card (Stripe — secure checkout)'}
                </span>
              </div>

              <div className='mt-4 pt-4 border-t border-gray-100'>
                {!cardClientSecret && <div className='flex items-center justify-center gap-2.5 py-8'>
                    <div className='w-5 h-5 border-2 border-gray-200 border-t-[#E8553A] rounded-full animate-spin' />
                    <p className='text-sm text-gray-400 font-lato'>
                      {cardLoading ? 'Loading secure card form…' : 'Preparing payment form…'}
                    </p>
                  </div>}
                {cardClientSecret && <>
                    {!paymentElementReady && <div className='flex items-center justify-center gap-2.5 py-8'>
                        <div className='w-5 h-5 border-2 border-gray-200 border-t-[#E8553A] rounded-full animate-spin' />
                        <p className='text-sm text-gray-400 font-lato'>
                          Loading payment options…
                        </p>
                      </div>}
                    {}
                    <div className={paymentElementReady ? '' : 'hidden'}>
                      <Elements stripe={stripePromise} options={{
                  clientSecret: cardClientSecret
                }}>
                        <StripeCardBlock ref={cardRef} onReady={() => setPaymentElementReady(true)} onMethodChange={setSelectedPaymentType} returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/checkout/complete?cart_id=${cartId}` : ''} />
                      </Elements>
                    </div>
                  </>}
              </div>

              <div className='flex justify-between items-center mt-5 pt-4 border-t border-gray-100'>
                <span className='font-lato text-sm text-gray-500'>
                  Total due
                </span>
                <span className='font-montserrat font-black text-lg text-[#0A1F44]'>
                  {formatCurrency(displayTotal)}
                </span>
              </div>

              <button onClick={handlePlaceOrder} disabled={placing || cardLoading || !cardClientSecret || !paymentElementReady} className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-montserrat font-black text-base mt-4 transition-all ${placing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:-translate-y-0.5'}`}>
                {placing ? 'Placing Order...' : `Pay ${formatCurrency(displayTotal)}`}
              </button>

              <div className='flex items-center justify-center gap-1.5 mt-3'>
                <ShieldIcon size={14} className='text-gray-400' />
                <p className='text-xs text-gray-400 font-lato'>
                  Secured by 256-bit SSL encryption
                </p>
              </div>
            </div>
          </div>
        </div>}

      {}
      {showDeliveryInfo && <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50' onClick={() => setShowDeliveryInfo(false)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl'>
              <h3 className='font-montserrat font-black text-lg text-[#0A1F44]'>
                Delivery Information
              </h3>
              <button type='button' onClick={() => setShowDeliveryInfo(false)} aria-label='Close' className='text-gray-400 hover:text-gray-600 text-xl leading-none'>
                ✕
              </button>
            </div>
            <div className='px-6 py-5 space-y-4 text-sm font-lato text-gray-600'>
              {DELIVERY_INFO_SECTIONS.map((section, i) => <div key={i}>
                  {section.heading && <p className='font-semibold text-[#0A1F44] mb-1.5'>
                      {section.heading}
                    </p>}
                  {section.body.split('\n\n').map((para, j) => <p key={j} className='mb-2 last:mb-0 leading-relaxed'>
                      {para}
                    </p>)}
                </div>)}
            </div>
          </div>
        </div>}
    </div>;
}
