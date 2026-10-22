import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Badge, Button, Card, EmptyState, ErrorBanner, Input, ModalSheet, Row, Screen, SectionTitle, Select,
} from '../components/UI';
import { errorMessage } from '../utils/format';
import { colors, spacing } from '../theme';

const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'technician', label: 'Technician' },
];

const ROLE_TONE = {
  owner: 'purple',
  cashier: 'blue',
  technician: 'yellow',
  staff: 'gray',
};

const EMPTY = { name: '', phone: '', password: '', role: 'staff' };

export default function StaffScreen() {
  const toast = useToast();
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load staff'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (member) => {
    setEditing(member);
    setForm({ name: member.name || '', phone: member.phone || '', password: '', role: member.role || 'staff' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    if (!editing && !form.password) return toast.error('Password is required for a new staff member');

    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name.trim(), phone: form.phone.trim(), role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/staff/${editing.id}`, payload);
        toast.success('Staff member updated');
      } else {
        await api.post('/staff', {
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success('Staff member added');
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save staff member'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    if (member.id === user?.id) {
      return toast.error('You cannot deactivate your own account');
    }
    setBusyId(member.id);
    try {
      await api.put(`/staff/${member.id}`, { isActive: !member.isActive });
      toast.success(member.isActive ? 'Staff member deactivated' : 'Staff member activated');
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update status'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = (member) => {
    if (member.id === user?.id) return toast.error('You cannot delete your own account');
    Alert.alert(
      'Delete staff member?',
      `${member.name} will lose access immediately. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/staff/${member.id}`);
              toast.success('Staff member deleted');
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
        <SectionTitle style={{ marginBottom: 0 }}>👨‍💼 Staff Management</SectionTitle>
        <Button title="＋ Add" size="sm" onPress={openAdd} />
      </Row>

      <ErrorBanner message={error} />

      {staff.length === 0 ? (
        <EmptyState icon="👨‍💼" title="No staff members yet" sub="Add a staff member so they can sign in" />
      ) : (
        staff.map((member) => (
          <Card key={member.id} style={{ marginBottom: spacing.sm }}>
            <Row>
              <View style={styles.person}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase() || 'S'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {member.name}{member.id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.phone}>{member.phone}</Text>
                </View>
              </View>
              <Badge tone={ROLE_TONE[member.role] || 'gray'}>{member.role}</Badge>
            </Row>

            <Row style={{ marginTop: spacing.md }}>
              <Pressable
                onPress={() => toggleActive(member)}
                disabled={busyId === member.id}
                style={({ pressed }) => [
                  styles.statusPill,
                  member.isActive ? styles.statusActive : styles.statusInactive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.statusText, { color: member.isActive ? '#15803d' : '#b91c1c' }]}>
                  {busyId === member.id ? '...' : member.isActive ? '● Active' : '○ Inactive'}
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="✏️ Edit" size="sm" variant="ghost" onPress={() => openEdit(member)} />
                {member.id !== user?.id && (
                  <Button title="Delete" size="sm" variant="ghost" onPress={() => remove(member)} />
                )}
              </View>
            </Row>
          </Card>
        ))
      )}

      <ModalSheet visible={showForm} title={editing ? '✏️ Edit Staff Member' : '＋ Add Staff Member'} onClose={() => setShowForm(false)}>
        <Input label="Full Name *" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Input label="Phone Number *" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" autoCapitalize="none" />
        <Input
          label={editing ? 'New Password (leave blank to keep old)' : 'Password *'}
          value={form.password}
          onChangeText={(password) => setForm({ ...form, password })}
          secureTextEntry
          autoCapitalize="none"
          placeholder={editing ? 'Unchanged' : 'Set a password'}
        />
        {editing?.role === 'owner' ? (
          <View style={styles.ownerNotice}>
            <Text style={styles.ownerNoticeText}>👑 Owner account — role cannot be changed here.</Text>
          </View>
        ) : (
          <Select
            label="Role"
            value={form.role}
            options={ROLES}
            onChange={(role) => setForm({ ...form, role })}
            inline
          />
        )}
        <Text style={styles.hint}>
          Staff can sign in with this phone and password. Roles: Cashier for sales, Technician for repairs.
        </Text>
        <Button title={editing ? 'Update Staff Member' : 'Add Staff Member'} onPress={save} loading={saving} />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 17 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  phone: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusActive: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  statusInactive: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  statusText: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 10, color: colors.textLight, lineHeight: 15, marginBottom: spacing.md },
  ownerNotice: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ownerNoticeText: { fontSize: 11, color: '#6d28d9', fontWeight: '600' },
});
