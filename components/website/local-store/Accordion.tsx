'use client'

import { useState, type ReactNode } from 'react'

type AccordionItem = {
  id: string
  title: string
  content: ReactNode
}

type AccordionProps = {
  items: AccordionItem[]
  defaultOpenId?: string
  containerClassName?: string
  rowClassName?: string
  triggerClassName?: string
  contentClassName?: string
  icon?: 'chevron' | 'plus'
  iconWrapClassName?: string
}

export default function Accordion({
  items,
  defaultOpenId,
  containerClassName = '',
  rowClassName = '',
  triggerClassName = '',
  contentClassName = '',
  icon = 'plus',
  iconWrapClassName = '',
}: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null)

  return (
    <div className={containerClassName}>
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className={rowClassName}>
            <button
              type='button'
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className={`w-full cursor-pointer flex items-center justify-between gap-4 text-left ${triggerClassName}`}
            >
              <span>{item.title}</span>
              {icon === 'chevron' ? (
                <span
                  className={`shrink-0 inline-flex items-center justify-center rounded-full border border-gray-200 text-[#E8553A] transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  } ${iconWrapClassName}`}
                >
                  ▾
                </span>
              ) : (
                <span
                  className={`shrink-0 text-[#E8553A] transition-transform text-lg leading-none ${
                    isOpen ? 'rotate-45' : ''
                  } ${iconWrapClassName}`}
                >
                  +
                </span>
              )}
            </button>
            {isOpen && <div className={contentClassName}>{item.content}</div>}
          </div>
        )
      })}
    </div>
  )
}
