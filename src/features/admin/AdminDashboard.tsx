import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Store, 
  TrendingUp, 
  Download, 
  Plus, 
  Settings, 
  LogOut, 
  Search,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import AdminSettings from './AdminSettings';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'transactions' | 'settings'>('transactions');
  
  const [newMerchant, setNewMerchant] = useState({
    name: '',
    address: '',
    nif: '',
    zipCode: '',
    phone: '',
    email: '',
    password: '',
    cashbackPercent: 10
  });

  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  // Cálculos de Métricas Globais
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalCashback = transactions.reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);
    const uniqueClients = new Set(transactions.map(t => t.clientId)).size;
    
    return {
      volume: totalVolume,
      cashback: totalCashback,
      clients: uniqueClients,
      count: transactions.length
    };
  }, [transactions]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'merchants'), {
        name: newMerchant.name,
        address: newMerchant.address,
        nif: newMerchant.nif,
        zipCode: newMerchant.zipCode,
        phone: newMerchant.phone,
        email: newMerchant.email.toLowerCase().trim(),
        temporaryPassword: newMerchant.password,
        password: '',
        firstAccess: true,
        cashbackPercent: newMerchant.cashbackPercent,
        role: 'merchant',
        operators: [],
        createdAt: serverTimestamp() // Alterado para consistência
      });

      alert('Lojista registado com sucesso!');
      setIsModalOpen(false);
      setNewMerchant({ 
        name: '', address: '', nif: '', zipCode: '', 
        phone: '', email: '', password: '', cashbackPercent: 10 
      });
    } catch (error) {
      console.error("Erro:", error);
      alert('Erro ao criar lojista.');
    }
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Data': t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : '---',
      'Loja': t.merchantName || '---',
      'Cliente (NIF/ID)': t.clientId || '---',
      'Valor Bruto': (t.amount || 0).toFixed(2) + '€',
      'Cashback': (t.cashbackAmount || 0).toFixed(2) + '€',
      'Documento': t.documentNumber || '---',
      'Tipo': t.type === 'earn' ? 'Acumulação' : 'Resgate'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Global");
    XLSX.writeFile(wb, `VizinhoPlus_Global_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.clientId?.toLowerCase().includes(query) || 
           t.merchantName?.toLowerCase().includes(query) || 
           t.documentNumber?.toLowerCase().includes(query);
  });

  if (currentView === 'settings') {
    return <AdminSettings onBack={() => setCurrentView('transactions')} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans text-[#0a2540] pb-12">
      {/* HEADER BRUTALISTA */}
      <header className="bg-[#0a2540] text-white p-6 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#00d66f] p-2 rounded-xl">
              <Store className="text-[#0a2540]" size={24} />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">
              Vizinho+ <span className="text-[#00d66f]">Admin</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00d66f] text-[#0a2540] px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden md:inline">Novo Lojista</span>
            </button>
            
            <button 
              onClick={() => setCurrentView('settings')}
              className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => logout()} 
              className="ml-2 p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* CARDS DE MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Vendas</p>
              <h3 className="text-3xl font-black text-[#0a2540]">{stats.volume.toFixed(2)}€</h3>
              <div className="flex items-center gap-1 mt-2 text-[#00d66f] font-bold text-xs">
                <TrendingUp size={14} /> <span>Rede Global</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cashback Gerado</p>
              <h3 className="text-3xl font-black text-[#00d66f]">{stats.cashback.toFixed(2)}€</h3>
              <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase">Total em circulação</p>
            </div>
          </div>

          <div className="bg-[#0a2540] p-8 rounded-[32px] shadow-xl relative overflow-hidden group text-white">
             <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clientes Ativos</p>
              <h3 className="text-3xl font-black">{stats.clients}</h3>
              <div className="flex items-center gap-1 mt-2 text-[#00d66f] font-bold text-xs uppercase tracking-tighter">
                <Users size={14} /> <span>Utilizadores Reais</span>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA E EXPORTAÇÃO */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Procurar por NIF, Loja ou Documento..." 
              className="w-full p-5 pl-12 rounded-2xl border-2 border-slate-100 outline-none focus:border-[#00d66f] font-bold shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={exportToExcel} 
            className="bg-white border-2 border-slate-100 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
          >
            <Download size={18} /> Exportar Relatório
          </button>
        </div>

        {/* TABELA DE TRANSACÇÕES */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-400">Fluxo de Transações da Rede</h3>
            <span className="bg-[#0a2540] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
              {filteredTransactions.length} Registos
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estabelecimento</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume Bruto</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cashback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-6 text-sm font-bold text-slate-400 group-hover:text-[#0a2540]">
                      {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}
                    </td>
                    <td className="p-6">
                      <p className="font-black uppercase text-sm tracking-tighter text-[#0a2540]">{t.merchantName}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase">{t.documentNumber}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="font-mono text-slate-500 font-bold text-xs">{t.clientId}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right font-bold text-slate-400">{(t.amount || 0).toFixed(2)}€</td>
                    <td className="p-6 text-right">
                      <div className={`flex items-center justify-end gap-2 font-black text-base ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                        {t.cashbackAmount.toFixed(2)}€
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DE REGISTO (MANTIDO E MELHORADO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a2540]/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] border border-white/20">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-[#0a2540] uppercase italic">Novo Parceiro</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Registo Oficial de Lojista</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors font-black text-2xl">×</button>
            </div>
            
            <form onSubmit={handleCreateMerchant} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nome Comercial</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.name}
                  onChange={e => setNewMerchant({...newMerchant, name: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Morada do Estabelecimento</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.address}
                  onChange={e => setNewMerchant({...newMerchant, address: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">NIF</label>
                <input 
                  type="text" required maxLength={9}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.nif}
                  onChange={e => setNewMerchant({...newMerchant, nif: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Código Postal</label>
                <input 
                  type="text" required placeholder="0000-000"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.zipCode}
                  onChange={e => setNewMerchant({...newMerchant, zipCode: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Telemóvel</label>
                <input 
                  type="tel" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.phone}
                  onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Email Gestor</label>
                <input 
                  type="email" required
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold"
                  value={newMerchant.email}
                  onChange={e => setNewMerchant({...newMerchant, email: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Password Provisória</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl outline-none focus:border-black font-black text-blue-600"
                  value={newMerchant.password}
                  onChange={e => setNewMerchant({...newMerchant, password: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">% Cashback Base</label>
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

              <div className="md:col-span-2 flex flex-col md:flex-row gap-4 mt-10">
                <button type="submit" className="flex-[2] p-5 bg-[#00d66f] text-[#0a2540] rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-[#00c265] transition-all shadow-xl active:scale-95">
                  Confirmar Adesão
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;