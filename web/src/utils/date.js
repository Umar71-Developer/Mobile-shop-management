/**
 * Local-date helpers.
 *
 * `new Date().toISOString()` gives a UTC date. In Pakistan (UTC+5) that
 * returns the previous day between 12:00 AM and 5:00 AM, which made
 * "today" filters show the wrong day. Always build date inputs from local
 * calendar parts instead.
 */

export function toLocalISODate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
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

/**
 * Shift a YYYY-MM-DD date string by a number of days without UTC drift.
 */
export function addDays(isoDate, days) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number);
  if (!year || !month || !day) return '';
  return toLocalISODate(new Date(year, month - 1, day + Number(days || 0)));
}

/**
 * Human-readable label for a local YYYY-MM-DD date, e.g.
 * "Wednesday, 21 October 2026".
 */
export function formatISODate(isoDate, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number);
  if (!year || !month || !day) return '—';
  return new Date(year, month - 1, day).toLocaleDateString('en-PK', options);
}
