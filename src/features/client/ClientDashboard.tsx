import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Wallet, 
  QrCode, 
  History, 
  Store, 
  Star, 
  ArrowUpRight, 
  ArrowDownLeft,
  Info,
  LogOut,
  MapPin,
  Clock
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { currentUser, transactions, subscribeToTransactions, logout } = useStore();
  const [view, setView] = useState<'home' | 'history' | 'partners'>('home');
  const [merchants, setMerchants] = useState<any[]>([]);

  // 1. SUBSCREVER TRANSAÇÕES DO CLIENTE
  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('client', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.id, subscribeToTransactions]);

  // 2. CARREGAR LOJAS PARCEIRAS (Para o utilizador saber onde comprar)
  useEffect(() => {
    const fetchMerchants = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'merchant'), limit(10));
      const snap = await getDocs(q);
      setMerchants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMerchants();
  }, []);

  // 3. CÁLCULO DE SALDOS (Disponível vs Pendente)
  const walletStats = useMemo(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    let available = 0;
    let pending = 0;

    transactions.forEach(t => {
      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const val = t.cashbackAmount || 0;

      if (t.type === 'earn') {
        if (txTime <= fortyEightHoursAgo) {
          available += val;
        } else {
          pending += val;
        }
      } else {
        // Resgates são sempre abatidos do disponível
        available -= val;
      }
    });

    return { available, pending };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[#f6f9fc] pb-24 font-sans">
      {/* HEADER DO UTILIZADOR */}
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
        
        {/* CARTÃO VIRTUAL BRUTALISTA */}
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
              <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em]">Saldo Disponível</p>
              <h3 className="text-5xl font-black italic tracking-tighter">
                {walletStats.available.toFixed(2)}€
              </h3>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">O seu NIF</p>
                <p className="text-xl font-black tracking-[0.2em]">{currentUser?.nif || '--- --- ---'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pendente</p>
                <p className="text-sm font-black text-[#00d66f]">{walletStats.pending.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* INFO DE MATURAÇÃO */}
        {walletStats.pending > 0 && (
          <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex items-start gap-3">
            <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
              Tens <span className="underline">{walletStats.pending.toFixed(2)}€</span> a processar. O cashback fica disponível para uso 48h após a compra por segurança.
            </p>
          </div>
        )}

        {/* MENU DE NAVEGAÇÃO RÁPIDA */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'home', icon: Wallet, label: 'Início' },
            { id: 'history', icon: History, label: 'Extrato' },
            { id: 'partners', icon: Store, label: 'Lojas' }
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
              <div className="flex justify-between items-center px-2">
                <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Últimos Movimentos</h4>
                <button onClick={() => setView('history')} className="text-[10px] font-black text-[#00d66f] uppercase">Ver Todos</button>
              </div>
              
              <div className="space-y-3">
                {transactions.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-[28px] border-2 border-slate-50 flex items-center justify-between group hover:border-[#0a2540] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'
                      }`}>
                        {t.type === 'earn' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{t.merchantName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount?.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                ))}
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{t.documentNumber}</p>
                    </div>
                    <p className={`font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount?.toFixed(2)}€
                    </p>
                 </div>
               ))}
            </div>
          )}

          {view === 'partners' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest px-2">Onde Ganhar Cashback</h4>
              <div className="grid grid-cols-1 gap-4">
                {merchants.map((m, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                        <Store size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{m.name}</p>
                        <div className="flex items-center gap-1 text-[#00d66f]">
                          <Star size={12} fill="#00d66f" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.cashbackPercent}% Cashback</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-slate-50 p-3 rounded-xl text-slate-300 group-hover:bg-[#0a2540] group-hover:text-white transition-all">
                      <MapPin size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER FIXO DE ACÇÃO */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f6f9fc] via-[#f6f9fc] to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={() => setView('partners')}
            className="w-full bg-[#0a2540] text-white p-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
          >
            Explorar Lojas Parceiras <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;