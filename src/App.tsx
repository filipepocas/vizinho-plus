import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// 1. IMPORTAÇÕES DE COMPONENTES
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';
import Register from './features/user/Register';
import LoginSelector from './components/LoginSelector';

// 2. HELPER DE PROTEÇÃO DE ROTA ADMIN (PARA O FILIPE)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useStore();
  
  // Se ainda estiver a carregar os dados do Firebase, mostramos um aviso visual simples
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="text-[#0a2540] font-black animate-pulse">AUTENTICANDO...</div>
      </div>
    );
  }

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
      if (currentUser.role === 'admin' || currentUser.email === 'rochap.filipe@gmail.com') {
        unsubscribe = subscribeToTransactions('admin');
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

          {/* ROTA 2: LOGIN FORMAL (Admin e Lojistas) */}
          <Route path="/login" element={<Login />} />

          {/* ROTA 3: RECUPERAÇÃO DE PASSWORD (Autónoma) */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* ROTA 4: ÁREA DO FILIPE (ADMIN CONTROL) */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* ROTA 5: ÁREA DO LOJISTA */}
          <Route path="/merchant" element={<MerchantDashboard />} />

          {/* ROTA 6: ÁREA DO CLIENTE (VIZINHO) */}
          <Route 
            path="/client" 
            element={currentUser ? <UserDashboard /> : <Navigate to="/client/register" replace />} 
          />
          
          {/* ROTA 7: REGISTO DO CLIENTE */}
          <Route path="/client/register" element={<Register />} />

          {/* ROTA 8: REDIRECIONAMENTO DE SEGURANÇA */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;