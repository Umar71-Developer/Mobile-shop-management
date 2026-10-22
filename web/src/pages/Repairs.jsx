import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { toLocalISODate } from '../utils/date';
import { formatMoney, errorMessage } from '../utils/format';

const STATUS_COLORS = {
  received:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  ready:       'bg-green-100 text-green-700',
  delivered:   'bg-gray-100 text-gray-600',
  cancelled:   'bg-red-100 text-red-500',
};

const EMPTY = { customerId: '', deviceBrand: '', deviceModel: '', imei: '', problem: '', estimatedCost: '', finalCost: '', advancePaid: '0', dueDate: '', notes: '' };

export default function Repairs() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    api.get('/repairs', { params: { status: statusFilter || undefined } }).then(r => setJobs(r.data));
    api.get('/customers').then(r => setCustomers(r.data));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (job) => {
    setEditing(job);
    setForm({
      customerId: job.customerId,
      deviceBrand: job.deviceBrand,
      deviceModel: job.deviceModel,
      imei: job.imei || '',
      problem: job.problem,
      estimatedCost: job.estimatedCost || '',
      finalCost: job.finalCost || '',
      advancePaid: job.advancePaid || '0',
      dueDate: job.dueDate ? toLocalISODate(job.dueDate) : '',
      notes: job.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        customerId: parseInt(form.customerId),
        estimatedCost: parseFloat(form.estimatedCost) || 0,
        finalCost: form.finalCost === '' ? null : parseFloat(form.finalCost) || 0,
        advancePaid: parseFloat(form.advancePaid) || 0,
        dueDate: form.dueDate || null,
      };
      if (editing) {
        await api.put(`/repairs/${editing.id}`, data);
        toast.success('Repair job updated!');
      } else {
        await api.post('/repairs', data);
        toast.success('✅ Repair job created!');
      }
      setShowForm(false); setEditing(null); load();
    } catch (err) { toast.error(errorMessage(err, 'Error')); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/repairs/${id}`, { status }); toast.success('Status updated!'); load(); }
    catch (err) { toast.error(errorMessage(err, 'Update failed')); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair job permanently?')) return;
    try { await api.delete(`/repairs/${id}`); toast.success('Repair job deleted!'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const statuses = ['', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">🔧 Repair Jobs</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          ＋ New Repair Job
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
            {s === '' ? 'All Jobs' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="font-mono text-sm font-bold text-blue-600">{job.jobNumber}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[job.status]}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
              <p className="font-semibold text-gray-800">{job.deviceBrand} {job.deviceModel}</p>
              <div className="text-sm text-gray-500 mt-0.5 flex gap-4">
                <span>👤 {job.customer?.name}</span>
                <span>📞 {job.customer?.phone}</span>
                {job.imei && <span className="font-mono text-xs">IMEI: {job.imei}</span>}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">🛠 {job.problem}</p>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-4">
                <span>Est: <span className="text-gray-600 font-medium">Rs. {job.estimatedCost?.toLocaleString()}</span></span>
                {job.finalCost !== null && job.finalCost !== undefined && (
                  <span>Final: <span className="text-gray-700 font-semibold">{formatMoney(job.finalCost)}</span></span>
                )}
                <span>Advance: <span className="text-green-600 font-medium">Rs. {job.advancePaid?.toLocaleString()}</span></span>
                {job.finalCost !== null && job.finalCost !== undefined && (
                  <span>Due: <span className="text-red-500 font-medium">{formatMoney(Math.max(0, job.finalCost - (job.advancePaid || 0)))}</span></span>
                )}
                {job.dueDate && <span>Due date: {new Date(job.dueDate).toLocaleDateString()}</span>}
                {job.deliveredAt && <span>Delivered: {new Date(job.deliveredAt).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <select value={job.status} onChange={e => updateStatus(job.id, e.target.value)}
                className="border rounded-xl px-3 py-1.5 text-sm text-gray-700">
                <option value="received">Received</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => openEdit(job)} className="text-xs px-3 py-1 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">✏️ Edit</button>
                <button onClick={() => handleDelete(job.id)} className="text-xs px-3 py-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium">🗑️ Del</button>
              </div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="text-center py-16 text-gray-300 bg-white rounded-xl border">
            <div className="text-5xl mb-2">🔧</div>
            <p>No repair jobs found</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? '✏️ Edit Repair Job' : '🔧 New Repair Job'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Device Brand *', key: 'deviceBrand', req: true },
                  { label: 'Device Model *', key: 'deviceModel', req: true },
                  { label: 'IMEI (optional)', key: 'imei' },
                  { label: 'Estimated Cost (Rs.)', key: 'estimatedCost', type: 'number' },
                  { label: 'Final Cost (Rs.)', key: 'finalCost', type: 'number' },
                  { label: 'Advance Paid (Rs.)', key: 'advancePaid', type: 'number' },
                  { label: 'Due Date', key: 'dueDate', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input type={f.type || 'text'} value={form[f.key]} required={f.req}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Problem Description *</label>
                <textarea value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} required rows={3}
                  placeholder="Describe the issue..."
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editing ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
