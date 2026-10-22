import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ROLES = ['staff', 'cashier', 'technician'];
const ROLE_COLORS = {
  owner:      'bg-purple-100 text-purple-700',
  cashier:    'bg-blue-100   text-blue-700',
  technician: 'bg-yellow-100 text-yellow-700',
  staff:      'bg-gray-100   text-gray-600',
};
const EMPTY = { name: '', phone: '', password: '', role: 'staff' };

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/staff').then(r => setStaff(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, password: '', role: s.role });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const data = { name: form.name, phone: form.phone, role: form.role };
        if (form.password) data.password = form.password;
        await api.put(`/staff/${editing.id}`, data);
        toast.success('Staff updated!');
      } else {
        await api.post('/staff', form);
        toast.success('Staff member added!');
      }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const toggleActive = async (id, current) => {
    try { await api.put(`/staff/${id}`, { isActive: !current }); toast.success('Status updated'); load(); }
    catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try { await api.delete(`/staff/${id}`); toast.success('Staff member deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">👨‍💼 Staff Management</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          ＋ Add Staff
        </button>
      </div>

      <div className="space-y-3">
        {staff.map(s => (
          <div key={s.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{s.name}</p>
                <p className="text-sm text-gray-400">{s.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full capitalize font-semibold ${ROLE_COLORS[s.role] || ROLE_COLORS.staff}`}>{s.role}</span>
              <button onClick={() => toggleActive(s.id, s.isActive)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${s.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                {s.isActive ? '✅ Active' : '❌ Inactive'}
              </button>
              <button onClick={() => openEdit(s)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
              <button onClick={() => handleDelete(s.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="text-center py-16 text-gray-300 bg-white rounded-xl border">
            <div className="text-4xl mb-2">👨‍💼</div><p>No staff members yet</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Staff Member' : '➕ Add Staff Member'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Full Name *', key: 'name', req: true },
                { label: 'Phone Number *', key: 'phone', req: true },
                { label: editing ? 'New Password (leave blank to keep old)' : 'Password *', key: 'password', type: 'password', req: !editing },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required={f.req}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editing ? 'Update' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
