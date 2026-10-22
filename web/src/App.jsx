import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Repairs from './pages/Repairs';
import Udhar from './pages/Udhar';
import Customers from './pages/Customers';
import JazzCash from './pages/JazzCash';
import EasyLoad from './pages/EasyLoad';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Purchases from './pages/Purchases';
import NotFound from './pages/NotFound';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-3">📱</div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="sales" element={<Sales />} />
        <Route path="repairs" element={<Repairs />} />
        <Route path="udhar" element={<Udhar />} />
        <Route path="customers" element={<Customers />} />
        <Route path="jazzcash" element={<JazzCash />} />
        <Route path="easyload" element={<EasyLoad />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="staff" element={<Staff />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
