import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import DateField from '../components/DateField';
import { Badge, Button, Card, EmptyState, ErrorBanner, Loading, Row, Screen, SectionTitle, StatCard } from '../components/UI';
import { addDays, formatISODate, toLocalISODate } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, radius, spacing } from '../theme';

const QUICK_ACTIONS = [
  { label: 'New Sale', icon: '🛒', screen: 'Sales', color: '#16a34a' },
  { label: 'Purchase', icon: '🚚', screen: 'Purchases', color: '#2563eb' },
  { label: 'Repair', icon: '🔧', screen: 'Repairs', color: '#4f46e5' },
  { label: 'Udhar', icon: '💳', screen: 'Udhar', color: '#f97316' },
  { label: 'Expense', icon: '💸', screen: 'Expenses', color: '#dc2626' },
  { label: 'Reports', icon: '📊', screen: 'Reports', color: '#334155' },
];

export default function DashboardScreen({ navigation }) {
  const today = toLocalISODate();
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [lastActive, setLastActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [reportRes, lowStockRes, lastActiveRes] = await Promise.all([
        api.get('/reports/daily', { params: { date } }),
        api.get('/products', { params: { lowStock: true } }),
        api.get('/reports/latest-activity').catch(() => null),
      ]);
      setReport(reportRes.data);
      setLowStock(lowStockRes.data);
      setLastActive(lastActiveRes?.data?.date || null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the dashboard'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) return <Screen><Loading label="Loading dashboard..." /></Screen>;

  if (error && !report) {
    return (
      <Screen>
        <ErrorBanner message={error} />
        <Button title="Try again" onPress={() => load()} />
      </Screen>
    );
  }

  const isToday = date === today;
  const dateLabel = formatISODate(date);
  const margin = report?.sales?.revenue > 0
    ? `${((report.sales.grossProfit / report.sales.revenue) * 100).toFixed(1)}% margin`
    : 'No sales yet';

  const activityCount =
    (report?.sales?.count || 0) +
    (report?.repairs?.count || 0) +
    (report?.expenses?.count || 0) +
    (report?.easyload?.count || 0) +
    (report?.jazzcash?.count || 0);

  const openModule = (screen) => navigation.navigate(screen);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load({ silent: true }); }}
    >
      <Text style={styles.heading}>{isToday ? "Today's Dashboard" : 'Dashboard'}</Text>
      <Text style={styles.dateLabel}>{dateLabel}</Text>

      <Row style={{ marginTop: spacing.md }}>
        <Button title="‹" variant="ghost" size="sm" onPress={() => setDate(addDays(date, -1))} />
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <DateField value={date} onChange={setDate} maximumDate={today} placeholder="Pick a date" />
        </View>
        <Button title="›" variant="ghost" size="sm" disabled={date >= today} onPress={() => setDate(addDays(date, 1))} />
      </Row>
      <Row style={{ marginBottom: spacing.md }}>
        {!isToday ? <Button title="Today" variant="soft" size="sm" onPress={() => setDate(today)} /> : <View />}
        <Button title="↻ Refresh" variant="ghost" size="sm" onPress={() => load()} />
      </Row>

      <ErrorBanner message={error} />

      {!loading && report && activityCount === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            <Text style={{ fontWeight: '700' }}>No sales, repairs or expenses on {dateLabel}.</Text>{' '}
            Pick another date above to view that day's dashboard.
          </Text>
          {lastActive && lastActive !== date && (
            <Button
              title={`View last active day (${formatISODate(lastActive, { day: 'numeric', month: 'short', year: 'numeric' })})`}
              variant="soft"
              size="sm"
              onPress={() => setDate(lastActive)}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </Card>
      )}

      <View style={styles.grid}>
        <StatCard title="Revenue" value={formatMoney(report?.sales?.revenue)} icon="💰" tone="green" sub={`${report?.sales?.count || 0} transactions`} />
        <StatCard title="Gross Profit" value={formatMoney(report?.sales?.grossProfit)} icon="📈" tone="green" sub={margin} />
        <StatCard title="Repair Income" value={formatMoney(report?.repairs?.total)} icon="🔧" tone="blue" sub={`${report?.repairs?.count || 0} delivered`} />
        <StatCard title="EasyLoad" value={formatMoney(report?.easyload?.commission)} icon="📶" tone="purple" sub={`${report?.easyload?.count || 0} transactions`} />
        <StatCard title="JazzCash" value={formatMoney(report?.jazzcash?.commission)} icon="📲" tone="yellow" sub={`${report?.jazzcash?.count || 0} transactions`} />
        <StatCard title="Expenses" value={formatMoney(report?.expenses?.total)} icon="💸" tone="red" sub={`${report?.expenses?.count || 0} entries`} />
        <StatCard title="Net Profit" value={formatMoney(report?.netProfit)} icon="🏆" tone={(report?.netProfit || 0) >= 0 ? 'green' : 'red'} sub="Profit − expenses" />
        <StatCard title="Pending Udhar" value={formatMoney(report?.udhar?.total)} icon="⚠️" tone="orange" sub={`${report?.udhar?.pending || 0} accounts (all time)`} />
      </View>

      <SectionTitle style={{ marginTop: spacing.xl }}>Quick actions</SectionTitle>
      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => openModule(action.screen)}
            style={({ pressed }) => [styles.action, { backgroundColor: action.color }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Row style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <SectionTitle style={{ marginBottom: 0 }}>⚠️ Low stock</SectionTitle>
        <Pressable onPress={() => openModule('Inventory')} hitSlop={8}>
          <Text style={styles.link}>View inventory ›</Text>
        </Pressable>
      </Row>

      <Card>
        {lowStock.length === 0 ? (
          <EmptyState icon="✅" title="All products are well stocked" />
        ) : (
          lowStock.slice(0, 8).map((product, index) => (
            <View key={product.id} style={[styles.lowRow, index > 0 && styles.lowRowBorder]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.lowName}>{product.brand} {product.model}</Text>
                <Text style={styles.lowMeta}>
                  {[product.color, product.storage, product.imei ? `IMEI: ${product.imei}` : ''].filter(Boolean).join(' • ') || product.category}
                </Text>
              </View>
              <Badge tone={product.stockQty <= 0 ? 'red' : 'orange'}>
                {product.stockQty <= 0 ? 'Out of stock' : `${product.stockQty} left`}
              </Badge>
            </View>
          ))
        )}
        {lowStock.length > 8 && (
          <Text style={styles.moreLow}>+ {lowStock.length - 8} more low-stock products</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '800', color: colors.text },
  dateLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', marginBottom: spacing.md },
  emptyText: { fontSize: 12, color: '#92400e', lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { width: '31%', flexGrow: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  actionIcon: { fontSize: 20 },
  actionLabel: { color: colors.white, fontSize: 10, fontWeight: '700', marginTop: 3 },
  link: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  lowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  lowRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  lowName: { fontSize: 13, fontWeight: '600', color: colors.text },
  lowMeta: { fontSize: 10, color: colors.textLight, marginTop: 1 },
  moreLow: { fontSize: 10, color: colors.textLight, marginTop: 6 },
});
