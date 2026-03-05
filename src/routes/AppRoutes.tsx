// src/routes/AppRoutes.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientDashboard from '../features/client/ClientDashboard';
import MerchantDashboard from '../features/merchant/MerchantDashboard';
import AdminDashboard from '../features/admin/AdminDashboard';
import LoginPage from '../features/auth/LoginPage';
import PrivateRoute from './PrivateRoute'; // O nosso novo segurança

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente" element={<ClientDashboard />} />
        <Route path="/comerciante" element={<MerchantDashboard />} />

        {/* Rota Protegida - Só entra quem fez Login */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* Redirecionamento padrão */}
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;