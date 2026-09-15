import qrcodegen from 'qrcode-generator'

/**
 * Generates a QR code locally (no external API call/network dependency —
 * same approach used by the POS receipt print and invoice PDF, see
 * components/pos/Receipt.tsx and lib/invoice-pdf.tsx) and returns it as a
 * Resend "inline" attachment: it isn't shown as a downloadable file, it's
 * referenced from the email HTML via `src="cid:<contentId>"`, which renders
 * reliably in Gmail/Outlook/Apple Mail unlike a large base64 data URI.
 */
export function qrInlineAttachment(
  text: string,
  contentId: string = 'order-qr',
) {
  const qr = qrcodegen(0, 'M')
  qr.addData(text)
  qr.make()
  const dataUrl = qr.createDataURL(8, 2)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return {
    filename: `${contentId}.gif`,
    content: base64,
    contentType: 'image/gif',
    inlineContentId: contentId,
  }
}
