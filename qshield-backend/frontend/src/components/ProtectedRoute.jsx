import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isReady } = useContext(AuthContext);

  // Wait for the initial silent-refresh attempt before deciding to redirect.
  // Without this, a page reload would always kick the user to /login
  // while the refresh token is being validated.
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f2]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
