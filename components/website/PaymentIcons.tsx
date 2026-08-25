interface PaymentMethod {
  name: string;
  render: () => React.ReactNode;
}
function Badge({
  bg,
  children
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return <div className='w-11 h-7 rounded-md flex items-center justify-center shrink-0' style={{
    background: bg
  }}>
      {children}
    </div>;
}
export const PAYMENT_METHODS: PaymentMethod[] = [{
  name: 'Visa',
  render: () => <Badge bg='#ffffff'>
        <span className='italic font-black text-[11px] tracking-tight' style={{
      color: '#1A1F71'
    }}>
          VISA
        </span>
      </Badge>
}, {
  name: 'Mastercard',
  render: () => <Badge bg='#ffffff'>
        <svg width='26' height='16' viewBox='0 0 26 16'>
          <circle cx='9' cy='8' r='8' fill='#EB001B' />
          <circle cx='17' cy='8' r='8' fill='#F79E1B' />
          <path d='M13 2.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6Z' fill='#FF5F00' />
        </svg>
      </Badge>
}, {
  name: 'Amex',
  render: () => <Badge bg='#006FCF'>
        <span className='font-black text-[8.5px] tracking-wide text-white leading-none text-center'>
          AMEX
        </span>
      </Badge>
}, {
  name: 'Apple Pay',
  render: () => <Badge bg='#000000'>
        <span className='flex items-center gap-0.5 text-white'>
          <svg width='11' height='13' viewBox='0 0 384 512' fill='currentColor'>
            <path d='M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z' />
          </svg>
          <span className='font-semibold text-[10px] leading-none'>Pay</span>
        </span>
      </Badge>
}, {
  name: 'Google Pay',
  render: () => <Badge bg='#ffffff'>
        <span className='flex items-center gap-[1px]'>
          <svg width='11' height='11' viewBox='0 0 48 48'>
            <path fill='#4285F4' d='M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.8 6.1C12.2 13.1 17.6 9.5 24 9.5z' />
            <path fill='#34A853' d='M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.8 6.8-17.4z' />
            <path fill='#FBBC05' d='M10.3 19.3c-.5 1.5-.8 3-.8 4.7s.3 3.2.8 4.7l-7.8 6c-1.6-3.2-2.5-6.8-2.5-10.7s.9-7.5 2.5-10.7l7.8 6z' />
            <path fill='#EA4335' d='M24 48c6.2 0 11.4-2 15.2-5.6l-7.3-5.7c-2 1.4-4.6 2.2-7.9 2.2-6.4 0-11.8-4.3-13.7-10.1l-7.8 6C6.5 42.6 14.6 48 24 48z' />
          </svg>
          <span className='text-[9px] font-semibold text-[#5F6368] leading-none'>
            Pay
          </span>
        </span>
      </Badge>
}, {
  name: 'Maestro',
  render: () => <Badge bg='#ffffff'>
        <svg width='26' height='16' viewBox='0 0 26 16'>
          <circle cx='9' cy='8' r='8' fill='#0099DF' />
          <circle cx='17' cy='8' r='8' fill='#ED0006' />
          <path d='M13 2.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6Z' fill='#6C6BBD' />
        </svg>
      </Badge>
}];
