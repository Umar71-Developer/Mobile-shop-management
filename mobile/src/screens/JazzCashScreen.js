import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, StatCard,
} from '../components/UI';
import { formatDateTime } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const EMPTY = { type: 'receive', amount: '', recipient: '', commission: '0', notes: '' };

export default function JazzCashScreen() {
  const toast = useToast();
  const [txns, setTxns] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/jazzcash');
      setTxns(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load JazzCash transactions'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCommission = txns.reduce((sum, txn) => sum + (txn.commission || 0), 0);
  const totalSend = txns.filter((txn) => txn.type === 'send').length;
  const totalReceive = txns.filter((txn) => txn.type === 'receive').length;

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (txn) => {
    setEditing(txn);
    setForm({
      type: txn.type,
      amount: String(txn.amount ?? ''),
      recipient: txn.recipient || '',
      commission: String(txn.commission ?? 0),
      notes: txn.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.recipient.trim()) return toast.error('Recipient / sender number is required');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');

    setSaving(true);
    try {
      const payload = {
        ...form,
        recipient: form.recipient.trim(),
        amount,
        commission: Number(form.commission) || 0,
      };
      if (editing) await api.put(`/jazzcash/${editing.id}`, payload);
      else await api.post('/jazzcash', payload);
      toast.success(editing ? 'Transaction updated' : 'Transaction added');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save transaction'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (txn) => {
    Alert.alert('Delete transaction?', `${txn.type} ${formatMoney(txn.amount)} — ${txn.recipient}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jazzcash/${txn.id}`);
            toast.success('Transaction deleted');
            await load();
          } catch {
            toast.error('Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>📲 JazzCash</SectionTitle>
        <Button title="＋ Add" size="sm" variant="danger" onPress={openAdd} />
      </Row>

      <View style={styles.grid}>
        <StatCard title="Transactions" value={String(txns.length)} icon="📲" tone="blue" />
        <StatCard title="Send / Receive" value={`${totalSend} / ${totalReceive}`} icon="🔁" tone="purple" />
        <StatCard title="Commission" value={formatMoney(totalCommission)} icon="💰" tone="green" sub="Total earned" />
      </View>

      <ErrorBanner message={error} />

      {txns.length === 0 ? (
        <EmptyState icon="📲" title="No transactions yet" />
      ) : (
        txns.map((txn) => (
          <Card key={txn.id} style={{ marginBottom: spacing.sm }}>
            <Row>
              <Badge tone={txn.type === 'receive' ? 'green' : 'blue'}>
                {txn.type === 'receive' ? '⬇ Receive' : '⬆ Send'}
              </Badge>
              <Text style={styles.date}>{formatDateTime(txn.createdAt)}</Text>
            </Row>
            <Text style={styles.recipient}>{txn.recipient}</Text>
            <Row style={{ marginTop: 6 }}>
              <Text style={styles.amount}>{formatMoney(txn.amount)}</Text>
              <Text style={styles.commission}>Comm. {formatMoney(txn.commission)}</Text>
            </Row>
            {txn.notes ? <Text style={styles.notes}>{txn.notes}</Text> : null}
            <Row style={{ marginTop: spacing.sm }}>
              <View />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(txn)} />
                <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(txn)} />
              </View>
            </Row>
          </Card>
        ))
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Transaction' : '📲 Add Transaction'} onClose={() => setShowForm(false)}>
        <Text style={styles.fieldLabel}>Transaction type</Text>
        <Chips
          value={form.type}
          options={[{ value: 'receive', label: '⬇ Receive' }, { value: 'send', label: '⬆ Send' }]}
          onChange={(type) => setForm({ ...form, type })}
        />
        <Input label="Recipient / Sender Number *" value={form.recipient} onChangeText={(recipient) => setForm({ ...form, recipient })} keyboardType="phone-pad" />
        <Input label="Amount (Rs.) *" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} keyboardType="decimal-pad" />
        <Input label="Commission Earned (Rs.)" value={form.commission} onChangeText={(commission) => setForm({ ...form, commission })} keyboardType="decimal-pad" />
        <Input label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
        <Button title={editing ? 'Update' : 'Add'} variant="danger" onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md },
  date: { fontSize: 9, color: colors.textLight },
  recipient: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6, fontFamily: 'monospace' },
  amount: { fontSize: 13, fontWeight: '700', color: colors.text },
  commission: { fontSize: 11, color: colors.success, fontWeight: '600' },
  notes: { fontSize: 10, color: colors.textLight, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
});
