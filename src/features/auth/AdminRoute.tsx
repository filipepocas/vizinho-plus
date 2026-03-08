// src/features/auth/AdminRoute.tsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser } = useStore();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronização molecular: aguarda o carregamento do LocalStorage
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-vplus-green flex items-center justify-center font-mono font-black italic uppercase text-2xl">
        A VALIDAR ACESSO V+...
      </div>
    );
  }

  // Verificação rigorosa do Admin conforme as tuas regras
  const isAdmin = currentUser?.email === 'rochap.filipe@gmail.com' && currentUser?.role === 'admin';

  if (!isAdmin) {
    console.warn("BLOQUEIO: Acesso negado para:", currentUser?.email);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;