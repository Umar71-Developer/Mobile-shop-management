import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select, StatCard,
} from '../components/UI';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme';

const EMPTY = {
  brand: '', model: '', color: '', storage: '', category: 'phone',
  imei: '', purchasePrice: '', sellingPrice: '', stockQty: '1',
};

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'phone', label: '📱 Phones' },
  { value: 'accessory', label: '🎧 Accessories' },
  { value: 'sim', label: '📡 SIMs' },
];

const CATEGORY_OPTIONS = [
  { value: 'phone', label: '📱 Phone' },
  { value: 'accessory', label: '🎧 Accessory' },
  { value: 'sim', label: '📡 SIM' },
];

const stockOf = (product) => Math.max(0, Number(product?.stockQty) || 0);

export default function InventoryScreen() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          category: category || undefined,
          lowStock: lowStock ? 'true' : undefined,
        },
      });
      setProducts(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load products'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category, lowStock]);

  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const summary = products.reduce((acc, product) => {
    const qty = stockOf(product);
    const invested = (product.purchasePrice || 0) * qty;
    const revenue = (product.sellingPrice || 0) * qty;
    return {
      totalInvested: acc.totalInvested + invested,
      totalRevenue: acc.totalRevenue + revenue,
      totalProfit: acc.totalProfit + (revenue - invested),
      totalItems: acc.totalItems + qty,
    };
  }, { totalInvested: 0, totalRevenue: 0, totalProfit: 0, totalItems: 0 });

  const overallMargin = summary.totalInvested > 0
    ? ((summary.totalProfit / summary.totalInvested) * 100).toFixed(1)
    : '0';

  const byCategory = ['phone', 'accessory', 'sim'].map((cat) => {
    const items = products.filter((product) => product.category === cat);
    const invested = items.reduce((sum, product) => sum + (product.purchasePrice || 0) * stockOf(product), 0);
    const revenue = items.reduce((sum, product) => sum + (product.sellingPrice || 0) * stockOf(product), 0);
    return { cat, count: items.length, invested, revenue, profit: revenue - invested };
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (product) => {
    setEditing(product);
    setForm({
      brand: product.brand || '',
      model: product.model || '',
      color: product.color || '',
      storage: product.storage || '',
      category: product.category || 'phone',
      imei: product.imei || '',
      purchasePrice: String(product.purchasePrice ?? ''),
      sellingPrice: String(product.sellingPrice ?? ''),
      stockQty: String(product.stockQty ?? 0),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.brand.trim() || !form.model.trim()) return toast.error('Brand and model are required');
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);
    const stockQty = Number(form.stockQty);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) return toast.error('Enter a valid purchase price');
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) return toast.error('Enter a valid selling price');
    if (!Number.isInteger(stockQty) || stockQty < 0) return toast.error('Stock must be a whole number of 0 or more');

    setSaving(true);
    try {
      const payload = {
        ...form,
        brand: form.brand.trim(),
        model: form.model.trim(),
        imei: form.imei.trim(),
        purchasePrice,
        sellingPrice,
        stockQty,
      };
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      toast.success(editing ? 'Product updated' : 'Product added');
      setShowForm(false);
      await load({ silent: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save product'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (product) => {
    Alert.alert('Delete product?', `${product.brand} ${product.model} will be removed from inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${product.id}`);
            toast.success('Product deleted');
            await load({ silent: true });
          } catch (err) {
            toast.error(errorMessage(err, 'Could not delete product'));
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load({ silent: true }); }}>
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>📦 Inventory</SectionTitle>
        <Button title="＋ Add" size="sm" onPress={openAdd} />
      </Row>

      <ErrorBanner message={error} />

      <View style={styles.grid}>
        <StatCard title="Stock Items" value={String(summary.totalItems)} icon="📦" tone="gray" sub={`${products.length} product lines`} />
        <StatCard title="Invested" value={formatMoney(summary.totalInvested)} icon="💰" tone="blue" sub="Purchase cost of stock" />
        <StatCard title="Selling Value" value={formatMoney(summary.totalRevenue)} icon="🏷️" tone="purple" sub="If all stock sold" />
        <StatCard title="Potential Profit" value={formatMoney(summary.totalProfit)} icon="📈" tone={summary.totalProfit >= 0 ? 'green' : 'red'} sub={`Margin ${overallMargin}%`} />
      </View>

      <SectionTitle style={{ marginTop: spacing.lg }}>By category</SectionTitle>
      {byCategory.map(({ cat, count, invested, revenue, profit }) => (
        <Card key={cat} style={{ marginBottom: spacing.sm, padding: spacing.md }}>
          <Row>
            <Text style={styles.catName}>{cat === 'phone' ? '📱 Phones' : cat === 'accessory' ? '🎧 Accessories' : '📡 SIMs'}</Text>
            <Badge tone="gray">{count} items</Badge>
          </Row>
          <Row style={{ marginTop: 6 }}>
            <Text style={styles.catMeta}>Invested {formatMoney(invested)}</Text>
            <Text style={styles.catMeta}>Sell {formatMoney(revenue)}</Text>
            <Text style={[styles.catProfit, { color: profit >= 0 ? colors.success : colors.danger }]}>{formatMoney(profit)}</Text>
          </Row>
        </Card>
      ))}

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="🔍 Search brand, model, IMEI..."
        style={{ marginTop: spacing.md }}
      />
      <Chips value={category} options={CATEGORIES} onChange={setCategory} />
      <Pressable onPress={() => setLowStock((value) => !value)} style={styles.checkboxRow}>
        <View style={[styles.checkbox, lowStock && styles.checkboxOn]}>
          {lowStock ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>Low stock only (2 units or fewer)</Text>
      </Pressable>

      {loading ? (
        <EmptyState icon="⏳" title="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState icon="📦" title="No products found" sub="Add a product to get started" />
      ) : (
        products.map((product) => {
          const stock = stockOf(product);
          const unitProfit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
          return (
            <Card key={product.id} style={{ marginTop: spacing.sm }}>
              <Row>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.productName}>{product.brand} {product.model}</Text>
                  <Text style={styles.productMeta}>
                    {[product.color, product.storage, product.imei ? `IMEI: ${product.imei}` : ''].filter(Boolean).join(' • ') || product.category}
                  </Text>
                </View>
                <Badge tone={stock === 0 ? 'red' : stock <= 2 ? 'orange' : 'green'}>
                  {stock === 0 ? 'Out' : `${stock} left`}
                </Badge>
              </Row>

              <Row style={{ marginTop: 8 }}>
                <View>
                  <Text style={styles.priceLabel}>Buy</Text>
                  <Text style={styles.price}>{formatMoney(product.purchasePrice)}</Text>
                </View>
                <View>
                  <Text style={styles.priceLabel}>Sell</Text>
                  <Text style={[styles.price, { color: colors.purple }]}>{formatMoney(product.sellingPrice)}</Text>
                </View>
                <View>
                  <Text style={styles.priceLabel}>Profit / unit</Text>
                  <Text style={[styles.price, { color: unitProfit >= 0 ? colors.success : colors.danger }]}>{formatMoney(unitProfit)}</Text>
                </View>
              </Row>

              <Row style={{ marginTop: spacing.md }}>
                <Badge tone="blue">{product.category}</Badge>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(product)} />
                  <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(product)} />
                </View>
              </Row>
            </Card>
          );
        })
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Product' : '＋ Add Product'} onClose={() => setShowForm(false)}>
        <Input label="Brand *" value={form.brand} onChangeText={(brand) => setForm({ ...form, brand })} />
        <Input label="Model *" value={form.model} onChangeText={(model) => setForm({ ...form, model })} />
        <Input label="Color" value={form.color} onChangeText={(color) => setForm({ ...form, color })} />
        <Input label="Storage" value={form.storage} onChangeText={(storage) => setForm({ ...form, storage })} placeholder="e.g. 128GB" />
        <Input label="IMEI (optional)" value={form.imei} onChangeText={(imei) => setForm({ ...form, imei })} />
        <Select label="Category" value={form.category} options={CATEGORY_OPTIONS} onChange={(category) => setForm({ ...form, category })} inline />
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Stock Qty" value={form.stockQty} onChangeText={(stockQty) => setForm({ ...form, stockQty })} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Purchase Price *" value={form.purchasePrice} onChangeText={(purchasePrice) => setForm({ ...form, purchasePrice })} keyboardType="decimal-pad" />
          </View>
        </Row>
        <Input label="Selling Price *" value={form.sellingPrice} onChangeText={(sellingPrice) => setForm({ ...form, sellingPrice })} keyboardType="decimal-pad" />

        {Number(form.purchasePrice) > 0 && Number(form.sellingPrice) > 0 && (
          <Text style={styles.preview}>
            Profit per unit: {formatMoney(Number(form.sellingPrice) - Number(form.purchasePrice))}
          </Text>
        )}

        <Button title={editing ? 'Update Product' : 'Add Product'} onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catName: { fontSize: 13, fontWeight: '700', color: colors.text },
  catMeta: { fontSize: 10, color: colors.textMuted },
  catProfit: { fontSize: 11, fontWeight: '700' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: colors.white,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 12, fontWeight: '800' },
  checkboxLabel: { fontSize: 12, color: colors.textMuted },
  productName: { fontSize: 14, fontWeight: '700', color: colors.text },
  productMeta: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  priceLabel: { fontSize: 9, color: colors.textLight, textTransform: 'uppercase', marginBottom: 2 },
  price: { fontSize: 12, fontWeight: '700', color: colors.text },
  preview: { fontSize: 12, color: colors.success, fontWeight: '600', marginBottom: spacing.md },
});
