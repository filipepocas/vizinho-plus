import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

import Login from './features/auth/Login';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import ClientDashboard from './features/client/ClientDashboard';
import AdminRoute from './features/auth/AdminRoute';

function App() {
  const { subscribeToTransactions, currentUser } = useStore();

  useEffect(() => {
    const unsubscribe = subscribeToTransactions();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />

        <Route path="/merchant" element={
          currentUser?.role === 'merchant' || currentUser?.role === 'admin'
            ? <MerchantDashboard /> 
            : <Navigate to="/login" replace />
        } />

        <Route path="/client" element={
          currentUser?.role === 'client' || currentUser?.role === 'admin'
            ? <ClientDashboard /> 
            : <Navigate to="/login" replace />
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;