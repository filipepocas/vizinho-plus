// src/routes/AppRoutes.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientDashboard from '../features/client/ClientDashboard';
import MerchantDashboard from '../features/merchant/MerchantDashboard';
import AdminDashboard from '../features/admin/AdminDashboard';
import LoginPage from '../features/auth/LoginPage';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente" element={<ClientDashboard />} />
        <Route path="/comerciante" element={<MerchantDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Redirecionamento padrão */}
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;