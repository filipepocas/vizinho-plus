// src/features/client/ClientDashboard.tsx
import React from 'react';
import ClientCard from '../../components/ClientCard';

const ClientDashboard: React.FC = () => {
  // Por agora usamos dados simulados, mas já com a estrutura final
  const mockClient = {
    name: "Filipe Rocha",
    cardNumber: "5601234567",
    totalBalance: 150.50,
    availableBalance: 125.00
  };

  return (
    <div className="min-h-screen bg-vplus-blue-light p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-vplus-blue tracking-tighter">A MINHA CARTEIRA</h1>
        </header>
        
        {/* O Nosso Cartão Funcional */}
        <ClientCard 
          name={mockClient.name}
          cardNumber={mockClient.cardNumber}
          totalBalance={mockClient.totalBalance}
          availableBalance={mockClient.availableBalance}
        />

        <div className="mt-8 space-y-4">
          <button className="w-full p-4 bg-vplus-blue text-white rounded-2xl font-bold shadow-lg flex justify-between items-center px-8 hover:bg-opacity-90 transition-all">
            <span>HISTÓRICO DE CASHBACK</span>
            <span className="text-vplus-green">→</span>
          </button>
          
          <button className="w-full p-4 bg-white text-vplus-blue border-2 border-vplus-blue rounded-2xl font-bold flex justify-between items-center px-8">
            <span>ONDE USAR O MEU CARTÃO</span>
            <span>📍</span>
          </button>
        </div>
        
        <footer className="mt-12 text-center">
          <p className="text-xs text-vplus-blue opacity-50 font-bold tracking-widest uppercase">
            Vizinho Mais © 2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ClientDashboard;