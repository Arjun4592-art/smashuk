// Minimal ambient declarations for the WebUSB and Web Bluetooth APIs.
// These browser APIs aren't part of TypeScript's default DOM lib. If you
// later install `@types/w3c-web-usb` and/or `@types/web-bluetooth`, remove
// this file (or the relevant half of it) to avoid duplicate declarations.

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
