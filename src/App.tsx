import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast'; 
import { getToken, onMessage } from 'firebase/messaging'; // Importes do Firebase Messaging
import { messaging, VAPID_KEY } from './config/firebase'; // Nossa config

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

function App() {
  const { initializeAuth, subscribeToTransactions, currentUser, updateUserToken } = useStore();

  // 1. Inicialização do Auth
  useEffect(() => {
    const unsub = initializeAuth();
    return () => unsub();
  }, []); 

  // 2. Subscrição de Transações
  useEffect(() => {
    if (currentUser?.id) {
      const unsub = subscribeToTransactions(currentUser.role, currentUser.id);
      return () => unsub();
    }
  }, [currentUser?.id, currentUser?.role]);

  // 3. Configuração de Notificações Push
  useEffect(() => {
    const setupNotifications = async () => {
      // Só pedimos permissão se houver um utilizador logado e se o messaging estiver disponível
      if (!currentUser?.id || !messaging) return;

      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (token) {
            // Guarda o token no Firestore através da Store
            await updateUserToken(currentUser.id, token);
          }
        }
      } catch (error) {
        console.error("Erro ao configurar notificações:", error);
      }
    };

    setupNotifications();

    // Ouvir mensagens com a App aberta (Foreground)
    if (messaging) {
      const unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('Mensagem recebida em foreground:', payload);
        // Aqui podes adicionar um toast customizado se quiseres
      });
      return () => unsubscribeOnMessage();
    }
  }, [currentUser?.id]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f8fafc]">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/vantagens" element={<VantagensPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/merchant" element={<ProtectedRoute requiredRole="merchant"><MerchantDashboard /></ProtectedRoute>} />
          <Route path="/client" element={<ProtectedRoute requiredRole="client"><UserDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings onBack={() => window.history.back()} /></ProtectedRoute>} />
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