/**
 * Money is stored as REAL in SQLite, so keep arithmetic at 2 decimal places
 * to avoid floating point drift (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */
function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { roundMoney };
