import React, { useState, useEffect, useMemo } from 'react';
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
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { 
  ShieldCheck, 
  Users, 
  Store, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Clock,
  RefreshCw
} from 'lucide-react';

// COMPONENTES MODULARES
import AdminSettings from '../../features/admin/AdminSettings';
import AdminTransactions from '../../features/admin/AdminTransactions';
import AdminUsers from '../../features/admin/AdminUsers';
import AdminMerchants from '../../features/admin/AdminMerchants';
import { User as UserProfile } from '../../types/index';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const navigate = useNavigate();
  
  // ESTADOS DE NAVEGAÇÃO E MODAL
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  // ESTADOS DE DADOS
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);

  // FORMULÁRIO DE NOVO PARCEIRO (Mantido aqui para lógica de Auth)
  const [newMerchant, setNewMerchant] = useState({
    name: '', 
    nif: '', 
    phone: '', 
    email: '', 
    cashbackPercent: 10 
  });

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

  // LÓGICA DE MATURAÇÃO DE CASHBACK
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

  // SUBSCRIPÇÃO E FETCH DE DADOS
  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  useEffect(() => {
    const fetchData = async () => {
      if (currentView === 'merchants' || currentView === 'users') {
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
      }
    };
    fetchData();
  }, [currentView]);

  // CÁLCULO DE ESTATÍSTICAS
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalCashback = transactions.reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);
    const pendingCashback = transactions
      .filter(t => t.status === 'pending')
      .reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);
    const uniqueClients = new Set(transactions.map(t => t.clientId)).size;
    
    return {
      volume: totalVolume,
      cashback: totalCashback,
      pending: pendingCashback,
      clients: uniqueClients,
      count: transactions.length
    };
  }, [transactions]);

  // GESTÃO DE STATUS (CLIENTES E LOJISTAS)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { status: newStatus });
      setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
      setRegisteredUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u));
    } catch (e) {
      alert("Erro ao atualizar status.");
    }
  };

  if (currentView === 'settings') return <AdminSettings onBack={() => setCurrentView('overview')} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
      {/* HEADER E NAVEGAÇÃO */}
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
        
        {/* VISTA: OVERVIEW / DASHBOARD */}
        {currentView === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Vendas</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats.volume)}</h3>
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendente</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats.pending)}</h3>
                 <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase text-slate-300">
                   <Clock size={10}/> Em Maturação
                 </div>
              </div>
              <div className="bg-[#00d66f] p-8 rounded-[40px] shadow-xl border-2 border-[#00d66f] text-[#0a2540]">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Saldos Maturados</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats.cashback - stats.pending)}</h3>
                 <button 
                  onClick={processMaturation} 
                  disabled={isProcessing} 
                  className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase bg-[#0a2540] text-white px-4 py-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                 >
                   <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''}/> 
                   {isProcessing ? 'A Processar...' : 'Libertar Cashback'}
                 </button>
              </div>
              <div className="bg-[#0a2540] p-8 rounded-[40px] shadow-xl text-white">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Vizinhos Ativos</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{stats.clients}</h3>
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

        {/* VISTA: LOJAS (MODULARIZADO) */}
        {currentView === 'merchants' && (
          <AdminMerchants 
            merchants={merchants}
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

        {/* VISTA: VIZINHOS (MODULARIZADO) */}
        {currentView === 'users' && (
          <AdminUsers 
            users={registeredUsers} 
            onUpdateStatus={handleUpdateStatus} 
            loading={loading} 
          />
        )}

      </main>

      {/* O Modal de Registo de Lojista pode ser movido no futuro para dentro do AdminMerchants se necessário, por agora mantemos a lógica de Auth no Dashboard por segurança estrutural */}
    </div>
  );
};

export default AdminDashboard;