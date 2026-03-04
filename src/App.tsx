// src/App.tsx
import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { Link, BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <div className="App font-sans">
      {/* Menu Temporário de Desenvolvimento para saltar entre Apps sem Refresh */}
      <div className="bg-black text-white p-2 text-[10px] flex justify-center gap-4 sticky top-0 z-50">
        <span className="opacity-50 uppercase font-bold">Modo Dev:</span>
        <a href="/cliente" className="hover:text-vplus-green underline">IR PARA CLIENTE</a>
        <a href="/comerciante" className="hover:text-vplus-green underline">IR PARA LOJISTA</a>
        <a href="/admin" className="hover:text-vplus-green underline">IR PARA ADMIN</a>
      </div>
      
      <AppRoutes />
    </div>
  );
}

export default App;