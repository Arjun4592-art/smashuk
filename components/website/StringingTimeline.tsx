import type { ReactNode } from 'react'

type TimelineStep = {
  step: string
  title: string
  desc: string
  icon?: ReactNode
}

type StringingTimelineProps = {
  steps: TimelineStep[]
}

export default function StringingTimeline({ steps }: StringingTimelineProps) {
  return (
    <div className='relative'>
      {/* Connecting line (desktop only) */}
      <div className='hidden md:block absolute top-8 left-0 right-0 h-px bg-gray-200' />

      <div className='grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4'>
        {steps.map((s) => (
          <div key={s.step} className='relative flex flex-col items-center text-center'>
            <div className='relative z-10 w-16 h-16 rounded-full bg-white border-2 border-[#E8553A] flex items-center justify-center text-[#E8553A] mb-4'>
              {s.icon ?? (
                <span className='font-montserrat font-black text-lg'>{s.step}</span>
              )}
            </div>
            <span className='text-xs font-montserrat font-bold text-[#E8553A] tracking-widest uppercase mb-1'>
              Step {s.step}
            </span>
            <h3 className='font-montserrat font-bold text-sm text-[#0A1F44] mb-2'>
              {s.title}
            </h3>
            <p className='text-xs text-gray-500 font-lato leading-relaxed max-w-[200px]'>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
