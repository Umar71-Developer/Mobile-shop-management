import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useToast } from '../components/Toast';
import DateField from '../components/DateField';
import {
  Badge, Button, Card, Chips, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { formatMoney } from '../utils/format';
import { toLocalISODate, formatDate } from '../utils/date';
import { colors, spacing } from '../theme';

const EMPTY = {
  customerId: '', deviceBrand: '', deviceModel: '', imei: '', problem: '',
  estimatedCost: '', finalCost: '', advancePaid: '0', dueDate: '', notes: '',
};

const STATUS_OPTIONS = [
  { value: 'received', label: 'Received' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TONE = {
  received: 'blue',
  in_progress: 'yellow',
  ready: 'green',
  delivered: 'gray',
  cancelled: 'red',
};

export default function RepairsScreen() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [jobsRes, customersRes] = await Promise.all([
        api.get('/repairs', { params: { status: statusFilter || undefined } }),
        api.get('/customers'),
      ]);
      setJobs(jobsRes.data);
      setCustomers(customersRes.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load repair jobs');
    } finally {
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (job) => {
    setEditing(job);
    setForm({
      customerId: String(job.customerId || ''),
      deviceBrand: job.deviceBrand || '',
      deviceModel: job.deviceModel || '',
      imei: job.imei || '',
      problem: job.problem || '',
      estimatedCost: job.estimatedCost != null ? String(job.estimatedCost) : '',
      finalCost: job.finalCost != null ? String(job.finalCost) : '',
      advancePaid: String(job.advancePaid ?? 0),
      dueDate: job.dueDate ? toLocalISODate(job.dueDate) : '',
      notes: job.notes || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.customerId) return toast.error('Select a customer');
    if (!form.deviceBrand.trim() || !form.deviceModel.trim()) return toast.error('Device brand and model are required');
    if (!form.problem.trim()) return toast.error('Describe the problem');

    setSaving(true);
    try {
      const data = {
        customerId: parseInt(form.customerId, 10),
        deviceBrand: form.deviceBrand.trim(),
        deviceModel: form.deviceModel.trim(),
        imei: form.imei.trim(),
        problem: form.problem.trim(),
        estimatedCost: Number(form.estimatedCost) || 0,
        finalCost: form.finalCost === '' ? null : Number(form.finalCost) || 0,
        advancePaid: Number(form.advancePaid) || 0,
        dueDate: form.dueDate || null,
        notes: form.notes,
      };
      if (editing) await api.put(`/repairs/${editing.id}`, data);
      else await api.post('/repairs', data);
      toast.success(editing ? 'Repair job updated' : 'Repair job created');
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not save repair job');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (job, status) => {
    try {
      await api.put(`/repairs/${job.id}`, { status });
      toast.success('Status updated');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed');
    }
  };

  const remove = (job) => {
    Alert.alert('Delete repair job?', `${job.jobNumber} will be deleted permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/repairs/${job.id}`);
            toast.success('Repair job deleted');
            await load();
          } catch {
            toast.error('Delete failed');
          }
        },
      },
    ]);
  };

  const customerOptions = customers.map((customer) => ({
    value: String(customer.id),
    label: `${customer.name} — ${customer.phone}`,
  }));

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
    >
      <Row style={{ marginBottom: spacing.md }}>
        <SectionTitle style={{ marginBottom: 0 }}>🔧 Repair Jobs</SectionTitle>
        <Button title="＋ New" size="sm" onPress={openAdd} />
      </Row>

      <Chips value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />
      <ErrorBanner message={error} />

      {jobs.length === 0 ? (
        <EmptyState icon="🔧" title="No repair jobs found" />
      ) : (
        jobs.map((job) => {
          const due = job.finalCost != null ? Math.max(0, (job.finalCost || 0) - (job.advancePaid || 0)) : null;
          return (
            <Card key={job.id} style={{ marginBottom: spacing.sm }}>
              <Row>
                <Text style={styles.jobNo}>{job.jobNumber}</Text>
                <Badge tone={TONE[job.status] || 'gray'}>{job.status.replace('_', ' ')}</Badge>
              </Row>
              <Text style={styles.device}>{job.deviceBrand} {job.deviceModel}</Text>
              <Text style={styles.customer}>👤 {job.customer?.name} · 📞 {job.customer?.phone}</Text>
              {job.imei ? <Text style={styles.imei}>IMEI: {job.imei}</Text> : null}
              <Text style={styles.problem}>🛠 {job.problem}</Text>

              <View style={styles.metaGrid}>
                <Text style={styles.meta}>Est: <Text style={styles.metaValue}>{formatMoney(job.estimatedCost)}</Text></Text>
                {job.finalCost != null && <Text style={styles.meta}>Final: <Text style={styles.metaValue}>{formatMoney(job.finalCost)}</Text></Text>}
                <Text style={styles.meta}>Advance: <Text style={[styles.metaValue, { color: colors.success }]}>{formatMoney(job.advancePaid)}</Text></Text>
                {due != null && <Text style={styles.meta}>Due: <Text style={[styles.metaValue, { color: colors.danger }]}>{formatMoney(due)}</Text></Text>}
                {job.dueDate ? <Text style={styles.meta}>Due date: {formatDate(job.dueDate)}</Text> : null}
                {job.deliveredAt ? <Text style={styles.meta}>Delivered: {formatDate(job.deliveredAt)}</Text> : null}
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <Select
                  value={job.status}
                  options={STATUS_OPTIONS}
                  onChange={(status) => updateStatus(job, status)}
                  inline
                />
              </View>

              <Row>
                <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(job)} />
                <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(job)} />
              </Row>
            </Card>
          );
        })
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Repair Job' : '🔧 New Repair Job'} onClose={() => setShowForm(false)}>
        <Select
          label="Customer *"
          value={form.customerId}
          options={customerOptions}
          onChange={(customerId) => setForm({ ...form, customerId })}
          placeholder="Select customer..."
          inline
        />
        <Input label="Device Brand *" value={form.deviceBrand} onChangeText={(deviceBrand) => setForm({ ...form, deviceBrand })} />
        <Input label="Device Model *" value={form.deviceModel} onChangeText={(deviceModel) => setForm({ ...form, deviceModel })} />
        <Input label="IMEI (optional)" value={form.imei} onChangeText={(imei) => setForm({ ...form, imei })} />
        <Input label="Problem Description *" value={form.problem} onChangeText={(problem) => setForm({ ...form, problem })} multiline />
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input label="Estimated Cost" value={form.estimatedCost} onChangeText={(estimatedCost) => setForm({ ...form, estimatedCost })} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Final Cost" value={form.finalCost} onChangeText={(finalCost) => setForm({ ...form, finalCost })} keyboardType="decimal-pad" />
          </View>
        </Row>
        <Input label="Advance Paid" value={form.advancePaid} onChangeText={(advancePaid) => setForm({ ...form, advancePaid })} keyboardType="decimal-pad" />
        <DateField label="Due Date (optional)" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
        {form.dueDate ? (
          <Pressable onPress={() => setForm({ ...form, dueDate: '' })} style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 11, color: colors.danger }}>Clear due date</Text>
          </Pressable>
        ) : null}
        <Input label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} multiline placeholder="Any additional notes..." />

        <Button title={editing ? 'Update Job' : 'Create Job'} onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  jobNo: { fontSize: 13, fontWeight: '800', color: colors.primary },
  device: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 4 },
  customer: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  imei: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  problem: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  meta: { fontSize: 10, color: colors.textLight },
  metaValue: { fontWeight: '600', color: colors.text },
});
