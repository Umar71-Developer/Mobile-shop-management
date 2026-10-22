import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle,
} from '../components/UI';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const EMPTY = { name: '', phone: '', address: '' };

export default function CustomersScreen() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/customers', { params: { search: search || undefined } });
      setCustomers(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load customers'));
    } finally {
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (customer) => {
    setEditing(customer);
    setForm({ name: customer.name || '', phone: customer.phone || '', address: customer.address || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), phone: form.phone.trim() };
      if (editing) await api.put(`/customers/${editing.id}`, payload);
      else await api.post('/customers', payload);
      toast.success(editing ? 'Customer updated' : 'Customer added');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save customer'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (customer) => {
    Alert.alert(
      'Delete customer?',
      'Customers with sales, repairs or udhar history cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/customers/${customer.id}`);
              toast.success('Customer deleted');
              await load();
            } catch (err) {
              toast.error(errorMessage(err, 'Delete failed'));
            }
          },
        },
      ]
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>👥 Customers</SectionTitle>
        <Button title="＋ Add" size="sm" onPress={openAdd} />
      </Row>

      <Input value={search} onChangeText={setSearch} placeholder="🔍 Search by name or phone..." />
      <ErrorBanner message={error} />

      {customers.length === 0 ? (
        <EmptyState icon="👥" title="No customers yet" />
      ) : (
        customers.map((customer) => {
          const balance = customer.outstandingBalance || 0;
          return (
            <Card key={customer.id} style={{ marginBottom: spacing.sm }}>
              <Row>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.name}>{customer.name}</Text>
                  <Text style={styles.phone}>{customer.phone}</Text>
                  {customer.address ? <Text style={styles.address}>{customer.address}</Text> : null}
                </View>
                <Badge tone={balance > 0 ? 'red' : 'green'}>
                  {balance > 0 ? `Udhar ${formatMoney(balance)}` : 'No balance'}
                </Badge>
              </Row>
              <Row style={{ marginTop: spacing.md }}>
                <View />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(customer)} />
                  <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(customer)} />
                </View>
              </Row>
            </Card>
          );
        })
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Customer' : '＋ Add Customer'} onClose={() => setShowForm(false)}>
        <Input label="Full Name *" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Input label="Phone Number *" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" />
        <Input label="Address (optional)" value={form.address} onChangeText={(address) => setForm({ ...form, address })} multiline />
        <Button title={editing ? 'Update' : 'Add Customer'} onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  phone: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  address: { fontSize: 10, color: colors.textLight, marginTop: 2 },
});
