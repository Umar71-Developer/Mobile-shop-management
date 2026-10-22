import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/',          label: 'Dashboard',      icon: '🏠' },
  { to: '/inventory', label: 'Inventory',       icon: '📦' },
  { to: '/purchases', label: 'Purchases',       icon: '🚚' },
  { to: '/sales',     label: 'Sales / POS',    icon: '🛒' },
  { to: '/repairs',   label: 'Repairs',         icon: '🔧' },
  { to: '/udhar',     label: 'Udhar (Credit)',  icon: '💳' },
  { to: '/customers', label: 'Customers',       icon: '👥' },
  { to: '/jazzcash',  label: 'JazzCash',        icon: '📲' },
  { to: '/easyload',  label: 'Easy Load',       icon: '📶' },
  { to: '/expenses',  label: 'Expenses',        icon: '💸' },
  { to: '/reports',   label: 'Reports',         icon: '📊' },
  { to: '/staff',     label: 'Staff',           icon: '👨‍💼' },
];

export default function Sidebar() {
  return (
    <div className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-blue-400">📱 Mobile Shop</h1>
        <p className="text-xs text-gray-500 mt-0.5">Management System</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-700 text-xs text-gray-600 text-center">
        v1.0 — Mobile Shop App
      </div>
    </div>
  );
}
