// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// 1. IMPORTAÇÕES DE COMPONENTES (Ajustadas aos nossos novos ficheiros)
import Login from './features/auth/Login';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard'; // O que criámos agora
import LoginSelector from './components/LoginSelector';

// 2. HELPER DE PROTEÇÃO DE ROTA ADMIN (SÓ PARA O FILIPE OU ADMINS)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useStore();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'rochap.filipe@gmail.com';
  
  if (!currentUser) return <Navigate to="/login" replace />;
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};

// 3. COMPONENTE PRINCIPAL
function App() {
  const { subscribeToTransactions, currentUser } = useStore();

  // ESCUTA DE DADOS EM TEMPO REAL (Cérebro da App)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (currentUser) {
      // Configura a escuta baseada no perfil que fez login
      if (currentUser.role === 'admin' || currentUser.email === 'rochap.filipe@gmail.com') {
        unsubscribe = subscribeToTransactions('admin');
      } else if (currentUser.role === 'merchant') {
        // Se no teu store o id for 'uid', mantemos 'uid'
        unsubscribe = subscribeToTransactions('merchant', currentUser.uid || currentUser.id);
      } else if (currentUser.role === 'client') {
        unsubscribe = subscribeToTransactions('client', currentUser.cardNumber || currentUser.clientId);
      }
    }

    return () => { 
      if (unsubscribe) unsubscribe(); 
    };
  }, [currentUser, subscribeToTransactions]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f6f9fc] selection:bg-[#00d66f] selection:text-[#0a2540]">
        <Routes>
          
          {/* ROTA 1: PORTAL DE ENTRADA */}
          <Route path="/" element={<LoginSelector />} />

          {/* ROTA 2: LOGIN DO LOJISTA/ADMIN */}
          <Route path="/login" element={<Login />} />
          
          {/* ROTA 3: ÁREA DO FILIPE (ADMIN CONTROL) */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* ROTA 4: ÁREA DO LOJISTA (TERMINAL DE VENDAS) */}
          <Route 
            path="/merchant" 
            element={
              currentUser?.role === 'merchant' || currentUser?.role === 'admin'
                ? <MerchantDashboard /> 
                : <Navigate to="/login" replace />
            } 
          />

          {/* ROTA 5: ÁREA DO CLIENTE (VIZINHO) */}
          <Route path="/client" element={<UserDashboard />} />

          {/* ROTA 6: REDIRECIONAMENTO DE SEGURANÇA */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;