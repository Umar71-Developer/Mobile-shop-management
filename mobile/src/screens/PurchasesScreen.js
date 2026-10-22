import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { formatDate } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const TABS = [
  { value: 'purchases', label: '📥 History' },
  { value: 'suppliers', label: '🏭 Suppliers' },
];

const emptyItem = () => ({ productId: '', description: '', quantity: '1', unitPrice: '' });
const emptyPurchase = () => ({ supplierId: '', notes: '', paidAmount: '', items: [emptyItem()] });

export default function PurchasesScreen() {
  const toast = useToast();
  const [tab, setTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase());
  const [submitting, setSubmitting] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState({ name: '', phone: '' });
  const [addingQuick, setAddingQuick] = useState(false);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '' });

  const loadPurchases = useCallback(async () => {
    try {
      const res = await api.get('/purchases', { params: { page, limit: 10 } });
      setPurchases(res.data.items);
      setPageInfo({ page: res.data.page, pages: res.data.pages, total: res.data.total });
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load purchases'));
    }
  }, [page]);

  const loadReference = useCallback(async () => {
    try {
      const [supplierRes, productRes] = await Promise.all([api.get('/suppliers'), api.get('/products')]);
      setSuppliers(supplierRes.data);
      setProducts(productRes.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load suppliers and products'));
    }
  }, []);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);
  useEffect(() => { loadReference(); }, [loadReference]);

  const purchaseTotal = purchaseForm.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const purchasePaid = Number(purchaseForm.paidAmount) || 0;
  const purchaseBalance = Math.max(0, purchaseTotal - purchasePaid);

  const openPurchase = () => {
    setPurchaseForm(emptyPurchase());
    setShowQuickSupplier(false);
    setQuickSupplier({ name: '', phone: '' });
    setShowPurchase(true);
  };

  const updateItem = (index, patch) => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const onProductChange = (index, productId) => {
    const product = products.find((entry) => String(entry.id) === String(productId));
    updateItem(index, {
      productId,
      description: product ? `${product.brand} ${product.model}` : purchaseForm.items[index].description,
      unitPrice: product ? String(product.purchasePrice) : purchaseForm.items[index].unitPrice,
    });
  };

  const addItem = () => setPurchaseForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (index) => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? [emptyItem()] : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handlePurchase = async () => {
    if (!purchaseForm.supplierId) return toast.error('Select a supplier');
    const items = purchaseForm.items.filter((item) => item.description.trim() && Number(item.quantity) > 0);
    if (items.length === 0) return toast.error('Add at least one item');
    if (items.some((item) => !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) {
      return toast.error('Enter a valid unit price for every item');
    }

    setSubmitting(true);
    try {
      await api.post('/purchases', {
        supplierId: parseInt(purchaseForm.supplierId, 10),
        paidAmount: Number(purchaseForm.paidAmount) || 0,
        notes: purchaseForm.notes,
        items: items.map((item) => ({
          productId: item.productId ? parseInt(item.productId, 10) : undefined,
          description: item.description.trim(),
          quantity: parseInt(item.quantity, 10),
          unitPrice: Number(item.unitPrice) || 0,
        })),
      });
      toast.success('Purchase recorded and stock updated');
      setShowPurchase(false);
      setPurchaseForm(emptyPurchase());
      setPage(1);
      await loadReference();
      if (page === 1) await loadPurchases();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save purchase'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSupplier = async () => {
    if (!quickSupplier.name.trim() || !quickSupplier.phone.trim()) {
      return toast.error('Supplier name and phone are required');
    }
    setAddingQuick(true);
    try {
      const res = await api.post('/suppliers', quickSupplier);
      setSuppliers((prev) => [...prev, res.data]);
      setPurchaseForm((prev) => ({ ...prev, supplierId: String(res.data.id) }));
      setQuickSupplier({ name: '', phone: '' });
      setShowQuickSupplier(false);
      toast.success('Supplier added');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add supplier'));
    } finally {
      setAddingQuick(false);
    }
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', phone: '', address: '' });
    setShowSupplierForm(true);
  };

  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({ name: supplier.name, phone: supplier.phone, address: supplier.address || '' });
    setShowSupplierForm(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      return toast.error('Supplier name and phone are required');
    }
    try {
      if (editingSupplier) await api.put(`/suppliers/${editingSupplier.id}`, supplierForm);
      else await api.post('/suppliers', supplierForm);
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier added');
      setShowSupplierForm(false);
      setEditingSupplier(null);
      await loadReference();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save supplier'));
    }
  };

  const deleteSupplier = (supplier) => {
    Alert.alert('Delete supplier?', `${supplier.name} will be removed. Suppliers with purchases cannot be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/suppliers/${supplier.id}`);
            toast.success('Supplier deleted');
            await loadReference();
          } catch (err) {
            toast.error(errorMessage(err, 'Could not delete supplier'));
          }
        },
      },
    ]);
  };

  const supplierOptions = suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.name} — ${supplier.phone}`,
  }));

  const productOptions = products.map((product) => ({
    value: String(product.id),
    label: `${product.brand} ${product.model} (${product.stockQty} in stock)`,
  }));

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await Promise.all([loadPurchases(), loadReference()]);
        setRefreshing(false);
      }}
    >
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>🚚 Purchases</SectionTitle>
        <Button
          title={tab === 'purchases' ? '＋ New Purchase' : '＋ Add Supplier'}
          size="sm"
          onPress={tab === 'purchases' ? openPurchase : openAddSupplier}
        />
      </Row>

      <Chips value={tab} options={TABS} onChange={setTab} />
      <ErrorBanner message={error} />

      {tab === 'purchases' ? (
        <>
          {purchases.length === 0 ? (
            <EmptyState icon="🚚" title="No purchases recorded yet" />
          ) : (
            purchases.map((purchase) => {
              const balance = Math.max(0, (purchase.totalAmount || 0) - (purchase.paidAmount || 0));
              return (
                <Card key={purchase.id} style={{ marginBottom: spacing.sm }}>
                  <Row>
                    <Text style={styles.supplierName}>{purchase.supplier?.name || 'Supplier'}</Text>
                    <Text style={styles.date}>{formatDate(purchase.createdAt)}</Text>
                  </Row>
                  <Text style={styles.phone}>{purchase.supplier?.phone || ''}</Text>
                  <Text style={styles.itemsText}>
                    {purchase.items.length} line(s): {purchase.items.map((item) => `${item.description} ×${item.quantity}`).join(', ')}
                  </Text>
                  <Row style={{ marginTop: 8 }}>
                    <View>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={styles.priceStrong}>{formatMoney(purchase.totalAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.priceLabel}>Paid</Text>
                      <Text style={[styles.priceStrong, { color: colors.success }]}>{formatMoney(purchase.paidAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.priceLabel}>Balance</Text>
                      <Text style={[styles.priceStrong, { color: balance > 0 ? colors.warning : colors.success }]}>{formatMoney(balance)}</Text>
                    </View>
                  </Row>
                  {purchase.notes ? <Text style={styles.notes}>📝 {purchase.notes}</Text> : null}
                </Card>
              );
            })
          )}

          {pageInfo.pages > 1 && (
            <Row style={{ marginTop: spacing.sm }}>
              <Button title="‹ Prev" size="sm" variant="ghost" disabled={pageInfo.page <= 1} onPress={() => setPage(pageInfo.page - 1)} />
              <Text style={styles.pageText}>Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total}</Text>
              <Button title="Next ›" size="sm" variant="ghost" disabled={pageInfo.page >= pageInfo.pages} onPress={() => setPage(pageInfo.page + 1)} />
            </Row>
          )}
        </>
      ) : (
        suppliers.length === 0 ? (
          <EmptyState icon="🏭" title="No suppliers yet" />
        ) : (
          suppliers.map((supplier) => (
            <Card key={supplier.id} style={{ marginBottom: spacing.sm }}>
              <Row>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.supplierName}>{supplier.name}</Text>
                  <Text style={styles.phone}>{supplier.phone}</Text>
                  <Text style={styles.address}>{supplier.address || 'No address'}</Text>
                </View>
                <Badge tone={supplier.outstandingBalance > 0 ? 'orange' : 'green'}>
                  {formatMoney(supplier.outstandingBalance)}
                </Badge>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Text style={styles.counts}>
                  {supplier._count?.products ?? 0} products · {supplier._count?.purchases ?? 0} purchases
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEditSupplier(supplier)} />
                  <Button title="Delete" size="sm" variant="ghost" onPress={() => deleteSupplier(supplier)} />
                </View>
              </Row>
            </Card>
          ))
        )
      )}

      <ModalSheet visible={showPurchase} title="🚚 Record Purchase" onClose={() => setShowPurchase(false)}>
        <Select
          label="Supplier *"
          value={purchaseForm.supplierId}
          options={supplierOptions}
          onChange={(supplierId) => setPurchaseForm({ ...purchaseForm, supplierId })}
          placeholder="Select supplier..."
          inline
        />
        <Pressable onPress={() => setShowQuickSupplier((value) => !value)} style={{ marginBottom: spacing.md }}>
          <Text style={styles.link}>{showQuickSupplier ? 'Cancel new supplier' : '＋ New supplier'}</Text>
        </Pressable>

        {showQuickSupplier && (
          <View style={styles.quickBox}>
            <Input label="Supplier name" value={quickSupplier.name} onChangeText={(name) => setQuickSupplier({ ...quickSupplier, name })} />
            <Input label="Phone" value={quickSupplier.phone} onChangeText={(phone) => setQuickSupplier({ ...quickSupplier, phone })} keyboardType="phone-pad" />
            <Button title="Save supplier" size="sm" onPress={handleQuickSupplier} loading={addingQuick} />
          </View>
        )}

        <Row style={{ marginTop: spacing.sm }}>
          <Text style={styles.sectionLabel}>Items *</Text>
          <Pressable onPress={addItem} hitSlop={8}><Text style={styles.link}>＋ Add item</Text></Pressable>
        </Row>

        {purchaseForm.items.map((item, index) => (
          <View key={index} style={styles.itemBox}>
            <Row style={{ marginBottom: 4 }}>
              <Text style={styles.itemIndex}>Item {index + 1}</Text>
              <Pressable onPress={() => removeItem(index)} hitSlop={8}><Text style={styles.remove}>✕ Remove</Text></Pressable>
            </Row>
            <Select
              value={item.productId}
              options={productOptions}
              onChange={(productId) => onProductChange(index, productId)}
              placeholder="Custom item (not linked to stock)"
              allowClear
              inline
            />
            <Input
              value={item.description}
              onChangeText={(description) => updateItem(index, { description })}
              placeholder="Description *"
            />
            <Row style={{ gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Qty"
                  value={item.quantity}
                  onChangeText={(quantity) => updateItem(index, { quantity })}
                  keyboardType="number-pad"
                  style={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Unit price"
                  value={item.unitPrice}
                  onChangeText={(unitPrice) => updateItem(index, { unitPrice })}
                  keyboardType="decimal-pad"
                  style={{ marginBottom: 0 }}
                />
              </View>
            </Row>
            <Text style={styles.lineTotal}>
              Line total: {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
            </Text>
          </View>
        ))}

        <Input label="Amount paid (Rs.)" value={purchaseForm.paidAmount} onChangeText={(paidAmount) => setPurchaseForm({ ...purchaseForm, paidAmount })} keyboardType="decimal-pad" placeholder="0" />
        <Input label="Notes" value={purchaseForm.notes} onChangeText={(notes) => setPurchaseForm({ ...purchaseForm, notes })} placeholder="Optional" />

        <View style={styles.totalsBox}>
          <Row><Text style={styles.totalLabel}>Purchase total</Text><Text style={styles.totalValue}>{formatMoney(purchaseTotal)}</Text></Row>
          <Row><Text style={styles.totalLabel}>Paid now</Text><Text style={[styles.totalValue, { color: colors.success }]}>{formatMoney(purchasePaid)}</Text></Row>
          <Row style={{ borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingTop: 4, marginTop: 4 }}>
            <Text style={styles.totalLabel}>Added to supplier balance</Text>
            <Text style={[styles.totalValue, { fontWeight: '800', color: purchaseBalance > 0 ? colors.warning : colors.success }]}>{formatMoney(purchaseBalance)}</Text>
          </Row>
        </View>

        <Button title={submitting ? 'Saving...' : 'Save Purchase'} onPress={handlePurchase} loading={submitting} disabled={submitting} />
      </ModalSheet>

      <ModalSheet visible={showSupplierForm} title={editingSupplier ? '✏️ Edit Supplier' : '🏭 Add Supplier'} onClose={() => setShowSupplierForm(false)}>
        <Input label="Name *" value={supplierForm.name} onChangeText={(name) => setSupplierForm({ ...supplierForm, name })} />
        <Input label="Phone *" value={supplierForm.phone} onChangeText={(phone) => setSupplierForm({ ...supplierForm, phone })} keyboardType="phone-pad" />
        <Input label="Address" value={supplierForm.address} onChangeText={(address) => setSupplierForm({ ...supplierForm, address })} />
        <Button title={editingSupplier ? 'Update Supplier' : 'Add Supplier'} onPress={saveSupplier} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  supplierName: { fontSize: 14, fontWeight: '700', color: colors.text },
  date: { fontSize: 10, color: colors.textLight },
  phone: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  address: { fontSize: 10, color: colors.textLight, marginTop: 1 },
  itemsText: { fontSize: 10, color: colors.textMuted, marginTop: 6, lineHeight: 15 },
  notes: { fontSize: 10, color: colors.textLight, marginTop: 6 },
  priceLabel: { fontSize: 9, color: colors.textLight, textTransform: 'uppercase' },
  priceStrong: { fontSize: 12, fontWeight: '700', color: colors.text },
  counts: { fontSize: 10, color: colors.textMuted },
  pageText: { fontSize: 10, color: colors.textMuted },
  link: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  quickBox: { backgroundColor: '#eff6ff', borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  itemBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm },
  itemIndex: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  remove: { fontSize: 10, color: colors.danger, fontWeight: '600' },
  lineTotal: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  totalsBox: { backgroundColor: '#eff6ff', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  totalLabel: { fontSize: 11, color: colors.textMuted },
  totalValue: { fontSize: 11, color: colors.text },
});
