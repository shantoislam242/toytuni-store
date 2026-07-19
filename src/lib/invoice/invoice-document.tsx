import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";
import type { InvoiceData } from "./build-invoice-data";

// The built-in Helvetica font has no Bengali Taka glyph (৳ U+09F3) — it renders as
// tofu in the PDF — so invoices use the ASCII "Tk" prefix instead.
const tk = (n: number) => `Tk ${n.toLocaleString("en-US")}`;

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 6,
  },
  brandContactLine: {
    fontSize: 9,
    color: "#333333",
  },
  invoiceTitleBlock: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  invoiceMetaLine: {
    fontSize: 9,
    color: "#333333",
  },
  billTo: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#777777",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  billToName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  billToLine: {
    fontSize: 9,
    color: "#333333",
  },
  table: {
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #111111",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eeeeee",
    paddingVertical: 4,
  },
  colItem: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  colLineTotal: { flex: 1.5, textAlign: "right" },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableCellText: {
    fontSize: 9,
  },
  totalsBlock: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsLabel: {
    fontSize: 9,
    color: "#333333",
  },
  totalsValue: {
    fontSize: 9,
  },
  totalsRowFinal: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTop: "1px solid #111111",
  },
  totalsLabelFinal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  totalsValueFinal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
});

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const toAddressLines = data.to.address.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{data.from.name}</Text>
            {data.from.tagline ? (
              <Text style={styles.brandTagline}>{data.from.tagline}</Text>
            ) : null}
            <Text style={styles.brandContactLine}>{data.from.phone}</Text>
            <Text style={styles.brandContactLine}>{data.from.email}</Text>
            <Text style={styles.brandContactLine}>{data.from.address}</Text>
          </View>
          <View style={styles.invoiceTitleBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMetaLine}>{data.orderNumber}</Text>
            <Text style={styles.invoiceMetaLine}>
              {formatDate(data.dateIso.slice(0, 10))}
            </Text>
            <Text style={styles.invoiceMetaLine}>
              Payment: {data.paymentStatusLabel}
            </Text>
            <Text style={styles.invoiceMetaLine}>
              Order: {data.orderStatusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.sectionLabel}>Bill to</Text>
          <Text style={styles.billToName}>{data.to.name}</Text>
          <Text style={styles.billToLine}>{data.to.phone}</Text>
          {data.to.email ? (
            <Text style={styles.billToLine}>{data.to.email}</Text>
          ) : null}
          {toAddressLines.map((line, i) => (
            <Text key={i} style={styles.billToLine}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colItem, styles.tableHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colUnit, styles.tableHeaderText]}>Unit</Text>
            <Text style={[styles.colLineTotal, styles.tableHeaderText]}>
              Line total
            </Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.colItem, styles.tableCellText]}>
                {item.title}
              </Text>
              <Text style={[styles.colQty, styles.tableCellText]}>
                {item.qty}
              </Text>
              <Text style={[styles.colUnit, styles.tableCellText]}>
                {tk(item.unitPrice)}
              </Text>
              <Text style={[styles.colLineTotal, styles.tableCellText]}>
                {tk(item.lineTotal)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{tk(data.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Delivery</Text>
            <Text style={styles.totalsValue}>{tk(data.deliveryFee)}</Text>
          </View>
          {data.advanceTotal > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Advance paid</Text>
              <Text style={styles.totalsValue}>{tk(data.advanceTotal)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabelFinal}>Total</Text>
            <Text style={styles.totalsValueFinal}>{tk(data.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
