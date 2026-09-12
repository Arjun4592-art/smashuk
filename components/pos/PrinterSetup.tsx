'use client'

import { useEffect, useMemo, useState } from 'react'
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
  requestSerialPrinter,
  disconnectSerialPrinter,
  SerialPrinterNotSupportedError,
} from '@/lib/printer/serial-transport'
import {
  printTestPage,
  NoPrinterConnectedError,
} from '@/lib/printer/print-receipt'
import { printTestPageViaBrowser } from '@/lib/printer/browser-print'
import { pingLanAgent } from '@/lib/printer/lan-agent-transport'
import {
  isAndroidDevice,
  printTestPageViaPassPRNT,
} from '@/lib/printer/passprnt-transport'

interface PrinterOption {
  type: PrinterConnectionType
  label: string
  icon: string
  desc: string
  recommended?: boolean
  unsupportedReason?: string
}

const ALL_OPTIONS: PrinterOption[] = [
  {
    type: 'browser',
    label: 'Browser / System',
    icon: '🖨️',
    desc: 'Uses your device’s normal print dialog. Works on every OS — good for Mac, or any AirPrint/OS-paired printer. On iPad, a Star TSP100 over classic Bluetooth won’t show up here — use Star PassPRNT instead.',
    recommended: true,
  },
  {
    type: 'star-passprnt',
    label: 'Star PassPRNT',
    icon: '⭐',
    desc: 'For iPad or Android tablets paired with a Star Bluetooth printer (e.g. TSP100IIIBI). Requires the free Star PassPRNT app installed and configured with the printer first — this is the recommended option on iPad since Safari has no generic Bluetooth print driver.',
  },
  {
    type: 'usb',
    label: 'USB',
    icon: '🔌',
    desc: 'Plugged in directly with a cable. Chrome or Edge only.',
  },
  {
    type: 'bluetooth',
    label: 'Bluetooth (BLE)',
    icon: '📶',
    desc: 'BLE printers only, Chrome/Edge only. Most budget thermal printers (incl. Star TSP100) use classic Bluetooth (SPP) instead — use Pair (Serial), Star PassPRNT (iPad/Android), or Browser/System for those.',
  },
  {
    type: 'serial',
    label: 'Pair (Serial)',
    icon: '🔗',
    desc: 'Pairs directly with a classic Bluetooth (SPP) printer like the Star TSP100 — pick its port once, prints go straight through after. Chrome/Edge on Windows/macOS/Linux only — not available on iPad or Android, use Star PassPRNT there instead.',
  },
  {
    type: 'network',
    label: 'Network',
    icon: '🌐',
    desc: 'WiFi/Ethernet printer on the same network',
  },
  {
    type: 'lan-agent',
    label: 'Bridge tablet',
    icon: '🔁',
    desc: 'Printer is paired over Bluetooth to another tablet running the print agent app. Enter that tablet\u2019s IP address.',
  },
]

// WebUSB and Web Bluetooth are Chrome/Edge-only APIs — Safari (macOS and
// iPadOS alike) implements neither, so those tiles would just fail every
// time on a Mac or iPad. Detect support and grey them out with an
// explanation instead of letting the person tap into a dead end.
function useSupportedOptions(): PrinterOption[] {
  return useMemo(() => {
    const hasUSB = typeof navigator !== 'undefined' && 'usb' in navigator
    const hasBluetooth =
      typeof navigator !== 'undefined' && 'bluetooth' in navigator
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator
    const onAndroid = isAndroidDevice()
    // iPadOS Safari has reported itself as a plain "Macintosh" UA (desktop
    // site by default) since iOS 13, so a UA string check for "iPad" alone
    // misses real iPads. The standard workaround: a "Mac" UA that also
    // reports multi-touch is actually an iPad (real Macs report 0 or 1).
    const onIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    const onMobileWithNoDriver = onAndroid || onIOS
    return ALL_OPTIONS.map((opt) => {
      // On Android or iPad, Star PassPRNT is the one path that actually
      // reaches a classic-Bluetooth (SPP) TSP100 — Serial isn't implemented
      // on Android Chrome or iOS Safari at all, and Browser/System has no
      // generic Bluetooth print driver on either mobile OS the way
      // macOS/Windows do. Swap the recommendation.
      if (opt.type === 'star-passprnt') {
        return { ...opt, recommended: onMobileWithNoDriver }
      }
      if (opt.type === 'browser' && onMobileWithNoDriver) {
        return { ...opt, recommended: false }
      }
      if (opt.type === 'usb' && !hasUSB) {
        return {
          ...opt,
          unsupportedReason:
            'Not supported in this browser — try Chrome/Edge, or use Browser/System instead.',
        }
      }
      if (opt.type === 'bluetooth' && !hasBluetooth) {
        return {
          ...opt,
          unsupportedReason:
            'Not supported in this browser — try Chrome/Edge, or use Browser/System instead.',
        }
      }
      if (opt.type === 'serial' && !hasSerial) {
        return {
          ...opt,
          unsupportedReason:
            'Not supported in this browser (or on Mac/iPad Safari) — use Browser/System instead.',
        }
      }
      return opt
    })
  }, [])
}

