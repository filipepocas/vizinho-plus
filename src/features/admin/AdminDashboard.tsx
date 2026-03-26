import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { ShieldCheck, Store, TrendingUp, Users, Settings, LogOut, Clock, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Componentes
import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';
import AdminMerchants from './AdminMerchants';
import FeedbackList from '../../components/admin/FeedbackList';

const AdminDashboard: React.FC = () => {
  const { logout, currentUser } = useStore();
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'reviews'>('overview');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [pendingStores, setPendingStores] = useState<{id: string, name: string, count: number}[]>([]);

  // BUSCAR LOJAS COM TRANSAÇÕES PENDENTES DE MESES ANTERIORES
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

  useEffect(() => { fetchPendingMaturation(); }, [fetchPendingMaturation]);

  // MATURAR LOJA ESPECÍFICA (Seguro para 10.000 clientes)
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
      const batch = writeBatch(db);

      snap.docs.forEach(txDoc => {
        const txData = txDoc.data();
        const amount = txData.cashbackAmount;

        batch.update(txDoc.ref, { status: 'available', maturedAt: serverTimestamp() });
        
        const userRef = doc(db, 'users', txData.clientId);
        batch.update(userRef, {
          [`storeWallets.${merchantId}.available`]: increment(amount),
          [`storeWallets.${merchantId}.pending`]: increment(-amount),
          [`wallet.available`]: increment(amount),
          [`wallet.pending`]: increment(-amount)
        });
      });

      await batch.commit();
      toast.success(`${merchantName} MATURADO COM SUCESSO!`);
      fetchPendingMaturation();
    } catch (e) {
      toast.error("ERRO NO PROCESSAMENTO.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] border-b-8 border-[#00d66f] mb-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
             <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-lg"><ShieldCheck size={40} strokeWidth={3} /></div>
             <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-[#00d66f]">Admin Console</h1>
          </div>
          <nav className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'reviews', label: 'Feedback', icon: MessageSquare },
            ].map(item => (
              <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/70 hover:bg-white/10'}`}>
                <item.icon size={16} /> {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {currentView === 'overview' && (
          <>
            {/* LISTAGEM DE LOJAS COM MATURAÇÃO PENDENTE */}
            <div className="bg-white rounded-[40px] border-4 border-[#0a2540] p-8 shadow-[12px_12px_0px_#0a2540]">
              <div className="flex items-center gap-3 mb-8">
                 <Clock className="text-amber-500" size={24} />
                 <h2 className="text-xl font-black uppercase italic italic">Maturações Pendentes (Regra Mês Seguinte)</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingStores.length > 0 ? pendingStores.map(store => (
                  <div key={store.id} className="p-6 bg-slate-50 border-4 border-slate-100 rounded-[30px] flex justify-between items-center">
                    <div>
                      <p className="font-black uppercase text-xs text-[#0a2540]">{store.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{store.count} Movimentos</p>
                    </div>
                    <button 
                      onClick={() => processStoreMaturation(store.id, store.name)}
                      disabled={isProcessing === store.id}
                      className="bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl hover:bg-black transition-all"
                    >
                      {isProcessing === store.id ? <RefreshCw className="animate-spin" /> : 'MATURAR'}
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full py-10 text-center border-4 border-dashed border-slate-100 rounded-[30px]">
                    <p className="font-black text-slate-300 uppercase tracking-widest">Tudo em dia. Não há saldos pendentes.</p>
                  </div>
                )}
              </div>
            </div>

            <AdminTransactions transactions={[]} users={[]} />
          </>
        )}

        {currentView === 'users' && <AdminUsers />}
        {currentView === 'merchants' && <AdminMerchants merchants={[]} onUpdateStatus={async () => {}} onOpenModal={() => {}} />}
        {currentView === 'reviews' && <FeedbackList />}
      </main>
    </div>
  );
};

export default AdminDashboard;