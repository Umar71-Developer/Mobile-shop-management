import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { toLocalISODate } from '../utils/date';
import { errorMessage } from '../utils/format';

export default function Udhar() {
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showPay, setShowPay] = useState(null);
  const [form, setForm] = useState({ customerId: '', totalAmount: '', description: '', dueDate: '' });
  const [editForm, setEditForm] = useState({ description: '', dueDate: '' });
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [filter, setFilter] = useState('');

  const load = () => {
    api.get('/udhar', { params: { status: filter || undefined } })
      .then(r => setRecords(r.data))
      .catch(err => toast.error(errorMessage(err, 'Could not load udhar records')));
    api.get('/customers')
      .then(r => setCustomers(r.data))
      .catch(err => toast.error(errorMessage(err, 'Could not load customers')));
  };
  useEffect(() => { load(); }, [filter]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/udhar', { ...form, customerId: parseInt(form.customerId), totalAmount: parseFloat(form.totalAmount) });
      toast.success('Udhar record added!');
      setShowAdd(false); setForm({ customerId: '', totalAmount: '', description: '', dueDate: '' }); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not add udhar')); }
  };

  const openEdit = (r) => {
    setShowEdit(r);
    setEditForm({ description: r.description, dueDate: r.dueDate ? toLocalISODate(r.dueDate) : '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/udhar/${showEdit.id}`, { description: editForm.description, dueDate: editForm.dueDate || null });
      toast.success('Updated!'); setShowEdit(null); load();
    } catch (err) { toast.error(errorMessage(err, 'Update failed')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this udhar record? The customer balance will be adjusted.')) return;
    try { await api.delete(`/udhar/${id}`); toast.success('Deleted!'); load(); }
    catch (err) { toast.error(errorMessage(err, 'Delete failed')); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/udhar/${showPay.id}/payment`, { amountPaid: parseFloat(payAmount), note: payNote });
      toast.success('✅ Payment recorded!'); setShowPay(null); setPayAmount(''); setPayNote(''); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not record payment')); }
  };

  const totalPending = records.reduce((s, r) => s + r.remainingAmount, 0);
  const statusColor = { pending: 'text-red-500', partial: 'text-yellow-600', cleared: 'text-green-600' };
  const statusBg    = { pending: 'bg-red-50',    partial: 'bg-yellow-50',    cleared: 'bg-green-50'  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">💳 Udhar (Credit) Management</h2>
          <p className="text-sm text-red-500 font-medium mt-0.5">Total Pending: Rs. {totalPending.toLocaleString()}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 text-sm font-medium">
          ＋ Add Udhar
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: '🔴 Pending' },
          { value: 'partial', label: '🟡 Partial' },
          { value: 'cleared', label: '🟢 Cleared' },
        ].map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === s.value ? 'bg-blue-600 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Customer', 'Description', 'Total', 'Paid', 'Remaining', 'Due Date', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {records.map(r => (
              <tr key={r.id} className={`hover:bg-opacity-80 transition-colors ${statusBg[r.status]}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{r.customer?.name}</p>
                  <p className="text-xs text-gray-400">{r.customer?.phone}</p>
                </td>
                <td className="px-4 py-3 max-w-[140px] truncate text-gray-600">{r.description}</td>
                <td className="px-4 py-3 font-medium">Rs. {r.totalAmount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-green-600">Rs. {r.paidAmount?.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-red-500">Rs. {r.remainingAmount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`capitalize text-xs font-bold ${statusColor[r.status]}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {r.status !== 'cleared' && (
                      <button onClick={() => setShowPay(r)}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600 font-medium">
                        💵 Pay
                      </button>
                    )}
                    <button onClick={() => openEdit(r)}
                      className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 font-medium">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 font-medium">
                      🗑️ Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                <div className="text-4xl mb-2">💳</div><p>No udhar records</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Udhar Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">💳 Add Udhar Record</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
                  placeholder="e.g. Samsung A34 5G, Repair charges..."
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.) *</label>
                <input type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} required
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected Return Date (optional)</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Add Udhar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Udhar Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">✏️ Edit Udhar Record</h3>
              <button onClick={() => setShowEdit(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
              <p><strong>{showEdit.customer?.name}</strong> — Rs. {showEdit.totalAmount?.toLocaleString()}</p>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} required
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input type="date" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(null)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">💵 Record Payment</h3>
              <button onClick={() => setShowPay(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
              <p className="text-sm"><span className="text-gray-500">Customer:</span> <strong>{showPay.customer?.name}</strong></p>
              <p className="text-sm mt-1"><span className="text-gray-500">Item:</span> {showPay.description}</p>
              <p className="text-sm mt-1"><span className="text-gray-500">Remaining:</span> <strong className="text-red-500 text-base">Rs. {showPay.remainingAmount?.toLocaleString()}</strong></p>
            </div>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paying Now (Rs.) *</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  required max={showPay.remainingAmount}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. Cash received"
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPay(null)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
