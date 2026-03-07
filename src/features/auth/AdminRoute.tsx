// src/features/auth/AdminRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - O Guarda-Redes do Painel de Controlo
 * Garante que apenas o e-mail oficial (rochap.filipe@gmail.com)
 * consegue aceder às funções de gestão de lojistas e auditoria.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser } = useStore();
  const location = useLocation();

  // Log para debug (ajuda a perceber porque é que expulsa)
  console.log("Verificando acesso Admin para:", currentUser?.email);

  // 1. Verifica se existe um utilizador logado no estado global
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Validação Molecular: Só o teu e-mail passa aqui
  const isAdmin = currentUser.email === 'rochap.filipe@gmail.com' && currentUser.role === 'admin';

  if (!isAdmin) {
    console.warn("Acesso negado: Utilizador não tem permissões de Administrador.");
    return <Navigate to="/login" replace />;
  }

  // Se passou em tudo, renderiza o conteúdo (AdminDashboard)
  return <>{children}</>;
};

export default AdminRoute;