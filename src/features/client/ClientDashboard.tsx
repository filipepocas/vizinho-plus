// src/features/client/ClientDashboard.tsx
import React from 'react';
import ClientCard from '../../components/ClientCard';
import { useStore } from '../../store/useStore';

const ClientDashboard: React.FC = () => {
  const { transactions } = useStore();
  
  // Simulamos o utilizador logado (no futuro virá do Auth)
  const clientData = {
    id: "5601234567",
    name: "Filipe Rocha"
  };

  // Filtrar apenas as transações deste cliente
  const myTransactions = transactions.filter(t => t.clientId === clientData.id);

  // Cálculos de Saldo
  const totalBalance = myTransactions.reduce((acc, t) => 
    acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0
  );
  
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const availableBalance = myTransactions
    .filter(t => new Date(t.createdAt) <= fortyEightHoursAgo)
    .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);

  return (
    <div className="min-h-screen bg-vplus-blue-light p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        
        {/* Cabeçalho Minimalista */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-vplus-blue tracking-tighter italic">VIZINHO+</h1>
          <div className="w-10 h-10 bg-vplus-blue rounded-full border-2 border-white"></div>
        </header>

        {/* Cartão Digital com Dados Reais */}
        <ClientCard 
          name={clientData.name}
          cardNumber={clientData.id}
          totalBalance={totalBalance}
          availableBalance={availableBalance}
        />

        {/* Secção de Histórico Brutalista */}
        <div className="mt-10">
          <h3 className="text-xs font-black uppercase text-vplus-blue mb-4 tracking-widest border-b-2 border-vplus-blue pb-1">
            Histórico de Ganhos
          </h3>
          
          <div className="space-y-3">
            {myTransactions.length === 0 ? (
              <div className="bg-white p-6 border-2 border-dashed border-gray-300 text-center italic text-gray-400">
                Ainda não tens movimentos registados.
              </div>
            ) : (
              myTransactions.map((t) => (
                <div key={t.id} className="bg-white p-4 border-l-8 border-vplus-green shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                    <p className="font-bold text-vplus-blue uppercase truncate w-40">
                      {t.merchantName || "Loja Parceira"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-vplus-green">
                      +{t.cashbackAmount.toFixed(2)}€
                    </p>
                    <p className="text-[8px] font-bold uppercase opacity-50">
                      {new Date(t.createdAt) > fortyEightHoursAgo ? "Pendente" : "Disponível"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Informativo */}
        <footer className="mt-12 p-6 bg-vplus-blue text-white rounded-t-3xl text-center">
          <p className="text-xs opacity-70 mb-2 font-bold uppercase tracking-widest">Saldo em Processamento</p>
          <p className="text-xl font-black text-vplus-green">
            {(totalBalance - availableBalance).toFixed(2)}€
          </p>
          <p className="text-[9px] opacity-50 mt-4 leading-tight uppercase font-medium">
            O saldo fica disponível 48h após a compra para garantir a segurança da transação.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ClientDashboard;