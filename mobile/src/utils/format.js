export function formatMoney(value) {
  const n = Number(value);
  return `Rs. ${(Number.isFinite(n) ? n : 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback;
}
