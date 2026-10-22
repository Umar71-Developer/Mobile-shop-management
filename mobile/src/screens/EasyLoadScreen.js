import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle,
} from '../components/UI';
import { formatDateTime } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const NETWORKS = ['jazz', 'telenor', 'ufone', 'zong'];
const NET_STYLE = {
  jazz: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  telenor: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  ufone: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  zong: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

const FILTERS = [{ value: '', label: 'All' }, ...NETWORKS.map((network) => ({ value: network, label: network.toUpperCase() }))];
const EMPTY = { network: 'jazz', amount: '', customerNumber: '', commission: '0' };

export default function EasyLoadScreen() {
  const toast = useToast();
  const [sales, setSales] = useState([]);
  const [netFilter, setNetFilter] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/easyload', { params: { network: netFilter || undefined } });
      setSales(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load easy load sales'));
    } finally {
      setRefreshing(false);
    }
  }, [netFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (sale) => {
    setEditing(sale);
    setForm({
      network: sale.network,
      amount: String(sale.amount ?? ''),
      customerNumber: sale.customerNumber || '',
      commission: String(sale.commission ?? 0),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.customerNumber.trim()) return toast.error('Customer number is required');
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount');

    setSaving(true);
    try {
      const payload = {
        ...form,
        customerNumber: form.customerNumber.trim(),
        amount,
        commission: Number(form.commission) || 0,
      };
      if (editing) await api.put(`/easyload/${editing.id}`, payload);
      else await api.post('/easyload', payload);
      toast.success(editing ? 'Easy load updated' : 'Easy load sale recorded');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save easy load sale'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (sale) => {
    Alert.alert('Delete entry?', `${sale.network.toUpperCase()} ${formatMoney(sale.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/easyload/${sale.id}`);
            toast.success('Easy load entry deleted');
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
        <SectionTitle style={{ marginBottom: 0 }}>📶 Easy Load</SectionTitle>
        <Button title="＋ Add" size="sm" variant="primary" onPress={openAdd} />
      </Row>

      <View style={styles.grid}>
        {NETWORKS.map((network) => {
          const style = NET_STYLE[network];
          const netSales = sales.filter((sale) => sale.network === network);
          const commission = netSales.reduce((sum, sale) => sum + (sale.commission || 0), 0);
          return (
            <View key={network} style={[styles.netCard, { backgroundColor: style.bg, borderColor: style.border }]}>
              <Text style={[styles.netName, { color: style.text }]}>{network.toUpperCase()}</Text>
              <Text style={styles.netCount}>{netSales.length}</Text>
              <Text style={styles.netSub}>sales</Text>
              <Text style={[styles.netComm, { color: style.text }]}>{formatMoney(commission)}</Text>
              <Text style={styles.netSub}>commission</Text>
            </View>
          );
        })}
      </View>

      <Chips value={netFilter} options={FILTERS} onChange={setNetFilter} />
      <ErrorBanner message={error} />

      {sales.length === 0 ? (
        <EmptyState icon="📶" title="No easy load sales yet" />
      ) : (
        sales.map((sale) => {
          const style = NET_STYLE[sale.network] || NET_STYLE.jazz;
          return (
            <Card key={sale.id} style={{ marginBottom: spacing.sm }}>
              <Row>
                <Badge tone="gray"><Text style={{ color: style.text, fontWeight: '800' }}>{sale.network.toUpperCase()}</Text></Badge>
                <Text style={styles.date}>{formatDateTime(sale.createdAt)}</Text>
              </Row>
              <Text style={styles.number}>{sale.customerNumber}</Text>
              <Row style={{ marginTop: 6 }}>
                <Text style={styles.amount}>{formatMoney(sale.amount)}</Text>
                <Text style={styles.commission}>Comm. {formatMoney(sale.commission)}</Text>
              </Row>
              <Row style={{ marginTop: spacing.sm }}>
                <View />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(sale)} />
                  <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(sale)} />
                </View>
              </Row>
            </Card>
          );
        })
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Easy Load' : '📶 Add Easy Load Sale'} onClose={() => setShowForm(false)}>
        <Text style={styles.fieldLabel}>Network *</Text>
        <Chips
          value={form.network}
          options={NETWORKS.map((network) => ({ value: network, label: network.toUpperCase() }))}
          onChange={(network) => setForm({ ...form, network })}
        />
        <Input label="Customer Phone Number *" value={form.customerNumber} onChangeText={(customerNumber) => setForm({ ...form, customerNumber })} keyboardType="phone-pad" />
        <Input label="Load Amount (Rs.) *" value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} keyboardType="decimal-pad" />
        <Input label="Commission Earned (Rs.)" value={form.commission} onChangeText={(commission) => setForm({ ...form, commission })} keyboardType="decimal-pad" />
        <Button title={editing ? 'Update' : 'Add Sale'} onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  netCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  netName: { fontSize: 11, fontWeight: '800' },
  netCount: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  netSub: { fontSize: 9, color: colors.textLight },
  netComm: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  date: { fontSize: 9, color: colors.textLight },
  number: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6, fontFamily: 'monospace' },
  amount: { fontSize: 13, fontWeight: '700', color: colors.text },
  commission: { fontSize: 11, color: colors.success, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
});
