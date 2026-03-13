import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  collection, 
  serverTimestamp, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDoc, 
  writeBatch, 
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  ShieldCheck, 
  Users, 
  Store, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Clock,
  RefreshCw,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';

// COMPONENTES MODULARES
import AdminSettings from '../../features/admin/AdminSettings';
import AdminTransactions from '../../features/admin/AdminTransactions';
import AdminUsers from '../../features/admin/AdminUsers';
import AdminMerchants from '../../features/admin/AdminMerchants';
import MerchantModal from '../../features/admin/MerchantModal';
import { User as UserProfile, Transaction, Merchant } from '../../types/index';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser, isInitialized } = useStore();
  const navigate = useNavigate();
  
  // ESTADOS DE NAVEGAÇÃO
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADOS DE DADOS
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  
  // ESTADOS PARA RELATÓRIO
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. PROTEÇÃO DE ACESSO (Audit1303261100)
  useEffect(() => {
    if (isInitialized && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/login');
    }
  }, [currentUser, isInitialized, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
      navigate('/login');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setMerchants(allData.filter(u => u.role === 'merchant'));
      setRegisteredUsers(allData.filter(u => u.role === 'client' || u.role === 'user'));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processMaturation = async () => {
    setIsProcessing(true);
    try {
      const configRef = doc(db, 'system', 'config');
      const configSnap = await getDoc(configRef);
      const hours = configSnap.exists() ? configSnap.data().maturationHours : 48;
      
      const limitDate = new Date();
      limitDate.setHours(limitDate.getHours() - hours);

      const q = query(
        collection(db, 'transactions'), 
        where('status', '==', 'pending'),
        where('createdAt', '<=', Timestamp.fromDate(limitDate))
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert(`Nenhum cashback pendente (+${hours}h) para processar.`);
        setIsProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach((txDoc) => {
        const txData = txDoc.data();
        batch.update(doc(db, 'transactions', txDoc.id), {
          status: 'available',
          maturedAt: serverTimestamp()
        });

        const userRef = doc(db, 'users', txData.clientId);
        batch.update(userRef, {
          'wallet.available': increment(txData.cashbackAmount || 0),
          'wallet.pending': increment(-(txData.cashbackAmount || 0))
        });
      });

      await batch.commit();
      alert(`${querySnapshot.size} transações maturadas com sucesso!`);
    } catch (error) {
      console.error("Erro na maturação:", error);
      alert("Erro ao processar maturação.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const unsubscribe = subscribeToTransactions('admin');
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [subscribeToTransactions, currentUser]);

  // CÁLCULO DE ESTATÍSTICAS CORRIGIDO (Ponto 1)
  const stats = useMemo(() => {
    const salesVolume = transactions
      .filter(t => t.type === 'earn' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const cancelVolume = transactions
      .filter(t => t.status === 'cancelled' || t.type === 'cancel')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const totalCashbackEmitido = transactions
      .filter(t => t.type === 'earn' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    const pendingCashback = transactions
      .filter(t => t.status === 'pending')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    const uniqueClients = new Set(transactions.map(t => t.clientId)).size;
    
    return {
      volume: salesVolume,
      cancellations: cancelVolume,
      cashback: totalCashbackEmitido,
      pending: pendingCashback,
      clients: uniqueClients,
      count: transactions.length
    };
  }, [transactions]);

  // FUNÇÃO DE EXPORTAÇÃO EXCEL (Ponto 2)
  const exportToExcel = () => {
    const allUsers = [...merchants, ...registeredUsers];
    
    const reportData = allUsers.map(user => {
      const userTransactions = transactions.filter(t => {
        const txDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        const isInRange = (!startDate || txDate >= new Date(startDate)) && 
                          (!endDate || txDate <= new Date(endDate));
        const isUserTx = t.clientId === user.id || t.merchantId === user.id;
        return isInRange && isUserTx;
      });

      const valorTransacoes = userTransactions
        .filter(t => t.type === 'earn' && t.status !== 'cancelled')
        .reduce((acc, t) => acc + (t.amount || 0), 0);

      const cashbackEmitido = userTransactions
        .filter(t => t.type === 'earn' && t.status !== 'cancelled')
        .reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);

      const cashbackUtilizado = userTransactions
        .filter(t => t.type === 'redeem' && t.status !== 'cancelled')
        .reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);

      // CORREÇÃO MOLECULAR: Usamos casting seguro para 'any' para ler campos específicos de Lojista ou Cliente
      const userData = user as any;

      return {
        'Tipo': user.role === 'merchant' ? 'Comercial' : 'Cliente',
        'Nome': userData.name || userData.shopName || 'N/A',
        'Contato': userData.phone || 'N/A',
        'Email': userData.email,
        'Código Postal': userData.zipCode || userData.postalCode || 'N/A',
        'Qtd Transações': userTransactions.length,
        'Valor Transações (€)': valorTransacoes.toFixed(2),
        'Cashback Emitido (€)': cashbackEmitido.toFixed(2),
        'Cashback Utilizado (€)': cashbackUtilizado.toFixed(2)
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Geral");
    XLSX.writeFile(wb, `Relatorio_VizinhoPlus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { status: newStatus });
      setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
      setRegisteredUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u));
    } catch (e) {
      alert("Erro ao atualizar status.");
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2540]">
        <div className="text-[#00d66f] font-black animate-pulse uppercase tracking-widest">A carregar consola...</div>
      </div>
    );
  }

  if (currentView === 'settings') return <AdminSettings onBack={() => setCurrentView('overview')} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
      {/* HEADER */}
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-lg rotate-3">
              <ShieldCheck size={40} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Admin <span className="text-[#00d66f]">Console</span></h1>
              <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.3em] mt-3">Gestão Central Vizinho+</p>
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-md border border-white/10">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'settings', label: 'Definições', icon: Settings },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl scale-105' : 'hover:bg-white/10 text-white/70'}`}
              >
                <item.icon size={16} strokeWidth={3} /> {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        
        {currentView === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            
            {/* FILTROS E RELATÓRIO */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 flex items-center gap-2">
                  <Calendar size={12}/> Data Início
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-[#00d66f]"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 flex items-center gap-2">
                  <Calendar size={12}/> Data Fim
                </label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-[#00d66f]"
                />
              </div>
              <button 
                onClick={exportToExcel}
                className="bg-[#0a2540] text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-[#00d66f] hover:text-[#0a2540] transition-all shadow-lg"
              >
                <FileSpreadsheet size={18} /> Exportar Excel
              </button>
            </div>

            {/* CARTÕES DE ESTATÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-[32px] shadow-xl border-b-4 border-blue-500">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Vendas</p>
                 <h3 className="text-2xl font-black italic tracking-tighter text-blue-600">{formatCurrency(stats.volume)}</h3>
              </div>
              <div className="bg-white p-6 rounded-[32px] shadow-xl border-b-4 border-red-500">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Anulações</p>
                 <h3 className="text-2xl font-black italic tracking-tighter text-red-600">{formatCurrency(stats.cancellations)}</h3>
              </div>
              <div className="bg-white p-6 rounded-[32px] shadow-xl border-b-4 border-amber-500">
                 <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendente</p>
                 <h3 className="text-2xl font-black italic tracking-tighter">{formatCurrency(stats.pending)}</h3>
                 <div className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase text-slate-300">
                   <Clock size={8}/> Em Maturação
                 </div>
              </div>
              <div className="bg-[#00d66f] p-6 rounded-[32px] shadow-xl text-[#0a2540]">
                 <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Cashback Emitido</p>
                 <h3 className="text-2xl font-black italic tracking-tighter">{formatCurrency(stats.cashback)}</h3>
                 <button 
                  onClick={processMaturation} 
                  disabled={isProcessing} 
                  className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase bg-[#0a2540] text-white px-3 py-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                 >
                   <RefreshCw size={10} className={isProcessing ? 'animate-spin' : ''}/> 
                   Libertar
                 </button>
              </div>
              <div className="bg-[#0a2540] p-6 rounded-[32px] shadow-xl text-white">
                 <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Vizinhos Ativos</p>
                 <h3 className="text-2xl font-black italic tracking-tighter">{stats.clients}</h3>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 ml-4">
                <div className="h-2 w-12 bg-[#00d66f] rounded-full"></div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Histórico de Movimentos</h2>
              </div>
              <AdminTransactions transactions={transactions} />
            </div>
          </div>
        )}

        {currentView === 'merchants' && (
          <AdminMerchants 
            merchants={merchants}
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

        {currentView === 'users' && (
          <AdminUsers 
            users={registeredUsers} 
            onUpdateStatus={handleUpdateStatus} 
            loading={loading} 
          />
        )}
      </main>

      {/* MODAL DE REGISTO DE LOJISTAS */}
      <MerchantModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default AdminDashboard;