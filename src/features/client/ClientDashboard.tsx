import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Wallet, 
  QrCode, 
  History, 
  Store, 
  ArrowUpRight, 
  ArrowDownLeft,
  LogOut,
  MapPin,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { currentUser, transactions, subscribeToTransactions, logout } = useStore();
  const [view, setView] = useState<'home' | 'history' | 'partners'>('home');
  const [merchants, setMerchants] = useState<any[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('client', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.id, subscribeToTransactions]);

  useEffect(() => {
    const fetchMerchants = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'merchant'), limit(10));
      const snap = await getDocs(q);
      setMerchants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMerchants();
  }, []);

  // CÁLCULO DE SALDOS TOTAIS (Soma de todas as lojas)
  const totalStats = useMemo(() => {
    let available = 0;
    let pending = 0;

    if (currentUser?.storeWallets) {
      Object.values(currentUser.storeWallets).forEach(wallet => {
        available += wallet.available || 0;
        pending += wallet.pending || 0;
      });
    }

    return { available, pending };
  }, [currentUser?.storeWallets]);

  // Transformar o objeto de carteiras num array para listar
  const storeWalletsList = useMemo(() => {
    if (!currentUser?.storeWallets) return [];
    return Object.entries(currentUser.storeWallets).map(([id, data]) => ({
      id,
      ...data
    })).filter(w => (w.available || 0) > 0 || (w.pending || 0) > 0);
  }, [currentUser?.storeWallets]);

  return (
    <div className="min-h-screen bg-[#f6f9fc] pb-24 font-sans">
      {/* HEADER */}
      <header className="bg-white p-6 border-b-2 border-slate-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0a2540] rounded-xl flex items-center justify-center text-[#00d66f] font-black">
            V+
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Olá, Vizinho!</p>
            <h2 className="text-sm font-black text-[#0a2540] uppercase truncate max-w-[150px]">{currentUser?.name}</h2>
          </div>
        </div>
        <button onClick={() => logout()} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        
        {/* CARTÃO VIRTUAL - MOSTRA TOTAL ACUMULADO */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d66f] to-[#0a2540] rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0a2540] rounded-[38px] p-8 text-white overflow-hidden border-b-8 border-black/30">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <QrCode size={140} />
            </div>
            
            <div className="flex justify-between items-start mb-12">
              <div className="bg-[#00d66f] text-[#0a2540] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                Membro Vizinho+
              </div>
              <QrCode size={24} className="text-[#00d66f]" />
            </div>

            <div className="space-y-1 mb-8">
              <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em]">Saldo Total Disponível</p>
              <h3 className="text-5xl font-black italic tracking-tighter">
                {formatCurrency(totalStats.available)}
              </h3>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">O seu NIF</p>
                <p className="text-xl font-black tracking-[0.2em]">{currentUser?.nif || '--- --- ---'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Pendente</p>
                <p className="text-sm font-black text-[#00d66f]">{formatCurrency(totalStats.pending)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO RÁPIDA */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'home', icon: Wallet, label: 'A Minha Conta' },
            { id: 'history', icon: History, label: 'Extrato' },
            { id: 'partners', icon: Store, label: 'Onde Comprar' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`flex flex-col items-center gap-2 p-4 rounded-[24px] border-2 transition-all ${
                view === item.id 
                ? 'bg-white border-[#00d66f] shadow-lg scale-105' 
                : 'bg-transparent border-slate-100 text-slate-400'
              }`}
            >
              <item.icon size={20} className={view === item.id ? 'text-[#00d66f]' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="space-y-6">
          {view === 'home' && (
            <>
              {/* LISTA DE SALDOS POR LOJA */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Os Meus Saldos por Loja</h4>
                  <Info size={14} className="text-slate-300" />
                </div>
                
                {storeWalletsList.length > 0 ? (
                  <div className="space-y-3">
                    {storeWalletsList.map((wallet) => (
                      <div key={wallet.id} className="bg-white p-5 rounded-[28px] border-2 border-slate-50 flex items-center justify-between group hover:border-[#00d66f] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0a2540]">
                            <Store size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{wallet.merchantName}</p>
                            <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">
                              Disponível: {formatCurrency(wallet.available)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {wallet.pending > 0 && (
                            <p className="text-[9px] font-black text-amber-500 uppercase">
                              +{formatCurrency(wallet.pending)} Pendente
                            </p>
                          )}
                          <ChevronRight size={16} className="ml-auto text-slate-200 group-hover:text-[#00d66f]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">Ainda não tens cashback acumulado.</p>
                  </div>
                )}
              </div>

              {/* ÚLTIMOS MOVIMENTOS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Atividade Recente</h4>
                  <button onClick={() => setView('history')} className="text-[10px] font-black text-[#00d66f] uppercase">Ver Tudo</button>
                </div>
                <div className="space-y-3">
                  {transactions.slice(0, 3).map((t, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[28px] border-2 border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'
                        }`}>
                          {t.type === 'earn' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-[#0a2540] uppercase tracking-tighter">{t.merchantName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Recentemente'}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === 'history' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
               <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest px-2">Histórico Completo</h4>
               {transactions.map((t, idx) => (
                 <div key={idx} className="bg-white p-5 rounded-[28px] border-2 border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{t.merchantName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">{t.documentNumber}</p>
                    </div>
                    <p className={`font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount || 0)}
                    </p>
                 </div>
               ))}
            </div>
          )}

          {view === 'partners' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest px-2">Lojas Parceiras</h4>
              <div className="grid grid-cols-1 gap-4">
                {merchants.map((m, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                        <Store size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{m.shopName || m.name}</p>
                        <div className="flex items-center gap-1 text-[#00d66f]">
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.cashbackPercent}% Cashback</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-slate-300">
                      <MapPin size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER FIXO */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f6f9fc] via-[#f6f9fc] to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={() => setView('partners')}
            className="w-full bg-[#0a2540] text-white p-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
          >
            Ver Onde Ganhar Cashback <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;