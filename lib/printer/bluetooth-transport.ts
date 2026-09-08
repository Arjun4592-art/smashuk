// Web Bluetooth transport for BLE thermal receipt printers.
//
// IMPORTANT CAVEAT: most cheap "Bluetooth" receipt printers actually use
// classic Bluetooth SPP (serial port profile), not Bluetooth Low Energy.
// Web Bluetooth only speaks BLE — it cannot connect to SPP-only printers.
// If your printer doesn't show up in the pairing dialog, it's almost
// certainly SPP-only; use the USB or Network connection instead, or use
// it as a normal OS-paired printer via the browser's Print dialog.

const PRINTER_SERVICE_CANDIDATES = [
  // Common write service/characteristic UUIDs seen on BLE ESC/POS printers.
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
]
const PRINTER_CHARACTERISTIC_CANDIDATES = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
]

export class BluetoothPrinterNotSupportedError extends Error {
  constructor() {
    super(
      'Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop or Android.',
    )
    this.name = 'BluetoothPrinterNotSupportedError'
  }
}

function assertSupported() {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    throw new BluetoothPrinterNotSupportedError()
  }
}

export interface BTPrinterHandle {
  id: string
  name?: string
}

let cachedDevice: BluetoothDevice | null = null
let cachedChar: BluetoothRemoteGATTCharacteristic | null = null

// Must be called from a user gesture (click).
export async function requestBluetoothPrinter(): Promise<BTPrinterHandle> {
  assertSupported()
  const device = await navigator.bluetooth.requestDevice({
    filters: PRINTER_SERVICE_CANDIDATES.map((s) => ({ services: [s] })),
    optionalServices: PRINTER_SERVICE_CANDIDATES,
  })
  cachedDevice = device
  return { id: device.id, name: device.name }
}

async function resolveCharacteristic(
  device: BluetoothDevice,
): Promise<BluetoothRemoteGATTCharacteristic> {
  if (!device.gatt) {
    throw new Error('This device does not support GATT connections.')
  }
  const server = device.gatt.connected
    ? device.gatt
    : await device.gatt.connect()

  let lastErr: unknown
  for (let i = 0; i < PRINTER_SERVICE_CANDIDATES.length; i++) {
    try {
      const service = await server.getPrimaryService(
        PRINTER_SERVICE_CANDIDATES[i],
      )
      const char = await service.getCharacteristic(
        PRINTER_CHARACTERISTIC_CANDIDATES[i],
      )
      return char
    } catch (err) {
      lastErr = err
    }
  }
  throw new Error(
    `Could not find a print service on this device. It may not be a supported ESC/POS BLE printer. (${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    })`,
  )
}

export async function printViaBluetooth(
  handle: BTPrinterHandle,
  data: Uint8Array,
): Promise<void> {
  assertSupported()
  if (!cachedDevice || cachedDevice.id !== handle.id) {
    throw new Error(
      'Bluetooth printer needs to be reconnected — tap "Connect" in Settings → Printer (browser permission does not persist across restarts).',
    )
  }
  if (!cachedChar) {
    cachedChar = await resolveCharacteristic(cachedDevice)
  }
  // BLE has a small MTU (~20 bytes default, up to ~512 negotiated); chunk
  // conservatively so we don't overflow on printers that don't negotiate up.
  const CHUNK = 180
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    if (cachedChar.writeValueWithoutResponse) {
      await cachedChar.writeValueWithoutResponse(chunk)
    } else {
      await cachedChar.writeValue(chunk)
    }
    // Small delay avoids overwhelming the printer's BLE buffer.
    await new Promise((r) => setTimeout(r, 15))
  }
}

export function disconnectBluetoothPrinter() {
  if (cachedDevice?.gatt?.connected) {
    cachedDevice.gatt.disconnect()
  }
  cachedDevice = null
  cachedChar = null
}
