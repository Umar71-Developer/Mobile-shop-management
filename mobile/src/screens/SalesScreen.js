import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import SaleReceipt from '../components/SaleReceipt';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { formatDateTime } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme';

const TABS = [
  { value: 'pos', label: '🛒 New Sale' },
  { value: 'history', label: '🧾 History' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
];

export default function SalesScreen() {
  const toast = useToast();
  const [tab, setTab] = useState('pos');

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);

  const [sales, setSales] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refundingId, setRefundingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers')
      .then((res) => setCustomers(res.data))
      .catch((err) => toast.error(errorMessage(err, 'Could not load customers')));
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setProducts([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get('/products', { params: { search: search.trim() } })
        .then((res) => setProducts(res.data))
        .catch((err) => toast.error(errorMessage(err, 'Could not search products')));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/sales', {
        params: {
          page,
          limit: 10,
          status: statusFilter || undefined,
          search: appliedSearch || undefined,
        },
      });
      setSales(res.data.items);
      setPageInfo({ page: res.data.page, pages: res.data.pages, total: res.data.total });
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load sales history'));
    } finally {
      setLoadingHistory(false);
    }
  }, [page, statusFilter, appliedSearch]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const addToCart = (product) => {
    if ((product.stockQty || 0) < 1) {
      return toast.error(`${product.brand} ${product.model} is out of stock`);
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.qty >= product.stockQty) {
      return toast.error(`Only ${product.stockQty} unit(s) in stock`);
    }
    setCart((prev) => {
      const match = prev.find((item) => item.id === product.id);
      if (match) {
        return prev.map((item) => item.id === product.id
          ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.sellingPrice }
          : item);
      }
      return [...prev, { ...product, qty: 1, total: product.sellingPrice }];
    });
    setSearch('');
    setProducts([]);
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const max = Math.max(1, item.stockQty || 1);
      const next = Math.min(max, Math.max(1, item.qty + delta));
      return { ...item, qty: next, total: next * item.sellingPrice };
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountValue = Number(discount) || 0;
  const finalTotal = Math.max(0, subtotal - discountValue);

  const handleSale = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (discountValue > subtotal) return toast.error('Discount cannot be greater than the subtotal');

    const received = paidAmount.trim() === '' ? finalTotal : Number(paidAmount);
    if (!Number.isFinite(received) || received < 0) return toast.error('Enter a valid amount received');
    if (received > finalTotal + 0.01) return toast.error('Amount received cannot be greater than the total');
    if (finalTotal - received > 0 && !customerId) {
      return toast.error('Select a customer to record the unpaid balance as udhar');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/sales', {
        customerId: customerId ? parseInt(customerId, 10) : null,
        items: cart.map((item) => ({ productId: item.id, quantity: item.qty })),
        discount: discountValue,
        paymentMode,
        paidAmount: received,
      });
      toast.success('Sale completed ✅');
      setCart([]);
      setCustomerId('');
      setDiscount('');
      setPaidAmount('');
      setPaymentMode('cash');
      setReceiptSale(res.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Sale failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = (sale) => {
    Alert.alert(
      `Refund sale #${sale.id}?`,
      'Stock will be restored and the sale marked refunded. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            setRefundingId(sale.id);
            try {
              await api.post(`/sales/${sale.id}/refund`);
              toast.success('Sale refunded and stock restored');
              await loadHistory();
            } catch (err) {
              toast.error(errorMessage(err, 'Refund failed'));
            } finally {
              setRefundingId(null);
            }
          },
        },
      ]
    );
  };

  const customerOptions = customers.map((customer) => ({
    value: String(customer.id),
    label: `${customer.name} — ${customer.phone}`,
  }));

  return (
    <Screen>
      <Chips value={tab} options={TABS} onChange={(value) => { setTab(value); setPage(1); }} />

      {tab === 'pos' ? (
        <>
          <Card style={{ padding: spacing.md }}>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="🔍 Search product by name, model, IMEI..."
              style={{ marginBottom: 0 }}
            />
            {products.length > 0 && (
              <View style={styles.results}>
                {products.slice(0, 8).map((product, index) => (
                  <Pressable
                    key={product.id}
                    onPress={() => addToCart(product)}
                    style={[styles.resultRow, index > 0 && styles.resultBorder]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.resultName}>{product.brand} {product.model}</Text>
                      <Text style={styles.resultMeta}>
                        {[product.color, product.storage].filter(Boolean).join(' • ')} · {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
                      </Text>
                    </View>
                    <Text style={styles.resultPrice}>{formatMoney(product.sellingPrice)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          <Row style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            <SectionTitle style={{ marginBottom: 0 }}>Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})</SectionTitle>
            {cart.length > 0 && (
              <Pressable onPress={() => setCart([])} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            )}
          </Row>

          {cart.length === 0 ? (
            <Card><EmptyState icon="🛒" title="Cart is empty" sub="Search a product above to add it" /></Card>
          ) : (
            <Card>
              {cart.map((item, index) => (
                <View key={item.id} style={[styles.cartRow, index > 0 && styles.resultBorder]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cartName}>{item.brand} {item.model}</Text>
                    <Text style={styles.cartMeta}>{formatMoney(item.sellingPrice)} each · {item.stockQty} in stock</Text>
                    <View style={styles.qtyControls}>
                      <Pressable onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>−</Text></Pressable>
                      <Text style={styles.qtyValue}>{item.qty}</Text>
                      <Pressable
                        onPress={() => updateQty(item.id, 1)}
                        disabled={item.qty >= (item.stockQty || 1)}
                        style={[styles.qtyBtn, item.qty >= (item.stockQty || 1) && { opacity: 0.35 }]}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                      <Pressable onPress={() => setCart((prev) => prev.filter((entry) => entry.id !== item.id))} hitSlop={8} style={{ marginLeft: 12 }}>
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.cartTotal}>{formatMoney(item.total)}</Text>
                </View>
              ))}
            </Card>
          )}

          <SectionTitle style={{ marginTop: spacing.lg }}>Order summary</SectionTitle>
          <Card>
            <Select
              label="Customer (optional)"
              value={customerId}
              options={customerOptions}
              onChange={setCustomerId}
              placeholder="Walk-in Customer"
              allowClear
            />

            <Text style={styles.fieldLabel}>Payment mode</Text>
            <Chips
              value={paymentMode}
              options={[{ value: 'cash', label: '💵 Cash' }, { value: 'jazzcash', label: '📲 JazzCash' }]}
              onChange={setPaymentMode}
            />

            <Input
              label="Discount (Rs.)"
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <Input
              label="Amount received (optional)"
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="decimal-pad"
              placeholder="Leave blank for full payment"
            />

            <View style={styles.totals}>
              <Row><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatMoney(subtotal)}</Text></Row>
              {discountValue > 0 && (
                <Row><Text style={styles.totalLabel}>Discount</Text><Text style={[styles.totalValue, { color: colors.danger }]}>− {formatMoney(discountValue)}</Text></Row>
              )}
              <Row style={styles.grandRow}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatMoney(finalTotal)}</Text>
              </Row>
              {paidAmount.trim() !== '' && Number(paidAmount) < finalTotal && (
                <Row style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.warning }}>Balance (Udhar)</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>{formatMoney(finalTotal - Number(paidAmount))}</Text>
                </Row>
              )}
            </View>

            <Button
              title={submitting ? 'Processing...' : '✅ Complete Sale'}
              variant="success"
              onPress={handleSale}
              disabled={cart.length === 0}
              loading={submitting}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        </>
      ) : (
        <>
          <Chips value={statusFilter} options={STATUS_FILTERS} onChange={(value) => { setStatusFilter(value); setPage(1); }} />
          <Row style={{ gap: 8, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                value={historySearch}
                onChangeText={setHistorySearch}
                placeholder="Receipt #, customer or phone"
                style={{ marginBottom: 0 }}
                onSubmitEditing={() => { setPage(1); setAppliedSearch(historySearch.trim()); }}
              />
            </View>
            <Button title="Search" size="sm" variant="dark" onPress={() => { setPage(1); setAppliedSearch(historySearch.trim()); }} />
          </Row>

          <ErrorBanner message={error} />

          {loadingHistory ? (
            <EmptyState icon="⏳" title="Loading sales..." />
          ) : sales.length === 0 ? (
            <EmptyState icon="🧾" title="No sales found" />
          ) : (
            sales.map((sale) => {
              const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));
              const itemCount = (sale.saleItems || []).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <Card key={sale.id} style={{ marginBottom: spacing.sm }}>
                  <Row>
                    <Text style={styles.receiptNo}>#{String(sale.id).padStart(4, '0')}</Text>
                    <Badge tone={sale.status === 'refunded' ? 'red' : 'green'}>{sale.status}</Badge>
                  </Row>
                  <Text style={styles.saleDate}>{formatDateTime(sale.createdAt)}</Text>
                  <Row style={{ marginTop: 6 }}>
                    <Text style={styles.saleCustomer}>{sale.customer?.name || 'Walk-in'}</Text>
                    <Text style={styles.saleMeta}>{itemCount} item(s) · {sale.paymentMode}</Text>
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <View>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={styles.priceStrong}>{formatMoney(sale.totalAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.priceLabel}>Paid</Text>
                      <Text style={[styles.priceStrong, { color: colors.success }]}>{formatMoney(sale.paidAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.priceLabel}>Balance</Text>
                      <Text style={[styles.priceStrong, { color: balance > 0 ? colors.warning : colors.textLight }]}>{formatMoney(balance)}</Text>
                    </View>
                  </Row>
                  <Row style={{ marginTop: spacing.md }}>
                    <Button title="🧾 Receipt" size="sm" variant="ghost" onPress={() => setReceiptSale(sale)} />
                    {sale.status === 'completed' ? (
                      <Button
                        title={refundingId === sale.id ? '...' : '↩ Refund'}
                        size="sm"
                        variant="ghost"
                        onPress={() => handleRefund(sale)}
                        disabled={refundingId === sale.id}
                      />
                    ) : <View />}
                  </Row>
                </Card>
              );
            })
          )}

          {pageInfo.pages > 1 && (
            <Row style={{ marginTop: spacing.sm }}>
              <Button title="‹ Prev" size="sm" variant="ghost" disabled={pageInfo.page <= 1} onPress={() => setPage(pageInfo.page - 1)} />
              <Text style={styles.pageText}>Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} sales</Text>
              <Button title="Next ›" size="sm" variant="ghost" disabled={pageInfo.page >= pageInfo.pages} onPress={() => setPage(pageInfo.page + 1)} />
            </Row>
          )}
        </>
      )}

      <SaleReceipt sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  results: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  resultBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  resultName: { fontSize: 13, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: 10, color: colors.textLight, marginTop: 1 },
  resultPrice: { fontSize: 12, fontWeight: '700', color: colors.success },
  clear: { fontSize: 11, color: colors.danger, fontWeight: '600' },
  cartRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  cartName: { fontSize: 13, fontWeight: '600', color: colors.text },
  cartMeta: { fontSize: 10, color: colors.textLight, marginTop: 1 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 18 },
  qtyValue: { width: 30, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.text },
  remove: { fontSize: 10, color: colors.danger, fontWeight: '600' },
  cartTotal: { fontSize: 13, fontWeight: '700', color: colors.text, paddingTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  totals: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  totalLabel: { fontSize: 12, color: colors.textMuted },
  totalValue: { fontSize: 12, color: colors.text },
  grandRow: { marginTop: 4 },
  grandLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  grandValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  receiptNo: { fontSize: 13, fontWeight: '800', color: colors.primary },
  saleDate: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  saleCustomer: { fontSize: 13, fontWeight: '600', color: colors.text },
  saleMeta: { fontSize: 10, color: colors.textMuted },
  priceLabel: { fontSize: 9, color: colors.textLight, textTransform: 'uppercase' },
  priceStrong: { fontSize: 12, fontWeight: '700', color: colors.text },
  pageText: { fontSize: 10, color: colors.textMuted },
});
