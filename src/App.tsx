import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// --- IMPORTAÇÕES DOS COMPONENTES ---
import LandingPage from './features/public/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import TermsPage from './features/public/TermsPage'; 
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';

/**
 * PROTECTED ROUTE
 * Gere o acesso com base no login e no cargo (role).
 */
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'merchant' | 'client' 
}> = ({ children, requiredRole }) => {
  const { currentUser, isLoading, isInitialized } = useStore();

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { initializeAuth, subscribeToTransactions, currentUser } = useStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

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
          {/* Rotas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Redirecionamento de Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              currentUser ? (
                currentUser.role === 'admin' ? <Navigate to="/admin" replace /> :
                currentUser.role === 'merchant' ? <Navigate to="/merchant" replace /> :
                <Navigate to="/client" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Rotas Protegidas */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/merchant" 
            element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client" 
            element={
              <ProtectedRoute requiredRole="client">
                <UserDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;