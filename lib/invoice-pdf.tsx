// lib/invoice-pdf.tsx
//
// UK VAT invoice PDF, built with @react-pdf/renderer.
// npm install @react-pdf/renderer
//
// Money convention: amounts here are DECIMAL (e.g. 19.99), matching
// formatCurrency() in lib/utils.ts and how this app already reads
// order.total / item.unit_price elsewhere — Medusa v2 in this project
// does NOT store amounts in pence/cents.
//
// vatRegistered / vatNumber: PENDING client confirmation (see status
// notes). Until confirmed, BUSINESS_VAT_REGISTERED stays "false" in
// .env.local so the template never wrongly displays a VAT number or
// charges VAT that isn't owed. Flip only once the client confirms.
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  businessBlock: { maxWidth: 260 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  label: { color: '#666', marginBottom: 2 },
  section: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  table: { marginTop: 12, borderTop: '1px solid #ddd' },
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
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colVat: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: { fontWeight: 700, fontSize: 12, marginTop: 4 },
})

export type InvoiceLineItem = {
  description: string
  quantity: number
  unitPriceExVat: number // decimal, e.g. 19.99
  vatRatePercent: number // e.g. 20
}

export type InvoiceData = {
  invoiceNumber: string
  invoiceDate: string
  supplyDate: string
  orderReference: string
  currency: string // e.g. "GBP"

  business: {
    name: string
    addressLines: string[]
    vatRegistered: boolean
    vatNumber?: string
  }

  customer: {
    name: string
    addressLines: string[]
  }

  lineItems: InvoiceLineItem[]
  shippingExVat?: number
  shippingVatRatePercent?: number
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(
    amount,
  )
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
            <Text style={styles.title}>{data.business.name}</Text>
            {data.business.addressLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
            {data.business.vatRegistered && data.business.vatNumber && (
              <Text style={{ marginTop: 4 }}>
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
              <Text style={styles.label}>Supply Date</Text>
              <Text>{data.supplyDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order Ref</Text>
              <Text>{data.orderReference}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <Text>{data.customer.name}</Text>
          {data.customer.addressLines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
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
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{formatMoney(grandTotal, data.currency)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />)
}
