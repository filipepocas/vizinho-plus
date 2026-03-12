// src/features/user/UserDashboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import MerchantExplore from './MerchantExplore';
import ProfileSettings from '../profile/ProfileSettings'; // Importação adicionada
import { Timestamp } from 'firebase/firestore';
import { 
  LogOut, 
  Store, 
  Settings, 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  CheckCircle2,
  Zap,
  ChevronRight
} from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  // Atualizado para incluir a vista de perfil
  const [view, setView] = useState<'home' | 'merchants' | 'profile'>('home');
  const [dateFilter, setDateFilter] = useState('all'); 

  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.nif, subscribeToTransactions]);

  // Cálculo de saldos (Disponível vs Pendente) com lógica de 48h
  const merchantBalances = useMemo(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const balances: { [key: string]: { name: string, available: number, pending: number, total: number } } = {};

    transactions.forEach(t => {
      const merchantId = t.merchantId || 'unknown';
      if (!balances[merchantId]) {
        balances[merchantId] = { name: t.merchantName || 'Loja Parceira', available: 0, pending: 0, total: 0 };
      }

      const txTime = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : Date.now();
      const isAvailable = txTime <= fortyEightHoursAgo;
      const amount = t.cashbackAmount || 0;

      if (t.type === 'earn') {
        balances[merchantId].total += amount;
        if (isAvailable) {
          balances[merchantId].available += amount;
        } else {
          balances[merchantId].pending += amount;
        }
      } else if (t.type === 'redeem') {
        let remainingToDebit = amount;
        if (balances[merchantId].available >= remainingToDebit) {
          balances[merchantId].available -= remainingToDebit;
          remainingToDebit = 0;
        } else {
          remainingToDebit -= balances[merchantId].available;
          balances[merchantId].available = 0;
          balances[merchantId].pending -= remainingToDebit;
        }
        balances[merchantId].total -= amount;
      }
    });

    return Object.values(balances);
  }, [transactions]);

  const totalBalance = merchantBalances.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  const filteredTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    }).filter(t => {
      if (dateFilter === 'all') return true;
      const txDate = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : Date.now();
      const diffDays = (Date.now() - txDate) / (1000 * 60 * 60 * 24);
      return dateFilter === '7d' ? diffDays <= 7 : diffDays <= 30;
    });
  }, [transactions, dateFilter]);

  // Navegação para Exploração de Lojas
  if (view === 'merchants') {
    return <MerchantExplore onBack={() => setView('home')} />;
  }

  // Navegação para Configurações de Perfil
  if (view === 'profile') {
    return <ProfileSettings onBack={() => setView('home')} />;
  }

  // Se ainda estiver a carregar o utilizador
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-8 border-[#00d66f] border-t-transparent rounded-2xl animate-spin mb-6"></div>
        <p className="font-black text-white uppercase tracking-[0.3em] text-[10px]">A sincronizar carteira...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32">
      
      {/* HEADER BRUTALISTA */}
      <header className="bg-[#0f172a] px-6 py-10 text-white rounded-b-[50px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#00d66f] p-3 rounded-2xl rotate-[-8deg] shadow-[4px_4px_0px_#ffffff]">
              <Wallet size={28} className="text-[#0f172a]" strokeWidth={3} />
            </div>
            <div>
              <h1 className="font-black italic text-2xl tracking-tighter uppercase leading-none">Minha Carteira</h1>
              <p className="text-[#00d66f] text-[9px] font-black uppercase tracking-[0.2em] mt-1">Vizinho+ Oficial</p>
            </div>
          </div>
          <button 
            onClick={() => logout()} 
            className="bg-white/5 hover:bg-red-500 text-white p-4 rounded-2xl transition-all border-2 border-white/10 active:scale-90"
          >
            <LogOut size={20} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        
        {/* CARTÃO VIRTUAL */}
        <div className="bg-white rounded-[50px] shadow-2xl border-4 border-[#0f172a] overflow-hidden mb-12 relative -mt-20 z-20">
          <div className="p-8">
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="bg-[#0f172a] text-[#00d66f] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Membro Ativo
                </span>
                <h2 className="text-4xl font-black text-[#0f172a] tracking-tighter uppercase mt-4 leading-none">
                  {(currentUser?.name || 'Vizinho').split(' ')[0]}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Acumulado</p>
                <p className="text-4xl font-black text-[#0f172a] italic tracking-tighter leading-none">{totalBalance.toFixed(2)}€</p>
              </div>
            </div>

            {/* QR CODE AREA */}
            <div className="bg-slate-50 p-8 rounded-[40px] border-4 border-dashed border-slate-200 flex flex-col items-center gap-6 mb-8 group">
              <div className="bg-white p-6 rounded-[35px] shadow-xl border-2 border-[#0f172a] group-hover:scale-105 transition-transform duration-500">
                <QRCodeSVG value={currentUser?.nif || "NO-NIF"} size={160} level="H" includeMargin={false} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Teu NIF para Cashback</p>
                <div className="bg-[#0f172a] text-[#00d66f] px-6 py-2 rounded-xl">
                    <p className="text-2xl font-mono font-black tracking-[0.2em]">
                        {currentUser?.nif || '--- --- ---'}
                    </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-[#00d66f]" />
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Status</p>
                    <p className="text-xs font-black text-[#0f172a] uppercase">Verificado</p>
                </div>
              </div>
              <div className="bg-[#00d66f] px-8 py-4 rounded-[25px] shadow-lg shadow-[#00d66f]/30 border-2 border-[#0f172a]">
                <p className="text-[10px] font-black text-[#0f172a] uppercase opacity-70 mb-1 leading-none text-center">Disponível</p>
                <p className="text-3xl font-black text-[#0f172a] leading-none tracking-tighter">{totalAvailable.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* ACÇÕES RÁPIDAS */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <button 
            onClick={() => setView('merchants')}
            className="group bg-[#0f172a] text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:bg-black transition-all shadow-xl border-b-8 border-black active:translate-y-1 active:border-b-0"
          >
            <div className="bg-[#00d66f] p-3 rounded-2xl group-hover:rotate-12 transition-transform">
                <Store size={28} className="text-[#0f172a]" strokeWidth={3} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Onde Ganhar</span>
          </button>
          
          <button 
            onClick={() => setView('profile')}
            className="group bg-white text-[#0f172a] p-8 rounded-[40px] flex flex-col items-center gap-4 border-4 border-[#0f172a] shadow-xl hover:bg-slate-50 transition-all active:translate-y-1"
          >
            <div className="bg-slate-100 p-3 rounded-2xl group-hover:rotate-[-12deg] transition-transform">
                <Settings size={28} strokeWidth={3} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Perfil</span>
          </button>
        </div>

        {/* SALDOS POR ESTABELECIMENTO */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 ml-2">
            <Zap size={20} className="text-[#00d66f]" fill="#00d66f" />
            <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">O Teu Cashback por Loja</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6">
            {merchantBalances.length > 0 ? merchantBalances.map((m, idx) => (
              <div key={idx} className="min-w-[260px] bg-white p-6 rounded-[35px] shadow-lg border-2 border-slate-100 group">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{m.name}</p>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-[#00d66f] transition-colors" />
                </div>
                <p className="text-3xl font-black text-[#0f172a] mb-6 italic tracking-tighter">{m.total.toFixed(2)}€</p>
                <div className="flex justify-between items-center pt-4 border-t-2 border-slate-50">
                  <div>
                    <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-tighter">Disponível</p>
                    <p className="text-xl font-black text-[#0f172a]">{m.available.toFixed(2)}€</p>
                  </div>
                  {m.pending > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">Em análise</p>
                      <p className="text-sm font-black text-orange-500 italic">+{m.pending.toFixed(2)}€</p>
                    </div>
                  )}
                </div>
              </div>
            )) : (
                <div className="w-full bg-slate-100/50 p-8 rounded-[35px] border-2 border-dashed border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Começa a comprar para acumular saldo!</p>
                </div>
            )}
          </div>
        </div>

        {/* ATIVIDADE RECENTE */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3">
                <History size={20} className="text-[#0f172a]" />
                <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Histórico</h4>
            </div>
            <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-4 border-[#0f172a] rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:bg-[#00d66f] transition-all cursor-pointer"
            >
                <option value="all">Sempre</option>
                <option value="7d">7 Dias</option>
                <option value="30d">30 Dias</option>
            </select>
          </div>

          <div className="bg-white rounded-[45px] shadow-2xl border-4 border-[#0f172a] overflow-hidden">
            {filteredTransactions.length > 0 ? (
              <div className="divide-y-4 divide-slate-50">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-8 flex justify-between items-center hover:bg-slate-50 transition-all group">
                    <div className="flex gap-5 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform ${
                        t.type === 'earn' ? 'bg-[#00d66f] text-[#0f172a]' : 'bg-red-500 text-white'
                      }`}>
                        {t.type === 'earn' ? <ArrowUpRight size={24} strokeWidth={4} /> : <ArrowDownLeft size={24} strokeWidth={4} />}
                      </div>
                      <div>
                        <p className="font-black text-[#0f172a] text-sm uppercase tracking-tight leading-none mb-1">{t.merchantName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                          <Clock size={12} /> {t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black italic tracking-tighter ${t.type === 'earn' ? 'text-[#0f172a]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Cashback</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                    <History size={32} className="text-slate-200" />
                </div>
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Sem movimentos registados</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;