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

interface PrinterState {
  connectionType: PrinterConnectionType
  paperWidth: PaperWidth
  usbHandle: USBPrinterHandle | null
  btHandle: BTPrinterHandle | null
  networkHandle: NetworkPrinterHandle | null
  serialHandle: SerialPrinterHandle | null
  lanAgentHandle: LanAgentHandle | null
  openDrawerOnPrint: boolean
  setConnectionType: (t: PrinterConnectionType) => void
  setPaperWidth: (w: PaperWidth) => void
  setUSBHandle: (h: USBPrinterHandle | null) => void
  setBTHandle: (h: BTPrinterHandle | null) => void
  setNetworkHandle: (h: NetworkPrinterHandle | null) => void
  setSerialHandle: (h: SerialPrinterHandle | null) => void
  setLanAgentHandle: (h: LanAgentHandle | null) => void
  setOpenDrawerOnPrint: (v: boolean) => void
  disconnect: () => void
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      connectionType: 'none',
      paperWidth: '80mm',
      usbHandle: null,
      btHandle: null,
      networkHandle: null,
      serialHandle: null,
      lanAgentHandle: null,
      openDrawerOnPrint: false,
      setConnectionType: (t) => set({ connectionType: t }),
      setPaperWidth: (w) => set({ paperWidth: w }),
      setUSBHandle: (h) => set({ usbHandle: h }),
      setBTHandle: (h) => set({ btHandle: h }),
      setNetworkHandle: (h) => set({ networkHandle: h }),
      setSerialHandle: (h) => set({ serialHandle: h }),
      setLanAgentHandle: (h) => set({ lanAgentHandle: h }),
      setOpenDrawerOnPrint: (v) => set({ openDrawerOnPrint: v }),
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
