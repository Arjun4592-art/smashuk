'use client'

import { useState } from 'react'

type Brand = {
  brand: string
  items: string[]
}

export default function DemoBrandAccordion({ brands }: { brands: Brand[] }) {
  const [openBrand, setOpenBrand] = useState<string | null>(
    brands[0]?.brand ?? null,
  )

  return (
    <div className='divide-y divide-gray-100 border-t border-gray-100'>
      {brands.map((b) => {
        const isOpen = openBrand === b.brand
        return (
          <div key={b.brand} className='py-3'>
            <button
              type='button'
              onClick={() => setOpenBrand(isOpen ? null : b.brand)}
              className='w-full font-montserrat font-semibold text-xs text-[#0A1F44] cursor-pointer flex items-center justify-between gap-4'
            >
              {b.brand}
              <span
                className={`text-[#E8553A] transition-transform text-base leading-none ${
                  isOpen ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <ul className='mt-2 space-y-1'>
                {b.items.map((item) => (
                  <li
                    key={item}
                    className='text-xs text-gray-500 font-lato leading-relaxed'
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
