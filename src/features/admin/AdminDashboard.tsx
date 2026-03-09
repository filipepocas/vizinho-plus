import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para o novo lojista com todos os campos obrigatórios
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    address: '',
    nif: '',
    zipCode: '',
    phone: '',
    email: '',
    password: '', // Esta será a password provisória definida pelo admin
    cashbackPercent: 10
  });

  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Criação do lojista com a lógica de primeiro acesso
      await addDoc(collection(db, 'merchants'), {
        name: newMerchant.name,
        address: newMerchant.address,
        nif: newMerchant.nif,
        zipCode: newMerchant.zipCode,
        phone: newMerchant.phone,
        email: newMerchant.email.toLowerCase().trim(),
        temporaryPassword: newMerchant.password, // Gravada como provisória
        password: '', // Vazia até o lojista definir a sua
        firstAccess: true, // Gatilho de segurança
        cashbackPercent: newMerchant.cashbackPercent,
        role: 'merchant',
        operators: [],
        createdAt: new Date()
      });

      alert('Lojista registado! Já pode entregar as credenciais ao comerciante.');
      setIsModalOpen(false);
      setNewMerchant({ 
        name: '', address: '', nif: '', zipCode: '', 
        phone: '', email: '', password: '', cashbackPercent: 10 
      });
    } catch (error) {
      console.error("Erro ao criar lojista:", error);
      alert('Erro ao criar lojista no sistema.');
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
            className="bg-[#00d66f] text-[#0a2540] px-6 py-2 rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
          >
            + Registar Comerciante
          </button>
          <button onClick={() => logout()} className="text-slate-400 hover:text-white font-bold transition-colors text-sm uppercase tracking-widest">Sair</button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Pesquisar transações (NIF, Loja ou Doc)..." 
            className="flex-1 p-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-[#00d66f] font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={exportToExcel} className="bg-white border-2 border-slate-100 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <span>📊</span> Exportar Excel
          </button>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cashback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 text-sm font-bold text-slate-500">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '...'}</td>
                  <td className="p-6 font-black uppercase text-sm tracking-tighter">{t.merchantName}</td>
                  <td className="p-6 font-mono text-blue-600 font-bold">{t.clientId}</td>
                  <td className={`p-6 text-right font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL REGISTO DE LOJISTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a2540]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black text-[#0a2540] mb-2 uppercase italic">Novo Comerciante</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Dados Obrigatórios para Adesão</p>
            
            <form onSubmit={handleCreateMerchant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Estabelecimento</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.name}
                  onChange={e => setNewMerchant({...newMerchant, name: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Morada Completa</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.address}
                  onChange={e => setNewMerchant({...newMerchant, address: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">NIF</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.nif}
                  onChange={e => setNewMerchant({...newMerchant, nif: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código Postal</label>
                <input 
                  type="text" required placeholder="0000-000"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.zipCode}
                  onChange={e => setNewMerchant({...newMerchant, zipCode: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Contato Telemóvel</label>
                <input 
                  type="tel" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.phone}
                  onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email de Acesso</label>
                <input 
                  type="email" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.email}
                  onChange={e => setNewMerchant({...newMerchant, email: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password Provisória</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl outline-none focus:border-black font-black text-blue-600"
                  value={newMerchant.password}
                  onChange={e => setNewMerchant({...newMerchant, password: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">% Cashback Padrão</label>
                <div className="flex items-center bg-green-50 rounded-2xl px-4 border-2 border-green-100">
                   <input 
                    type="number" step="0.1"
                    className="w-full p-4 bg-transparent text-xl font-black outline-none text-green-700"
                    value={newMerchant.cashbackPercent}
                    onChange={e => setNewMerchant({...newMerchant, cashbackPercent: Number(e.target.value)})}
                  />
                  <span className="font-black text-green-700">%</span>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] p-5 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95">Finalizar Registo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;