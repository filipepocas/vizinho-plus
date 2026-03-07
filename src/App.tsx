// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// IMPORTAÇÃO DAS PÁGINAS (FEATURES)
import LandingPage from './features/public/LandingPage';
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import ClientDashboard from './features/client/ClientDashboard';

// IMPORTAÇÃO DO GUARDIÃO DE SEGURANÇA
import AdminRoute from './features/auth/AdminRoute';

function App() {
  const { subscribeToTransactions } = useStore();

  useEffect(() => {
    // Liga a escuta em tempo real da base de dados Firebase
    const unsubscribe = subscribeToTransactions();
    
    // Limpa a escuta quando o componente é destruído para poupar bateria/dados
    return () => unsubscribe();
  }, [subscribeToTransactions]);

  return (
    <Router>
      <Routes>
        {/* ROTA PRINCIPAL: Landing Page (A Montra) */}
        <Route path="/" element={<LandingPage />} />
        
        {/* AUTENTICAÇÃO */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* DASHBOARDS DE UTILIZADOR (PÚBLICOS/ACESSO DIRETO) */}
        <Route path="/cliente" element={<ClientDashboard />} />
        <Route path="/lojista" element={<MerchantDashboard />} />
        
        {/* PAINEL DE CONTROLO (RESTRITO APENAS AO FILIPE) */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />

        {/* REDIRECIONAMENTO DE SEGURANÇA: Se a rota não existir, volta para a Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;