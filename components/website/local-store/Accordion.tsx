'use client';
import { useState } from 'react';
export type AccordionItem = {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
};
export default function Accordion({
  items,
  defaultOpenId = null,
  icon = 'plus',
  containerClassName = '',
  rowClassName = '',
  triggerClassName = '',
  contentWrapClassName = '',
  contentClassName = '',
  iconWrapClassName = ''
}: {
  items: AccordionItem[];
  defaultOpenId?: string | null;
  icon?: 'plus' | 'chevron';
  containerClassName?: string;
  rowClassName?: string;
  triggerClassName?: string;
  contentWrapClassName?: string;
  contentClassName?: string;
  iconWrapClassName?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);
  return <div className={containerClassName}>
      {items.map(item => {
      const isOpen = openId === item.id;
      return <div key={item.id} className={rowClassName}>
            <button type='button' onClick={() => setOpenId(isOpen ? null : item.id)} aria-expanded={isOpen} className={`w-full flex items-center justify-between gap-4 text-left cursor-pointer ${triggerClassName}`}>
              {item.title}
              <span className={`shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#E8553A] text-base font-bold leading-none transition-transform duration-300 ${icon === 'plus' ? isOpen ? 'rotate-45' : '' : isOpen ? 'rotate-180' : ''} ${iconWrapClassName}`}>
                {icon === 'plus' ? '+' : '▾'}
              </span>
            </button>
            <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} ${contentWrapClassName}`}>
              <div className='overflow-hidden'>
                <div className={contentClassName}>{item.content}</div>
              </div>
            </div>
          </div>;
    })}
    </div>;
}
