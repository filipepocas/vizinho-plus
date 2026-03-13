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
  Smile,
  Frown,
  Meh
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
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings' | 'reviews'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADOS DE DADOS
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [supportEmail, setSupportEmail] = useState('ajuda@vizinho-plus.pt');
  const [vantagensUrl, setVantagensUrl] = useState(''); // NOVO: URL Vantagens+
  
  // ESTADOS PARA RELATÓRIO E FILTROS
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');

  // 1. PROTEÇÃO DE ACESSO
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
      // Carregar utilizadores e lojistas
      const usersSnap = await getDocs(collection(db, 'users'));
      const allData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setMerchants(allData.filter(u => u.role === 'merchant'));
      setRegisteredUsers(allData.filter(u => u.role === 'client' || u.role === 'user'));

      // PONTO 8: Carregar e-mail de suporte e URL Vantagens das configurações
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        const configData = configSnap.data();
        setSupportEmail(configData.supportEmail || 'ajuda@vizinho-plus.pt');
        setVantagensUrl(configData.vantagensUrl || ''); // Carrega o link salvo
      }

      // PONTO 9: Carregar Avaliações
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
      setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lógica de Maturação (Ponto 5)
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
          [`storeWallets.${txData.merchantId}.available`]: increment(txData.cashbackAmount || 0),
          [`storeWallets.${txData.merchantId}.pending`]: increment(-(txData.cashbackAmount || 0))
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

  const stats = useMemo(() => {
    const salesVolume = transactions
      .filter(t => t.type === 'earn' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const totalCashbackEmitido = transactions
      .filter(t => t.type === 'earn' && t.status !== 'cancelled')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    const pendingCashback = transactions
      .filter(t => t.status === 'pending')
      .reduce((acc, t) => acc + (Number(t.cashbackAmount) || 0), 0);

    return {
      volume: salesVolume,
      cashback: totalCashbackEmitido,
      pending: pendingCashback,
      clients: new Set(transactions.map(t => t.clientId)).size,
    };
  }, [transactions]);

  // Filtro de Avaliações (Ponto 9)
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
    XLSX.writeFile(wb, `Avaliacoes_VizinhoPlus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderRatingFace = (rating: number) => {
    if (rating <= 2) return <Frown className="text-red-500" size={24} />;
    if (rating === 3) return <Meh className="text-amber-500" size={24} />;
    return <Smile className="text-[#00d66f]" size={24} />;
  };

  if (!isInitialized) return <div className="min-h-screen bg-[#0a2540]" />;

  if (currentView === 'settings') return <AdminSettings onBack={() => {
    setCurrentView('overview');
    fetchData(); // Recarrega dados ao voltar para atualizar e-mail/links no header
  }} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
      {/* HEADER */}
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-lg">
              <ShieldCheck size={40} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Admin <span className="text-[#00d66f]">Console</span></h1>
              <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.3em] mt-3">Suporte: {supportEmail}</p>
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
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl scale-105' : 'hover:bg-white/10 text-white/70'}`}
              >
                <item.icon size={16} strokeWidth={3} /> {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="p-4 rounded-2xl text-red-400">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        
        {currentView === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* ESTATÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-4 border-blue-500">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Vendas Totais</p>
                 <h3 className="text-3xl font-black italic">{formatCurrency(stats.volume)}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border-b-4 border-amber-500">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendente (48h)</p>
                 <h3 className="text-3xl font-black italic text-amber-600">{formatCurrency(stats.pending)}</h3>
              </div>
              <div className="bg-[#00d66f] p-8 rounded-[32px] shadow-lg">
                 <p className="text-[10px] font-black text-[#0a2540]/60 uppercase mb-2">Cashback Ativo</p>
                 <h3 className="text-3xl font-black italic">{formatCurrency(stats.cashback)}</h3>
              </div>
              <div className="bg-[#0a2540] p-8 rounded-[32px] shadow-lg text-white">
                 <p className="text-[10px] font-black text-white/40 uppercase mb-2">Total Vizinhos</p>
                 <h3 className="text-3xl font-black italic">{stats.clients}</h3>
              </div>
            </div>
            <AdminTransactions transactions={transactions} />
          </div>
        )}

        {currentView === 'reviews' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-4 flex-1">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Filtrar por Loja</label>
                  <select 
                    value={filterMerchant}
                    onChange={(e) => setFilterMerchant(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm"
                  >
                    <option value="">Todas as Lojas</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>{(m as any).shopName || m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Início</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Fim</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" />
                </div>
              </div>
              <button onClick={exportToExcel} className="bg-[#0a2540] text-white px-8 py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-xl hover:bg-[#00d66f] hover:text-[#0a2540] transition-all">
                <FileSpreadsheet size={20} /> Relatório Excel
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredReviews.length > 0 ? filteredReviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-50 flex items-center justify-between shadow-sm hover:border-[#00d66f] transition-all">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      {renderRatingFace(review.rating)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-widest mb-1">{review.merchantName}</p>
                      <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">"{review.comment || 'Sem comentário'}"</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        Cliente: {review.clientName} • {review.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={12} className={star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="bg-white p-20 rounded-[40px] border-4 border-dashed border-slate-100 text-center text-slate-300 font-black uppercase italic">
                  Nenhuma avaliação encontrada com estes filtros.
                </div>
              )}
            </div>
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