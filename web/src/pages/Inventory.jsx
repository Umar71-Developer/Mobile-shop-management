import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/format';

const EMPTY = { brand: '', model: '', color: '', storage: '', category: 'phone', imei: '', purchasePrice: '', sellingPrice: '', stockQty: 1 };

// Defensive clamp: legacy rows could hold negative stock, which made every
// inventory total (invested value, item count, profit) negative.
const stockOf = (product) => Math.max(0, Number(product?.stockQty) || 0);

function ProfitBadge({ purchase, selling }) {
  const profit = selling - purchase;
  const margin = purchase > 0 ? ((profit / purchase) * 100).toFixed(1) : 0;
  const isGood = profit > 0;
  return (
    <div>
      <span className={`font-bold text-sm ${isGood ? 'text-green-600' : 'text-red-500'}`}>
        Rs. {profit.toLocaleString()}
      </span>
      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${isGood ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
        {isGood ? '+' : ''}{margin}%
      </span>
    </div>
  );
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [lowStock, setLowStock] = useState(false);

  const load = () => api.get('/products', {
    params: {
      search: search || undefined,
      category: category || undefined,
      lowStock: lowStock ? 'true' : undefined,
    },
  })
    .then(r => setProducts(r.data))
    .catch(err => toast.error(errorMessage(err, 'Could not load products')));
  useEffect(() => { load(); }, [search, category, lowStock]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, purchasePrice: parseFloat(form.purchasePrice), sellingPrice: parseFloat(form.sellingPrice), stockQty: parseInt(form.stockQty) };
      if (editing) { await api.put(`/products/${editing.id}`, data); toast.success('Product updated!'); }
      else { await api.post('/products', data); toast.success('Product added!'); }
      setShowModal(false); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save product')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error(errorMessage(err, 'Could not delete product')); }
  };

  // ── Profit Summary Calculations ──────────────────────────────
  const summary = products.reduce((acc, p) => {
    const qty       = stockOf(p);
    const invested  = (p.purchasePrice || 0) * qty;
    const revenue   = (p.sellingPrice  || 0) * qty;
    const profit    = revenue - invested;
    return {
      totalInvested:  acc.totalInvested  + invested,
      totalRevenue:   acc.totalRevenue   + revenue,
      totalProfit:    acc.totalProfit    + profit,
      totalItems:     acc.totalItems     + qty,
    };
  }, { totalInvested: 0, totalRevenue: 0, totalProfit: 0, totalItems: 0 });

  const overallMargin = summary.totalInvested > 0
    ? ((summary.totalProfit / summary.totalInvested) * 100).toFixed(1)
    : 0;

  // Per-category profit
  const byCategory = ['phone', 'accessory', 'sim'].map(cat => {
    const items = products.filter(p => p.category === cat);
    const invested = items.reduce((s, p) => s + (p.purchasePrice || 0) * stockOf(p), 0);
    const revenue  = items.reduce((s, p) => s + (p.sellingPrice  || 0) * stockOf(p), 0);
    return { cat, count: items.length, invested, revenue, profit: revenue - invested };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📦 Inventory</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          ＋ Add Product
        </button>
      </div>

      {/* ── Profit Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Stock Items</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalItems}</p>
          <p className="text-xs text-gray-400 mt-0.5">{products.length} product lines</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">💰 Total Invested</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">Rs. {summary.totalInvested.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Purchase cost of stock</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🏷️ Selling Value</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">Rs. {summary.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">If all stock sold</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 ${summary.totalProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">📈 Potential Profit</p>
          <p className={`text-2xl font-bold mt-1 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            Rs. {summary.totalProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Margin: {overallMargin}%</p>
        </div>
      </div>

      {/* ── Per-Category Profit Breakdown ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {byCategory.map(({ cat, count, invested, revenue, profit }) => {
          const margin = invested > 0 ? ((profit / invested) * 100).toFixed(1) : 0;
          const icons  = { phone: '📱', accessory: '🎧', sim: '📡' };
          const labels = { phone: 'Phones', accessory: 'Accessories', sim: 'SIMs' };
          return (
            <div key={cat} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icons[cat]}</span>
                <span className="capitalize font-semibold text-gray-700">{labels[cat]}</span>
                <span className="ml-auto text-xs text-gray-400">{count} items</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Invested:</span><span className="text-blue-600 font-medium">Rs. {invested.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sell value:</span><span className="text-purple-600 font-medium">Rs. {revenue.toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-gray-600 font-semibold">Profit:</span>
                  <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    Rs. {profit.toLocaleString()} <span className="text-xs font-normal">({margin}%)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border p-3 mb-4 flex items-center gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by brand, model, IMEI..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          <option value="phone">📱 Phone</option>
          <option value="accessory">🎧 Accessory</option>
          <option value="sim">📡 SIM</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={e => setLowStock(e.target.checked)}
            className="rounded border-gray-300"
          />
          Low stock only
        </label>
      </div>

      {lowStock && (
        <div className="bg-orange-50 border border-orange-100 text-orange-600 text-xs rounded-xl px-4 py-2 mb-4">
          Showing products with 2 units or fewer. The summary above reflects this filter.
        </div>
      )}

      {/* ── Product Table ── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Brand / Model', 'Category', 'IMEI', 'Stock', 'Buy Price', 'Sell Price', 'Profit / Unit', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(p => {
              const stock = stockOf(p);
              return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{p.brand} {p.model}</div>
                  <div className="text-xs text-gray-400">{[p.color, p.storage].filter(Boolean).join(' • ')}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.category}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.imei || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold text-base ${stock <= 2 ? 'text-red-500' : 'text-green-600'}`}>{stock}</span>
                  {stock === 0 && <span className="ml-1 text-xs text-red-400">Out</span>}
                  {stock > 0 && stock <= 2 && <span className="ml-1 text-xs text-red-400">Low!</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">Rs. {p.purchasePrice?.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-purple-600">Rs. {p.sellingPrice?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <ProfitBadge purchase={p.purchasePrice || 0} selling={p.sellingPrice || 0} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">✏️ Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50">🗑️ Del</button>
                  </div>
                </td>
              </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                <div className="text-4xl mb-2">📦</div>
                <p>No products found. Add one!</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Product' : '➕ Add Product'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Live profit preview inside modal */}
            {(form.purchasePrice && form.sellingPrice) && (
              <div className={`rounded-xl p-3 mb-4 flex items-center justify-between text-sm ${
                (parseFloat(form.sellingPrice) - parseFloat(form.purchasePrice)) >= 0
                  ? 'bg-green-50 border border-green-100'
                  : 'bg-red-50 border border-red-100'
              }`}>
                <span className="text-gray-500">Profit per unit:</span>
                <span className={`font-bold text-base ${(parseFloat(form.sellingPrice) - parseFloat(form.purchasePrice)) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  Rs. {(parseFloat(form.sellingPrice || 0) - parseFloat(form.purchasePrice || 0)).toLocaleString()}
                  {' '}
                  ({parseFloat(form.purchasePrice) > 0
                    ? (((parseFloat(form.sellingPrice || 0) - parseFloat(form.purchasePrice || 0)) / parseFloat(form.purchasePrice)) * 100).toFixed(1)
                    : 0}%)
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              {[
                { label: 'Brand *', key: 'brand', req: true },
                { label: 'Model *', key: 'model', req: true },
                { label: 'Color', key: 'color' },
                { label: 'Storage', key: 'storage', placeholder: 'e.g. 128GB' },
                { label: 'IMEI', key: 'imei' },
                { label: 'Stock Qty', key: 'stockQty', type: 'number' },
                { label: 'Purchase Price (Rs.) *', key: 'purchasePrice', type: 'number', req: true },
                { label: 'Selling Price (Rs.) *', key: 'sellingPrice', type: 'number', req: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type={f.type || 'text'} value={form[f.key]} required={f.req}
                    min={f.key === 'stockQty' ? 0 : undefined}
                    placeholder={f.placeholder || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="phone">📱 Phone</option>
                  <option value="accessory">🎧 Accessory</option>
                  <option value="sim">📡 SIM</option>
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm text-gray-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editing ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
