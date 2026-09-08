// Sends ESC/POS bytes to a network (WiFi/Ethernet) thermal printer via the
// server-side proxy route, since browsers cannot open raw TCP sockets.

export interface NetworkPrinterHandle {
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

export async function printViaNetwork(
  handle: NetworkPrinterHandle,
  data: Uint8Array,
): Promise<void> {
  const res = await fetch('/api/pos/print/network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      host: handle.host,
      port: handle.port,
      dataBase64: bytesToBase64(data),
    }),
  })
  const responseBody = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(responseBody.error ?? 'Failed to reach network printer')
  }
}
