'use client'

import { use, useEffect, useState } from 'react'
import { getOrder } from '@/lib/api/dashboard'
import {
  SITE_LOGO,
  STORE_DISPLAY_NAME,
  STORE_ADDRESS_LINE1,
  STORE_ADDRESS_LINE2,
  CONTACT_EMAIL,
} from '@/lib/constants'

function fmt(amount: number, currency = 'GBP') {
  const symbol =
    currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return (
    symbol +
    amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export default function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (order) {
      // Auto-print when order loads
      setTimeout(() => window.print(), 500)
    }
  }, [order])

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
      </div>
    )
  }

  if (!order) {
    return (
      <div className='flex items-center justify-center min-h-screen text-gray-500'>
        Order not found
      </div>
    )
  }

  const currency = order.currency_code ?? 'gbp'
  const customerName =
    `${order.shipping_address?.first_name ?? order.customer?.first_name ?? ''} ${order.shipping_address?.last_name ?? order.customer?.last_name ?? ''}`.trim() ||
    order.email ||
    'Guest'

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const addr = order.shipping_address

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print,
          aside,
          header,
          nav { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }
          /* neutralise any dashboard chrome wrapper that clips content */
          body * {
            overflow: visible !important;
            max-height: none !important;
          }
          .packing-slip {
            max-width: none !important;
            /* page margin lives here, not in @page, so the browser
               does not draw its own header/footer band */
            padding: 15mm !important;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          /* margin: 0 suppresses the browser's URL / date / page-number
             header & footer in Chrome, Edge and Safari */
          @page { margin: 0; size: A4; }
        }
        body { font-family: Arial, sans-serif; }
        @media screen {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Screen-only top bar */}
      <div className='no-print fixed top-0 left-0 right-0 bg-gray-800 text-white px-6 py-3 flex items-center justify-between z-50'>
        <span className='text-sm'>
          Packing Slip — Order #{order.display_id ?? id.slice(-6)}
        </span>
        <div className='flex gap-3'>
          <button
            onClick={() => window.print()}
            className='px-4 py-1.5 bg-white text-gray-800 text-sm font-medium rounded hover:bg-gray-100 transition-colors'
          >
            🖨️ Print
          </button>
          <button
            onClick={() => window.close()}
            className='px-4 py-1.5 border border-gray-500 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors'
          >
            Close
          </button>
        </div>
      </div>

      {/* Packing Slip Content */}
      <div className='packing-slip max-w-2xl mx-auto p-8 pt-20 print:pt-0 print:p-0'>
        {/* Logo */}
        <div className='flex justify-center mb-6'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SITE_LOGO}
            alt={STORE_DISPLAY_NAME}
            className='h-14 w-auto'
          />
        </div>

        {/* Header */}
        <div className='flex items-start justify-between mb-8 pb-4 border-b-2 border-[#1e2a6e]'>
          <div>
            <h1 className='text-2xl font-bold text-[#1e2a6e] tracking-tight'>
              Packing Slip
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              SmashRocker Pro Ltd &bull; {CONTACT_EMAIL.toLowerCase()}
            </p>
          </div>
          <div className='text-right'>
            <h2 className='text-xl font-bold text-[#c8202f]'>
              #{order.display_id ?? id.slice(-6)}
            </h2>
          </div>
        </div>

        {/* Addresses */}
        <div className='grid grid-cols-2 gap-8 mb-8'>
          {/* Ship To */}
          <div>
            <p className='text-xs font-semibold text-[#1e2a6e] uppercase tracking-wider mb-2'>
              Ship To
            </p>
            <p className='text-sm font-semibold text-gray-900'>
              {customerName}
            </p>
            {addr ? (
              <div className='text-sm text-gray-600 mt-1 space-y-0.5'>
                {addr.address_1 && <p>{addr.address_1}</p>}
                {addr.address_2 && <p>{addr.address_2}</p>}
                {(addr.city || addr.province || addr.postal_code) && (
                  <p>
                    {[addr.city, addr.province, addr.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {addr.country_code && <p>{addr.country_code.toUpperCase()}</p>}
              </div>
            ) : (
              <p className='text-sm text-gray-400 mt-1'>No address on file</p>
            )}
            {order.email && (
              <p className='text-sm text-gray-500 mt-2'>{order.email}</p>
            )}
            {order.customer?.phone && (
              <p className='text-sm text-gray-500'>{order.customer.phone}</p>
            )}
          </div>

          {/* Order Info */}
          <div>
            <p className='text-xs font-semibold text-[#1e2a6e] uppercase tracking-wider mb-2'>
              Order Info
            </p>
            <div className='space-y-1.5'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Order #</span>
                <span className='font-medium text-gray-800'>
                  {order.display_id ?? id.slice(-6)}
                </span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Date</span>
                <span className='text-gray-800'>{orderDate}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Payment</span>
                <span className='capitalize text-gray-800'>
                  {order.payment_status?.replace('_', ' ') ?? '—'}
                </span>
              </div>
              {order.metadata?.fulfillment_type && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Fulfilment</span>
                  <span className='capitalize text-gray-800'>
                    {order.metadata.fulfillment_type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className='w-full mb-6'>
          <thead>
            <tr className='border-b-2 border-[#1e2a6e]'>
              <th className='text-left text-xs font-semibold text-[#1e2a6e] uppercase tracking-wider pb-2 pr-4'>
                Item
              </th>
              <th className='text-center text-xs font-semibold text-[#1e2a6e] uppercase tracking-wider pb-2 px-4'>
                Qty
              </th>
              <th className='text-right text-xs font-semibold text-[#1e2a6e] uppercase tracking-wider pb-2 pl-4'>
                Price
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {(order.items ?? []).map((item: any) => (
              <tr key={item.id}>
                <td className='py-3 pr-4'>
                  <p className='text-sm font-medium text-gray-900'>
                    {item.title}
                  </p>
                  {item.variant_title && item.variant_title !== 'Default' && (
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {item.variant_title}
                    </p>
                  )}
                  {item.sku && (
                    <p className='text-xs text-gray-400 mt-0.5'>
                      SKU: {item.sku}
                    </p>
                  )}
                </td>
                <td className='py-3 px-4 text-center'>
                  <span className='text-sm font-semibold text-gray-900'>
                    {item.quantity}
                  </span>
                </td>
                <td className='py-3 pl-4 text-right'>
                  <span className='text-sm text-gray-700'>
                    {fmt(item.unit_price * item.quantity, currency)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className='border-t border-gray-200 pt-4 ml-auto w-64 space-y-1.5'>
          <div className='flex justify-between text-sm text-gray-500'>
            <span>Subtotal</span>
            <span>{fmt(order.subtotal ?? 0, currency)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className='flex justify-between text-sm text-red-500'>
              <span>Discount</span>
              <span>-{fmt(order.discount_total, currency)}</span>
            </div>
          )}
          <div className='flex justify-between text-sm text-gray-500'>
            <span>Shipping</span>
            <span>
              {order.shipping_total > 0
                ? fmt(order.shipping_total, currency)
                : 'Free'}
            </span>
          </div>
          {order.tax_total > 0 && (
            <div className='flex justify-between text-sm text-gray-500'>
              <span>Tax</span>
              <span>{fmt(order.tax_total, currency)}</span>
            </div>
          )}
          <div className='flex justify-between text-base font-bold text-[#1e2a6e] pt-2 border-t-2 border-[#1e2a6e]'>
            <span>Total</span>
            <span>{fmt(order.total ?? 0, currency)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.metadata?.notes && (
          <div className='mt-8 p-4 bg-gray-50 rounded border border-gray-200'>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1'>
              Order Notes
            </p>
            <p className='text-sm text-gray-700'>{order.metadata.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className='mt-10 pt-6 border-t border-gray-200 text-center'>
          <p className='text-sm font-semibold text-[#1e2a6e]'>
            Thank you for shopping with
          </p>
          <p className='text-sm font-semibold text-[#1e2a6e]'>
            SmashRocker Pro Ltd
          </p>
          <p className='text-xs text-gray-400 mt-3'>
            Questions? {CONTACT_EMAIL.toLowerCase()}
          </p>
          <p className='text-xs text-gray-400 mt-6'>
            Smash Racket Pro, {STORE_ADDRESS_LINE1},
            <br />
            {STORE_ADDRESS_LINE2}
          </p>
        </div>
      </div>
    </>
  )
}
