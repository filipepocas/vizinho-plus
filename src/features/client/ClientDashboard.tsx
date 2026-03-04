// src/features/client/ClientDashboard.tsx
import React, { useEffect } from 'react';
import ClientCard from '../../components/ClientCard';
import { useStore } from '../../store/useStore';

const ClientDashboard: React.FC = () => {
  const { transactions, updateBalances } = useStore();
  
  // Dados do cliente (Simulamos que o ID é este número de cartão)
  const clientData = {
    id: "5601234567",
    name: "Filipe Rocha"
  };

  // Filtrar transações deste cliente
  const myTransactions = transactions.filter(t => t.clientId === clientData.id);

  // Calcular saldos em tempo real
  const totalBalance = myTransactions.reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);
  
  // Lógica simplificada de 48h para o teste visual
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const availableBalance = myTransactions
    .filter(t => new Date(t.createdAt) <= fortyEightHoursAgo)
    .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);

  return (
    <div className="min-h-screen bg-vplus-blue-light p-6 flex flex-col items-center">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-black text-vplus-blue mb-8 uppercase tracking-tighter italic">Minha Carteira</h1>
        
        <ClientCard 
          name={clientData.name}
          cardNumber={clientData.id}
          totalBalance={totalBalance}
          availableBalance={availableBalance}
        />

        <div className="mt-8 space-y-4">
          <div className="bg-white p-4 border-2 border-vplus-blue text-left">
            <h3 className="text-[10px] font-black uppercase text-vplus-blue opacity-50">Últimos Movimentos</h3>
            {myTransactions.length === 0 ? (
              <p className="text-sm italic text-gray-400 mt-2">Sem movimentos recentes.</p>
            ) : (
              myTransactions.slice(0, 3).map(t => (
                <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-bold">{new Date(t.createdAt).toLocaleDateString()}</span>
                  <span className="text-sm font-black text-vplus-green">+{t.cashbackAmount.toFixed(2)}€</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;