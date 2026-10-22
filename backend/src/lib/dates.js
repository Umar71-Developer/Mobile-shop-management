/**
 * Date helpers that work in the server's local timezone.
 * `new Date('2026-10-22')` is parsed as UTC by JS, which shifts the day
 * for timezones ahead of UTC (e.g. Pakistan, UTC+5). These helpers always
 * build dates from local calendar parts instead.
 */

function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

function startOfDay(value = new Date()) {
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value = new Date()) {
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function toLocalISODate(value = new Date()) {
  const d = parseLocalDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = { parseLocalDate, startOfDay, endOfDay, toLocalISODate };
