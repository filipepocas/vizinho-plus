// src/features/merchant/MerchantDashboard.tsx
import React from 'react';

const MerchantDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="border-b-4 border-vplus-green pb-4 mb-6">
        <h1 className="text-3xl font-black text-vplus-blue uppercase italic">PAINEL LOJISTA</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-vplus-green-light p-6 border-2 border-vplus-green rounded-none">
          <h2 className="font-bold text-vplus-blue">Vendas Hoje</h2>
          <p className="text-4xl font-black text-vplus-blue">0</p>
        </div>
        
        <div className="bg-vplus-blue p-6 border-2 border-vplus-blue rounded-none text-white">
          <h2 className="font-bold text-vplus-green">Cashback a Validar</h2>
          <p className="text-4xl font-black">0.00€</p>
        </div>
      </div>

      <button className="mt-8 w-full bg-vplus-green p-4 text-vplus-blue font-black uppercase text-xl hover:bg-opacity-90 transition-all">
        Registar Nova Venda
      </button>
    </div>
  );
};

export default MerchantDashboard;