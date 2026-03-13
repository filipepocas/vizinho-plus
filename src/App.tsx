import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// IMPORTAÇÃO DO SCRIPT DE LIMPEZA (TEMPORÁRIO)
import { cleanUserProfiles } from './utils/cleanDatabase';

// IMPORTAÇÕES DOS COMPONENTES AUDITADOS
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';

// HELPER DE PROTEÇÃO DE ROTA (ADMIN E GERAL)
const PrivateRoute: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { currentUser, isLoading, isInitialized } = useStore();
  
  // Esperamos a inicialização completa para evitar redirecionamentos errados no refresh
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-[#00d66f] font-black animate-pulse uppercase tracking-widest text-xs">
          A validar sessão...
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (role && currentUser.role !== role) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { subscribeToTransactions, currentUser, initializeAuth } = useStore();

  // 1. INICIALIZAÇÃO DA SESSÃO (Firebase Auth)
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  // 2. CICLO DE LIMPEZA DA BASE DE DADOS (Executa uma vez ao abrir)
  useEffect(() => {
    cleanUserProfiles();
  }, []);

  // 3. ESCUTA DE TRANSAÇÕES
  useEffect(() => {
    let unsubscribeTrans: (() => void) | undefined;
    if (currentUser) {
      unsubscribeTrans = subscribeToTransactions(currentUser.role, currentUser.id);
    }
    return () => { if (unsubscribeTrans) unsubscribeTrans(); };
  }, [currentUser, subscribeToTransactions]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc]">
        <Routes>
          {/* Raiz redireciona para Login para validação visual */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Autenticação */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Área Admin */}
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

          {/* Fallback de Segurança */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;