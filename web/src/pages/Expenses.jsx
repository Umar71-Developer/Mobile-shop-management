import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { toLocalISODate } from '../utils/date';
import { errorMessage } from '../utils/format';

const CATEGORIES = ['rent', 'electricity', 'salary', 'maintenance', 'transport', 'misc'];
const EMPTY = { category: 'misc', amount: '', note: '', date: toLocalISODate() };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/expenses')
    .then(r => setExpenses(r.data))
    .catch(err => toast.error(errorMessage(err, 'Could not load expenses')));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({ category: e.category, amount: e.amount, note: e.note || '', date: toLocalISODate(e.date) });
    setShowForm(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    try {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (editing) {
        await api.put(`/expenses/${editing.id}`, data);
        toast.success('Expense updated!');
      } else {
        await api.post('/expenses', data);
        toast.success('Expense recorded!');
      }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save expense')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete expense'));
    }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">💸 Expenses</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 text-sm font-medium">
          ＋ Add Expense
        </button>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5 flex justify-between items-center">
        <span className="text-gray-600 font-medium">Total Expenses Shown</span>
        <span className="text-2xl font-bold text-red-500">Rs. {total.toLocaleString()}</span>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {['Category', 'Amount', 'Description', 'Date', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="capitalize text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">{e.category}</span></td>
                <td className="px-4 py-3 font-bold text-red-500">Rs. {e.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{e.note || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(e)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="text-center py-16 text-gray-300"><div className="text-4xl mb-2">💸</div><p>No expenses recorded</p></td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Expense' : '💸 Add Expense'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs.) *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description / Note</label>
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional note..."
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                  {editing ? 'Update' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
