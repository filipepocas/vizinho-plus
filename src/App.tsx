// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// IMPORTAÇÕES DOS COMPONENTES AUDITADOS (MOLÉCULAS CORRETAS)
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';

// HELPER DE PROTEÇÃO DE ROTA (ADMIN E GERAL)
const PrivateRoute: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { currentUser, isLoading } = useStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C305C]">
        <div className="text-white font-black animate-pulse uppercase tracking-widest">A carregar...</div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (role && currentUser.role !== role && currentUser.email !== 'rochap.filipe@gmail.com') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { subscribeToTransactions, currentUser } = useStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (currentUser) {
      // Subscreve às transações conforme o papel do utilizador
      unsubscribe = subscribeToTransactions(currentUser.role, currentUser.id);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentUser, subscribeToTransactions]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f6f9fc]">
        <Routes>
          {/* A Raiz agora envia para o Login para vermos o teu logotipo imediatamente */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Rotas de Autenticação (As que corrigimos) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Área Admin (Filipe) */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            } 
          />

          {/* Área Comerciante */}
          <Route 
            path="/merchant" 
            element={
              <PrivateRoute role="merchant">
                <MerchantDashboard />
              </PrivateRoute>
            } 
          />

          {/* Área Cliente (Vizinho) */}
          <Route 
            path="/client" 
            element={
              <PrivateRoute role="client">
                <UserDashboard />
              </PrivateRoute>
            } 
          />

          {/* Redirecionamento de Segurança */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;