export default function Pager({ page, pages, total, onPageChange, label = 'records' }) {
  if (!total) return null;
  const current = Math.max(1, page || 1);
  const last = Math.max(1, pages || 1);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-xs text-gray-500 print:hidden">
      <span>
        {total.toLocaleString()} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          className="px-3 py-1.5 rounded-lg border bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          ← Prev
        </button>
        <span className="font-medium text-gray-600">
          Page {current} of {last}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= last}
          className="px-3 py-1.5 rounded-lg border bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
