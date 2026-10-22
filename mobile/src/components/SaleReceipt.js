import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatDateTime } from '../utils/date';
import { formatMoney } from '../utils/format';
import { useToast } from './Toast';
import { Button, Row } from './UI';
import { colors, radius, spacing } from '../theme';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReceiptHtml(sale) {
  const items = sale.saleItems || [];
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount = sale.discount || 0;
  const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #374151; padding: 18px; }
  .shop { text-align: center; border-bottom: 1px dashed #9ca3af; padding-bottom: 10px; margin-bottom: 10px; }
  .shop h1 { font-size: 20px; margin: 0; letter-spacing: 1px; }
  .shop p { margin: 3px 0 0; font-size: 11px; color: #6b7280; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; margin: 4px 0; }
  .refunded { border: 1px solid #dc2626; color: #dc2626; background: #fee2e2; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 10px 0; }
  th { text-align: left; color: #9ca3af; border-bottom: 1px solid #e5e7eb; padding: 4px 0; }
  th.qty, td.qty { text-align: center; }
  th.amt, td.amt { text-align: right; }
  td { border-bottom: 1px dashed #e5e7eb; padding: 6px 0; }
  .muted { color: #9ca3af; font-size: 9px; display: block; }
  .totals div { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; }
  .total { font-size: 15px; font-weight: bold; color: #111827; border-top: 1px dashed #9ca3af; padding-top: 5px; }
  .balance { color: #c2410c; font-weight: bold; }
  .thanks { text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px dashed #9ca3af; margin-top: 14px; padding-top: 10px; }
</style></head>
<body>
  <div class="shop">
    <h1>MOBILE SHOP</h1>
    <p>Mobile Shop Management System</p>
    <p>Sales Receipt</p>
  </div>
  <div class="meta"><span>Receipt #${String(sale.id).padStart(4, '0')}</span><span>${escapeHtml(formatDateTime(sale.createdAt))}</span></div>
  <div class="meta"><span>Customer: ${escapeHtml(sale.customer?.name || 'Walk-in')}</span><span>Served by: ${escapeHtml(sale.user?.name || '—')}</span></div>
  ${sale.status === 'refunded' ? '<div class="refunded">REFUNDED</div>' : ''}
  <table>
    <thead><tr><th>Item</th><th class="qty">Qty</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${items.map((item) => `<tr>
        <td>${escapeHtml(item.product ? `${item.product.brand} ${item.product.model}` : `Product #${item.productId}`)}<span class="muted">${formatMoney(item.unitPrice)} each</span></td>
        <td class="qty">${item.quantity}</td>
        <td class="amt">${formatMoney(item.total)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
    ${discount > 0 ? `<div style="color:#dc2626"><span>Discount</span><span>− ${formatMoney(discount)}</span></div>` : ''}
    <div class="total"><span>Total</span><span>${formatMoney(sale.totalAmount)}</span></div>
    <div><span>Paid (${escapeHtml(sale.paymentMode)})</span><span>${formatMoney(sale.paidAmount)}</span></div>
    ${balance > 0 ? `<div class="balance"><span>Balance (Udhar)</span><span>${formatMoney(balance)}</span></div>` : ''}
  </div>
  <p class="thanks">Thank you for shopping with us!</p>
</body></html>`;
}

function buildReceiptText(sale) {
  const items = sale.saleItems || [];
  const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));
  return [
    'MOBILE SHOP — Sales Receipt',
    `Receipt #${String(sale.id).padStart(4, '0')}`,
    formatDateTime(sale.createdAt),
    `Customer: ${sale.customer?.name || 'Walk-in'}`,
    '',
    ...items.map((item) => `${item.product ? `${item.product.brand} ${item.product.model}` : `Product #${item.productId}`} x${item.quantity} = ${formatMoney(item.total)}`),
    '',
    `Total: ${formatMoney(sale.totalAmount)}`,
    `Paid: ${formatMoney(sale.paidAmount)}`,
    balance > 0 ? `Balance (Udhar): ${formatMoney(balance)}` : null,
  ].filter(Boolean).join('\n');
}

export default function SaleReceipt({ sale, onClose }) {
  const toast = useToast();
  if (!sale) return null;

  const items = sale.saleItems || [];
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount = sale.discount || 0;
  const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));

  const print = async () => {
    try {
      await Print.printAsync({ html: buildReceiptHtml(sale) });
    } catch (err) {
      if (!String(err?.message || '').includes('cancel')) toast.error('Could not open printing');
    }
  };

  const share = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(sale) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Sale receipt', UTI: 'com.adobe.pdf' });
      } else {
        toast.info('Sharing is not available on this device');
      }
    } catch {
      toast.error('Could not create the receipt PDF');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Row style={styles.header}>
            <Text style={styles.headerTitle}>🧾 Sale Receipt</Text>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
          </Row>

          <ScrollView contentContainerStyle={styles.receipt}>
            <View style={styles.shopBlock}>
              <Text style={styles.shopName}>📱 MOBILE SHOP</Text>
              <Text style={styles.shopSub}>Mobile Shop Management System</Text>
              <Text style={styles.shopSub}>Sales Receipt</Text>
            </View>

            <Row><Text style={styles.meta}>Receipt #{String(sale.id).padStart(4, '0')}</Text><Text style={styles.meta}>{formatDateTime(sale.createdAt)}</Text></Row>
            <Row style={{ marginBottom: 10 }}>
              <Text style={styles.meta}>Customer: {sale.customer?.name || 'Walk-in'}</Text>
              <Text style={styles.meta}>Served by: {sale.user?.name || '—'}</Text>
            </Row>

            {sale.status === 'refunded' && (
              <View style={styles.refunded}><Text style={styles.refundedText}>REFUNDED</Text></View>
            )}

            <Row style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1 }]}>Item</Text>
              <Text style={styles.th}>Qty</Text>
              <Text style={[styles.th, { textAlign: 'right', width: 80 }]}>Amount</Text>
            </Row>
            {items.map((item) => (
              <Row key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemName}>{item.product ? `${item.product.brand} ${item.product.model}` : `Product #${item.productId}`}</Text>
                  <Text style={styles.unit}>{formatMoney(item.unitPrice)} each</Text>
                </View>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Text style={styles.amount}>{formatMoney(item.total)}</Text>
              </Row>
            ))}

            <View style={{ marginTop: 8 }}>
              <Row><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatMoney(subtotal)}</Text></Row>
              {discount > 0 && <Row><Text style={[styles.totalLabel, { color: colors.danger }]}>Discount</Text><Text style={[styles.totalValue, { color: colors.danger }]}>− {formatMoney(discount)}</Text></Row>}
              <Row style={styles.grand}><Text style={styles.grandLabel}>Total</Text><Text style={styles.grandValue}>{formatMoney(sale.totalAmount)}</Text></Row>
              <Row><Text style={styles.totalLabel}>Paid ({sale.paymentMode})</Text><Text style={styles.totalValue}>{formatMoney(sale.paidAmount)}</Text></Row>
              {balance > 0 && <Row><Text style={[styles.totalLabel, { color: colors.warning, fontWeight: '700' }]}>Balance (Udhar)</Text><Text style={[styles.totalValue, { color: colors.warning, fontWeight: '700' }]}>{formatMoney(balance)}</Text></Row>}
            </View>

            <Text style={styles.thanks}>Thank you for shopping with us!</Text>
          </ScrollView>

          <View style={styles.actions}>
            <Button title="🖨 Print / PDF" variant="dark" style={{ flex: 1 }} onPress={print} />
            <Button title="Share" variant="ghost" style={{ flex: 1 }} onPress={share} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, maxHeight: '92%', overflow: 'hidden' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  close: { fontSize: 20, color: colors.textLight },
  receipt: { padding: spacing.lg },
  shopBlock: { alignItems: 'center', borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.textLight, paddingBottom: 10, marginBottom: 10 },
  shopName: { fontSize: 19, fontWeight: '800', letterSpacing: 1, color: colors.text },
  shopSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  meta: { fontSize: 10, color: colors.textMuted },
  refunded: { borderWidth: 1, borderColor: colors.danger, backgroundColor: '#fee2e2', borderRadius: 6, paddingVertical: 4, alignItems: 'center', marginBottom: 8 },
  refundedText: { color: colors.danger, fontSize: 10, fontWeight: '800' },
  tableHead: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  th: { fontSize: 10, color: colors.textLight, fontWeight: '600' },
  itemRow: { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: '#f3f4f6', paddingVertical: 7, alignItems: 'flex-start' },
  itemName: { fontSize: 11, color: colors.text },
  unit: { fontSize: 9, color: colors.textLight },
  qty: { fontSize: 11, color: colors.text, paddingHorizontal: 8 },
  amount: { fontSize: 11, color: colors.text, width: 80, textAlign: 'right' },
  totalLabel: { fontSize: 11, color: colors.textMuted },
  totalValue: { fontSize: 11, color: colors.text },
  grand: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.textLight, paddingTop: 5, marginTop: 3 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  grandValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  thanks: { textAlign: 'center', fontSize: 9, color: colors.textLight, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.textLight, marginTop: 14, paddingTop: 10 },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
