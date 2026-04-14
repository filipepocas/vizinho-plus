// src/App.tsx

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast'; 
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, VAPID_KEY } from './config/firebase';
import { AlertTriangle, Download } from 'lucide-react';

import LandingPage from './features/public/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import TermsPage from './features/public/TermsPage'; 
import VantagensPage from './features/public/VantagensPage'; 
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';
import ProfileSettings from './features/profile/ProfileSettings';

// Componente para proteger rotas por tipo de utilizador
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'merchant' | 'client' 
}> = ({ children, requiredRole }) => {
  const { currentUser, isLoading, isInitialized } = useStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (requiredRole && currentUser.role !== requiredRole) {
    const defaultPaths = { admin: '/admin', merchant: '/merchant', client: '/dashboard' };
    return <Navigate to={defaultPaths[currentUser.role as keyof typeof defaultPaths]} replace />;
  }

  return <>{children}</>;
};

// COMPONENTE DE ALERTA DE NOTIFICAÇÕES (Ponto 1)
const NotificationAlert = () => {
  const { currentUser, toggleNotifications } = useStore();
  
  // Só mostra se o utilizador estiver logado e tiver as notificações explicitamente desativadas
  if (!currentUser || currentUser.notificationsEnabled !== false) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-between gap-3 sticky top-0 z-[60]">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={18} className="shrink-0" />
        <p className="text-[10px] font-black uppercase leading-tight">
          Atenção: Notificações desligadas! Podes estar a perder oportunidades importantes de poupar dinheiro.
        </p>
      </div>
      <button 
        onClick={() => toggleNotifications(currentUser.id, true)}
        className="bg-amber-200 text-amber-900 px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap"
      >
        Ativar agora
      </button>
    </div>
  );
};

function App() {
  const { initializeAuth, currentUser, updateUserToken } = useStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // 1. Inicializar Autenticação
  useEffect(() => {
    const unsub = initializeAuth();
    return () => unsub();
  }, [initializeAuth]);

  // 2. Lógica de PWA: Capturar o evento de instalação (Ponto 2)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA: Evento beforeinstallprompt capturado');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 3. Configurar Mensagens Push (Ponto 4)
  useEffect(() => {
    if (!currentUser || !messaging) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            await updateUserToken(currentUser.id, token);
          }
        }
      } catch (err) {
        console.error('Erro ao configurar notificações:', err);
      }
    };

    requestPermission();

    const unsubOnMessage = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano:', payload);
      // Aqui podes usar o toast para mostrar a notificação se a app estiver aberta
    });

    return () => unsubOnMessage();
  }, [currentUser, updateUserToken]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-[#00d66f]/30">
        <Toaster position="top-center" />
        
        {/* Aviso de notificações desativadas */}
        <NotificationAlert />

        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage installPrompt={deferredPrompt} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/vantagens" element={<VantagensPage />} />

          {/* Rotas Protegidas */}
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/*" element={
            <ProtectedRoute requiredRole="merchant">
              <MerchantDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/*" element={
            <ProtectedRoute requiredRole="client">
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />

          {/* Redirecionamento Padrão */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;