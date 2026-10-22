import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/format';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  const load = () => api.get('/customers', { params: { search: search || undefined } })
    .then(r => setCustomers(r.data))
    .catch(err => toast.error(errorMessage(err, 'Could not load customers')));
  useEffect(() => { load(); }, [search]);

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', address: '' }); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone, address: c.address || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
        toast.success('Customer updated!');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added!');
      }
      setShowForm(false); setEditing(null); setForm({ name: '', phone: '', address: '' }); load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save customer')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? Customers with sales, repairs or udhar history cannot be deleted.')) return;
    try { await api.delete(`/customers/${id}`); toast.success('Customer deleted'); load(); }
    catch (err) { toast.error(errorMessage(err, 'Delete failed')); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">👥 Customers</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          ＋ Add Customer
        </button>
      </div>
      <div className="bg-white rounded-xl border p-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or phone..."
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Name', 'Phone', 'Address', 'Outstanding Balance', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.address || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${c.outstandingBalance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    Rs. {(c.outstandingBalance || 0).toLocaleString()}
                    {c.outstandingBalance > 0 && <span className="ml-1 text-xs bg-red-50 px-1.5 py-0.5 rounded">Udhar</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16 text-gray-300">
                <div className="text-4xl mb-2">👥</div><p>No customers yet</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Customer' : '➕ Add Customer'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[{ label: 'Full Name *', key: 'name', req: true }, { label: 'Phone Number *', key: 'phone', req: true }, { label: 'Address (optional)', key: 'address' }].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.req}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
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
