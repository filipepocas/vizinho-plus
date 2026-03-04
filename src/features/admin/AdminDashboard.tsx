// src/features/admin/AdminDashboard.tsx
import React from 'react';
import { useStore } from '../../store/useStore';

const AdminDashboard: React.FC = () => {
  const { transactions, clients } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Admin - Estilo Corporativo Azul */}
      <header className="bg-vplus-blue text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">ADMINISTRAÇÃO VIZINHO+</h1>
            <p className="text-vplus-green-light text-xs font-bold uppercase tracking-widest">
              Filipe Rocha | rochap.filipe@gmail.com
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-white/10 px-4 py-2 rounded">
              <p className="text-[10px] uppercase opacity-70">Total Transações</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 lg:p-8 flex-grow">
        {/* KPIs Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border-l-8 border-vplus-blue p-6 shadow-sm">
            <h3 className="text-gray-400 text-xs font-black uppercase">Volume de Vendas Global</h3>
            <p className="text-3xl font-black text-vplus-blue">
              {transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}€
            </p>
          </div>
          <div className="bg-white border-l-8 border-vplus-green p-6 shadow-sm">
            <h3 className="text-gray-400 text-xs font-black uppercase">Cashback Gerado</h3>
            <p className="text-3xl font-black text-vplus-green">
              {transactions.reduce((acc, t) => acc + t.cashbackAmount, 0).toFixed(2)}€
            </p>
          </div>
          <div className="bg-white border-l-8 border-yellow-400 p-6 shadow-sm">
            <h3 className="text-gray-400 text-xs font-black uppercase">Clientes Ativos</h3>
            <p className="text-3xl font-black text-gray-800">{clients.length}</p>
          </div>
        </div>

        {/* Tabela de Auditoria de Transações */}
        <div className="bg-white border-2 border-gray-200 rounded-none overflow-hidden">
          <div className="bg-gray-100 p-4 border-b-2 border-gray-200 flex justify-between items-center">
            <h2 className="font-black text-vplus-blue uppercase">Auditoria de Transações em Tempo Real</h2>
            <button className="text-xs bg-vplus-blue text-white px-3 py-1 font-bold">EXPORTAR CSV</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
                  <th className="p-4">ID Transação</th>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Cartão Cliente</th>
                  <th className="p-4">Loja</th>
                  <th className="p-4 text-right">Valor Venda</th>
                  <th className="p-4 text-right">Cashback</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400 italic">
                      Nenhuma transação registada no sistema até ao momento.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-vplus-blue-light transition-colors">
                      <td className="p-4 font-mono font-bold text-vplus-blue">{t.id}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(t.createdAt).toLocaleString('pt-PT')}
                      </td>
                      <td className="p-4 text-sm font-bold">{t.clientId}</td>
                      <td className="p-4 text-sm">{t.merchantId}</td>
                      <td className="p-4 text-right font-bold">{t.amount.toFixed(2)}€</td>
                      <td className="p-4 text-right font-black text-vplus-green">
                        {t.cashbackAmount.toFixed(2)}€
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase rounded ${
                          t.status === 'available' ? 'bg-vplus-green-light text-vplus-green' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {t.status === 'available' ? 'Disponível' : 'Pendente (48h)'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;