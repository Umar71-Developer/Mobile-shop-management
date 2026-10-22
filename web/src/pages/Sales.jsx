import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SaleReceipt from '../components/SaleReceipt';
import Pager from '../components/Pager';
import { formatDateTime } from '../utils/date';import { formatMoney, errorMessage } from '../utils/format';

export default function Sales() {
  const [tab, setTab] = useState('pos');

  // POS state
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);

  // History state
  const [sales, setSales] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refundingId, setRefundingId] = useState(null);

  useEffect(() => {
    api.get('/customers')
      .then(r => setCustomers(r.data))
      .catch(err => toast.error(errorMessage(err, 'Could not load customers')));
  }, []);

  useEffect(() => {
    if (search.length > 1) {
      api.get('/products', { params: { search } })
        .then(r => setProducts(r.data))
        .catch(err => toast.error(errorMessage(err, 'Could not search products')));
    } else {
      setProducts([]);
    }
  }, [search]);

  const loadHistory = useCallback(async (nextPage) => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/sales', {
        params: {
          page: nextPage,
          limit: 10,
          status: statusFilter || undefined,
          search: appliedSearch || undefined,
        },
      });
      setSales(res.data.items);
      setPageInfo({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load sales history'));
    } finally {
      setLoadingHistory(false);
    }
  }, [statusFilter, appliedSearch]);

  useEffect(() => {
    if (tab === 'history') loadHistory(page);
  }, [tab, page, loadHistory]);

  const addToCart = (product) => {
    if ((product.stockQty || 0) < 1) {
      return toast.error(`${product.brand} ${product.model} is out of stock`);
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing && existing.qty >= product.stockQty) {
      return toast.error(`Only ${product.stockQty} unit(s) of ${product.brand} ${product.model} in stock`);
    }
    setCart(prev => {
      const match = prev.find(item => item.id === product.id);
      if (match) {
        return prev.map(item => item.id === product.id
          ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.sellingPrice }
          : item);
      }
      return [...prev, { ...product, qty: 1, total: product.sellingPrice }];
    });
    setSearch('');
    setProducts([]);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const max = Math.max(1, item.stockQty || 1);
      const next = Math.min(max, Math.max(1, item.qty + delta));
      return { ...item, qty: next, total: next * item.sellingPrice };
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalTotal = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleSale = async () => {
    if (cart.length === 0) return toast.error('Cart is empty!');
    if ((parseFloat(discount) || 0) > subtotal) return toast.error('Discount cannot be greater than the subtotal');

    setSubmitting(true);
    try {
      const res = await api.post('/sales', {
        customerId: customerId ? parseInt(customerId, 10) : null,
        items: cart.map(item => ({ productId: item.id, quantity: item.qty })),
        discount: parseFloat(discount) || 0,
        paymentMode,
      });
      toast.success('✅ Sale completed successfully!');
      setCart([]);
      setCustomerId('');
      setDiscount(0);
      setPaymentMode('cash');
      setReceiptSale(res.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Sale failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async (sale) => {
    if (!window.confirm(`Refund sale #${sale.id}? Stock will be restored and the sale marked refunded.`)) return;
    setRefundingId(sale.id);
    try {
      await api.post(`/sales/${sale.id}/refund`);
      toast.success('Sale refunded and stock restored');
      await loadHistory(page);
    } catch (err) {
      toast.error(errorMessage(err, 'Refund failed'));
    } finally {
      setRefundingId(null);
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(historySearch.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🛒 Sales / POS</h2>
          <p className="text-sm text-gray-400 mt-0.5">Ring up sales, print receipts and handle refunds</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'pos', label: '🛒 New Sale' },
            { value: 'history', label: '🧾 Sales History' },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tab === item.value ? 'bg-blue-600 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pos' && (
        <div className="flex flex-col xl:flex-row gap-5">
          {/* Left — Product Search + Cart */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="relative">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search product by name, model, IMEI..."
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              />
              {products.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-10 mt-1 max-h-64 overflow-y-auto">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm">{p.brand} {p.model}</p>
                        <p className="text-xs text-gray-400">
                          {[p.color, p.storage, p.imei ? `IMEI: ${p.imei}` : ''].filter(Boolean).join(' • ')}
                        </p>
                        <p className={`text-xs mt-0.5 ${p.stockQty <= 2 ? 'text-red-500' : 'text-gray-400'}`}>
                          {p.stockQty > 0 ? `${p.stockQty} in stock` : 'Out of stock'}
                        </p>
                      </div>
                      <span className="text-green-600 font-bold text-sm">{formatMoney(p.sellingPrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[320px]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-gray-300">
                  <div className="text-6xl mb-3">🛒</div>
                  <p>Search a product above to add to cart</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {['Product', 'Qty', 'Unit Price', 'Total', ''].map(header => (
                          <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cart.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{item.brand} {item.model}</p>
                            <p className="text-xs text-gray-400">
                              {item.color}{item.stockQty ? ` • ${item.stockQty} in stock` : ''}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 border rounded-lg flex items-center justify-center hover:bg-gray-100 font-bold">−</button>
                              <span className="w-6 text-center font-semibold">{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                disabled={item.qty >= (item.stockQty || 1)}
                                className="w-7 h-7 border rounded-lg flex items-center justify-center hover:bg-gray-100 font-bold disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatMoney(item.sellingPrice)}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{formatMoney(item.total)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-lg">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="w-full xl:w-80 bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4 shrink-0">
            <h3 className="font-bold text-lg text-gray-800">Order Summary</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer (optional)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm">
                <option value="">Walk-in Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name} — {customer.phone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
              <div className="flex gap-2">
                {[{ value: 'cash', label: '💵 Cash' }, { value: 'jazzcash', label: '📲 JazzCash' }].map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => setPaymentMode(mode.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      paymentMode === mode.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount (Rs.)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border-t pt-4 space-y-2 mt-auto">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{formatMoney(subtotal)}</span>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount</span><span>− {formatMoney(parseFloat(discount) || 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-gray-800">
                <span>Total</span><span>{formatMoney(finalTotal)}</span>
              </div>
              <button
                onClick={handleSale}
                disabled={submitting || cart.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {submitting ? '⏳ Processing...' : '✅ Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-3 border-b flex flex-col md:flex-row gap-2 md:items-center md:justify-between print:hidden">
            <div className="flex gap-2">
              {[
                { value: '', label: 'All' },
                { value: 'completed', label: 'Completed' },
                { value: 'refunded', label: 'Refunded' },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => { setStatusFilter(item.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    statusFilter === item.value ? 'bg-blue-600 text-white' : 'bg-gray-50 border text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <form onSubmit={applySearch} className="flex gap-2">
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search receipt #, customer name or phone..."
                className="border rounded-xl px-3 py-2 text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900">
                Search
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Receipt', 'Date', 'Customer', 'Items', 'Total', 'Paid', 'Balance', 'Mode', 'Status', 'Actions'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map(sale => {
                  const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));
                  const itemCount = (sale.saleItems || []).reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">#{String(sale.id).padStart(4, '0')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(sale.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{sale.customer?.name || 'Walk-in'}</p>
                        <p className="text-xs text-gray-400">{sale.user?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{itemCount}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{formatMoney(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-green-600">{formatMoney(sale.paidAmount)}</td>
                      <td className={`px-4 py-3 font-medium ${balance > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{formatMoney(balance)}</td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-500">{sale.paymentMode}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          sale.status === 'refunded' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setReceiptSale(sale)}
                            className="text-xs px-2.5 py-1 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            🧾 Receipt
                          </button>
                          {sale.status === 'completed' && (
                            <button
                              onClick={() => handleRefund(sale)}
                              disabled={refundingId === sale.id}
                              className="text-xs px-2.5 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            >
                              {refundingId === sale.id ? '...' : '↩ Refund'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-gray-300">
                      <div className="text-4xl mb-2">🧾</div>
                      <p>{loadingHistory ? 'Loading sales...' : 'No sales found'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager
            page={pageInfo.page}
            pages={pageInfo.pages}
            total={pageInfo.total}
            label="sales"
            onPageChange={setPage}
          />
        </div>
      )}

      <SaleReceipt sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </div>
  );
}
