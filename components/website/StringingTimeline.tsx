'use client';

import { useEffect, useRef, useState } from 'react';
interface Step {
  step: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}
interface Props {
  steps: Step[];
}
export default function StringingTimeline({
  steps
}: Props) {
  const [activeStep, setActiveStep] = useState(-1);
  const [lineWidth, setLineWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        let w = 0;
        const lineInterval = setInterval(() => {
          w += 2;
          setLineWidth(w);
          if (w >= 100) clearInterval(lineInterval);
        }, 12);
        steps.forEach((_, i) => {
          setTimeout(() => setActiveStep(i), 200 + i * 220);
        });
        observer.disconnect();
      }
    }, {
      threshold: 0.3
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [steps]);
  return <div ref={containerRef}>
      {}
      <div className='hidden md:block'>
        <div className='relative'>
          {}
          <div className='absolute top-8 left-[9%] right-[9%] h-px bg-gray-100' />
          {}
          <div className='absolute top-8 left-[9%] h-px bg-gradient-to-r from-[#E8553A] to-[#FFC453] transition-none' style={{
          width: `${lineWidth / 100 * 82}%`
        }} />

          <div className='grid grid-cols-5 gap-3 relative'>
            {steps.map((p, i) => <div key={p.step} className='flex flex-col items-center text-center' style={{
            opacity: activeStep >= i ? 1 : 0,
            transform: activeStep >= i ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease'
          }}>
                {}
                <div className={`relative z-10 mb-5 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${activeStep >= i ? 'bg-white border-2 border-[#E8553A] shadow-[0_0_0_6px_rgba(232,85,58,0.08),0_8px_24px_rgba(232,85,58,0.2)]' : 'bg-white border-2 border-gray-100'}`}>
                  <span className='text-xl'>{p.icon}</span>
                  <span className='font-montserrat font-black text-[9px] text-[#E8553A] tracking-widest leading-none mt-0.5'>
                    {p.step}
                  </span>
                </div>

                {}
                <div className={`rounded-xl border p-4 w-full transition-all duration-500 ${activeStep >= i ? 'bg-white border-[#E8553A]/20 shadow-[0_8px_24px_rgba(232,85,58,0.08)]' : 'bg-[#F8F9FB] border-gray-100'}`}>
                  <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
                    {p.title}
                  </h3>
                  <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                    {p.desc}
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </div>

      {}
      <div className='md:hidden space-y-4 relative'>
        {}
        <div className='absolute left-7 top-0 bottom-0 w-px bg-gray-100' />
        {}
        <div className='absolute left-7 top-0 w-px bg-gradient-to-b from-[#E8553A] to-[#FFC453] transition-none' style={{
        height: `${lineWidth}%`
      }} />

        {steps.map((p, i) => <div key={p.step} className='flex gap-5 items-start pl-2' style={{
        opacity: activeStep >= i ? 1 : 0,
        transform: activeStep >= i ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease'
      }}>
            <div className={`shrink-0 z-10 w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${activeStep >= i ? 'bg-white border-2 border-[#E8553A] shadow-[0_0_0_4px_rgba(232,85,58,0.08)]' : 'bg-white border-2 border-gray-200'}`}>
              <span className='text-base'>{p.icon}</span>
              <span className='font-montserrat font-black text-[8px] text-[#E8553A] tracking-widest leading-none'>
                {p.step}
              </span>
            </div>
            <div className={`rounded-xl border p-4 flex-1 mt-1 transition-all duration-500 ${activeStep >= i ? 'bg-white border-[#E8553A]/20 shadow-[0_4px_12px_rgba(232,85,58,0.06)]' : 'bg-[#F8F9FB] border-gray-100'}`}>
              <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-1'>
                {p.title}
              </h3>
              <p className='text-xs text-gray-500 font-lato leading-relaxed'>
                {p.desc}
              </p>
            </div>
          </div>)}
      </div>
    </div>;
}
