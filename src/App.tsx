// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// IMPORTAÇÃO DE TODOS OS COMPONENTES DO ECOSSISTEMA
import Login from './features/auth/Login';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import ClientDashboard from './features/client/ClientDashboard';
import AdminRoute from './features/auth/AdminRoute';

/**
 * App.tsx - O Sistema Central de Navegação
 * Aqui definimos como as 3 APPS (Cliente, Comerciante, Admin) 
 * comunicam e se protegem entre si.
 */
function App() {
  const { subscribeToTransactions, currentUser } = useStore();

  useEffect(() => {
    // Inicializa a escuta de dados em tempo real do Firebase
    // Isto garante que o saldo atualiza no exato momento da picação
    const unsubscribe = subscribeToTransactions();
    
    // Limpeza ao fechar a app para evitar consumo de dados desnecessário
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToTransactions]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* ROTA INICIAL: Sempre o Login conforme as regras de segurança */}
          <Route path="/login" element={<Login />} />
          
          {/* PAINEL DO ADMINISTRADOR (FILIPE) - Protegido por AdminRoute */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* PAINEL DO LOJISTA (TERMINAL DE PICAÇÃO) */}
          <Route 
            path="/merchant" 
            element={
              currentUser?.role === 'merchant' || currentUser?.role === 'admin' 
                ? <MerchantDashboard /> 
                : <Navigate to="/login" replace />
            } 
          />

          {/* PAINEL DO CLIENTE (CARTEIRA DIGITAL E QR CODE) */}
          <Route 
            path="/client" 
            element={<ClientDashboard />} 
          />

          {/* REDIRECIONAMENTO DE SEGURANÇA: Qualquer rota desconhecida vai para o Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;