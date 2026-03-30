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
  
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<UserProfile[]>([]);
  const [globalClients, setGlobalClients] = useState<UserProfile[]>([]);
  
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [pendingStores, setPendingStores] = useState<{id: string, name: string, count: number}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPendingMaturation = useCallback(async () => {
    const now = new Date();
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

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(qTx, (snap) => {
        setGlobalTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });

    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerchants = onSnapshot(qMerchants, (snap) => {
        setGlobalMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    const qClients = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsubClients = onSnapshot(qClients, (snap) => {
        setGlobalClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    fetchPendingMaturation();

    return () => {
        unsubTx();
        unsubMerchants();
        unsubClients();
    };
  }, [fetchPendingMaturation]);

  const processStoreMaturation = async (merchantId: string, merchantName: string) => {
    if (!window.confirm(`Maturar todas as transações de "${merchantName}"?`)) return;

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
      const BATCH_LIMIT = 240; 
      let batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      snap.docs.forEach((txDoc) => {
        const txData = txDoc.data();
        const amount = txData.cashbackAmount;

        currentBatch.update(txDoc.ref, { status: 'available', maturedAt: serverTimestamp() });
        operationCount++;

        const userRef = doc(db, 'users', txData.clientId);
        currentBatch.update(userRef, {
          [`storeWallets.${merchantId}.available`]: increment(amount),
          [`storeWallets.${merchantId}.pending`]: increment(-amount),
          [`wallet.available`]: increment(amount),
          [`wallet.pending`]: increment(-amount)
        });
        operationCount++;

        if (operationCount >= BATCH_LIMIT * 2) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);
      toast.success(`SALDOS DE ${merchantName} MATURADOS!`);
      fetchPendingMaturation(); 
    } catch (e) {
      toast.error("ERRO NO PROCESSAMENTO.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* CABEÇALHO PRINCIPAL CORRIGIDO */}
      <header className="bg-[#0a2540] text-white p-6 md:p-10 rounded-b-[50px] border-b-[10px] border-[#00d66f] shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-[#00d66f] p-4 rounded-[25px] text-[#0a2540] shadow-[4px_4px_0px_#ffffff]">
                <ShieldCheck size={32} strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-[#00d66f]">Admin Console</h1>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Supervisão Vizinho+</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => navigate('/settings')} className="px-6 py-4 bg-white/10 rounded-2xl text-white hover:bg-[#00d66f] hover:text-[#0a2540] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border-2 border-white/10">
                <Settings size={20} /> Master
              </button>
              <button onClick={async () => { await logout(); navigate('/login'); }} className="px-6 py-4 bg-red-500/10 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border-2 border-red-500/20">
                <LogOut size={20} /> Sair
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 mt-10 bg-black/20 p-2 rounded-[25px] border border-white/5 inline-flex">
            {[
              { id: 'overview', label: 'Painel', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'reviews', label: 'Feedback', icon: MessageSquare },
            ].map(item => (
              <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl translate-y-[-2px]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={18} strokeWidth={3} /> {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 w-full">
        {currentView === 'overview' && (
          <>
            {/* Secção de Maturação */}
            <div className="bg-white rounded-[40px] border-4 border-[#0a2540] p-10 shadow-[12px_12px_0px_#0a2540]">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                  <Clock size={28} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540]">Maturações Pendentes</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingStores.length > 0 ? pendingStores.map(store => (
                  <div key={store.id} className="p-8 bg-slate-50 border-4 border-slate-100 rounded-[35px] flex justify-between items-center group hover:border-[#00d66f] transition-all">
                    <div>
                      <p className="font-black uppercase text-base text-[#0a2540] mb-1">{store.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{store.count} Movimentos</p>
                    </div>
                    <button onClick={() => processStoreMaturation(store.id, store.name)} className="bg-[#0a2540] text-[#00d66f] p-5 rounded-2xl hover:bg-black transition-all shadow-lg">
                      {isProcessing === store.id ? <RefreshCw className="animate-spin" size={24} /> : <TrendingUp size={24} strokeWidth={3} />}
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center bg-green-50 border-4 border-dashed border-green-200 rounded-[40px]">
                    <ShieldCheck size={60} className="mx-auto text-green-400 mb-4" />
                    <p className="font-black text-green-700 uppercase tracking-[0.3em]">Tudo atualizado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Auditoria de Transações (Secção da Imagem) */}
            <div className="bg-white rounded-[50px] border-4 border-[#0a2540] p-10 shadow-[15px_15px_0px_#0a2540]">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-10">Auditoria de Transações</h2>
                <AdminTransactions transactions={globalTransactions} users={[]} />
            </div>
          </>
        )}
        {currentView === 'users' && <AdminUsers users={globalClients} />}
        {currentView === 'merchants' && <AdminMerchants merchants={globalMerchants} onUpdateStatus={async (id, s) => { await writeBatch(db).update(doc(db, 'users', id), { status: s }).commit(); }} onOpenModal={() => setIsModalOpen(true)} />}
        {currentView === 'reviews' && <FeedbackList />}
      </main>

      <MerchantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;