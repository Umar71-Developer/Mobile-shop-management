import { formatDateTime } from '../utils/date';
import { formatMoney } from '../utils/format';

export default function SaleReceipt({ sale, onClose }) {
  if (!sale) return null;

  const items = sale.saleItems || [];
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount = sale.discount || 0;
  const balance = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b print:hidden">
          <h3 className="font-bold text-gray-800">🧾 Sale Receipt</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <div id="sale-receipt" className="p-6 text-sm text-gray-700">
          <div className="text-center border-b border-dashed pb-3 mb-3">
            <p className="text-xl font-bold tracking-wide">📱 MOBILE SHOP</p>
            <p className="text-xs text-gray-500">Mobile Shop Management System</p>
            <p className="text-xs text-gray-400 mt-1">Sales Receipt</p>
          </div>

          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Receipt #{String(sale.id).padStart(4, '0')}</span>
            <span>{formatDateTime(sale.createdAt)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mb-3">
            <span>Customer: {sale.customer?.name || 'Walk-in'}</span>
            <span>Served by: {sale.user?.name || '—'}</span>
          </div>

          {sale.status === 'refunded' && (
            <div className="text-center text-xs font-bold text-red-600 border border-red-300 bg-red-50 rounded-lg py-1 mb-3">
              REFUNDED
            </div>
          )}

          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="border-b text-gray-400">
                <th className="text-left py-1 font-medium">Item</th>
                <th className="text-center py-1 font-medium">Qty</th>
                <th className="text-right py-1 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-dashed">
                  <td className="py-1.5 pr-2">
                    {item.product ? `${item.product.brand} ${item.product.model}` : `Product #${item.productId}`}
                    <span className="block text-[10px] text-gray-400">
                      {formatMoney(item.unitPrice)} each
                    </span>
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span>
                <span>− {formatMoney(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-dashed pt-1.5 text-gray-800">
              <span>Total</span>
              <span>{formatMoney(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Paid ({sale.paymentMode})</span>
              <span>{formatMoney(sale.paidAmount)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between font-semibold text-orange-600">
                <span>Balance (Udhar)</span>
                <span>{formatMoney(balance)}</span>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-gray-400 border-t border-dashed mt-4 pt-3">
            Thank you for shopping with us!
          </p>
        </div>

        <div className="p-4 border-t flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-800 text-white py-2 rounded-xl text-sm font-semibold hover:bg-gray-900"
          >
            🖨 Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 border py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
