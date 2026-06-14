import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading workspace...</div>;
  }

  return token ? children : <Navigate to="/login" replace />;
}
