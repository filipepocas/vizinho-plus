// src/routes/PrivateRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verifica o estado do login no Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-8 font-black uppercase tracking-tighter italic">Verificando Credenciais...</div>;

  // Se não estiver logado, redireciona para o login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Se estiver logado, mostra a página (children)
  return <>{children}</>;
};

export default PrivateRoute;