import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// 1. IMPORTAÇÕES DE COMPONENTES
import Login from './features/auth/Login';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import UserDashboard from './features/user/UserDashboard';
import LoginSelector from './components/LoginSelector';

// 2. HELPER DE PROTEÇÃO DE ROTA ADMIN (PARA O FILIPE)
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
  // Nota: Deixamos a subscrição aqui apenas para o Admin. 
  // Lojista e Cliente gerem a sua própria subscrição ao validar o acesso.
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
          
          {/* ROTA 1: PORTAL DE ENTRADA (Onde o utilizador escolhe quem é) */}
          <Route path="/" element={<LoginSelector />} />

          {/* ROTA 2: LOGIN FORMAL (Para Admin e Lojistas Registados) */}
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
          {/* Permitimos acesso direto porque o MerchantDashboard tem o seu próprio login por email */}
          <Route path="/merchant" element={<MerchantDashboard />} />

          {/* ROTA 5: ÁREA DO CLIENTE (VIZINHO) */}
          {/* Permitimos acesso direto porque o UserDashboard tem o seu próprio login por NIF */}
          <Route path="/client" element={<UserDashboard />} />

          {/* ROTA 6: REDIRECIONAMENTO DE SEGURANÇA */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;