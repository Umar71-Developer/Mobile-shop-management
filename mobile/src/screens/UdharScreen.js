import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import DateField from '../components/DateField';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { formatDate, toLocalISODate } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: '🔴 Pending' },
  { value: 'partial', label: '🟡 Partial' },
  { value: 'cleared', label: '🟢 Cleared' },
];

const TONE = { pending: 'red', partial: 'yellow', cleared: 'green' };

export default function UdharScreen() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerId: '', totalAmount: '', description: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', dueDate: '' });

  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payingNow, setPayingNow] = useState(false);

  const load = useCallback(async () => {
    try {
      const [recordsRes, customersRes] = await Promise.all([
        api.get('/udhar', { params: { status: filter || undefined } }),
        api.get('/customers'),
      ]);
      setRecords(recordsRes.data);
      setCustomers(customersRes.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load udhar records'));
    } finally {
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const totalPending = records.reduce((sum, record) => sum + (record.remainingAmount || 0), 0);

  const openAdd = () => {
    setForm({ customerId: '', totalAmount: '', description: '', dueDate: '' });
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!form.customerId) return toast.error('Select a customer');
    if (!form.description.trim()) return toast.error('Enter a description');
    const amount = Number(form.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');

    setSaving(true);
    try {
      await api.post('/udhar', {
        customerId: parseInt(form.customerId, 10),
        totalAmount: amount,
        description: form.description.trim(),
        dueDate: form.dueDate || null,
      });
      toast.success('Udhar record added');
      setShowAdd(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add udhar'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (record) => {
    setEditing(record);
    setEditForm({ description: record.description || '', dueDate: record.dueDate ? toLocalISODate(record.dueDate) : '' });
  };

  const handleEdit = async () => {
    if (!editForm.description.trim()) return toast.error('Description is required');
    try {
      await api.put(`/udhar/${editing.id}`, { description: editForm.description.trim(), dueDate: editForm.dueDate || null });
      toast.success('Udhar updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Update failed'));
    }
  };

  const remove = (record) => {
    Alert.alert('Delete udhar record?', 'The customer balance will be adjusted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/udhar/${record.id}`);
            toast.success('Udhar deleted');
            await load();
          } catch (err) {
            toast.error(errorMessage(err, 'Delete failed'));
          }
        },
      },
    ]);
  };

  const openPay = (record) => {
    setPaying(record);
    setPayAmount(String(record.remainingAmount || ''));
    setPayNote('');
  };

  const handlePayment = async () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');
    if (amount > paying.remainingAmount + 0.01) return toast.error('Amount cannot be more than the remaining balance');

    setPayingNow(true);
    try {
      await api.post(`/udhar/${paying.id}/payment`, { amountPaid: amount, note: payNote });
      toast.success('Payment recorded ✅');
      setPaying(null);
      setPayAmount('');
      setPayNote('');
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not record payment'));
    } finally {
      setPayingNow(false);
    }
  };

  const customerOptions = customers.map((customer) => ({
    value: String(customer.id),
    label: `${customer.name} — ${customer.phone}`,
  }));

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Row style={{ marginBottom: spacing.sm }}>
        <SectionTitle style={{ marginBottom: 0 }}>💳 Udhar</SectionTitle>
        <Button title="＋ Add" size="sm" variant="primary" onPress={openAdd} />
      </Row>
      <Text style={styles.pending}>Total pending: {formatMoney(totalPending)}</Text>

      <Chips value={filter} options={FILTERS} onChange={setFilter} />
      <ErrorBanner message={error} />

      {records.length === 0 ? (
        <EmptyState icon="💳" title="No udhar records" />
      ) : (
        records.map((record) => (
          <Card key={record.id} style={{ marginBottom: spacing.sm }}>
            <Row>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.name}>{record.customer?.name}</Text>
                <Text style={styles.phone}>{record.customer?.phone}</Text>
              </View>
              <Badge tone={TONE[record.status] || 'gray'}>{record.status}</Badge>
            </Row>
            <Text style={styles.description}>{record.description}</Text>

            <Row style={{ marginTop: 8 }}>
              <View>
                <Text style={styles.priceLabel}>Total</Text>
                <Text style={styles.priceStrong}>{formatMoney(record.totalAmount)}</Text>
              </View>
              <View>
                <Text style={styles.priceLabel}>Paid</Text>
                <Text style={[styles.priceStrong, { color: colors.success }]}>{formatMoney(record.paidAmount)}</Text>
              </View>
              <View>
                <Text style={styles.priceLabel}>Remaining</Text>
                <Text style={[styles.priceStrong, { color: colors.danger }]}>{formatMoney(record.remainingAmount)}</Text>
              </View>
            </Row>

            {record.dueDate ? <Text style={styles.due}>Due: {formatDate(record.dueDate)}</Text> : null}

            <Row style={{ marginTop: spacing.md }}>
              {record.status !== 'cleared' ? (
                <Button title="💵 Pay" size="sm" variant="success" onPress={() => openPay(record)} />
              ) : <View />}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(record)} />
                <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(record)} />
              </View>
            </Row>
          </Card>
        ))
      )}

      <ModalSheet visible={showAdd} title="💳 Add Udhar Record" onClose={() => setShowAdd(false)}>
        <Select
          label="Customer *"
          value={form.customerId}
          options={customerOptions}
          onChange={(customerId) => setForm({ ...form, customerId })}
          placeholder="Select customer..."
          inline
        />
        <Input label="Description *" value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="e.g. Samsung A34, repair charges..." />
        <Input label="Amount (Rs.) *" value={form.totalAmount} onChangeText={(totalAmount) => setForm({ ...form, totalAmount })} keyboardType="decimal-pad" />
        <DateField label="Expected return date (optional)" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
        <Button title="Add Udhar" onPress={handleAdd} loading={saving} />
      </ModalSheet>

      <ModalSheet visible={!!editing} title="✏️ Edit Udhar Record" onClose={() => setEditing(null)}>
        {editing && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              <Text style={{ fontWeight: '700' }}>{editing.customer?.name}</Text> — {formatMoney(editing.totalAmount)}
            </Text>
          </View>
        )}
        <Input label="Description" value={editForm.description} onChangeText={(description) => setEditForm({ ...editForm, description })} />
        <DateField label="Due date" value={editForm.dueDate} onChange={(dueDate) => setEditForm({ ...editForm, dueDate })} />
        <Button title="Update" onPress={handleEdit} />
      </ModalSheet>

      <ModalSheet visible={!!paying} title="💵 Record Payment" onClose={() => setPaying(null)}>
        {paying && (
          <View style={styles.payBox}>
            <Text style={styles.payText}><Text style={styles.payLabel}>Customer: </Text>{paying.customer?.name}</Text>
            <Text style={styles.payText}><Text style={styles.payLabel}>Item: </Text>{paying.description}</Text>
            <Text style={styles.payText}>
              <Text style={styles.payLabel}>Remaining: </Text>
              <Text style={{ fontWeight: '800', color: colors.danger }}>{formatMoney(paying.remainingAmount)}</Text>
            </Text>
          </View>
        )}
        <Input label="Amount paying now (Rs.) *" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" />
        <Input label="Note (optional)" value={payNote} onChangeText={setPayNote} placeholder="e.g. Cash received" />
        <Button title="Record Payment" variant="success" onPress={handlePayment} loading={payingNow} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pending: { fontSize: 12, color: colors.danger, fontWeight: '600', marginBottom: spacing.md },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  phone: { fontSize: 10, color: colors.textLight, marginTop: 1 },
  description: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  priceLabel: { fontSize: 9, color: colors.textLight, textTransform: 'uppercase' },
  priceStrong: { fontSize: 12, fontWeight: '700', color: colors.text },
  due: { fontSize: 10, color: colors.textLight, marginTop: 6 },
  summaryBox: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  summaryText: { fontSize: 12, color: colors.textMuted },
  payBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  payText: { fontSize: 12, color: colors.text, marginBottom: 3 },
  payLabel: { color: colors.textMuted },
});
