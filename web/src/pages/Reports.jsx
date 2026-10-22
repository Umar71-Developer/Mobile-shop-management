import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toLocalISODate } from '../utils/date';
import { formatMoney, errorMessage } from '../utils/format';

const COLORS = {
  green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600' },
  red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-700' },
};

function Row({ label, value, sub, color = 'gray' }) {
  const c = COLORS[color] || COLORS.gray;
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${c.text} mt-0.5`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ReportGrid({ report, kind }) {
  const sales = report.sales || {};
  const repairs = report.repairs || {};
  const expenses = report.expenses || {};
  const easyload = report.easyload || {};
  const jazzcash = report.jazzcash || {};
  const margin = sales.revenue > 0 ? ((sales.grossProfit / sales.revenue) * 100).toFixed(1) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      <Row label="Revenue" value={formatMoney(sales.revenue)} sub={`${sales.count || 0} transactions`} color="green" />
      <Row label="Cost of Goods Sold" value={formatMoney(sales.cogs)} sub="Purchase cost of items sold" color="gray" />
      <Row
        label="Gross Profit"
        value={formatMoney(sales.grossProfit)}
        sub={margin !== null ? `${margin}% margin` : 'No sales'}
        color={(sales.grossProfit || 0) >= 0 ? 'green' : 'red'}
      />
      <Row label="Discounts Given" value={formatMoney(sales.discount)} sub="Included in gross profit" color="red" />
      <Row label="Repair Income" value={formatMoney(repairs.total)} sub={`${repairs.count || 0} jobs delivered`} color="blue" />
      <Row label="EasyLoad Commission" value={formatMoney(easyload.commission)} sub={`${easyload.count || 0} sales`} color="purple" />
      <Row label="JazzCash Commission" value={formatMoney(jazzcash.commission)} sub={`${jazzcash.count || 0} txns`} color="yellow" />
      <Row label="Total Expenses" value={formatMoney(expenses.total)} sub={`${expenses.count || 0} entries`} color="red" />
      <Row
        label="Net Profit"
        value={formatMoney(report.netProfit)}
        sub="Gross profit + commissions − expenses"
        color={(report.netProfit || 0) >= 0 ? 'green' : 'red'}
      />
      {kind === 'daily' && (
        <Row
          label="Pending Udhar"
          value={formatMoney(report.udhar?.total)}
          sub={`${report.udhar?.pending || 0} accounts (all time)`}
          color="orange"
        />
      )}
    </div>
  );
}

export default function Reports() {
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [date, setDate] = useState(toLocalISODate());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingDaily(true);
    api.get('/reports/daily', { params: { date } })
      .then(r => { if (!cancelled) { setDaily(r.data); setError(''); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Could not load the daily report')); })
      .finally(() => { if (!cancelled) setLoadingDaily(false); });
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMonthly(true);
    api.get('/reports/monthly', { params: { year, month } })
      .then(r => { if (!cancelled) { setMonthly(r.data); setError(''); } })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Could not load the monthly report')); })
      .finally(() => { if (!cancelled) setLoadingMonthly(false); });
    return () => { cancelled = true; };
  }, [month, year]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">📊 Reports & Analytics</h2>
        <p className="text-sm text-gray-400 mt-0.5">Profit is calculated from selling price minus purchase cost</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Daily Report */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">📅 Daily Report</h3>
            <p className="text-xs text-gray-400">
              {daily?.date || 'Selected day'}
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {loadingDaily ? (
          <p className="text-gray-400 text-center py-8">Loading report...</p>
        ) : daily ? (
          <ReportGrid report={daily} kind="daily" />
        ) : (
          <p className="text-gray-400 text-center py-8">No data for selected date</p>
        )}
      </div>

      {/* Monthly Report */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">🗓 Monthly Report</h3>
            <p className="text-xs text-gray-400">{monthly?.period || `${year}-${String(month).padStart(2, '0')}`}</p>
          </div>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value, 10))}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
              className="border rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {loadingMonthly ? (
          <p className="text-gray-400 text-center py-8">Loading report...</p>
        ) : monthly ? (
          <ReportGrid report={monthly} kind="monthly" />
        ) : (
          <p className="text-gray-400 text-center py-8">No data for selected month</p>
        )}
      </div>
    </div>
  );
}
