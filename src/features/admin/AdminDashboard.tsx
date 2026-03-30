import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, Timestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Store, TrendingUp, Users, Settings, LogOut, Clock, RefreshCw, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { User as UserProfile, Transaction } from '../../types';

// Componentes
import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';
import AdminMerchants from './AdminMerchants';
import FeedbackList from '../../components/admin/FeedbackList';
import MerchantModal from './MerchantModal';

const AdminDashboard: React.FC = () => {
  const { logout } = useStore();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'reviews'>('overview');
  
  // Dados globais do Admin
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<UserProfile[]>([]);
  
  // Estado de carregamentos e processos
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [pendingStores, setPendingStores] = useState<{id: string, name: string, count: number}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // BUSCAR LOJAS COM TRANSAÇÕES PENDENTES DE MESES ANTERIORES
  const fetchPendingMaturation = useCallback(async () => {
    const now = new Date();
    // A regra: Tudo o que foi faturado até às 23:59 do último dia do mês passado
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const q = query(
      collection(db, 'transactions'),
      where('status', '==', 'pending'),
      where('createdAt', '<', Timestamp.fromDate(startOfCurrentMonth))
    );

    const snap = await getDocs(q);
    const storeMap = new Map();

    snap.docs.forEach(d => {
      const data = d.data();
      const existing = storeMap.get(data.merchantId) || { id: data.merchantId, name: data.merchantName, count: 0 };
      storeMap.set(data.merchantId, { ...existing, count: existing.count + 1 });
    });

    setPendingStores(Array.from(storeMap.values()));
  }, []);

  // Monitorizar todas as transações em tempo real (Limitado a 100 para não esgotar leituras da camada gratuita)
  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc')); // Retirado limit(100) temporariamente para o Admin ver o fluxo geral. Para grandes volumes, repor limit(100).
    const unsubTx = onSnapshot(qTx, (snap) => {
        setGlobalTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });

    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerchants = onSnapshot(qMerchants, (snap) => {
        setGlobalMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    fetchPendingMaturation();

    return () => {
        unsubTx();
        unsubMerchants();
    };
  }, [fetchPendingMaturation]);


  // MATURAR LOJA ESPECÍFICA (Seguro para 10.000+ clientes com Chunking)
  const processStoreMaturation = async (merchantId: string, merchantName: string) => {
    if (!window.confirm(`Maturar todas as transações de "${merchantName}"? Isto irá disponibilizar o saldo a todos os clientes desta loja.`)) return;

    setIsProcessing(merchantId);
    try {
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

      const q = query(
        collection(db, 'transactions'),
        where('merchantId', '==', merchantId),
        where('status', '==', 'pending'),
        where('createdAt', '<', Timestamp.fromDate(startOfCurrentMonth))
      );

      const snap = await getDocs(q);
      
      // O Firebase tem limite de 500 operações por Batch. 
      // Temos que atualizar a Transação (1) e a Conta do Cliente (1). Portanto, máximo 240 transações por Batch.
      const BATCH_LIMIT = 240; 
      let batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      snap.docs.forEach((txDoc) => {
        const txData = txDoc.data();
        const amount = txData.cashbackAmount;

        // Operação 1: Atualizar Transação
        currentBatch.update(txDoc.ref, { status: 'available', maturedAt: serverTimestamp() });
        operationCount++;

        // Operação 2: Atualizar Saldo do Cliente
        const userRef = doc(db, 'users', txData.clientId);
        currentBatch.update(userRef, {
          [`storeWallets.${merchantId}.available`]: increment(amount),
          [`storeWallets.${merchantId}.pending`]: increment(-amount),
          [`wallet.available`]: increment(amount),
          [`wallet.pending`]: increment(-amount)
        });
        operationCount++;

        // Se o batch estiver a ficar cheio, criamos um novo
        if (operationCount >= BATCH_LIMIT * 2) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      // Garantir que o último batch incompleto também é executado
      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }

      await Promise.all(batches); // Executa tudo
      toast.success(`SALDOS DE ${merchantName} MATURADOS COM SUCESSO!`);
      fetchPendingMaturation(); // Atualiza a lista visual
    } catch (e) {
      console.error(e);
      toast.error("ERRO NO PROCESSAMENTO. VERIFIQUE A LIGAÇÃO.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Função para mudar o Status de Lojistas (Usado no componente AdminMerchants)
  const handleUpdateMerchantStatus = async (merchantId: string, newStatus: string) => {
      try {
          await writeBatch(db).update(doc(db, 'users', merchantId), { status: newStatus }).commit();
          toast.success("Estado do Lojista atualizado!");
      } catch (err) {
          toast.error("Erro ao atualizar o estado.");
      }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] border-b-8 border-[#00d66f] mb-12 shadow-2xl relative">
        {/* BOTÕES DE TOPO (DEFINIÇÕES E LOGOUT) */}
        <div className="absolute top-8 right-8 flex gap-3">
             <button 
                onClick={() => navigate('/settings')} 
                className="p-3 bg-white/10 rounded-2xl text-white hover:bg-[#00d66f] hover:text-[#0a2540] transition-colors shadow-lg"
                title="Configurações Master"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={handleLogout} 
                className="p-3 bg-white/10 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                title="Sair"
            >
                <LogOut size={20} />
            </button>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mt-4 md:mt-0">
          <div className="flex items-center gap-6">
             <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-[4px_4px_0px_#ffffff]"><ShieldCheck size={40} strokeWidth={3} /></div>
             <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none text-[#00d66f]">Admin Console</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Supervisão Vizinho+</p>
             </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-sm border border-white/10">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'reviews', label: 'Feedback', icon: MessageSquare },
            ].map(item => (
              <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-lg scale-105' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <item.icon size={16} strokeWidth={2.5} /> {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {currentView === 'overview' && (
          <>
            {/* LISTAGEM DE LOJAS COM MATURAÇÃO PENDENTE */}
            <div className="bg-white rounded-[40px] border-4 border-[#0a2540] p-8 shadow-[12px_12px_0px_#0a2540] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Clock size={160} />
              </div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-amber-100 p-3 rounded-2xl">
                        <Clock className="text-amber-600" size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-[#0a2540]">Maturações Pendentes</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Regra do Mês Seguinte</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingStores.length > 0 ? pendingStores.map(store => (
                      <div key={store.id} className="p-6 bg-slate-50 border-4 border-slate-100 rounded-[30px] flex justify-between items-center group hover:border-[#00d66f] transition-all">
                        <div>
                          <p className="font-black uppercase text-sm text-[#0a2540] leading-tight mb-1">{store.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white inline-block px-3 py-1 rounded-full border-2 border-slate-100">{store.count} Movimentos</p>
                        </div>
                        <button 
                          onClick={() => processStoreMaturation(store.id, store.name)}
                          disabled={isProcessing === store.id}
                          className="bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl hover:bg-black transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                          title="Transformar Saldo Pendente em Disponível"
                        >
                          {isProcessing === store.id ? <RefreshCw className="animate-spin" size={20} /> : <TrendingUp size={20} strokeWidth={3} />}
                        </button>
                      </div>
                    )) : (
                      <div className="col-span-full py-16 px-8 text-center bg-green-50 border-4 border-dashed border-green-200 rounded-[30px]">
                        <ShieldCheck size={48} className="mx-auto text-green-400 mb-4" />
                        <p className="font-black text-green-700 uppercase tracking-[0.2em] text-sm">Tudo em dia.</p>
                        <p className="font-bold text-green-600 text-[10px] uppercase mt-2">Não há saldos pendentes do mês passado para maturar.</p>
                      </div>
                    )}
                  </div>
              </div>
            </div>

            {/* TABELA GLOBAL DE TRANSAÇÕES */}
            <div className="bg-white rounded-[40px] border-4 border-[#0a2540] p-8 shadow-[12px_12px_0px_#00d66f]">
                <h2 className="text-xl font-black uppercase italic tracking-tight text-[#0a2540] mb-8">Auditoria de Transações</h2>
                <AdminTransactions transactions={globalTransactions} users={[]} />
            </div>
          </>
        )}

        {/* OUTRAS VIEWS */}
        {currentView === 'users' && <AdminUsers />}
        
        {currentView === 'merchants' && (
            <AdminMerchants 
                merchants={globalMerchants} 
                onUpdateStatus={handleUpdateMerchantStatus} 
                onOpenModal={() => setIsModalOpen(true)} 
            />
        )}
        
        {currentView === 'reviews' && <FeedbackList />}
      </main>

      {/* MODAL DE CRIAÇÃO DE LOJISTA */}
      <MerchantModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
            toast.success("Lojista criado com sucesso! Partilhe o email e password definidos com o proprietário.");
            setIsModalOpen(false);
        }} 
      />

    </div>
  );
};

export default AdminDashboard;