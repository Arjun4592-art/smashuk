// Sends ESC/POS bytes to the Android bridge app (see /android-agent) running
// on a tablet that's paired with the printer over classic Bluetooth (SPP).
// Unlike network-transport.ts, this talks straight from the browser to the
// agent's LAN IP — no server-side proxy needed, since the agent itself is
// an HTTPS server on the local network (not a raw TCP printer).
//
// HTTPS (not HTTP) is required here: this app is served over HTTPS, and
// browsers block a HTTPS page from fetch()-ing plain http:// on the LAN
// ("Mixed Content"). The agent serves a self-signed certificate, so the
// first time a device talks to a given bridge tablet, the person needs to
// open https://<bridge-ip>:<port>/status directly in the browser once and
// click through the "connection is not private" warning — after that,
// fetch() calls below succeed normally.

export interface LanAgentHandle {
  host: string
  port: number
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export class LanAgentUnreachableError extends Error {
  constructor(detail?: string) {
    super(
      detail ??
        'Could not reach the print agent. Make sure the Android agent app is open on the bridge tablet, both devices are on the same Wi-Fi, and you\u2019ve accepted the certificate warning once at https://<bridge-ip>:<port>/status in this browser.',
    )
    this.name = 'LanAgentUnreachableError'
  }
}

export async function printViaLanAgent(
  handle: LanAgentHandle,
  data: Uint8Array,
): Promise<void> {
  const url = `https://${handle.host}:${handle.port}/print`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataBase64: bytesToBase64(data) }),
      // Agent should respond quickly; don't hang the UI forever if the
      // bridge tablet is asleep or off Wi-Fi.
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    throw new LanAgentUnreachableError(
      err instanceof Error && err.name === 'TimeoutError'
        ? 'Print agent did not respond in time. Check the bridge tablet is awake and on Wi-Fi.'
        : undefined,
    )
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? 'Print agent reported a failure.')
  }
}

export async function pingLanAgent(handle: LanAgentHandle): Promise<boolean> {
  try {
    const res = await fetch(`https://${handle.host}:${handle.port}/status`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}
