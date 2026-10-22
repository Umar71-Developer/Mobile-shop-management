import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import DateField from '../components/DateField';
import {
  Badge, Button, Card, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { formatDate, toLocalISODate } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'salary', label: 'Salary' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'misc', label: 'Misc' },
];

const emptyForm = () => ({ category: 'misc', amount: '', note: '', date: toLocalISODate() });

export default function ExpensesScreen() {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load expenses'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (expense) => {
    setEditing(expense);
    setForm({
      category: expense.category,
      amount: String(expense.amount ?? ''),
      note: expense.note || '',
      date: toLocalISODate(expense.date),
    });
    setShowForm(true);
  };

  const save = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');
    if (!form.category) return toast.error('Select a category');

    setSaving(true);
    try {
      const payload = { ...form, amount };
      if (editing) await api.put(`/expenses/${editing.id}`, payload);
      else await api.post('/expenses', payload);
      toast.success(editing ? 'Expense updated' : 'Expense recorded');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save expense'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (expense) => {
    Alert.alert('Delete expense?', `${expense.category} — ${formatMoney(expense.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/expenses/${expense.id}`);
            toast.success('Expense deleted');
            await load();
          } catch (err) {
            toast.error(errorMessage(err, 'Could not delete expense'));
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>💸 Expenses</SectionTitle>
        <Button title="＋ Add" size="sm" variant="danger" onPress={openAdd} />
      </Row>

      <Card style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', marginBottom: spacing.md }}>
        <Row>
          <Text style={styles.totalLabel}>Total expenses shown</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </Row>
      </Card>

      <ErrorBanner message={error} />

      {expenses.length === 0 ? (
        <EmptyState icon="💸" title="No expenses recorded" />
      ) : (
        expenses.map((expense) => (
          <Card key={expense.id} style={{ marginBottom: spacing.sm }}>
            <Row>
              <Badge tone="red">{expense.category}</Badge>
              <Text style={styles.amount}>{formatMoney(expense.amount)}</Text>
            </Row>
            <Text style={styles.note}>{expense.note || 'No description'}</Text>
            <Text style={styles.date}>{formatDate(expense.date)}</Text>
            <Row style={{ marginTop: spacing.sm }}>
              <View />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(expense)} />
                <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(expense)} />
              </View>
            </Row>
          </Card>
        ))
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Expense' : '💸 Add Expense'} onClose={() => setShowForm(false)}>
        <Select
          label="Category"
          value={form.category}
          options={CATEGORIES}
          onChange={(category) => setForm({ ...form, category })}
          inline
        />
        <Input label="Amount (Rs.) *" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} keyboardType="decimal-pad" />
        <Input label="Description / Note" value={form.note} onChangeText={(note) => setForm({ ...form, note })} placeholder="Optional note..." />
        <DateField label="Date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        <Button title={editing ? 'Update' : 'Add Expense'} variant="danger" onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.danger },
  amount: { fontSize: 14, fontWeight: '800', color: colors.danger },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  date: { fontSize: 10, color: colors.textLight, marginTop: 3 },
});
