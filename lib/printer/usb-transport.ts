// WebUSB transport for USB thermal receipt printers.
// Works in Chrome/Edge on desktop over HTTPS (or http://localhost). Most
// ESC/POS USB printers expose a vendor-specific bulk OUT endpoint — this
// finds it generically instead of hardcoding one vendor's printer.

export class USBPrinterNotSupportedError extends Error {
  constructor() {
    super(
      'WebUSB is not supported in this browser. Use Chrome or Edge on desktop.',
    )
    this.name = 'USBPrinterNotSupportedError'
  }
}

function assertSupported() {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    throw new USBPrinterNotSupportedError()
  }
}

async function findOutEndpoint(device: USBDevice): Promise<{
  configurationValue: number
  interfaceNumber: number
  endpointNumber: number
}> {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        // Printers are typically class 7 (Printer), but some vendors use
        // vendor-specific (0xFF). Accept any interface with a bulk OUT.
        const out = alt.endpoints.find(
          (e) => e.direction === 'out' && e.type === 'bulk',
        )
        if (out) {
          return {
            configurationValue: config.configurationValue,
            interfaceNumber: iface.interfaceNumber,
            endpointNumber: out.endpointNumber,
          }
        }
      }
    }
  }
  throw new Error(
    'Could not find a USB bulk output endpoint on this device — it may not be a supported printer.',
  )
}

export interface USBPrinterHandle {
  vendorId: number
  productId: number
  productName?: string
}

// Prompts the OS device picker. Must be called from a user gesture (click).
export async function requestUSBPrinter(): Promise<USBPrinterHandle> {
  assertSupported()
  const device = await navigator.usb.requestDevice({
    filters: [
      { classCode: 7 }, // USB Printer class
      // Fallback: Star Micronics printers (incl. TSP100 series) often
      // enumerate as vendor-specific class rather than printer class, so
      // match on vendor ID too or they won't appear in the picker at all.
      { vendorId: 0x0519 },
    ],
  })
  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
  }
}

// Reconnects to a previously-granted device without prompting the user,
// as long as the browser still remembers the permission grant.
async function getGrantedDevice(
  handle: USBPrinterHandle,
): Promise<USBDevice | null> {
  assertSupported()
  const devices = await navigator.usb.getDevices()
  return (
    devices.find(
      (d) => d.vendorId === handle.vendorId && d.productId === handle.productId,
    ) ?? null
  )
}

export async function isUSBPrinterAvailable(
  handle: USBPrinterHandle,
): Promise<boolean> {
  try {
    return (await getGrantedDevice(handle)) !== null
  } catch {
    return false
  }
}

export async function printViaUSB(
  handle: USBPrinterHandle,
  data: Uint8Array,
): Promise<void> {
  assertSupported()
  const device = await getGrantedDevice(handle)
  if (!device) {
    throw new Error(
      'Printer permission was lost. Reconnect it from Settings → Printer.',
    )
  }
  await device.open()
  try {
    const { configurationValue, interfaceNumber, endpointNumber } =
      await findOutEndpoint(device)
    if (device.configuration?.configurationValue !== configurationValue) {
      await device.selectConfiguration(configurationValue)
    }
    await device.claimInterface(interfaceNumber)
    try {
      // WebUSB has a payload cap per transfer on some platforms; chunk to be safe.
      const CHUNK = 4096
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK)
        const res = await device.transferOut(endpointNumber, chunk)
        if (res.status !== 'ok') {
          throw new Error(`USB transfer failed: ${res.status}`)
        }
      }
    } finally {
      await device.releaseInterface(interfaceNumber)
    }
  } finally {
    await device.close()
  }
}
