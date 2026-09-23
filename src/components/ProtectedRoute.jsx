import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  requireAdmin = false,
}) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  console.log('PROTECTED ROUTE USER:', user);
  console.log('PROTECTED ROUTE IS ADMIN:', isAdmin);
  console.log('PROTECTED ROUTE LOADING:', loading);
  console.log('PROTECTED ROUTE PATH:', location.pathname);

  if (loading) {
    return (
      <div className="container-shell py-12">
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm text-brand-muted">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in → Login
  if (!user) {
    console.log('PROTECTED ROUTE → LOGIN');

    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Admin users → always Admin Dashboard
  if (isAdmin || user.role === 'admin' || user.isAdmin === true) {
    console.log('PROTECTED ROUTE → ADMIN');

    if (location.pathname !== '/admin') {
      return <Navigate to="/admin" replace />;
    }

    return children;
  }

  // Customer trying to access an admin page
  if (requireAdmin) {
    console.log('PROTECTED ROUTE → ACCOUNT BECAUSE NOT ADMIN');

    return <Navigate to="/account" replace />;
  }

  return children;
}
