import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import MerchantExplore from './MerchantExplore';
import { 
  LogOut, 
  Store, 
  Settings, 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Calendar,
  CreditCard,
  Info,
  History // Adicionado o ícone que estava em falta nos imports
} from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  const [view, setView] = useState<'home' | 'merchants'>('home');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); 

  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToTransactions]);

  if (view === 'merchants') {
    return <MerchantExplore onBack={() => setView('home')} />;
  }

  const getBalancesByMerchant = () => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const balances: { [key: string]: { name: string, available: number, pending: number, total: number } } = {};

    transactions.forEach(t => {
      const merchantId = t.merchantId || 'unknown';
      if (!balances[merchantId]) {
        balances[merchantId] = { name: t.merchantName || 'Loja Vizinha', available: 0, pending: 0, total: 0 };
      }

      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const isAvailable = txTime <= fortyEightHoursAgo;
      const amount = t.cashbackAmount || 0;

      if (t.type === 'earn') {
        balances[merchantId].total += amount;
        if (isAvailable) {
          balances[merchantId].available += amount;
        } else {
          balances[merchantId].pending += amount;
        }
      } else {
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
  };

  const filteredTransactions = transactions.filter(t => {
    const matchMerchant = merchantFilter === 'all' || t.merchantName === merchantFilter;
    
    let matchDate = true;
    if (dateFilter !== 'all') {
      const txDate = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const now = Date.now();
      const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
      
      if (dateFilter === '7d') matchDate = diffDays <= 7;
      else if (dateFilter === '30d') matchDate = diffDays <= 30;
      else if (dateFilter === '90d') matchDate = diffDays <= 90;
    }

    return matchMerchant && matchDate;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#00d66f] blur-2xl opacity-20 animate-pulse"></div>
          <img src="/logo-vizinho.png" alt="Vizinho+" className="w-20 h-20 relative object-contain" />
        </div>
        <div className="w-10 h-1 border-2 border-[#00d66f] animate-pulse mb-6"></div>
        <p className="font-black text-white uppercase tracking-[0.3em] text-[10px]">A ler o teu chip...</p>
      </div>
    );
  }

  const merchantBalances = getBalancesByMerchant();
  const totalBalance = merchantBalances.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-24">
      
      <header className="bg-[#0a2540] px-6 py-8 text-white rounded-b-[48px] shadow-2xl mb-10 border-b-4 border-[#00d66f]">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl rotate-[-6deg] shadow-[4px_4px_0px_#00d66f]">
              <img src="/logo-vizinho.png" alt="V+" className="h-7 w-7 object-contain" />
            </div>
            <h1 className="font-black italic text-xl tracking-tighter uppercase leading-none">VIZINHO+</h1>
          </div>
          <button 
            onClick={() => logout()} 
            className="group flex items-center gap-2 bg-white/5 hover:bg-red-500/20 text-[10px] font-black uppercase px-5 py-2.5 rounded-full border border-white/10 transition-all active:scale-95"
          >
            Sair <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        
        <div className="relative group max-w-md mx-auto mb-14">
          <div className="absolute -inset-4 bg-gradient-to-br from-[#00d66f] to-[#0a2540] rounded-[55px] blur-2xl opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          
          <div className="relative bg-white p-10 rounded-[48px] shadow-[0_30px_60px_-15px_rgba(10,37,64,0.15)] border-b-[12px] border-[#00d66f] overflow-hidden transition-all duration-500 hover:translate-y-[-4px]">
            
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none select-none">
              <img src="/logo-vizinho.png" alt="" className="w-48 h-48 object-contain rotate-12" />
            </div>

            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d66f]/10 text-[#00d66f] rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                  <CreditCard size={10} strokeWidth={3} /> Membro Oficial
                </span>
                <h2 className="text-3xl font-black text-[#0a2540] tracking-tighter uppercase leading-[0.9] break-words max-w-[220px]">
                  {currentUser.name}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Saldo Acumulado</p>
                <p className="text-4xl font-black text-[#0a2540] leading-none italic tracking-tighter">{totalBalance.toFixed(2)}€</p>
              </div>
            </div>

            <div className="bg-slate-50 p-7 rounded-[32px] border-2 border-slate-100 flex flex-col items-center gap-5 relative z-10 shadow-inner">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                {/* Correção: Garantir que o valor seja sempre string e nunca undefined */}
                <Barcode 
                  value={String(currentUser.customerNumber || "0000000000")} 
                  width={1.6} 
                  height={45} 
                  displayValue={false}
                  lineColor="#0a2540"
                  margin={0}
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Cliente</p>
                <p className="text-xl font-mono font-black tracking-[0.25em] text-[#0a2540] bg-white px-4 py-1 rounded-lg">
                  {currentUser.customerNumber?.match(/.{1,4}/g)?.join(' ') || "0000 0000 00"}
                </p>
              </div>
            </div>

            <div className="mt-10 flex justify-between items-end relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                  <QRCodeSVG value={currentUser.nif || ""} size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">NIF Registado</p>
                  <p className="text-sm font-black text-[#0a2540]">{currentUser.nif}</p>
                </div>
              </div>
              <div className="bg-[#00d66f] px-5 py-2.5 rounded-[18px] shadow-lg shadow-[#00d66f]/20">
                <p className="text-[10px] font-black text-[#0a2540] uppercase leading-none mb-1">Disponível</p>
                <p className="text-lg font-black text-[#0a2540] leading-none tracking-tighter">{totalAvailable.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-16">
          <button 
            onClick={() => setView('merchants')}
            className="group bg-[#0a2540] text-white p-8 rounded-[40px] flex flex-col items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl active:scale-95 border-b-8 border-black/30"
          >
            <div className="bg-white/10 p-4 rounded-[20px] group-hover:scale-110 transition-transform">
              <Store size={28} className="text-[#00d66f]" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Explorar Lojas</span>
          </button>

          <button className="group bg-white text-[#0a2540] p-8 rounded-[40px] flex flex-col items-center justify-center gap-3 border-2 border-slate-100 hover:border-[#00d66f] transition-all active:scale-95 shadow-xl border-b-8 border-slate-100">
            <div className="bg-slate-50 p-4 rounded-[20px] group-hover:rotate-90 transition-transform duration-500">
              <Settings size={28} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Definições</span>
          </button>
        </div>

        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 ml-4">
            <Wallet className="text-[#00d66f]" size={20} strokeWidth={3} />
            <h4 className="text-[11px] font-black text-[#0a2540] uppercase tracking-[0.2em]">O Teu Saldo por Loja</h4>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-8 px-4 no-scrollbar -mx-4">
            {merchantBalances.length === 0 ? (
              <div className="w-full bg-white p-12 rounded-[40px] border-4 border-dashed border-slate-100 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Ainda não tens compras registadas.</p>
              </div>
            ) : (
              merchantBalances.map((m, idx) => (
                <div key={idx} className="min-w-[260px] bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-50 flex flex-col justify-between transition-all hover:border-[#00d66f]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate">{m.name}</p>
                    <h5 className="text-3xl font-black text-[#0a2540] tracking-tighter italic">{m.total.toFixed(2)}€</h5>
                  </div>
                  <div className="mt-6 pt-6 border-t-2 border-slate-50 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-[#00d66f] uppercase mb-1">Pronto</p>
                      <p className="text-xl font-black text-[#0a2540]">{m.available.toFixed(2)}€</p>
                    </div>
                    {m.pending > 0 && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-orange-400 mb-1">
                          <Clock size={10} strokeWidth={3} />
                          <p className="text-[9px] font-black uppercase">Espera</p>
                        </div>
                        <p className="font-black text-orange-500 text-sm italic">{m.pending.toFixed(2)}€</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 ml-4">
            <div className="flex items-center gap-3">
              <History size={20} strokeWidth={3} className="text-[#0a2540]" />
              <h4 className="text-[11px] font-black text-[#0a2540] uppercase tracking-[0.2em]">Atividade Recente</h4>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <select 
                  value={merchantFilter}
                  onChange={(e) => setMerchantFilter(e.target.value)}
                  className="bg-white border-2 border-slate-100 rounded-2xl pl-9 pr-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">Lojas</option>
                  {merchantBalances.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-white border-2 border-slate-100 rounded-2xl pl-9 pr-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">Sempre</option>
                  <option value="7d">7 Dias</option>
                  <option value="30d">30 Dias</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[48px] shadow-xl border-2 border-slate-100 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-slate-300 font-black text-[10px] uppercase italic tracking-[0.3em]">Sem movimentos registados</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-slate-50">
                {[...filteredTransactions].reverse().map((t) => (
                  <div key={t.id} className="p-8 flex justify-between items-center hover:bg-slate-50 transition-all group">
                    <div className="flex gap-5 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                        t.type === 'earn' ? 'bg-[#00d66f]/10 text-[#00d66f]' : 'bg-red-50 text-red-500'
                      }`}>
                        {t.type === 'earn' ? <ArrowUpRight size={24} strokeWidth={3} /> : <ArrowDownLeft size={24} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-black text-[#0a2540] text-sm uppercase tracking-tight mb-1">{t.merchantName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Clock size={10} /> {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black italic tracking-tighter ${t.type === 'earn' ? 'text-[#0a2540]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Cashback</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;