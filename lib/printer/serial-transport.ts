const DEFAULT_BAUD_RATE = 9600

export class SerialPrinterNotSupportedError extends Error {
  constructor() {
    super(
      'Web Serial is not supported in this browser. Use Chrome or Edge on Windows, macOS, or Linux.',
    )
    this.name = 'SerialPrinterNotSupportedError'
  }
}

function assertSupported() {
  if (typeof navigator === 'undefined' || !('serial' in navigator)) {
    throw new SerialPrinterNotSupportedError()
  }
}

export interface SerialPrinterHandle {
  // Web Serial doesn't expose a stable per-port id, so we can't persist a
  // precise handle across reloads the way USB/Bluetooth do. usbVendorId /
  // usbProductId are present for USB-to-serial adapters but usually absent
  // for Bluetooth SPP ports — label is just for display.
  usbVendorId?: number
  usbProductId?: number
  label: string
}

// The actual SerialPort object only lives for this page session (it's not
// serializable into the persisted Zustand store) — re-derived on demand
// from navigator.serial.getPorts(), which returns ports already granted to
// this origin without prompting again.
let cachedPort: SerialPort | null = null

function handleMatchesPort(
  handle: SerialPrinterHandle,
  port: SerialPort,
): boolean {
  const info = port.getInfo()
  return (
    info.usbVendorId === handle.usbVendorId &&
    info.usbProductId === handle.usbProductId
  )
}

// Must be called from a user gesture (click). Opens the OS device picker
// listing serial/COM ports, incl. ones created by OS Bluetooth pairing.
export async function requestSerialPrinter(): Promise<SerialPrinterHandle> {
  assertSupported()
  const port = await navigator.serial.requestPort()
  cachedPort = port
  const info = port.getInfo()
  return {
    usbVendorId: info.usbVendorId,
    usbProductId: info.usbProductId,
    label: info.usbVendorId
      ? `Serial printer (${info.usbVendorId.toString(16)}:${(info.usbProductId ?? 0).toString(16)})`
      : 'Paired serial printer',
  }
}

async function getGrantedPort(
  handle: SerialPrinterHandle,
): Promise<SerialPort | null> {
  assertSupported()
  if (cachedPort && handleMatchesPort(handle, cachedPort)) return cachedPort
  const ports = await navigator.serial.getPorts()
  if (ports.length === 0) return null
  // Prefer an exact vendor/product match (USB-to-serial adapters); for
  // Bluetooth SPP ports there's usually nothing to match on, so fall back
  // to the sole granted port if there's exactly one.
  const match = ports.find((p) => handleMatchesPort(handle, p))
  const port = match ?? (ports.length === 1 ? ports[0] : null)
  if (port) cachedPort = port
  return port
}

export async function isSerialPrinterAvailable(
  handle: SerialPrinterHandle,
): Promise<boolean> {
  try {
    return (await getGrantedPort(handle)) !== null
  } catch {
    return false
  }
}

export async function printViaSerial(
  handle: SerialPrinterHandle,
  data: Uint8Array,
): Promise<void> {
  assertSupported()
  const port = await getGrantedPort(handle)
  if (!port) {
    throw new Error(
      'Serial printer not found — reconnect it from Settings → Printer (the pairing may have been revoked, or the port is in use by another app).',
    )
  }
  await port.open({ baudRate: DEFAULT_BAUD_RATE })
  try {
    if (!port.writable) {
      throw new Error('This port is not writable.')
    }
    const writer = port.writable.getWriter()
    try {
      await writer.write(data)
    } finally {
      writer.releaseLock()
    }
  } finally {
    await port.close()
  }
}

export function disconnectSerialPrinter() {
  cachedPort = null
}
