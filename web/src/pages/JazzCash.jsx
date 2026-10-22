import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EMPTY = { type: 'receive', amount: '', recipient: '', commission: '0', notes: '' };

export default function JazzCash() {
  const [txns, setTxns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/jazzcash').then(r => setTxns(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowAdd(true); };
  const openEdit = (t) => { setEditing(t); setForm({ type: t.type, amount: t.amount, recipient: t.recipient, commission: t.commission, notes: t.notes || '' }); setShowAdd(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, amount: parseFloat(form.amount), commission: parseFloat(form.commission) || 0 };
      if (editing) {
        await api.put(`/jazzcash/${editing.id}`, data);
        toast.success('Transaction updated!');
      } else {
        await api.post('/jazzcash', data);
        toast.success('Transaction added!');
      }
      setShowAdd(false); setEditing(null); setForm(EMPTY); load();
    } catch (err) { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await api.delete(`/jazzcash/${id}`); toast.success('Deleted!'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const totalCommission = txns.reduce((s, t) => s + (t.commission || 0), 0);
  const totalSend = txns.filter(t => t.type === 'send').length;
  const totalReceive = txns.filter(t => t.type === 'receive').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📲 JazzCash</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 text-sm font-medium">
          ＋ Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border p-4 text-center shadow-sm"><p className="text-xs text-gray-500">Total Transactions</p><p className="text-3xl font-bold text-gray-800 mt-1">{txns.length}</p></div>
        <div className="bg-white rounded-xl border p-4 text-center shadow-sm"><p className="text-xs text-gray-500">Send / Receive</p><p className="text-xl font-bold text-gray-800 mt-1">{totalSend} / {totalReceive}</p></div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center shadow-sm"><p className="text-xs text-gray-500">Total Commission Earned</p><p className="text-2xl font-bold text-green-600 mt-1">Rs. {totalCommission.toLocaleString()}</p></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {['Type', 'Recipient/Sender', 'Amount', 'Commission', 'Date & Time', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y">
            {txns.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`capitalize text-xs px-3 py-1 rounded-full font-semibold ${t.type === 'receive' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.type === 'receive' ? '⬇ Receive' : '⬆ Send'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{t.recipient}</td>
                <td className="px-4 py-3 font-semibold">Rs. {t.amount?.toLocaleString()}</td>
                <td className="px-4 py-3 text-green-600 font-medium">Rs. {t.commission?.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-300"><div className="text-4xl mb-2">📲</div><p>No transactions yet</p></td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Transaction' : '📲 Add JazzCash Transaction'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
                <div className="flex gap-2">
                  {[{ v: 'receive', l: '⬇ Receive' }, { v: 'send', l: '⬆ Send' }].map(m => (
                    <button key={m.v} type="button" onClick={() => setForm({ ...form, type: m.v })}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${form.type === m.v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600'}`}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: 'Recipient / Sender Number *', key: 'recipient', req: true },
                { label: 'Amount (Rs.) *', key: 'amount', type: 'number', req: true },
                { label: 'Commission Earned (Rs.)', key: 'commission', type: 'number' },
                { label: 'Notes', key: 'notes' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.req}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                  {editing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
