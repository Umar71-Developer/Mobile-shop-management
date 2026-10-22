import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const NETWORKS = ['jazz', 'telenor', 'ufone', 'zong'];
const NET_STYLE = {
  jazz:    { bg: 'bg-orange-100', text: 'text-orange-700', btn: 'bg-orange-500' },
  telenor: { bg: 'bg-blue-100',   text: 'text-blue-700',   btn: 'bg-blue-500' },
  ufone:   { bg: 'bg-green-100',  text: 'text-green-700',  btn: 'bg-green-500' },
  zong:    { bg: 'bg-red-100',    text: 'text-red-700',    btn: 'bg-red-500' },
};
const EMPTY = { network: 'jazz', amount: '', customerNumber: '', commission: '0' };

export default function EasyLoad() {
  const [sales, setSales] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [netFilter, setNetFilter] = useState('');

  const load = () => api.get('/easyload', { params: { network: netFilter || undefined } }).then(r => setSales(r.data));
  useEffect(() => { load(); }, [netFilter]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowAdd(true); };
  const openEdit = (s) => { setEditing(s); setForm({ network: s.network, amount: s.amount, customerNumber: s.customerNumber, commission: s.commission }); setShowAdd(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, amount: parseFloat(form.amount), commission: parseFloat(form.commission) || 0 };
      if (editing) {
        await api.put(`/easyload/${editing.id}`, data);
        toast.success('Easy load updated!');
      } else {
        await api.post('/easyload', data);
        toast.success('Easy load sale recorded!');
      }
      setShowAdd(false); setEditing(null); setForm(EMPTY); load();
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this easy load entry?')) return;
    try { await api.delete(`/easyload/${id}`); toast.success('Deleted!'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📶 Easy Load</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 text-sm font-medium">
          ＋ Add Sale
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {NETWORKS.map(n => {
          const s = NET_STYLE[n];
          const netSales = sales.filter(x => x.network === n);
          const comm = netSales.reduce((t, x) => t + (x.commission || 0), 0);
          return (
            <div key={n} className={`${s.bg} rounded-xl p-4 text-center`}>
              <p className={`capitalize font-bold text-sm ${s.text}`}>{n.toUpperCase()}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{netSales.length}</p>
              <p className="text-xs text-gray-500">sales</p>
              <p className={`text-sm font-semibold mt-1 ${s.text}`}>Rs. {comm.toLocaleString()}</p>
              <p className="text-xs text-gray-400">commission</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        {['', ...NETWORKS].map(n => (
          <button key={n} onClick={() => setNetFilter(n)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${netFilter === n ? 'bg-purple-600 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
            {n || 'All Networks'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            {['Network', 'Customer Number', 'Amount', 'Commission', 'Date & Time', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y">
            {sales.map(s => {
              const st = NET_STYLE[s.network] || {};
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={`uppercase text-xs px-2 py-1 rounded-full font-bold ${st.bg} ${st.text}`}>{s.network}</span></td>
                  <td className="px-4 py-3 font-mono text-gray-700">{s.customerNumber}</td>
                  <td className="px-4 py-3 font-semibold">Rs. {s.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">Rs. {s.commission?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-300"><div className="text-4xl mb-2">📶</div><p>No easy load sales yet</p></td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Easy Load Entry' : '📶 Add Easy Load Sale'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Network *</label>
                <div className="grid grid-cols-4 gap-2">
                  {NETWORKS.map(n => {
                    const st = NET_STYLE[n];
                    return (
                      <button key={n} type="button" onClick={() => setForm({ ...form, network: n })}
                        className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${form.network === n ? `${st.btn} text-white border-transparent` : 'bg-white text-gray-500 border-gray-200'}`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              {[
                { label: 'Customer Phone Number *', key: 'customerNumber', req: true },
                { label: 'Load Amount (Rs.) *', key: 'amount', type: 'number', req: true },
                { label: 'Commission Earned (Rs.)', key: 'commission', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.req}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                  {editing ? 'Update' : 'Add Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
