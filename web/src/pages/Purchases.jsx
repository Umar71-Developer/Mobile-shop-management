import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Pager from '../components/Pager';
import { formatDate } from '../utils/date';
import { formatMoney, errorMessage } from '../utils/format';

const emptyItem = () => ({ productId: '', description: '', quantity: '1', unitPrice: '' });
const emptyPurchase = () => ({ supplierId: '', notes: '', paidAmount: '', items: [emptyItem()] });

export default function Purchases() {
  const [tab, setTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase());
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '' });
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadPurchases = useCallback(async (nextPage) => {
    try {
      const res = await api.get('/purchases', { params: { page: nextPage, limit: 10 } });
      setPurchases(res.data.items);
      setPageInfo({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load purchases'));
    }
  }, []);

  const loadReference = useCallback(async () => {
    try {
      const [supplierRes, productRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
      ]);
      setSuppliers(supplierRes.data);
      setProducts(productRes.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load suppliers and products'));
    }
  }, []);

  useEffect(() => { loadPurchases(page); }, [page, loadPurchases]);
  useEffect(() => { loadReference(); }, [loadReference]);

  const purchaseTotal = purchaseForm.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const purchasePaid = Number(purchaseForm.paidAmount) || 0;
  const purchaseBalance = Math.max(0, purchaseTotal - purchasePaid);

  const openPurchase = () => {
    setPurchaseForm(emptyPurchase());
    setShowQuickSupplier(false);
    setShowPurchase(true);
  };

  const updateItem = (index, patch) => {
    setPurchaseForm(prev => {
      const items = prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return { ...prev, items };
    });
  };

  const onProductChange = (index, productId) => {
    const product = products.find(p => String(p.id) === String(productId));
    updateItem(index, {
      productId,
      description: product ? `${product.brand} ${product.model}` : purchaseForm.items[index].description,
      unitPrice: product ? String(product.purchasePrice) : purchaseForm.items[index].unitPrice,
    });
  };

  const addItem = () => {
    setPurchaseForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.length === 1 ? [emptyItem()] : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierId) return toast.error('Select a supplier');
    const items = purchaseForm.items.filter(item => item.description.trim() && Number(item.quantity) > 0);
    if (items.length === 0) return toast.error('Add at least one item');

    setSubmitting(true);
    try {
      await api.post('/purchases', {
        supplierId: parseInt(purchaseForm.supplierId, 10),
        paidAmount: Number(purchaseForm.paidAmount) || 0,
        notes: purchaseForm.notes,
        items: items.map(item => ({
          productId: item.productId ? parseInt(item.productId, 10) : undefined,
          description: item.description.trim(),
          quantity: parseInt(item.quantity, 10),
          unitPrice: Number(item.unitPrice) || 0,
        })),
      });
      toast.success('Purchase recorded and stock updated');
      setShowPurchase(false);
      setPurchaseForm(emptyPurchase());
      setPage(1);
      await Promise.all([loadPurchases(1), loadReference()]);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save purchase'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSupplier = async (e) => {
    e.preventDefault();
    if (!quickSupplier.name.trim() || !quickSupplier.phone.trim()) {
      return toast.error('Supplier name and phone are required');
    }
    try {
      const res = await api.post('/suppliers', quickSupplier);
      setSuppliers(prev => [...prev, res.data]);
      setPurchaseForm(prev => ({ ...prev, supplierId: String(res.data.id) }));
      setQuickSupplier({ name: '', phone: '' });
      setShowQuickSupplier(false);
      toast.success('Supplier added');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add supplier'));
    }
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', phone: '', address: '' });
    setShowSupplierForm(true);
  };

  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({ name: supplier.name, phone: supplier.phone, address: supplier.address || '' });
    setShowSupplierForm(true);
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, supplierForm);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', supplierForm);
        toast.success('Supplier added');
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
      await loadReference();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save supplier'));
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    if (!window.confirm(`Delete ${supplier.name}?`)) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      toast.success('Supplier deleted');
      await loadReference();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete supplier'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🚚 Purchases</h2>
          <p className="text-sm text-gray-400 mt-0.5">Restock inventory and track supplier balances</p>
        </div>
        <div className="flex gap-2">
          {tab === 'purchases' ? (
            <button onClick={openPurchase} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
              ＋ New Purchase
            </button>
          ) : (
            <button onClick={openAddSupplier} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
              ＋ Add Supplier
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { value: 'purchases', label: '📥 Purchase History' },
          { value: 'suppliers', label: '🏭 Suppliers' },
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

      {tab === 'purchases' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Supplier', 'Items', 'Total', 'Paid', 'Balance', 'Notes'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map(purchase => {
                  const balance = Math.max(0, (purchase.totalAmount || 0) - (purchase.paidAmount || 0));
                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(purchase.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{purchase.supplier?.name}</p>
                        <p className="text-xs text-gray-400">{purchase.supplier?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{purchase.items.length} line(s)</p>
                        <p className="text-xs text-gray-400 max-w-[220px] truncate">
                          {purchase.items.map(item => `${item.description} ×${item.quantity}`).join(', ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{formatMoney(purchase.totalAmount)}</td>
                      <td className="px-4 py-3 text-green-600">{formatMoney(purchase.paidAmount)}</td>
                      <td className={`px-4 py-3 font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatMoney(balance)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">{purchase.notes || '—'}</td>
                    </tr>
                  );
                })}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300">
                      <div className="text-4xl mb-2">🚚</div>
                      <p>No purchases recorded yet</p>
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
            label="purchases"
            onPageChange={setPage}
          />
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Supplier', 'Phone', 'Address', 'Products', 'Purchases', 'Outstanding', 'Actions'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{supplier.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{supplier.phone}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{supplier.address || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{supplier._count?.products ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{supplier._count?.purchases ?? 0}</td>
                    <td className={`px-4 py-3 font-bold ${supplier.outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatMoney(supplier.outstandingBalance)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditSupplier(supplier)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDeleteSupplier(supplier)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                          🗑️ Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300">
                      <div className="text-4xl mb-2">🏭</div>
                      <p>No suppliers yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New purchase modal */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">🚚 Record Purchase</h3>
              <button onClick={() => setShowPurchase(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Supplier *</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplier(value => !value)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showQuickSupplier ? 'Cancel new supplier' : '＋ New supplier'}
                  </button>
                </div>
                <select
                  value={purchaseForm.supplierId}
                  onChange={e => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                  required
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} — {supplier.phone}
                    </option>
                  ))}
                </select>
              </div>

              {showQuickSupplier && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                  <input
                    value={quickSupplier.name}
                    onChange={e => setQuickSupplier({ ...quickSupplier, name: e.target.value })}
                    placeholder="Supplier name"
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={quickSupplier.phone}
                    onChange={e => setQuickSupplier({ ...quickSupplier, phone: e.target.value })}
                    placeholder="Phone number"
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleQuickSupplier}
                    className="col-span-2 bg-blue-600 text-white rounded-lg py-2 text-xs font-semibold hover:bg-blue-700"
                  >
                    Save supplier
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Items *</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">
                    ＋ Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {purchaseForm.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 border rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={item.productId}
                          onChange={e => onProductChange(index, e.target.value)}
                          className="border rounded-lg px-2 py-2 text-sm"
                        >
                          <option value="">Custom item</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.brand} {product.model} ({product.stockQty} in stock)
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.description}
                          onChange={e => updateItem(index, { description: e.target.value })}
                          placeholder="Description *"
                          required
                          className="border rounded-lg px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(index, { quantity: e.target.value })}
                          placeholder="Qty"
                          required
                          className="border rounded-lg px-2 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateItem(index, { unitPrice: e.target.value })}
                          placeholder="Unit price"
                          required
                          className="border rounded-lg px-2 py-2 text-sm"
                        />
                        <div className="flex items-center justify-between px-2">
                          <span className="text-xs text-gray-500">
                            {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-600"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseForm.paidAmount}
                    onChange={e => setPurchaseForm({ ...purchaseForm, paidAmount: e.target.value })}
                    placeholder="0"
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    value={purchaseForm.notes}
                    onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    placeholder="Optional"
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase total</span>
                  <span className="font-semibold text-gray-800">{formatMoney(purchaseTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid now</span>
                  <span className="text-green-600">{formatMoney(purchasePaid)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-1">
                  <span className="text-gray-600 font-medium">Added to supplier balance</span>
                  <span className={`font-bold ${purchaseBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatMoney(purchaseBalance)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPurchase(false)}
                  className="px-4 py-2 border rounded-xl text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/edit supplier modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editingSupplier ? '✏️ Edit Supplier' : '🏭 Add Supplier'}</h3>
              <button onClick={() => setShowSupplierForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  value={supplierForm.name}
                  onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  required
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                <input
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  required
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input
                  value={supplierForm.address}
                  onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSupplierForm(false)} className="px-4 py-2 border rounded-xl text-sm text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editingSupplier ? 'Update' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
