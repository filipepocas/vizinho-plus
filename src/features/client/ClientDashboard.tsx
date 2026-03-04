// src/features/client/ClientDashboard.tsx
import React from 'react';

const ClientDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-vplus-blue-light p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-vplus-blue mb-2">Olá, Cliente!</h1>
        <p className="text-gray-600 mb-8 text-sm">Bem-vindo à sua carteira digital Vizinho+.</p>
        
        {/* Espaço reservado para o Cartão que vamos desenhar a seguir */}
        <div className="w-full h-56 bg-vplus-blue rounded-2xl shadow-xl flex items-center justify-center border-2 border-vplus-green">
          <span className="text-vplus-green-light font-bold">O Teu Cartão aparecerá aqui</span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 font-bold text-vplus-blue">
            Ver Extrato
          </button>
          <button className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 font-bold text-vplus-blue">
            Lojas Parceiras
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;