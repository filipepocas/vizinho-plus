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
  MessageSquare,
  ExternalLink,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';

// COMPONENTES MODULARES
import AdminSettings from '../../features/admin/AdminSettings';
import AdminTransactions from '../../features/admin/AdminTransactions';
import AdminUsers from '../../features/admin/AdminUsers';
import AdminMerchants from '../../features/admin/AdminMerchants';
import MerchantModal from '../../features/admin/MerchantModal';
import FeedbackList from '../../components/admin/FeedbackList'; 
import { User as UserProfile, Feedback } from '../../types/index';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser, isInitialized } = useStore();
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings' | 'reviews'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [supportEmail, setSupportEmail] = useState('ajuda@vizinho-plus.pt');
  const [vantagensUrl, setVantagensUrl] = useState(''); 
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');

  // 1. Proteção de Rota Master
  useEffect(() => {
    if (isInitialized && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/login');
    }
  }, [currentUser, isInitialized, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  // 2. Carregamento de Dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setAllUsers(allData);
      setMerchants(allData.filter(u => u.role === 'merchant'));
      setRegisteredUsers(allData.filter(u => u.role === 'client' || u.role === 'user'));

      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        const configData = configSnap.data();
        setSupportEmail(configData.supportEmail || 'ajuda@vizinho-plus.pt');
        setVantagensUrl(configData.vantagensUrl || '');
      }

      const reviewsSnap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')));
      setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));

    } catch (e) {
      console.error("Erro ao carregar dados do Admin:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================================================================
  // MATURAÇÃO MENSAL MANUAL (SEGURANÇA FINANCEIRA)
  // Regra: Apenas transações de meses ANTERIORES ao atual podem ser maturadas.
  // =========================================================================
  const processMaturation = async () => {
    const now = new Date();
    const currentMonthName = now.toLocaleString('pt-PT', { month: 'long' });
    
    if (!window.confirm(`Deseja maturar todas as transações pendentes de meses ANTERIORES a ${currentMonthName}?`)) return;
    
    setIsProcessing(true);
    try {
      // Calcular o primeiro segundo do mês atual (Ex: 1 de Abril, 00:00:00)
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

      const q = query(
        collection(db, 'transactions'), 
        where('status', '==', 'pending'),
        where('type', '==', 'earn'),
        where('createdAt', '<', Timestamp.fromDate(startOfCurrentMonth)) // Menor que o início do mês atual
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert(`Não existem transações de meses anteriores prontas para maturar.`);
        setIsProcessing(false);
        return;
      }

      const docsArray = querySnapshot.docs;
      const CHUNK_SIZE = 200; 

      for (let i = 0; i < docsArray.length; i += CHUNK_SIZE) {
        const chunk = docsArray.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((txDoc) => {
          const txData = txDoc.data();
          const amount = Number(txData.cashbackAmount) || 0;
          
          // A. Atualiza o Status da Transação
          batch.update(doc(db, 'transactions', txDoc.id), {
            status: 'available',
            maturedAt: serverTimestamp(),
            auditRef: "maturacao_mensal_manual"
          });

          // B. Atualiza as Carteiras do Vizinho (Loja E Global)
          const userRef = doc(db, 'users', txData.clientId);
          batch.update(userRef, {
            [`storeWallets.${txData.merchantId}.available`]: increment(amount),
            [`storeWallets.${txData.merchantId}.pending`]: increment(-amount),
            [`wallet.available`]: increment(amount),
            [`wallet.pending`]: increment(-amount)
          });
        });

        await batch.commit();
      }

      alert(`${docsArray.length} transações foram maturadas com sucesso!`);
      fetchData();
    } catch (error) {
      console.error("Erro na maturação:", error);
      alert("Erro crítico ao processar maturação.");
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
    const dataToExport = filteredReviews.map(r => ({
      'DATA': r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '---',
      'LOJA': r.merchantName,
      'VIZINHO': r.userName,
      'ESTRELAS': r.rating,
      'COMENTÁRIO': r.comment,
      'RECOMENDA': r.recommend ? 'Sim' : 'Não'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avaliacoes");
    XLSX.writeFile(wb, `Feedback_VizinhoPlus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isInitialized) return <div className="min-h-screen bg-[#0a2540]" />;

  if (currentView === 'settings') return <AdminSettings onBack={() => {
    setCurrentView('overview');
    fetchData();
  }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
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
        
        {currentView === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-8 border-blue-500">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Volume de Negócios</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats.volume)}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-8 border-amber-500">
                 <div className="flex justify-between items-start">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendente Global</p>
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
                <p className="text-[10px] font-bold uppercase tracking-tight">
                  A maturação liberta o saldo de meses anteriores para o saldo disponível (Regra: Mês Seguinte).
                </p>
              </div>
              <button 
                onClick={processMaturation}
                disabled={isProcessing}
                className="w-full md:w-auto bg-[#0a2540] text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#00d66f] hover:text-[#0a2540] transition-all disabled:opacity-50 shadow-xl"
              >
                <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} strokeWidth={3} />
                {isProcessing ? 'A Processar...' : 'Forçar Maturação'}
              </button>
            </div>

            <AdminTransactions transactions={transactions} users={allUsers} />
          </div>
        )}

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
                      <option key={m.id} value={m.id}>{m.shopName || m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest">Início</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-4 border-slate-50 rounded-2xl p-4 font-black text-sm focus:border-[#00d66f] outline-none" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest">Fim</label>
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

        {currentView === 'merchants' && (
          <AdminMerchants 
            merchants={merchants}
            loading={loading}
            onUpdateStatus={(id, status) => updateDoc(doc(db, 'users', id), { status })}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

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