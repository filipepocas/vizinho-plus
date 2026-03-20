import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Alterado para apontar para o dashboard que acabámos de configurar
import UserDashboard from '../features/user/UserDashboard'; 
import MerchantDashboard from '../features/merchant/MerchantDashboard';
import AdminDashboard from '../features/admin/AdminDashboard';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage'; // Importado o novo componente
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Rota do Cliente atualizada para o UserDashboard */}
        <Route path="/cliente" element={<UserDashboard />} />
        
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