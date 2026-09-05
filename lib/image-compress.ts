'use client'

/**
 * Resizes and re-compresses an image in the browser before it's uploaded.
 *
 * Why this exists: `next dev` on localhost has no request-size limit, but a
 * production deployment sitting behind a reverse proxy (nginx / OpenLiteSpeed
 * on a VPS, CyberPanel, Vercel, etc.) almost always enforces one — commonly
 * as low as 1MB by default (nginx's `client_max_body_size`). Phone/DSLR
 * product photos are routinely 5–15MB, so uploads that work fine on
 * localhost fail in production with a generic "Upload failed" once the
 * reverse proxy rejects the request before it even reaches the app.
 *
 * This shrinks images to a sane max dimension and re-encodes them as JPEG,
 * stepping quality down further if still too large, so uploads succeed
 * reliably without needing to touch server config every time someone
 * uploads a large photo (and it makes the storefront load faster too).
 */
export async function compressImageForUpload(
  file: File,
  {
    maxDimension = 2000,
    quality = 0.85,
    maxOutputBytes = 3 * 1024 * 1024, // stay safely under typical reverse-proxy body limits
  }: { maxDimension?: number; quality?: number; maxOutputBytes?: number } = {},
): Promise<File> {
  // Skip non-images, already-small files, and GIFs (re-encoding would kill animation)
  if (
    !file.type.startsWith('image/') ||
    file.size <= maxOutputBytes ||
    file.type === 'image/gif'
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    let q = quality
    let blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', q),
    )
    // Step quality down further if it's still too big
    while (blob && blob.size > maxOutputBytes && q > 0.4) {
      q -= 0.15
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', q),
      )
    }

    if (!blob) return file
    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch (err) {
    // If compression fails for any reason, fall back to the original file
    // rather than blocking the upload entirely.
    console.warn('[image-compress] failed, uploading original file:', err)
    return file
  }
}
