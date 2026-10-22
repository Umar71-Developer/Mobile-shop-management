import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, Row, Screen, SectionTitle } from '../components/UI';
import { colors, radius, spacing } from '../theme';

const MODULES = [
  { screen: 'Purchases', icon: '🚚', label: 'Purchases', sub: 'Restock & suppliers' },
  { screen: 'Repairs', icon: '🔧', label: 'Repair Jobs', sub: 'Track repairs' },
  { screen: 'Udhar', icon: '💳', label: 'Udhar', sub: 'Customer credit' },
  { screen: 'Customers', icon: '👥', label: 'Customers', sub: 'Directory' },
  { screen: 'JazzCash', icon: '📲', label: 'JazzCash', sub: 'Transactions' },
  { screen: 'EasyLoad', icon: '📶', label: 'Easy Load', sub: 'Mobile top-ups' },
  { screen: 'Expenses', icon: '💸', label: 'Expenses', sub: 'Shop costs' },
  { screen: 'Staff', icon: '👨‍💼', label: 'Staff', sub: 'Users & roles' },
];

export default function MoreScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <Card style={{ marginBottom: spacing.lg }}>
        <Row>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'S'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.name}>{user?.name || 'Shop User'}</Text>
            <Text style={styles.phone}>{user?.phone || ''}</Text>
          </View>
          <Badge tone={user?.role === 'owner' ? 'purple' : 'blue'}>{user?.role || 'staff'}</Badge>
        </Row>
      </Card>

      <SectionTitle>All modules</SectionTitle>
      <View style={styles.grid}>
        {MODULES.map((module) => (
          <Pressable
            key={module.screen}
            onPress={() => navigation.navigate(module.screen)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.tileIcon}>{module.icon}</Text>
            <Text style={styles.tileLabel}>{module.label}</Text>
            <Text style={styles.tileSub}>{module.sub}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle style={{ marginTop: spacing.lg }}>App settings</SectionTitle>
      <Pressable
        onPress={() => navigation.navigate('ServerSettings')}
        style={({ pressed }) => [styles.setting, pressed && { opacity: 0.75 }]}
      >
        <Text style={styles.settingIcon}>⚙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>Server connection</Text>
          <Text style={styles.settingSub}>Change the shop server address</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Button title="Logout" variant="danger" onPress={logout} style={{ marginTop: spacing.lg }} />
      <Text style={styles.version}>Mobile Shop v1.0 · React Native</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileIcon: { fontSize: 24 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 6 },
  tileSub: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  settingIcon: { fontSize: 20, marginRight: spacing.md },
  settingTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  settingSub: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textLight },
  version: { textAlign: 'center', fontSize: 10, color: colors.textLight, marginTop: spacing.lg },
});
