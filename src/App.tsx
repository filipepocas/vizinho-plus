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

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#0a2540] border-t-[#00d66f] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

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

  // 1. Inicializa o Auth UMA VEZ
  useEffect(() => {
    const unsub = initializeAuth();
    return () => unsub();
  }, []); // Sem dependências para não repetir

  // 2. Subscreve transações APENAS quando o user ID está estável
  useEffect(() => {
    if (currentUser?.id) {
      const unsub = subscribeToTransactions(currentUser.role, currentUser.id);
      return () => unsub();
    }
  }, [currentUser?.id, currentUser?.role]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc]">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
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

const DashboardRedirect = () => {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === 'admin') return <Navigate to="/admin" />;
  if (currentUser.role === 'merchant') return <Navigate to="/merchant" />;
  return <Navigate to="/client" />;
};

export default App;