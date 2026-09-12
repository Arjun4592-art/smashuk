import { usePrinterStore } from '@/store/printerStore'
import {
  buildReceiptEscPos,
  buildTestPrintEscPos,
  type ReceiptData,
} from './escpos'
import { printViaUSB, isUSBPrinterAvailable } from './usb-transport'
import { printViaBluetooth } from './bluetooth-transport'
import { printViaNetwork } from './network-transport'
import { printTestPageViaBrowser } from './browser-print'
import { printViaSerial, isSerialPrinterAvailable } from './serial-transport'
import { printViaLanAgent } from './lan-agent-transport'
import {
  printViaPassPRNT,
  printTestPageViaPassPRNT,
} from './passprnt-transport'

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
  const {
    connectionType,
    usbHandle,
    btHandle,
    networkHandle,
    serialHandle,
    lanAgentHandle,
  } = usePrinterStore.getState()

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
    case 'serial': {
      if (!serialHandle) throw new NoPrinterConnectedError()
      const available = await isSerialPrinterAvailable(serialHandle)
      if (!available) {
        throw new Error(
          'Serial printer not detected. Check the pairing, or reconnect it in Settings → Printer.',
        )
      }
      await printViaSerial(serialHandle, bytes)
      return
    }
    case 'lan-agent': {
      if (!lanAgentHandle) throw new NoPrinterConnectedError()
      await printViaLanAgent(lanAgentHandle, bytes)
      return
    }
    default:
      throw new NoPrinterConnectedError()
  }
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const { connectionType, paperWidth, openDrawerOnPrint } =
    usePrinterStore.getState()
  // Star PassPRNT (Android) doesn't take raw ESC/POS bytes either — it
  // takes an HTML layout via its own URL scheme, and the printer/paper
  // profile is configured inside the PassPRNT app itself rather than sent
  // per print. Handled separately here, same reasoning as 'browser' below.
  if (connectionType === 'star-passprnt') {
    await printViaPassPRNT(data, paperWidth)
    return
  }
  const bytes = await buildReceiptEscPos(data, paperWidth, openDrawerOnPrint)
  await sendToConfiguredPrinter(bytes)
}

export async function printTestPage(): Promise<void> {
  const { connectionType, paperWidth } = usePrinterStore.getState()
  // Browser/OS printing doesn't take raw ESC/POS bytes — it prints an HTML
  // page through window.print(), so it's handled separately here rather
  // than in sendToConfiguredPrinter (which only ever sees Uint8Array).
  if (connectionType === 'browser') {
    await printTestPageViaBrowser(paperWidth)
    return
  }
  if (connectionType === 'star-passprnt') {
    await printTestPageViaPassPRNT(paperWidth)
    return
  }
  const bytes = await buildTestPrintEscPos(paperWidth)
  await sendToConfiguredPrinter(bytes)
}
