import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import { toLocalISODate, addDays, formatISODate } from '../utils/date';
import { formatMoney, errorMessage } from '../utils/format';

export default function Dashboard() {
  const today = toLocalISODate();
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [lastActive, setLastActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
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
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center"><div className="text-4xl mb-2">⏳</div><p>Loading dashboard...</p></div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="bg-white border rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-4xl mb-2">⚠️</div>
        <p className="text-gray-700 font-medium">{error}</p>
        <button onClick={load} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          Try again
        </button>
      </div>
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
  const isEmpty = !loading && report && activityCount === 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isToday ? "Today's Dashboard" : 'Dashboard'}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {dateLabel}
            {loading && <span className="ml-2 text-blue-500">Loading...</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setDate(addDays(date, -1))}
            title="Previous day"
            aria-label="Previous day"
            className="h-9 w-9 border bg-white rounded-lg text-gray-600 hover:bg-gray-50 text-lg leading-none"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="border bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={date >= today}
            title="Next day"
            aria-label="Next day"
            className="h-9 w-9 border bg-white rounded-lg text-gray-600 hover:bg-gray-50 text-lg leading-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ›
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(today)}
              className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium"
            >
              Today
            </button>
          )}
          <button onClick={load} className="text-xs text-gray-500 border bg-white px-3 py-2 rounded-lg hover:bg-gray-50">
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {isEmpty && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">No sales, repairs or expenses on {dateLabel}.</span>{' '}
            Pick another date above to see that day's dashboard.
          </p>
          {lastActive && lastActive !== date && (
            <button
              onClick={() => setDate(lastActive)}
              className="shrink-0 text-xs font-semibold text-amber-800 bg-white border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100"
            >
              View last active day ({formatISODate(lastActive, { day: 'numeric', month: 'short', year: 'numeric' })})
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={formatMoney(report?.sales?.revenue)}
          icon="💰"
          color="green"
          sub={`${report?.sales?.count || 0} transactions`}
        />
        <StatCard
          title="Gross Profit"
          value={formatMoney(report?.sales?.grossProfit)}
          icon="📈"
          color={(report?.sales?.grossProfit || 0) >= 0 ? 'green' : 'red'}
          sub={margin}
        />
        <StatCard
          title="Repair Income"
          value={formatMoney(report?.repairs?.total)}
          icon="🔧"
          color="blue"
          sub={`${report?.repairs?.count || 0} jobs delivered`}
        />
        <StatCard
          title="EasyLoad Commission"
          value={formatMoney(report?.easyload?.commission)}
          icon="📶"
          color="purple"
          sub={`${report?.easyload?.count || 0} transactions`}
        />
        <StatCard
          title="JazzCash Commission"
          value={formatMoney(report?.jazzcash?.commission)}
          icon="📲"
          color="yellow"
          sub={`${report?.jazzcash?.count || 0} transactions`}
        />
        <StatCard
          title="Total Expenses"
          value={formatMoney(report?.expenses?.total)}
          icon="💸"
          color="red"
          sub={`${report?.expenses?.count || 0} entries`}
        />
        <StatCard
          title="Net Profit"
          value={formatMoney(report?.netProfit)}
          icon="🏆"
          color={(report?.netProfit || 0) >= 0 ? 'green' : 'red'}
          sub="Gross profit + commissions − expenses"
        />
        <StatCard
          title="Pending Udhar"
          value={formatMoney(report?.udhar?.total)}
          icon="⚠️"
          color="orange"
          sub={`${report?.udhar?.pending || 0} accounts pending (all time)`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-800">⚠️ Low Stock Alerts</h3>
              <p className="text-xs text-gray-400">Products with 2 units or fewer</p>
            </div>
            <Link to="/inventory" className="text-xs text-blue-600 hover:underline">View inventory →</Link>
          </div>

          {lowStock.length === 0 ? (
            <div className="py-8 text-center text-gray-300">
              <div className="text-3xl mb-1">✅</div>
              <p className="text-sm">All products are well stocked</p>
            </div>
          ) : (
            <div className="divide-y">
              {lowStock.slice(0, 6).map(product => (
                <div key={product.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{product.brand} {product.model}</p>
                    <p className="text-xs text-gray-400">
                      {[product.color, product.storage, product.imei ? `IMEI: ${product.imei}` : ''].filter(Boolean).join(' • ') || product.category}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    product.stockQty <= 0 ? 'bg-red-100 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {product.stockQty <= 0 ? 'Out of stock' : `${product.stockQty} left`}
                  </span>
                </div>
              ))}
              {lowStock.length > 6 && (
                <p className="text-xs text-gray-400 pt-2">+ {lowStock.length - 6} more low-stock products</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Sale', icon: '🛒', link: '/sales', color: 'bg-green-500' },
              { label: 'New Purchase', icon: '🚚', link: '/purchases', color: 'bg-blue-500' },
              { label: 'New Repair', icon: '🔧', link: '/repairs', color: 'bg-indigo-500' },
              { label: 'Add Udhar', icon: '💳', link: '/udhar', color: 'bg-orange-500' },
              { label: 'Add Expense', icon: '💸', link: '/expenses', color: 'bg-red-500' },
              { label: 'Reports', icon: '📊', link: '/reports', color: 'bg-gray-700' },
            ].map(item => (
              <Link
                key={item.label}
                to={item.link}
                className={`${item.color} text-white rounded-xl p-3 text-center hover:opacity-90 transition-opacity`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="text-xs font-semibold">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
