interface USBEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
  type: 'bulk' | 'interrupt' | 'isochronous'
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[]
}

interface USBInterface {
  interfaceNumber: number
  alternates: USBAlternateInterface[]
}

interface USBConfiguration {
  configurationValue: number
  interfaces: USBInterface[]
}

interface USBOutTransferResult {
  status: 'ok' | 'stall' | 'babble'
  bytesWritten: number
}

interface USBDevice {
  vendorId: number
  productId: number
  productName?: string
  configuration: USBConfiguration | null
  configurations: USBConfiguration[]
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  transferOut(
    endpointNumber: number,
    data: BufferSource,
  ): Promise<USBOutTransferResult>
}

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
  classCode?: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USB {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
  getDevices(): Promise<USBDevice[]>
}

interface Navigator {
  usb: USB
  bluetooth: Bluetooth
  serial: Serial
}

interface Bluetooth {
  requestDevice(options: {
    filters?: { services?: (string | number)[] }[]
    optionalServices?: (string | number)[]
    acceptAllDevices?: boolean
  }): Promise<BluetoothDevice>
  getDevices?(): Promise<BluetoothDevice[]>
}

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void
  removeEventListener(
    type: 'gattserverdisconnected',
    listener: () => void,
  ): void
}

interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(
    service: string | number,
  ): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(
    characteristic: string | number,
  ): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValueWithoutResponse?(value: BufferSource): Promise<void>
  writeValueWithResponse?(value: BufferSource): Promise<void>
  writeValue(value: BufferSource): Promise<void>
}
// --- Web Serial ---------------------------------------------------------
// Lets the person explicitly *pair* with a serial (or Bluetooth-classic
// SPP, which Windows/macOS/Linux expose as a virtual serial/COM port once
// paired in OS Bluetooth settings) printer via a native picker — the same
// kind of one-time "pick the device" flow as WebUSB/Web Bluetooth above,
// just for ports instead of USB/BLE devices. Chrome/Edge desktop only.

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
}

interface SerialPort {
  writable: WritableStream<Uint8Array> | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}
