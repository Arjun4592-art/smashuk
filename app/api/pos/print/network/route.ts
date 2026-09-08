import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import net from 'net'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

// Raw TCP sockets aren't available in the browser or the Edge runtime, so
// network/WiFi ESC/POS printers (which listen for raw bytes on port 9100 —
// the "JetDirect"/RAW protocol most receipt and label printers support) are
// printed to via this server-side route instead.
export const runtime = 'nodejs'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
const HOSTNAME_RE = /^[a-zA-Z0-9.-]+$/

function sendToPrinter(
  host: string,
  port: number,
  data: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('Timed out connecting to printer'))
    }, 5000)

    socket.once('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    socket.connect(port, host, () => {
      socket.write(data, (err) => {
        clearTimeout(timeout)
        if (err) {
          socket.destroy()
          reject(err)
          return
        }
        socket.end()
        resolve()
      })
    })
  })
}

export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { host?: string; port?: number; dataBase64?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { host, dataBase64 } = body
  const port = body.port ?? 9100

  if (!host || !dataBase64) {
    return NextResponse.json(
      { error: 'host and dataBase64 are required' },
      { status: 400 },
    )
  }
  if (!IPV4_RE.test(host) && !HOSTNAME_RE.test(host)) {
    return NextResponse.json({ error: 'Invalid printer host' }, { status: 400 })
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return NextResponse.json({ error: 'Invalid port' }, { status: 400 })
  }

  let data: Buffer
  try {
    data = Buffer.from(dataBase64, 'base64')
  } catch {
    return NextResponse.json({ error: 'Invalid print data' }, { status: 400 })
  }

  try {
    await sendToPrinter(host, port, data)
    return NextResponse.json({ sent: true })
  } catch (err: any) {
    console.error('[POS] network printer error:', err)
    const msg =
      err?.code === 'ECONNREFUSED'
        ? `Printer at ${host}:${port} refused the connection — check it's powered on and on the same network.`
        : err?.code === 'ETIMEDOUT' ||
            err?.message === 'Timed out connecting to printer'
          ? `Could not reach printer at ${host}:${port} — check the IP address and that it's on the same network.`
          : (err?.message ?? 'Failed to reach printer')
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
