// src/features/admin/AdminDashboard.tsx
import React from 'react';
import { useStore } from '../../store/useStore';

const AdminDashboard: React.FC = () => {
  // Agora 'clients' já existe na interface da store
  const { transactions, clients } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-vplus-blue text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Painel de Controlo Cloud</h1>
            <p className="text-vplus-green-light text-xs font-bold tracking-widest">rochap.filipe@gmail.com</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 lg:p-8 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border-l-8 border-vplus-blue p-6 shadow-sm">
            <h3 className="text-gray-400 text-xs font-black uppercase">Vendas Registadas no Firebase</h3>
            <p className="text-3xl font-black text-vplus-blue">
              {transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}€
            </p>
          </div>
          <div className="bg-white border-l-8 border-vplus-green p-6 shadow-sm">
            <h3 className="text-gray-400 text-xs font-black uppercase">Cashback Total na Nuvem</h3>
            <p className="text-3xl font-black text-vplus-green">
              {transactions.reduce((acc, t) => acc + t.cashbackAmount, 0).toFixed(2)}€
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
                <th className="p-4">ID Firebase</th>
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-right">Venda</th>
                <th className="p-4 text-right">Cashback</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-mono text-[10px] text-gray-400">{t.id}</td>
                  <td className="p-4 text-sm">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-sm font-bold">{t.clientId}</td>
                  <td className="p-4 text-right text-sm">{t.amount.toFixed(2)}€</td>
                  <td className="p-4 text-right text-sm font-black text-vplus-green">{t.cashbackAmount.toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;