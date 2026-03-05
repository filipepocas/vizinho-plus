// src/App.tsx
import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useStore } from './store/useStore';

function App() {
  const subscribeToTransactions = useStore(state => state.subscribeToTransactions);

  useEffect(() => {
    // Liga a ligação em tempo real com o Firebase
    const unsubscribe = subscribeToTransactions();
    // Desliga quando a App for fechada para não gastar recursos
    return () => unsubscribe();
  }, [subscribeToTransactions]);

  return (
    <div className="App font-sans">
      <div className="bg-black text-white p-2 text-[10px] flex justify-center gap-4 sticky top-0 z-50">
        <span className="opacity-50 uppercase font-bold">Modo Cloud:</span>
        <a href="/cliente" className="hover:text-vplus-green underline">CLIENTE</a>
        <a href="/comerciante" className="hover:text-vplus-green underline">LOJISTA</a>
        <a href="/admin" className="hover:text-vplus-green underline">ADMIN</a>
      </div>
      
      <AppRoutes />
    </div>
  );
}

export default App;