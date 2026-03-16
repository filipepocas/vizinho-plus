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
  Timestamp,
  orderBy
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
  Calendar,
  MessageSquare,
  Star,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

// COMPONENTES MODULARES
import AdminSettings from '../../features/admin/AdminSettings';
import AdminTransactions from '../../features/admin/AdminTransactions';
import AdminUsers from '../../features/admin/AdminUsers';
import AdminMerchants from '../../features/admin/AdminMerchants';
import MerchantModal from '../../features/admin/MerchantModal';
import FeedbackList from '../../components/admin/FeedbackList'; 
import { User as UserProfile, Transaction, Merchant } from '../../types/index';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser, isInitialized } = useStore();
  const navigate = useNavigate();
  
  // ESTADOS DE NAVEGAÇÃO
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings' | 'reviews'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADOS DE DADOS
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [supportEmail, setSupportEmail] = useState('ajuda@vizinho-plus.pt');
  const [vantagensUrl, setVantagensUrl] = useState(''); 
  
  // ESTADOS PARA RELATÓRIO E FILTROS
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');

  // 1. PROTEÇÃO DE ACESSO (Ponto 15: Segurança Molecular)
  useEffect(() => {
    if (isInitialized && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/login');
    }
  }, [currentUser, isInitialized, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
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
      // Carregar utilizadores e lojistas
      const usersSnap = await getDocs(collection(db, 'users'));
      const allData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setMerchants(allData.filter(u => u.role === 'merchant'));
      setRegisteredUsers(allData.filter(u => u.role === 'client' || u.role === 'user'));

      // Carregar e-mail de suporte e URL Vantagens (Ponto 11)
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        const configData = configSnap.data();
        setSupportEmail(configData.supportEmail || 'ajuda@vizinho-plus.pt');
        setVantagensUrl(configData.vantagensUrl || '');
      }

      // Carregar Avaliações
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
      setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (e) {
      console.error("Erro ao carregar dados do Admin:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lógica de Maturação Automática (Ponto 5 - Audit150326)
  const processMaturation = async () => {
    if (!window.confirm("Deseja forçar a maturação de todas as transações com mais de 48h?")) return;
    
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
        where('type', '==', 'earn'),
        where('createdAt', '<=', Timestamp.fromDate(limitDate))
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert(`Nenhuma transação pendente (+${hours}h) para processar neste momento.`);
        setIsProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      
      // LOG DE AUDITORIA: Regista a execução manual da auditoria audit150326
      querySnapshot.docs.forEach((txDoc) => {
        const txData = txDoc.data();
        batch.update(doc(db, 'transactions', txDoc.id), {
          status: 'available',
          maturedAt: serverTimestamp(),
          auditRef: "audit150326_manual"
        });

        const userRef = doc(db, 'users', txData.clientId);
        batch.update(userRef, {
          [`storeWallets.${txData.merchantId}.available`]: increment(txData.cashbackAmount || 0),
          [`storeWallets.${txData.merchantId}.pending`]: increment(-(txData.cashbackAmount || 0))
        });
      });

      await batch.commit();
      alert(`${querySnapshot.size} transações maturadas com sucesso! Referência: audit150326.`);
      fetchData();
    } catch (error) {
      console.error("Erro na maturação manual:", error);
      alert("Erro crítico ao processar maturação. Verifique a consola.");
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

  const stats = useMemo(() => {
    const validTransactions = transactions.filter(t => t.status !== 'cancelled');
    
    const salesVolume = validTransactions
      .filter(t => t.type === 'earn')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const totalCashbackEmitido = validTransactions
      .filter(t => t.type === 'earn')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    const pendingCashback = validTransactions
      .filter(t => t.status === 'pending')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    return {
      volume: salesVolume,
      cashback: totalCashbackEmitido,
      pending: pendingCashback,
      clients: registeredUsers.length,
      merchants: merchants.length
    };
  }, [transactions, registeredUsers, merchants]);
  // Lógica de Filtros e Excel (Preservada e Otimizada)
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const rDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
      const matchDate = (!startDate || rDate >= new Date(startDate)) && 
                        (!endDate || rDate <= new Date(endDate));
      const matchMerchant = !filterMerchant || r.merchantId === filterMerchant;
      return matchDate && matchMerchant;
    });
  }, [reviews, startDate, endDate, filterMerchant]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredReviews);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avaliacoes");
    XLSX.writeFile(wb, `Relatorio_VPlus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isInitialized) return <div className="min-h-screen bg-[#0a2540]" />;

  if (currentView === 'settings') return <AdminSettings onBack={() => {
    setCurrentView('overview');
    fetchData();
  }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
      {/* HEADER BRUTALISTA (Ponto 11 e 15) */}
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-lg">
              <ShieldCheck size={40} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Admin <span className="text-[#00d66f]">Console</span></h1>
              <div className="flex flex-col gap-1 mt-3">
                <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.2em]">Suporte: {supportEmail}</p>
                {vantagensUrl && (
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <ExternalLink size={10} /> Link Vantagens: {vantagensUrl.substring(0, 30)}...
                  </p>
                )}
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-md border border-white/10">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'reviews', label: 'Feedback', icon: MessageSquare },
              { id: 'settings', label: 'Definições', icon: Settings },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  currentView === item.id 
                  ? 'bg-[#00d66f] text-[#0a2540] shadow-xl scale-105' 
                  : 'hover:bg-white/10 text-white/70'
                }`}
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
        
        {/* VIEW: OVERVIEW (Ponto 8 e 12) */}
        {currentView === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-8 border-blue-500">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Volume de Negócios</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats.volume)}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-8 border-amber-500">
                 <div className="flex justify-between items-start">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendente (48h)</p>
                   <Clock size={14} className="text-amber-500" />
                 </div>
                 <h3 className="text-3xl font-black italic text-amber-600 tracking-tighter">{formatCurrency(stats.pending)}</h3>
              </div>
              <div className="bg-[#00d66f] p-8 rounded-[32px] shadow-lg border-b-8 border-black/20">
                 <p className="text-[10px] font-black text-[#0a2540]/60 uppercase mb-2">Total Cashback Emitido</p>
                 <h3 className="text-3xl font-black italic tracking-tighter text-[#0a2540]">{formatCurrency(stats.cashback)}</h3>
              </div>
              <div className="bg-[#0a2540] p-8 rounded-[32px] shadow-lg text-white border-b-8 border-black">
                 <p className="text-[10px] font-black text-white/40 uppercase mb-2">Comunidade Vizinho+</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{stats.clients} <span className="text-[10px] uppercase font-bold not-italic text-[#00d66f]">Vizinhos</span></h3>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[32px] border-2 border-slate-50">
              <div className="flex items-center gap-3 text-slate-400">
                <AlertCircle size={18} />
                <p className="text-[10px] font-bold uppercase">Gestão Ativa de Maturação: audit150326</p>
              </div>
              <button 
                onClick={processMaturation}
                disabled={isProcessing}
                className="w-full md:w-auto bg-[#0a2540] text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#00d66f] hover:text-[#0a2540] transition-all disabled:opacity-50 shadow-xl"
              >
                <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} strokeWidth={3} />
                {isProcessing ? 'A Processar...' : 'Forçar Maturação Manual'}
              </button>
            </div>

            <AdminTransactions transactions={transactions} />
          </div>
        )}

        {/* VIEW: REVIEWS (Filtros Preservados) */}
        {currentView === 'reviews' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-4 flex-1 w-full">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest">Loja</label>
                  <select 
                    value={filterMerchant}
                    onChange={(e) => setFilterMerchant(e.target.value)}
                    className="w-full bg-slate-50 border-4 border-slate-50 rounded-2xl p-4 font-black text-sm focus:border-[#00d66f] transition-all outline-none"
                  >
                    <option value="">Todas as Lojas</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>{(m as any).shopName || m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest">Data Início</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-4 border-slate-50 rounded-2xl p-4 font-black text-sm focus:border-[#00d66f] outline-none" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest">Data Fim</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-4 border-slate-50 rounded-2xl p-4 font-black text-sm focus:border-[#00d66f] outline-none" />
                </div>
              </div>
              <button onClick={exportToExcel} className="w-full md:w-auto bg-[#0a2540] text-white px-8 py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.15em] flex items-center justify-center gap-3 shadow-2xl hover:bg-green-600 transition-all border-b-4 border-black/30">
                <FileSpreadsheet size={20} /> Exportar Excel
              </button>
            </div>

            <FeedbackList />
          </div>
        )}

        {/* VIEW: MERCHANTS (Ponto 6) */}
        {currentView === 'merchants' && (
          <AdminMerchants 
            merchants={merchants}
            loading={loading}
            onUpdateStatus={(id, status) => updateDoc(doc(db, 'users', id), { status })}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

        {/* VIEW: USERS (Ponto 15) */}
        {currentView === 'users' && (
          <AdminUsers 
            users={registeredUsers} 
            onUpdateStatus={(id, status) => updateDoc(doc(db, 'users', id), { status })} 
            loading={loading} 
          />
        )}
      </main>

      <MerchantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
};

export default AdminDashboard;