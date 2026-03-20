import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// 1. IMPORTAÇÕES DOS COMPONENTES DE PÁGINA
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';

// NOTA: A importação do cleanUserProfiles foi removida daqui para evitar execuções acidentais.

/**
 * PROTECTED ROUTE (UNIFICADA)
 * Este componente substitui o PrivateRoute e o AdminRoute.
 * Ele gere o acesso com base na autenticação e no cargo (role).
 */
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'merchant' | 'client' 
}> = ({ children, requiredRole }) => {
  const { currentUser, isLoading, isInitialized } = useStore();

  // 1. Enquanto o Firebase está a validar a sessão
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#00d66f] font-black uppercase tracking-[0.3em] text-[10px]">
          Validando Acesso Vizinho+ ...
        </div>
      </div>
    );
  }

  // 2. Se não houver utilizador logado, vai para o Login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Verificação de Role (Cargo)
  if (requiredRole) {
    // Caso especial: Segurança extra para o Admin (Email específico)
    if (requiredRole === 'admin') {
      const isSuperAdmin = currentUser.email === 'rochap.filipe@gmail.com' && currentUser.role === 'admin';
      if (!isSuperAdmin) return <Navigate to="/login" replace />;
    } 
    // Outros cargos (Merchant ou Client)
    else if (currentUser.role !== requiredRole) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  const { initializeAuth, subscribeToTransactions, currentUser } = useStore();

  // Inicializa o Firebase Auth ao montar a app
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  // A função cleanUserProfiles() e o seu useEffect foram removidos para evitar
  // o esgotamento da quota de leituras/escritas do Firebase e potenciais loops.

  // Subscreve às transações em tempo real assim que o utilizador é identificado
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
          
          {/* --- ROTAS PÚBLICAS --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* --- ROTA DE ADMIN (Filipe) --- */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* --- ROTA DE COMERCIANTE (Lojas) --- */}
          <Route 
            path="/merchant" 
            element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantDashboard />
              </ProtectedRoute>
            } 
          />

          {/* --- ROTA DE CLIENTE (Vizinhos) --- */}
          <Route 
            path="/client" 
            element={
              <ProtectedRoute requiredRole="client">
                <UserDashboard />
              </ProtectedRoute>
            } 
          />

          {/* --- REDIRECIONAMENTOS INTELIGENTES --- */}
          <Route 
            path="/" 
            element={
              currentUser ? (
                // Se já estiver logado, manda para o dashboard certo
                currentUser.role === 'admin' ? <Navigate to="/admin" /> :
                currentUser.role === 'merchant' ? <Navigate to="/merchant" /> :
                <Navigate to="/client" />
              ) : (
                // Se não, vai para o login
                <Navigate to="/login" />
              )
            } 
          />

          {/* Rota 404 - Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;