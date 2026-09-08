import { usePrinterStore } from '@/store/printerStore'
import {
  buildReceiptEscPos,
  buildTestPrintEscPos,
  type ReceiptData,
} from './escpos'
import { printViaUSB, isUSBPrinterAvailable } from './usb-transport'
import { printViaBluetooth } from './bluetooth-transport'
import { printViaNetwork } from './network-transport'

export class NoPrinterConnectedError extends Error {
  constructor() {
    super('No receipt printer connected. Falling back to browser print.')
    this.name = 'NoPrinterConnectedError'
  }
}

// Sends the given ESC/POS bytes to whichever printer is configured in the
// store. Throws NoPrinterConnectedError if nothing is set up (caller should
// fall back to window.print() in that case), or the transport's own error
// (with a human-readable message) if the configured printer can't be reached.
async function sendToConfiguredPrinter(bytes: Uint8Array): Promise<void> {
  const { connectionType, usbHandle, btHandle, networkHandle } =
    usePrinterStore.getState()

  switch (connectionType) {
    case 'usb': {
      if (!usbHandle) throw new NoPrinterConnectedError()
      const available = await isUSBPrinterAvailable(usbHandle)
      if (!available) {
        throw new Error(
          'USB printer not detected. Check the cable, or reconnect it in Settings → Printer.',
        )
      }
      await printViaUSB(usbHandle, bytes)
      return
    }
    case 'bluetooth': {
      if (!btHandle) throw new NoPrinterConnectedError()
      await printViaBluetooth(btHandle, bytes)
      return
    }
    case 'network': {
      if (!networkHandle) throw new NoPrinterConnectedError()
      await printViaNetwork(networkHandle, bytes)
      return
    }
    default:
      throw new NoPrinterConnectedError()
  }
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const { paperWidth, openDrawerOnPrint } = usePrinterStore.getState()
  const bytes = buildReceiptEscPos(data, paperWidth, openDrawerOnPrint)
  await sendToConfiguredPrinter(bytes)
}

export async function printTestPage(): Promise<void> {
  const { paperWidth } = usePrinterStore.getState()
  const bytes = buildTestPrintEscPos(paperWidth)
  await sendToConfiguredPrinter(bytes)
}
