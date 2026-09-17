'use client'

export async function compressImageForUpload(
  file: File,
  {
    maxDimension = 2500,
    quality = 0.92,
    maxOutputBytes = 3 * 1024 * 1024,
  }: { maxDimension?: number; quality?: number; maxOutputBytes?: number } = {},
): Promise<File> {
  if (
    !file.type.startsWith('image/') ||
    file.size <= maxOutputBytes ||
    file.type === 'image/gif'
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)

    const preferredType =
      file.type === 'image/webp' || file.type === 'image/png'
        ? file.type
        : 'image/jpeg'

    let { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension)

    let blob = await drawHighQuality(
      bitmap,
      width,
      height,
      preferredType,
      quality,
    )

    let q = quality
    let currentType = preferredType
    while (blob && blob.size > maxOutputBytes) {
      if (currentType !== 'image/png' && q > 0.5) {
        q -= 0.1
        blob = await drawHighQuality(bitmap, width, height, currentType, q)
        continue
      }
      if (Math.max(width, height) > 800) {
        const next = fitWithin(
          width,
          height,
          Math.round(Math.max(width, height) * 0.85),
        )
        width = next.width
        height = next.height
        blob = await drawHighQuality(bitmap, width, height, currentType, q)
        continue
      }
      if (currentType === 'image/png') {
        currentType = 'image/jpeg'
        q = quality
        blob = await drawHighQuality(bitmap, width, height, currentType, q)
        continue
      }
      break
    }

    if (!blob) return file
    const ext = currentType.split('/')[1]
    const newName = file.name.replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], newName, { type: currentType })
  } catch (err) {
    // If compression fails for any reason, fall back to the original file
    // rather than blocking the upload entirely.
    console.warn('[image-compress] failed, uploading original file:', err)
    return file
  }
}

/** Scales width/height down (never up) so the longer side is at most `max`. */
function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Draws `source` into a canvas at `width`x`height` and encodes it, downscaling
 * in halving steps rather than one big jump. A single large downscale (e.g.
 * 6000px -> 1200px in one `drawImage` call) skips samples and produces
 * aliasing/moiré even with smoothing on; halving repeatedly keeps each step
 * within a range the browser's resampler handles well.
 */
async function drawHighQuality(
  source: ImageBitmap,
  width: number,
  height: number,
  type: string,
  quality: number,
): Promise<Blob | null> {
  let srcCanvas: HTMLCanvasElement | ImageBitmap = source
  let curW = source.width
  let curH = source.height

  while (curW / 2 > width && curH / 2 > height) {
    curW = Math.round(curW / 2)
    curH = Math.round(curH / 2)
    const step = document.createElement('canvas')
    step.width = curW
    step.height = curH
    const stepCtx = step.getContext('2d')
    if (!stepCtx) break
    stepCtx.imageSmoothingEnabled = true
    stepCtx.imageSmoothingQuality = 'high'
    stepCtx.drawImage(srcCanvas as any, 0, 0, curW, curH)
    srcCanvas = step
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(srcCanvas as any, 0, 0, width, height)

  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
