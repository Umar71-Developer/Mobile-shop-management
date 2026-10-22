import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
      <div className="text-sm text-gray-400">
        {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{user?.name}</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
        </div>
        <button
          onClick={logout}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
