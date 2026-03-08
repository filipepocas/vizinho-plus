import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para o novo lojista
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    nif: '',
    email: '',
    password: '',
    cashbackPercent: 10
  });

  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'merchants'), {
        ...newMerchant,
        role: 'merchant',
        createdAt: new Date()
      });
      alert('Lojista criado com sucesso!');
      setIsModalOpen(false);
      setNewMerchant({ name: '', nif: '', email: '', password: '', cashbackPercent: 10 });
    } catch (error) {
      console.error("Erro ao criar lojista:", error);
      alert('Erro ao criar lojista.');
    }
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Data': t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : '---',
      'Loja': t.merchantName || '---',
      'Cliente': t.clientId || '---',
      'Valor': (t.amount || 0) + '€',
      'Cashback': (t.cashbackAmount || 0).toFixed(2) + '€',
      'Doc': t.documentNumber || '---'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, "Relatorio_VizinhoPlus.xlsx");
  };

  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.clientId?.toLowerCase().includes(query) || 
           t.merchantName?.toLowerCase().includes(query) || 
           t.documentNumber?.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans text-[#0a2540]">
      <header className="bg-[#0a2540] text-white p-6 flex justify-between items-center shadow-xl">
        <div>
          <h1 className="text-2xl font-black italic">VIZINHO+ <span className="text-[#00d66f]">ADMIN</span></h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00d66f] text-[#0a2540] px-6 py-2 rounded-xl font-bold hover:scale-105 transition-all"
          >
            + Novo Lojista
          </button>
          <button onClick={() => logout()} className="text-slate-400 hover:text-white font-bold">Sair</button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="flex-1 p-4 rounded-2xl border border-slate-200 outline-none focus:border-[#00d66f]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={exportToExcel} className="bg-white border border-slate-200 px-6 rounded-2xl font-bold hover:bg-slate-50">📊 Excel</button>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Data</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Loja</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Cliente</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase text-right">Cashback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="p-5 text-sm text-slate-500">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '...'}</td>
                  <td className="p-5 font-bold">{t.merchantName}</td>
                  <td className="p-5 font-mono text-blue-600">{t.clientId}</td>
                  <td className={`p-5 text-right font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL NOVO LOJISTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a2540]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-white">
            <h2 className="text-2xl font-black text-[#0a2540] mb-6">Registar Lojista</h2>
            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <input 
                type="text" placeholder="Nome da Loja" required
                className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00d66f]"
                value={newMerchant.name}
                onChange={e => setNewMerchant({...newMerchant, name: e.target.value})}
              />
              <input 
                type="text" placeholder="NIF" required
                className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00d66f]"
                value={newMerchant.nif}
                onChange={e => setNewMerchant({...newMerchant, nif: e.target.value})}
              />
              <input 
                type="email" placeholder="Email de Acesso" required
                className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00d66f]"
                value={newMerchant.email}
                onChange={e => setNewMerchant({...newMerchant, email: e.target.value})}
              />
              <input 
                type="password" placeholder="Password Temporária" required
                className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-[#00d66f]"
                value={newMerchant.password}
                onChange={e => setNewMerchant({...newMerchant, password: e.target.value})}
              />
              <div className="p-4 bg-blue-50 rounded-2xl">
                <label className="text-xs font-bold text-blue-900 uppercase">% Cashback Padrão</label>
                <input 
                  type="number" step="0.1"
                  className="w-full bg-transparent text-xl font-black outline-none"
                  value={newMerchant.cashbackPercent}
                  onChange={e => setNewMerchant({...newMerchant, cashbackPercent: Number(e.target.value)})}
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 font-bold text-slate-400">Cancelar</button>
                <button type="submit" className="flex-1 p-4 bg-[#0a2540] text-white rounded-2xl font-bold hover:bg-black transition-all">Criar Loja</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;