// src/App.tsx

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast'; 
import { AlertTriangle } from 'lucide-react';

import LandingPage from './features/public/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import TermsPage from './features/public/TermsPage'; 
import VantagensPage from './features/public/VantagensPage'; 
import InstallPage from './features/public/InstallPage'; 
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';
import MunicipalityDashboard from './features/municipality/MunicipalityDashboard';
import PartnerDashboard from './features/partner/PartnerDashboard';
import ProfileSettings from './features/profile/ProfileSettings';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading, isInitialized } = useStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const defaultPaths: Record<string, string> = { admin: '/admin', merchant: '/merchant', client: '/dashboard', municipality: '/municipality', partner: '/partner' };
    return <Navigate to={defaultPaths[currentUser.role] || '/login'} replace />;
  }

  return <>{children}</>;
};

const NotificationAlert = () => {
  const { currentUser, toggleNotifications } = useStore();
  if (!currentUser || currentUser.notificationsEnabled !== false) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-between gap-3 sticky top-0 z-[60]">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={18} className="shrink-0" />
        <p className="text-[10px] font-black uppercase leading-tight">
          Atenção: Notificações desligadas! Podes estar a perder oportunidades.
        </p>
      </div>
      <button onClick={() => toggleNotifications(currentUser.id, true)} className="bg-amber-200 text-amber-900 px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap">
        Ativar agora
      </button>
    </div>
  );
};

function App() {
  const { initializeAuth, currentUser } = useStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const unsub = initializeAuth();
    return () => unsub();
  }, [initializeAuth]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-[#00d66f]/30">
        <Toaster position="top-center" />
        <NotificationAlert />

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/instalar" element={<InstallPage />} />
          <Route path="/login" element={<LoginPage installPrompt={deferredPrompt} onRegister={() => window.location.href = '/register'} onForgotPassword={() => window.location.href = '/forgot-password'} />} />
          <Route path="/register" element={<RegisterPage onBack={handleBack} onSuccess={() => window.location.href = '/login'} />} />
          <Route path="/forgot-password" element={<ForgotPassword onBack={handleBack} />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/vantagens" element={<VantagensPage />} />
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/merchant/*" element={<ProtectedRoute allowedRoles={['merchant']}><MerchantDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={['client']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/municipality/*" element={<ProtectedRoute allowedRoles={['municipality']}><MunicipalityDashboard /></ProtectedRoute>} />
          <Route path="/partner/*" element={<ProtectedRoute allowedRoles={['partner']}><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings onBack={handleBack} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;