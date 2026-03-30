import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast'; 

import LandingPage from './features/public/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import TermsPage from './features/public/TermsPage'; 
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';
import ProfileSettings from './features/profile/ProfileSettings';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'merchant' | 'client' 
}> = ({ children, requiredRole }) => {
  const { currentUser, isLoading, isInitialized } = useStore();

  // Enquanto estivermos a carregar o Auth OU os dados do Firestore (isLoading), mantemos o loading screen
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-16 h-16 border-8 border-[#0a2540] border-t-[#00d66f] rounded-full animate-spin mb-6"></div>
        <div className="text-[#0a2540] font-black uppercase tracking-[0.3em] text-xs">
          Vizinho+ ...
        </div>
      </div>
    );
  }

  // Se a inicialização terminou e NÃO temos utilizador, vai para o login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Se o utilizador tem o cargo errado
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const SettingsWrapper = () => {
  const navigate = useNavigate();
  return <ProfileSettings onBack={() => navigate(-1)} />;
};

function App() {
  const { initializeAuth, subscribeToTransactions, currentUser } = useStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [initializeAuth]);

  useEffect(() => {
    let unsubscribeTrans: (() => void) | undefined;
    if (currentUser?.id) {
      unsubscribeTrans = subscribeToTransactions(currentUser.role, currentUser.id);
    }
    return () => { if (unsubscribeTrans) unsubscribeTrans(); };
  }, [currentUser, subscribeToTransactions]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc]">
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#0a2540',
            color: '#fff',
            borderRadius: '15px',
            border: '4px solid #00d66f',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '900',
            textTransform: 'uppercase',
            fontSize: '10px'
          }
        }} />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route path="/dashboard" element={
            currentUser ? (
              currentUser.role === 'admin' ? <Navigate to="/admin" replace /> : 
              currentUser.role === 'merchant' ? <Navigate to="/merchant" replace /> : 
              <Navigate to="/client" replace />
            ) : <ProtectedRoute><div>Redirecting...</div></ProtectedRoute>
          } />
          
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
          <Route path="/client" element={<ProtectedRoute requiredRole="client"><UserDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsWrapper /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;