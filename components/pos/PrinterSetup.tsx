'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  usePrinterStore,
  type PrinterConnectionType,
} from '@/store/printerStore'
import {
  requestUSBPrinter,
  isUSBPrinterAvailable,
  USBPrinterNotSupportedError,
} from '@/lib/printer/usb-transport'
import {
  requestBluetoothPrinter,
  disconnectBluetoothPrinter,
  BluetoothPrinterNotSupportedError,
} from '@/lib/printer/bluetooth-transport'
import {
  printTestPage,
  NoPrinterConnectedError,
} from '@/lib/printer/print-receipt'

const OPTIONS: {
  type: PrinterConnectionType
  label: string
  icon: string
  desc: string
}[] = [
  {
    type: 'usb',
    label: 'USB',
    icon: '🔌',
    desc: 'Plugged in directly with a cable',
  },
  {
    type: 'bluetooth',
    label: 'Bluetooth',
    icon: '📶',
    desc: 'BLE printers only — classic Bluetooth (SPP) printers aren\u2019t supported by the browser',
  },
  {
    type: 'network',
    label: 'Network',
    icon: '🌐',
    desc: 'WiFi/Ethernet printer on the same network',
  },
]

export default function PrinterSetup() {
  const {
    connectionType,
    paperWidth,
    usbHandle,
    btHandle,
    networkHandle,
    openDrawerOnPrint,
    setConnectionType,
    setPaperWidth,
    setUSBHandle,
    setBTHandle,
    setNetworkHandle,
    setOpenDrawerOnPrint,
    disconnect,
  } = usePrinterStore()
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [usbOk, setUsbOk] = useState<boolean | null>(null)
  const [host, setHost] = useState(networkHandle?.host ?? '')
  const [port, setPort] = useState(String(networkHandle?.port ?? 9100))

  useEffect(() => {
    if (connectionType === 'usb' && usbHandle) {
      isUSBPrinterAvailable(usbHandle)
        .then(setUsbOk)
        .catch(() => setUsbOk(false))
    }
  }, [connectionType, usbHandle])

  const connectUSB = async () => {
    setBusy(true)
    try {
      const handle = await requestUSBPrinter()
      setUSBHandle(handle)
      setConnectionType('usb')
      toast.success(`Connected to ${handle.productName || 'USB printer'}`)
    } catch (err: unknown) {
      if (err instanceof USBPrinterNotSupportedError) {
        toast.error('Not supported', { description: err.message })
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        // user cancelled the picker
      } else {
        toast.error('Could not connect USB printer', {
          description: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const connectBluetooth = async () => {
    setBusy(true)
    try {
      const handle = await requestBluetoothPrinter()
      setBTHandle(handle)
      setConnectionType('bluetooth')
      toast.success(`Connected to ${handle.name || 'Bluetooth printer'}`)
    } catch (err: unknown) {
      if (err instanceof BluetoothPrinterNotSupportedError) {
        toast.error('Not supported', { description: err.message })
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        // user cancelled the picker
      } else {
        toast.error('Could not connect Bluetooth printer', {
          description:
            err instanceof Error
              ? err.message
              : 'It may be a classic Bluetooth (SPP) printer, which browsers can\u2019t talk to — try USB or Network instead.',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const saveNetwork = () => {
    const trimmedHost = host.trim()
    const portNum = parseInt(port, 10)
    if (!trimmedHost) {
      toast.error('Enter the printer\u2019s IP address')
      return
    }
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Enter a valid port (default 9100)')
      return
    }
    setNetworkHandle({ host: trimmedHost, port: portNum })
    setConnectionType('network')
    toast.success(`Saved printer at ${trimmedHost}:${portNum}`)
  }

  const handleDisconnect = () => {
    if (connectionType === 'bluetooth') disconnectBluetoothPrinter()
    disconnect()
    toast.success('Printer disconnected')
  }

  const handleTestPrint = async () => {
    setTesting(true)
    try {
      await printTestPage()
      toast.success('Test page sent to printer')
    } catch (err: unknown) {
      if (err instanceof NoPrinterConnectedError) {
        toast.error('No printer connected', {
          description: 'Connect one below first.',
        })
      } else {
        toast.error('Test print failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    } finally {
      setTesting(false)
    }
  }

  const connectedLabel =
    connectionType === 'usb'
      ? usbHandle?.productName || 'USB printer'
      : connectionType === 'bluetooth'
        ? btHandle?.name || 'Bluetooth printer'
        : connectionType === 'network'
          ? `${networkHandle?.host}:${networkHandle?.port}`
          : null

  return (
    <div className='rounded-xl overflow-hidden bg-white border border-gray-200'>
      <div className='px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between'>
        <p className='text-sm font-semibold text-gray-800'>Receipt printer</p>
        {connectionType !== 'none' && (
          <span className='text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700'>
            Connected
          </span>
        )}
      </div>

      <div className='p-5 space-y-4'>
        {connectionType !== 'none' ? (
          <div className='flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-4 py-3'>
            <div className='min-w-0'>
              <p className='text-sm font-medium text-gray-800 truncate'>
                {connectedLabel}
              </p>
              <p className='text-xs text-gray-500 mt-0.5 capitalize'>
                {connectionType} · {paperWidth}
                {connectionType === 'usb' && usbOk === false && (
                  <span className='text-red-600 font-medium'>
                    {' '}
                    · not detected
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className='px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-red-600 hover:bg-red-50 transition-colors shrink-0'
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
            {OPTIONS.map((opt) => (
              <button
                key={opt.type}
                disabled={busy}
                onClick={() =>
                  opt.type === 'usb'
                    ? connectUSB()
                    : opt.type === 'bluetooth'
                      ? connectBluetooth()
                      : setConnectionType('network')
                }
                className='flex flex-col items-start text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#008060] hover:bg-[#F2F7F5] transition-colors disabled:opacity-50'
              >
                <span className='text-lg'>{opt.icon}</span>
                <span className='text-sm font-semibold text-gray-800 mt-1'>
                  {opt.label}
                </span>
                <span className='text-[11px] text-gray-500 mt-0.5 leading-snug'>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {connectionType === 'none' && (
          <div className='space-y-2 pt-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-500 block'>
              Network printer IP (if using Network)
            </label>
            <div className='flex gap-2'>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder='192.168.1.50'
                className='flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#008060]'
              />
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder='9100'
                className='w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#008060]'
              />
              <button
                onClick={saveNetwork}
                className='px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] transition-colors shrink-0'
              >
                Save
              </button>
            </div>
            <p className='text-[11px] text-gray-400'>
              Port 9100 is the default raw print port on almost all network
              thermal printers.
            </p>
          </div>
        )}

        <div className='flex items-center justify-between pt-2 border-t border-gray-100'>
          <div>
            <p className='text-sm font-medium text-gray-800'>Paper width</p>
          </div>
          <div className='flex rounded-lg border border-gray-200 overflow-hidden'>
            {(['58mm', '80mm'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setPaperWidth(w)}
                className='px-3 py-1.5 text-xs font-medium transition-colors'
                style={{
                  background: paperWidth === w ? '#008060' : '#FFFFFF',
                  color: paperWidth === w ? '#FFFFFF' : '#6D7175',
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-gray-800'>
              Open cash drawer on print
            </p>
            <p className='text-xs text-gray-500 mt-0.5'>
              Only works if your drawer is wired to the printer
            </p>
          </div>
          <button
            onClick={() => setOpenDrawerOnPrint(!openDrawerOnPrint)}
            className='w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0'
            style={{
              background: openDrawerOnPrint ? '#008060' : '#D1D5DB',
            }}
            role='switch'
            aria-checked={openDrawerOnPrint}
          >
            <span
              className='absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200'
              style={{
                left: openDrawerOnPrint ? 'calc(100% - 20px)' : '4px',
              }}
            />
          </button>
        </div>

        <button
          onClick={handleTestPrint}
          disabled={testing || connectionType === 'none'}
          className='w-full py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
        >
          {testing ? 'Sending test page\u2026' : 'Print test page'}
        </button>
      </div>
    </div>
  )
}
