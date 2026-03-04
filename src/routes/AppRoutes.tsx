// src/routes/AppRoutes.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientDashboard from '../features/client/ClientDashboard';
import MerchantDashboard from '../features/merchant/MerchantDashboard';
import AdminDashboard from '../features/admin/AdminDashboard';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota para o Cliente */}
        <Route path="/cliente" element={<ClientDashboard />} />

        {/* Rota para o Comerciante */}
        <Route path="/comerciante" element={<MerchantDashboard />} />

        {/* Rota para o Admin (Filipe) */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Se alguém entrar na raiz "/", enviamos para o cliente por defeito */}
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        
        {/* Rota de erro para caminhos inexistentes */}
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;