// Converts an image (PNG/JPG/etc, e.g. the site logo) into a 1-bit-per-pixel
// monochrome raster, packed 8 pixels per byte (MSB = leftmost pixel) — the
// exact format lib/printer/escpos.ts's Builder.image() expects for the
// GS v 0 raster print command.
//
// Runs in the browser (uses <canvas>), since that's where the POS terminal
// UI executes and where the logo <img> asset is already loaded.

export interface MonochromeRaster {
  widthPx: number
  heightPx: number
  raster: Uint8Array
}

/**
 * @param src        Image URL (e.g. SITE_LOGO)
 * @param maxWidthPx Target width in printer dots. 80mm paper is ~576 dots
 *                   wide at 203dpi; keep the logo well under that (e.g. 300)
 *                   so it doesn't dominate the receipt header.
 * @param threshold  0-255 luminance cutoff; pixels darker than this print
 *                   as black. Lower = only very dark pixels print black.
 */
export async function imageUrlToMonochromeRaster(
  src: string,
  maxWidthPx = 300,
  threshold = 160,
): Promise<MonochromeRaster> {
  const img = await loadImage(src)

  const scale = Math.min(1, maxWidthPx / img.width)
  const widthPx = Math.max(1, Math.round(img.width * scale))
  const heightPx = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // Flatten onto white first — logos with transparent backgrounds would
  // otherwise print as solid black where alpha=0 if we skip this step.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, widthPx, heightPx)
  ctx.drawImage(img, 0, 0, widthPx, heightPx)

  const { data } = ctx.getImageData(0, 0, widthPx, heightPx)
  const widthBytes = Math.ceil(widthPx / 8)
  const raster = new Uint8Array(widthBytes * heightPx)

  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const idx = (y * widthPx + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      // Standard luma weighting.
      const luminance = r * 0.299 + g * 0.587 + b * 0.114
      const isBlack = a > 128 && luminance < threshold
      if (isBlack) {
        const byteIndex = y * widthBytes + (x >> 3)
        raster[byteIndex] |= 0x80 >> (x % 8)
      }
    }
  }

  return { widthPx, heightPx, raster }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}
