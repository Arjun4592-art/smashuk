import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PaperWidth } from '@/lib/printer/escpos'
import type { USBPrinterHandle } from '@/lib/printer/usb-transport'
import type { BTPrinterHandle } from '@/lib/printer/bluetooth-transport'
import type { NetworkPrinterHandle } from '@/lib/printer/network-transport'
import type { SerialPrinterHandle } from '@/lib/printer/serial-transport'
import type { LanAgentHandle } from '@/lib/printer/lan-agent-transport'

export type PrinterConnectionType =
  | 'none'
  | 'usb'
  | 'bluetooth'
  | 'network'
  | 'browser'
  | 'serial'
  | 'lan-agent'
  | 'star-passprnt'
  // Label printer (Zebra / TSC / Xprinter / Brother etc.) reached through the
  // OS print dialog / driver — receipts are printed as HTML sized to the
  // label via @page. See lib/printer/label-print.ts.
  | 'label'

interface PrinterState {
  connectionType: PrinterConnectionType
  paperWidth: PaperWidth
  usbHandle: USBPrinterHandle | null
  btHandle: BTPrinterHandle | null
  networkHandle: NetworkPrinterHandle | null
  serialHandle: SerialPrinterHandle | null
  lanAgentHandle: LanAgentHandle | null
  openDrawerOnPrint: boolean
  // Label size in millimetres. labelHeightMm = 0 means "continuous roll" —
  // the page height is measured from the content at print time.
  labelWidthMm: number
  labelHeightMm: number
  setConnectionType: (t: PrinterConnectionType) => void
  setPaperWidth: (w: PaperWidth) => void
  setUSBHandle: (h: USBPrinterHandle | null) => void
  setBTHandle: (h: BTPrinterHandle | null) => void
  setNetworkHandle: (h: NetworkPrinterHandle | null) => void
  setSerialHandle: (h: SerialPrinterHandle | null) => void
  setLanAgentHandle: (h: LanAgentHandle | null) => void
  setOpenDrawerOnPrint: (v: boolean) => void
  setLabelSize: (widthMm: number, heightMm: number) => void
  disconnect: () => void
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      // Default to the label printer: the physical roll loaded (Double
      // Dragon 102×51mm / 4×2in die-cut labels — same size as the
      // "Smash String Recorder" ticket reference) is fed through the
      // TSP100IIIBI's OS print dialog, sized via @page — see
      // lib/printer/label-print.ts. labelWidthMm/labelHeightMm below
      // already match this roll exactly.
      connectionType: 'label',
      paperWidth: '80mm',
      usbHandle: null,
      btHandle: null,
      networkHandle: null,
      serialHandle: null,
      lanAgentHandle: null,
      openDrawerOnPrint: false,
      labelWidthMm: 101.6, // 4in
      labelHeightMm: 50.8, // 2in
      setConnectionType: (t) => set({ connectionType: t }),
      setPaperWidth: (w) => set({ paperWidth: w }),
      setUSBHandle: (h) => set({ usbHandle: h }),
      setBTHandle: (h) => set({ btHandle: h }),
      setNetworkHandle: (h) => set({ networkHandle: h }),
      setSerialHandle: (h) => set({ serialHandle: h }),
      setLanAgentHandle: (h) => set({ lanAgentHandle: h }),
      setOpenDrawerOnPrint: (v) => set({ openDrawerOnPrint: v }),
      setLabelSize: (widthMm, heightMm) =>
        set({ labelWidthMm: widthMm, labelHeightMm: heightMm }),
      disconnect: () =>
        set({
          connectionType: 'none',
          usbHandle: null,
          btHandle: null,
          networkHandle: null,
          serialHandle: null,
          lanAgentHandle: null,
        }),
    }),
    { name: 'pos-printer-settings' },
  ),
)
