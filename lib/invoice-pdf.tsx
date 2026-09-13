import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import qrcodegen from 'qrcode-generator'
// Generated locally (no network call) so the QR code can never go missing
// from a PDF because of a slow/blocked external request — same reasoning
// as the POS printed receipt (components/pos/Receipt.tsx).
function qrDataUrl(text: string): string {
  const qr = qrcodegen(0, 'M')
  qr.addData(text)
  qr.make()
  return qr.createDataURL(4, 0)
}
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  businessBlock: {
    maxWidth: 260,
  },
  logo: {
    width: 90,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  label: {
    color: '#666',
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
  },
  addressColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressBlock: {
    maxWidth: 240,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  table: {
    marginTop: 12,
    borderTop: '1px solid #ddd',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #333',
    paddingVertical: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    paddingVertical: 6,
  },
  colDesc: {
    flex: 4,
  },
  colQty: {
    flex: 1,
    textAlign: 'right',
  },
  colPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  colVat: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1.5,
    textAlign: 'right',
  },
  totals: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    fontWeight: 700,
    fontSize: 12,
    marginTop: 4,
  },
  // "Boxed total" — the grand total gets its own bordered box so it stands
  // out from the subtotal/VAT rows above it, matching the receipt-style
  // redesign (vs. the old plain right-aligned row).
  totalBox: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#111',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTop: '1px solid #ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerNote: {
    color: '#666',
    fontSize: 9,
    maxWidth: 380,
  },
  qr: {
    width: 50,
    height: 50,
  },
})
export type InvoiceLineItem = {
  description: string
  quantity: number
  unitPriceExVat: number
  vatRatePercent: number
}
export type InvoiceData = {
  invoiceNumber: string
  invoiceDate: string
  supplyDate: string
  orderReference: string
  placedAt?: string
  receiptTime?: string
  paymentMethod?: string
  staffName?: string
  currency: string
  business: {
    name: string
    addressLines: string[]
    vatRegistered: boolean
    vatNumber?: string
  }
  // Logo + display name shown at the top of the PDF. Kept separate from
  // `business` (the legal entity used for the VAT block) since the brand
  // shown to the customer can differ from the registered legal name.
  brandName?: string
  brandLogoUrl?: string
  phone?: string
  customer: {
    name: string
    addressLines: string[]
  }
  // Only present for orders actually being shipped (website checkout with
  // a delivery address, or a POS "Ship" sale) — see invoice-service.ts.
  shipTo?: {
    name: string
    addressLines: string[]
  }
  lineItems: InvoiceLineItem[]
  shippingExVat?: number
  shippingVatRatePercent?: number
  // Link encoded into the footer QR code so a customer can scan the
  // printed/PDF invoice to jump straight to their order status page.
  trackingUrl?: string
}
function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount)
}
function InvoiceDocument({ data }: { data: InvoiceData }) {
  const rows = [
    ...data.lineItems,
    ...(data.shippingExVat
      ? [
          {
            description: 'Shipping',
            quantity: 1,
            unitPriceExVat: data.shippingExVat,
            vatRatePercent: data.shippingVatRatePercent ?? 20,
          },
        ]
      : []),
  ]
  const subtotalExVat = rows.reduce(
    (sum, r) => sum + r.unitPriceExVat * r.quantity,
    0,
  )
  const totalVat = data.business.vatRegistered
    ? rows.reduce(
        (sum, r) =>
          sum + r.unitPriceExVat * r.quantity * (r.vatRatePercent / 100),
        0,
      )
    : 0
  const grandTotal = subtotalExVat + totalVat
  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.businessBlock}>
            {data.brandLogoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
              <Image style={styles.logo} src={data.brandLogoUrl} />
            )}
            <Text style={styles.title}>
              {data.brandName ?? data.business.name}
            </Text>
            {data.business.addressLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
            {data.phone && <Text>{data.phone}</Text>}
            {data.business.vatRegistered && data.business.vatNumber && (
              <Text
                style={{
                  marginTop: 4,
                }}
              >
                VAT Reg No: {data.business.vatNumber}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.title}>
              {data.business.vatRegistered ? 'VAT Invoice' : 'Invoice'}
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice No.</Text>
              <Text>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice Date</Text>
              <Text>{data.invoiceDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order No.</Text>
              <Text>{data.orderReference}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order Date</Text>
              <Text>
                {data.placedAt ?? data.supplyDate}
                {data.receiptTime ? `, ${data.receiptTime}` : ''}
              </Text>
            </View>
            {data.paymentMethod && (
              <View style={styles.row}>
                <Text style={styles.label}>Payment Method</Text>
                <Text>{data.paymentMethod}</Text>
              </View>
            )}
            {data.staffName && (
              <View style={styles.row}>
                <Text style={styles.label}>Served By</Text>
                <Text>{data.staffName}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={data.shipTo ? styles.addressColumns : styles.section}>
          <View style={data.shipTo ? styles.addressBlock : undefined}>
            <Text style={styles.label}>Bill To</Text>
            <Text>{data.customer.name}</Text>
            {data.customer.addressLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
          {data.shipTo && (
            <View style={styles.addressBlock}>
              <Text style={styles.label}>Ship To</Text>
              <Text>{data.shipTo.name}</Text>
              {data.shipTo.addressLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit (ex VAT)</Text>
            {data.business.vatRegistered && (
              <Text style={styles.colVat}>VAT</Text>
            )}
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {rows.map((item, i) => {
            const lineTotal =
              item.unitPriceExVat *
              item.quantity *
              (data.business.vatRegistered ? 1 + item.vatRatePercent / 100 : 1)
            return (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>
                  {formatMoney(item.unitPriceExVat, data.currency)}
                </Text>
                {data.business.vatRegistered && (
                  <Text style={styles.colVat}>{item.vatRatePercent}%</Text>
                )}
                <Text style={styles.colTotal}>
                  {formatMoney(lineTotal, data.currency)}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal (ex VAT)</Text>
            <Text>{formatMoney(subtotalExVat, data.currency)}</Text>
          </View>
          {data.business.vatRegistered && (
            <View style={styles.totalRow}>
              <Text>VAT</Text>
              <Text>{formatMoney(totalVat, data.currency)}</Text>
            </View>
          )}
          <View style={styles.totalBox}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>
              {formatMoney(grandTotal, data.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Thank you for shopping with {data.brandName ?? data.business.name}.
          </Text>
          {data.trackingUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image style={styles.qr} src={qrDataUrl(data.trackingUrl)} />
          )}
        </View>
      </Page>
    </Document>
  )
}
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />)
}
