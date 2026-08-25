'use client';

import { useState } from 'react';
import { CloseIcon } from '@/components/ui/Icons';
interface Props {
  onClose: () => void;
  initialTab?: 'shoes' | 'apparel';
}
const SHOE_SIZES = [{
  uk: '4',
  eu: '37',
  us_m: '5',
  us_w: '6.5',
  cm: '23'
}, {
  uk: '5',
  eu: '38',
  us_m: '6',
  us_w: '7.5',
  cm: '24'
}, {
  uk: '6',
  eu: '39.5',
  us_m: '7',
  us_w: '8.5',
  cm: '25'
}, {
  uk: '7',
  eu: '41',
  us_m: '8',
  us_w: '9.5',
  cm: '26'
}, {
  uk: '8',
  eu: '42',
  us_m: '9',
  us_w: '10.5',
  cm: '27'
}, {
  uk: '9',
  eu: '43.5',
  us_m: '10',
  us_w: '11.5',
  cm: '28'
}, {
  uk: '10',
  eu: '44.5',
  us_m: '11',
  us_w: '12.5',
  cm: '29'
}, {
  uk: '11',
  eu: '46',
  us_m: '12',
  us_w: '13.5',
  cm: '30'
}, {
  uk: '12',
  eu: '47',
  us_m: '13',
  us_w: '14.5',
  cm: '31'
}];
const APPAREL_SIZES = [{
  size: 'XS',
  chest: '81-86',
  waist: '66-71'
}, {
  size: 'S',
  chest: '86-91',
  waist: '71-76'
}, {
  size: 'M',
  chest: '91-97',
  waist: '76-82'
}, {
  size: 'L',
  chest: '97-104',
  waist: '82-89'
}, {
  size: 'XL',
  chest: '104-112',
  waist: '89-97'
}, {
  size: 'XXL',
  chest: '112-120',
  waist: '97-105'
}];
export default function SizeGuideModal({
  onClose,
  initialTab = 'shoes'
}: Props) {
  const [tab, setTab] = useState<'shoes' | 'apparel'>(initialTab);
  return <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm' onClick={onClose}>
      <div className='bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
        <div className='flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10'>
          <h2 className='font-montserrat font-black text-lg text-[#0A1F44]'>
            Size Guide
          </h2>
          <button onClick={onClose} aria-label='Close' className='w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#0A1F44] transition-colors'>
            <CloseIcon size={16} />
          </button>
        </div>

        {}
        <div className='flex gap-2 px-6 pt-5'>
          {(['shoes', 'apparel'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-xs font-montserrat font-bold capitalize transition-colors ${tab === t ? 'bg-[#E8553A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {t}
            </button>)}
        </div>

        <div className='px-6 pb-6 pt-4'>
          {tab === 'shoes' ? <>
              <p className='text-xs text-gray-500 font-lato mb-3'>
                Measurements are approximate — if you&apos;re between sizes, we
                recommend sizing up.
              </p>
              <div className='overflow-x-auto'>
                <table className='w-full text-xs font-lato text-center border-collapse'>
                  <thead>
                    <tr className='bg-gray-50 text-[#0A1F44] font-montserrat font-bold'>
                      <th className='py-2 px-2 rounded-l-lg'>UK</th>
                      <th className='py-2 px-2'>EU</th>
                      <th className='py-2 px-2'>US (M)</th>
                      <th className='py-2 px-2'>US (W)</th>
                      <th className='py-2 px-2 rounded-r-lg'>Foot (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOE_SIZES.map(row => <tr key={row.uk} className='border-b border-gray-100 text-gray-600'>
                        <td className='py-2 px-2 font-semibold text-[#0A1F44]'>{row.uk}</td>
                        <td className='py-2 px-2'>{row.eu}</td>
                        <td className='py-2 px-2'>{row.us_m}</td>
                        <td className='py-2 px-2'>{row.us_w}</td>
                        <td className='py-2 px-2'>{row.cm}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </> : <>
              <p className='text-xs text-gray-500 font-lato mb-3'>
                Chest and waist measurements in centimetres — measure at the
                fullest/narrowest point.
              </p>
              <div className='overflow-x-auto'>
                <table className='w-full text-xs font-lato text-center border-collapse'>
                  <thead>
                    <tr className='bg-gray-50 text-[#0A1F44] font-montserrat font-bold'>
                      <th className='py-2 px-2 rounded-l-lg'>Size</th>
                      <th className='py-2 px-2'>Chest (cm)</th>
                      <th className='py-2 px-2 rounded-r-lg'>Waist (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {APPAREL_SIZES.map(row => <tr key={row.size} className='border-b border-gray-100 text-gray-600'>
                        <td className='py-2 px-2 font-semibold text-[#0A1F44]'>{row.size}</td>
                        <td className='py-2 px-2'>{row.chest}</td>
                        <td className='py-2 px-2'>{row.waist}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </>}
        </div>
      </div>
    </div>;
}
