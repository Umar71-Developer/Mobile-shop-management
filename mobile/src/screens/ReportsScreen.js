import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../api/client';
import DateField from '../components/DateField';
import {
  Button, Card, ErrorBanner, Loading, Row, Screen, SectionTitle, Select, StatCard,
} from '../components/UI';
import { addDays, formatISODate, toLocalISODate } from '../utils/date';
import { errorMessage, formatMoney } from '../utils/format';
import { colors, spacing } from '../theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, index) => ({ value: index + 1, label }));

function ReportGrid({ report, kind }) {
  if (!report) return null;
  const sales = report.sales || {};
  const repairs = report.repairs || {};
  const expenses = report.expenses || {};
  const easyload = report.easyload || {};
  const jazzcash = report.jazzcash || {};
  const margin = sales.revenue > 0 ? `${((sales.grossProfit / sales.revenue) * 100).toFixed(1)}% margin` : 'No sales';

  return (
    <View style={styles.grid}>
      <StatCard title="Revenue" value={formatMoney(sales.revenue)} sub={`${sales.count || 0} transactions`} icon="💰" tone="green" />
      <StatCard title="Cost of Goods" value={formatMoney(sales.cogs)} sub="Purchase cost of items sold" icon="📦" tone="gray" />
      <StatCard title="Gross Profit" value={formatMoney(sales.grossProfit)} sub={margin} icon="📈" tone={(sales.grossProfit || 0) >= 0 ? 'green' : 'red'} />
      <StatCard title="Discounts Given" value={formatMoney(sales.discount)} sub="Included in gross profit" icon="🏷️" tone="red" />
      <StatCard title="Repair Income" value={formatMoney(repairs.total)} sub={`${repairs.count || 0} jobs delivered`} icon="🔧" tone="blue" />
      <StatCard title="EasyLoad Commission" value={formatMoney(easyload.commission)} sub={`${easyload.count || 0} sales`} icon="📶" tone="purple" />
      <StatCard title="JazzCash Commission" value={formatMoney(jazzcash.commission)} sub={`${jazzcash.count || 0} txns`} icon="📲" tone="yellow" />
      <StatCard title="Total Expenses" value={formatMoney(expenses.total)} sub={`${expenses.count || 0} entries`} icon="💸" tone="red" />
      <StatCard title="Net Profit" value={formatMoney(report.netProfit)} sub="Gross profit + commissions − expenses" icon="🏆" tone={(report.netProfit || 0) >= 0 ? 'green' : 'red'} />
      {kind === 'daily' && (
        <StatCard title="Pending Udhar" value={formatMoney(report.udhar?.total)} sub={`${report.udhar?.pending || 0} accounts (all time)`} icon="⚠️" tone="orange" />
      )}
    </View>
  );
}

export default function ReportsScreen() {
  const today = toLocalISODate();
  const now = new Date();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const res = await api.get('/reports/daily', { params: { date } });
      setDaily(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load the daily report'));
    } finally {
      setLoadingDaily(false);
    }
  }, [date]);

  const loadMonthly = useCallback(async () => {
    setLoadingMonthly(true);
    try {
      const res = await api.get('/reports/monthly', { params: { year, month } });
      setMonthly(res.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load the monthly report'));
    } finally {
      setLoadingMonthly(false);
    }
  }, [month, year]);

  useEffect(() => { loadDaily(); }, [loadDaily]);
  useEffect(() => { loadMonthly(); }, [loadMonthly]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDaily(), loadMonthly()]);
    setRefreshing(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <SectionTitle style={{ fontSize: 20 }}>📊 Reports & Analytics</SectionTitle>
      <Text style={styles.subtitle}>Profit is calculated from selling price minus purchase cost</Text>

      <ErrorBanner message={error} />

      <Card style={{ marginTop: spacing.lg }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>📅 Daily Report</Text>
            <Text style={styles.cardSub}>{formatISODate(date)}</Text>
          </View>
          <View style={styles.todayButton}>
            <Button title="Today" size="sm" variant="soft" onPress={() => setDate(today)} />
          </View>
        </Row>

        <Row style={{ marginTop: spacing.md }}>
          <Button title="‹" variant="ghost" size="sm" onPress={() => setDate(addDays(date, -1))} />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <DateField value={date} onChange={setDate} maximumDate={today} />
          </View>
          <Button title="›" variant="ghost" size="sm" disabled={date >= today} onPress={() => setDate(addDays(date, 1))} />
        </Row>

        <View style={{ marginTop: spacing.sm }}>
          {loadingDaily ? <Loading label="Loading daily report..." /> : <ReportGrid report={daily} kind="daily" />}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.cardTitle}>📆 Monthly Report</Text>
        <Text style={styles.cardSub}>{monthly?.period || `${year}-${String(month).padStart(2, '0')}`}</Text>

        <View style={{ marginTop: spacing.md }}>
          <Select label="Month" value={month} options={MONTHS} onChange={setMonth} />
        </View>

        <Row style={{ marginBottom: spacing.md }}>
          <Button title="‹" variant="ghost" size="sm" onPress={() => setYear((value) => value - 1)} />
          <Text style={styles.year}>{year}</Text>
          <Button title="›" variant="ghost" size="sm" onPress={() => setYear((value) => value + 1)} />
        </Row>

        {loadingMonthly ? <Loading label="Loading monthly report..." /> : <ReportGrid report={monthly} kind="monthly" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  todayButton: { marginLeft: spacing.sm },
  year: { fontSize: 16, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
});