export default function PrinterSetup() {
  const {
    connectionType,
    paperWidth,
    usbHandle,
    btHandle,
    networkHandle,
    serialHandle,
    lanAgentHandle,
    openDrawerOnPrint,
    setConnectionType,
    setPaperWidth,
    setUSBHandle,
    setBTHandle,
    setNetworkHandle,
    setSerialHandle,
    setLanAgentHandle,
    setOpenDrawerOnPrint,
    disconnect,
  } = usePrinterStore()
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [usbOk, setUsbOk] = useState<boolean | null>(null)
  const [host, setHost] = useState(networkHandle?.host ?? '')
  const [port, setPort] = useState(String(networkHandle?.port ?? 9100))
  const [agentHost, setAgentHost] = useState(lanAgentHandle?.host ?? '')
  const [agentPort, setAgentPort] = useState(
    String(lanAgentHandle?.port ?? 7777),
  )
  const [agentBusy, setAgentBusy] = useState(false)
  const options = useSupportedOptions()

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

  // Same picker shape as USB/Bluetooth above, but for a serial/COM port —
  // this is what reaches a classic Bluetooth (SPP) printer, since it shows
  // up as a virtual port once paired in the OS's own Bluetooth settings.
  const connectSerial = async () => {
    setBusy(true)
    try {
      const handle = await requestSerialPrinter()
      setSerialHandle(handle)
      setConnectionType('serial')
      toast.success(`Paired with ${handle.label}`)
    } catch (err: unknown) {
      if (err instanceof SerialPrinterNotSupportedError) {
        toast.error('Not supported', { description: err.message })
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        // user cancelled the picker
      } else {
        toast.error('Could not pair printer', {
          description: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  // Unlike USB/Bluetooth, there's no browser API that can confirm a real
  // printer is present before we "connect" — the OS print dialog is the
  // only place that ever shows an actual printer list. So selecting this
  // option immediately opens that dialog (via a test page) instead of
  // just flipping a switch to "Connected" on faith. If the dialog can't
  // even be opened, we roll the selection back rather than claim success.
  const connectBrowser = async () => {
    setBusy(true)
    try {
      // Opening the dialog only proves the dialog opened — it doesn't
      // prove the person picked the right destination or that paper
      // actually came out. There's no browser API that can tell us that,
      // so we ask directly instead of assuming success. Only a "yes" here
      // marks it connected.
      await printTestPageViaBrowser(paperWidth)
      const confirmed = window.confirm(
        'Did the test page print correctly on your receipt printer?\n\nClick OK only if it actually printed. Click Cancel to try again.',
      )
      if (!confirmed) {
        toast.error('Not connected', {
          description:
            'Pick your printer as the destination in the print dialog, then try again.',
        })
        return
      }
      setConnectionType('browser')
      toast.success('Printer connected')
    } catch (err: unknown) {
      toast.error('Could not open the print dialog', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setBusy(false)
    }
  }

  // Fires a real test print through PassPRNT. PassPRNT's own success/
  // failure result comes back via consumePassPrntCallback() after the
  // 'back' URL reloads this page (see POSTerminalLayout) — so there's
  // nothing to resolve here; this just launches the app.
  const connectPassPRNT = async () => {
    setBusy(true)
    try {
      await printTestPageViaPassPRNT(paperWidth, 'connect-test')
    } catch (err: unknown) {
      toast.error('Could not open Star PassPRNT', {
        description:
          err instanceof Error
            ? err.message
            : 'Make sure the Star PassPRNT app is installed.',
      })
      setBusy(false)
    }
    // On success, the page navigates away to PassPRNT and this component
    // unmounts — setBusy(false) here would be a no-op in that case.
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

  const saveLanAgent = async () => {
    const trimmedHost = agentHost.trim()
    const portNum = parseInt(agentPort, 10)
    if (!trimmedHost) {
      toast.error('Enter the bridge tablet\u2019s IP address')
      return
    }
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Enter a valid port (default 7777)')
      return
    }
    setAgentBusy(true)
    try {
      const handle = { host: trimmedHost, port: portNum }
      const reachable = await pingLanAgent(handle)
      if (!reachable) {
        toast.error('Could not reach the print agent', {
          description:
            'Make sure the agent app is open on the bridge tablet and both devices are on the same Wi-Fi.',
        })
        return
      }
      setLanAgentHandle(handle)
      setConnectionType('lan-agent')
      toast.success(`Connected to bridge at ${trimmedHost}:${portNum}`)
    } finally {
      setAgentBusy(false)
    }
  }

  const handleDisconnect = () => {
    if (connectionType === 'bluetooth') disconnectBluetoothPrinter()
    if (connectionType === 'serial') disconnectSerialPrinter()
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
          : connectionType === 'browser'
            ? 'System print dialog'
            : connectionType === 'serial'
              ? serialHandle?.label || 'Paired serial printer'
              : connectionType === 'lan-agent'
                ? `Bridge @ ${lanAgentHandle?.host}:${lanAgentHandle?.port}`
                : connectionType === 'star-passprnt'
                  ? 'Star PassPRNT app'
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
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
            {options.map((opt) => {
              const disabled = busy || !!opt.unsupportedReason
              return (
                <button
                  key={opt.type}
                  disabled={disabled}
                  title={opt.unsupportedReason}
                  onClick={() =>
                    opt.type === 'usb'
                      ? connectUSB()
                      : opt.type === 'bluetooth'
                        ? connectBluetooth()
                        : opt.type === 'serial'
                          ? connectSerial()
                          : opt.type === 'browser'
                            ? connectBrowser()
                            : opt.type === 'star-passprnt'
                              ? connectPassPRNT()
                              : opt.type === 'lan-agent'
                                ? undefined // handled by the form below
                                : setConnectionType('network')
                  }
                  className='flex flex-col items-start text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[#008060] hover:bg-[#F2F7F5] transition-colors disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-transparent'
                >
                  <span className='flex items-center gap-1.5 w-full'>
                    <span className='text-lg'>{opt.icon}</span>
                    {opt.recommended && (
                      <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F2F7F5] text-[#008060]'>
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className='text-sm font-semibold text-gray-800 mt-1'>
                    {opt.label}
                  </span>
                  <span className='text-[11px] text-gray-500 mt-0.5 leading-snug'>
                    {opt.unsupportedReason ?? opt.desc}
                  </span>
                </button>
              )
            })}
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

        {connectionType === 'none' && (
          <div className='space-y-2 pt-1'>
            <label className='text-[11px] font-medium uppercase tracking-wide text-gray-500 block'>
              Bridge tablet IP (if using Bridge tablet)
            </label>
            <div className='flex gap-2'>
              <input
                value={agentHost}
                onChange={(e) => setAgentHost(e.target.value)}
                placeholder='192.168.1.60'
                className='flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#008060]'
              />
              <input
                value={agentPort}
                onChange={(e) => setAgentPort(e.target.value)}
                placeholder='7777'
                className='w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#008060]'
              />
              <button
                onClick={saveLanAgent}
                disabled={agentBusy}
                className='px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] transition-colors shrink-0 disabled:opacity-50'
              >
                {agentBusy ? 'Checking\u2026' : 'Connect'}
              </button>
            </div>
            <p className='text-[11px] text-gray-400'>
              The other tablet must have the print agent app open and be paired
              with the printer over Bluetooth.
            </p>
            {agentHost.trim() && (
              <p className='text-[11px] text-gray-400'>
                First time only: the agent uses a self-signed certificate, so
                this browser needs to accept it once. Open{' '}
                <a
                  href={`https://${agentHost.trim()}:${agentPort || '7777'}/status`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline text-[#008060]'
                >
                  https://{agentHost.trim()}:{agentPort || '7777'}/status
                </a>{' '}
                and tap &ldquo;Advanced&rdquo; &rarr; &ldquo;Proceed
                anyway&rdquo; on the warning, then come back and press Connect.
              </p>
            )}
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
