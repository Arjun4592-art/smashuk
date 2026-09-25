'use client'

import { useEffect, useState } from 'react'
import { usePrinterStore } from '@/store/printerStore'
import { LABEL_PRESETS } from '@/lib/printer/label-print'

// Shared by POS → Settings → Printer and the dashboard "Label size" dialog.
// Both read/write the same persisted printer store, so the size is set once
// per device/browser.

const near = (a: number, b: number) => Math.abs(a - b) < 0.06

export default function LabelSizePicker() {
  const labelWidthMm = usePrinterStore((s) => s.labelWidthMm)
  const labelHeightMm = usePrinterStore((s) => s.labelHeightMm)
  const setLabelSize = usePrinterStore((s) => s.setLabelSize)

  const continuous = labelHeightMm <= 0
  const activePreset = continuous
    ? undefined
    : LABEL_PRESETS.find(
        (p) => near(p.widthMm, labelWidthMm) && near(p.heightMm, labelHeightMm),
      )

  const [w, setW] = useState(String(labelWidthMm))
  const [h, setH] = useState(String(labelHeightMm > 0 ? labelHeightMm : ''))

  // Keep the custom boxes in sync when a preset is tapped — but leave what
  // the person is typing alone (e.g. "101." while editing).
  useEffect(() => {
    const r = (n: number) => String(Math.round(n * 10) / 10)
    setW((cur) => (near(parseFloat(cur), labelWidthMm) ? cur : r(labelWidthMm)))
    setH((cur) =>
      labelHeightMm <= 0
        ? ''
        : near(parseFloat(cur), labelHeightMm)
          ? cur
          : r(labelHeightMm),
    )
  }, [labelWidthMm, labelHeightMm])

  const commit = (nextW: string, nextH: string, cont: boolean) => {
    const wn = parseFloat(nextW)
    const hn = cont ? 0 : parseFloat(nextH)
    if (!(wn >= 20 && wn <= 300)) return
    if (!cont && !(hn >= 10 && hn <= 500)) return
    setLabelSize(wn, hn)
  }

  const chip = (active: boolean) =>
    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ' +
    (active
      ? 'bg-[#008060] text-white border-[#008060]'
      : 'bg-white text-gray-600 border-gray-200 hover:border-[#008060]')

  const input =
    'w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#008060] disabled:bg-gray-50 disabled:text-gray-400'

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        {LABEL_PRESETS.map((p) => (
          <button
            key={p.id}
            type='button'
            onClick={() => setLabelSize(p.widthMm, p.heightMm)}
            className={chip(activePreset?.id === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className='flex flex-wrap items-end gap-3'>
        <label className='text-[11px] font-medium uppercase tracking-wide text-gray-500'>
          Width (mm)
          <input
            inputMode='decimal'
            value={w}
            onChange={(e) => {
              setW(e.target.value)
              commit(e.target.value, h, continuous)
            }}
            className={`${input} block mt-1 normal-case`}
          />
        </label>
        <label className='text-[11px] font-medium uppercase tracking-wide text-gray-500'>
          Height (mm)
          <input
            inputMode='decimal'
            value={h}
            disabled={continuous}
            onChange={(e) => {
              setH(e.target.value)
              commit(w, e.target.value, false)
            }}
            className={`${input} block mt-1 normal-case`}
          />
        </label>
        <label className='flex items-center gap-2 text-xs text-gray-600 pb-2'>
          <input
            type='checkbox'
            checked={continuous}
            onChange={(e) => {
              if (e.target.checked) commit(w, h, true)
              else commit(w, h || '50.8', false)
            }}
          />
          Continuous roll (auto height)
        </label>
      </div>

      <p className='text-[11px] text-gray-400 leading-snug'>
        In the print dialog: pick your label printer, set the paper size to the
        same label, Margins → None/Default, Scale → 100%, and turn OFF
        &ldquo;Headers and footers&rdquo;. Receipts longer than one label
        continue on the next label.
      </p>
    </div>
  )
}
