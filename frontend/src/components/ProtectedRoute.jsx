import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-wrap" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span className="spinner-text">Carregando...</span>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
