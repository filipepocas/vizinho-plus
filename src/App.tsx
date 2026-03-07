// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import ClientDashboard from './features/client/ClientDashboard';

// Proteção de Rota para o Admin - CORREÇÃO DO TIPO AQUI
const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { currentUser } = useStore();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  const { subscribeToTransactions } = useStore();

  useEffect(() => {
    // Liga a escuta em tempo real da base de dados
    const unsubscribe = subscribeToTransactions();
    return () => unsubscribe();
  }, [subscribeToTransactions]);

  return (
    <Router>
      <Routes>
        {/* ROTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* ROTAS DE UTILIZADOR */}
        <Route path="/cliente" element={<ClientDashboard />} />
        <Route path="/lojista" element={<MerchantDashboard />} />
        
        {/* ROTA PROTEGIDA (ADMIN) */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* REDIRECIONAMENTO PADRÃO */}
        <Route path="/" element={<Navigate to="/cliente" />} />
      </Routes>
    </Router>
  );
}

export default App;