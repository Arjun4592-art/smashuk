const PT_TO_MM = 25.4 / 72

async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  return pdfjsLib
}

export async function pdfUrlToPrintHtml(url: string): Promise<string> {
  const pdfjsLib = await loadPdfJs()
  const doc = await pdfjsLib.getDocument({ url }).promise
  const RENDER_SCALE = 2

  const pageHtml: string[] = []
  let pageWidthMm = 0
  let pageHeightMm = 0

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not render the shipping label.')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const widthMm = (viewport.width / RENDER_SCALE) * PT_TO_MM
    const heightMm = (viewport.height / RENDER_SCALE) * PT_TO_MM
    if (i === 1) {
      pageWidthMm = widthMm
      pageHeightMm = heightMm
    }

    pageHtml.push(
      `<div class="page"><img src="${canvas.toDataURL('image/png')}" /></div>`,
    )
    canvas.width = 0
    canvas.height = 0
  }

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { width: ${pageWidthMm}mm; height: ${pageHeightMm}mm;
    break-after: page; page-break-after: always; overflow: hidden; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .page img { width: 100%; height: 100%; display: block; object-fit: contain; }
</style></head>
<body>${pageHtml.join('')}</body></html>`
}
