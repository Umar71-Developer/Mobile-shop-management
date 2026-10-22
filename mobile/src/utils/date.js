export function toLocalISODate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function addDays(isoDate, days) {
  const d = parseISODate(isoDate);
  if (!d) return '';
  d.setDate(d.getDate() + Number(days || 0));
  return toLocalISODate(d);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? parseISODate(value) : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatISODate(isoDate, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = parseISODate(isoDate);
  if (!d) return '—';
  return d.toLocaleDateString('en-PK', options);
}
