// src/features/auth/AdminRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser } = useStore();

  // 1. Verifica se está logado
  // 2. Verifica se o e-mail é o do administrador oficial definido nas configurações
  const isAdmin = currentUser?.email === 'rochap.filipe@gmail.com';

  if (!currentUser || !isAdmin) {
    console.warn("ACESSO NEGADO: Tentativa de entrada não autorizada no painel Admin.");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AdminRoute;