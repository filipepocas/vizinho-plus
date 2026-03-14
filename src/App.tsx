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
// CORREÇÃO: Importando o componente correto do Cliente
import UserDashboard from './features/user/UserDashboard'; 
// Se o ficheiro se chamar ClientDashboard, altere acima para ./features/client/ClientDashboard

// HELPER DE PROTEÇÃO DE ROTA (ADMIN E GERAL)
const PrivateRoute: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { currentUser, isLoading, isInitialized } = useStore();
  
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

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  useEffect(() => {
    cleanUserProfiles();
  }, []);

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
          <Route path="/" element={<Navigate to="/login" replace />} />
          
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

          {/* NOVA ROTA: Vantagens (VIP) */}
          <Route 
            path="/vantagens" 
            element={
              <PrivateRoute>
                {/* Aqui você pode criar um componente VantagensPage ou redirecionar */}
                <div className="p-8 text-center font-black uppercase">Página de Vantagens em breve...</div>
              </PrivateRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;