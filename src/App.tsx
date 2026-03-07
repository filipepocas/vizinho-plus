// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import LandingPage from './features/public/LandingPage'; // NOVO IMPORT
import Login from './features/auth/Login';
import ForgotPassword from './features/auth/ForgotPassword';
import AdminDashboard from './features/admin/AdminDashboard';
import MerchantDashboard from './features/merchant/MerchantDashboard';
import ClientDashboard from './features/client/ClientDashboard';

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { currentUser } = useStore();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  const { subscribeToTransactions } = useStore();

  useEffect(() => {
    const unsubscribe = subscribeToTransactions();
    return () => unsubscribe();
  }, [subscribeToTransactions]);

  return (
    <Router>
      <Routes>
        {/* A PORTA DE ENTRADA É AGORA A LANDING PAGE */}
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/cliente" element={<ClientDashboard />} />
        <Route path="/lojista" element={<MerchantDashboard />} />
        
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;