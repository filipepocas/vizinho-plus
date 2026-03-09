import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import MerchantExplore from './MerchantExplore';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  // Estados para Navegação e Filtros
  const [view, setView] = useState<'home' | 'merchants'>('home');
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); 

  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToTransactions]);

  // Lógica de alternância de vista
  if (view === 'merchants') {
    return <MerchantExplore onBack={() => setView('home')} />;
  }

  // Cálculo de Saldos com a regra das 48h e prioridade de débito
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
        // Regra de Débito: Retira primeiro do disponível, o resto do pendente
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

  // Lógica de Filtragem de Transações
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
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 text-center">
        <p className="font-bold text-slate-400 uppercase tracking-widest">A carregar o seu cartão...</p>
      </div>
    );
  }

  const merchantBalances = getBalancesByMerchant();
  const totalBalance = merchantBalances.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      {/* HEADER COM LOGO E SAIR */}
      <header className="p-6 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0a2540] rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm italic">V+</span>
          </div>
          <span className="font-black text-[#0a2540] tracking-tighter">VIZINHO+</span>
        </div>
        <button 
          onClick={() => logout()} 
          className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors"
        >
          Sair [→
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        
        {/* O CARTÃO DESENHADO */}
        <div className="relative group max-w-md mx-auto mb-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d66f] to-blue-500 rounded-[35px] blur opacity-20 transition duration-1000 group-hover:opacity-40"></div>
          <div className="relative bg-white p-8 rounded-[32px] shadow-2xl border border-slate-50 overflow-hidden">
            
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-[0.2em]">Cartão Vizinho+</p>
                <h2 className="text-xl font-black text-[#0a2540] tracking-tight uppercase leading-none">
                  {currentUser.name}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase">Saldo Total</p>
                <p className="text-2xl font-black text-[#0a2540] leading-none">{totalBalance.toFixed(2)}€</p>
                <div className="mt-1 bg-[#00d66f]/10 px-2 py-0.5 rounded-md inline-block">
                  <p className="text-[8px] font-black text-[#00d66f] uppercase leading-none">Disponível: {totalAvailable.toFixed(2)}€</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <Barcode 
                value={currentUser.customerNumber || "0000000000"} 
                width={1.6} 
                height={60} 
                displayValue={false}
                background="transparent"
                lineColor="#0a2540"
              />
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Cliente</p>
                <p className="text-xl font-mono font-black tracking-[0.25em] text-[#0a2540]">
                  {currentUser.customerNumber?.match(/.{1,4}/g)?.join(' ') || "0000 0000 00"}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-end">
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">NIF Registado</p>
                <p className="text-xs font-black text-[#0a2540]">{currentUser.nif}</p>
              </div>
              <div className="opacity-10">
                 <QRCodeSVG value={currentUser.nif} size={35} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTÕES DE ACESSO */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-12">
          <button 
            onClick={() => setView('merchants')}
            className="bg-[#0a2540] text-white p-6 rounded-[28px] flex flex-col items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-blue-900/10 group active:scale-95"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🏪</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Lojas Aderentes</span>
          </button>

          <button className="bg-white text-[#0a2540] p-6 rounded-[28px] flex flex-col items-center justify-center gap-2 border-2 border-slate-100 hover:border-[#00d66f] transition-all group active:scale-95">
            <span className="text-2xl group-hover:scale-110 transition-transform">👤</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Meu Perfil</span>
          </button>
        </div>

        {/* SALDOS POR LOJA */}
        <div className="mb-10">
          <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Saldos por Loja</h4>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {merchantBalances.map((m, idx) => (
              <div key={idx} className="min-w-[220px] bg-white p-6 rounded-[28px] shadow-sm border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{m.name}</p>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-[#0a2540]">{m.total.toFixed(2)}€</span>
                  <span className="text-[9px] font-bold text-[#00d66f] uppercase tracking-tighter">Disponível: {m.available.toFixed(2)}€</span>
                </div>
                {m.pending > 0 && (
                  <p className="text-[9px] font-bold text-orange-500 uppercase mt-2">⌛ {m.pending.toFixed(2)}€ a libertar</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* HISTÓRICO COM FILTROS */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
            <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Movimentos Detalhados</h4>
            
            <div className="flex gap-2">
              <select 
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:border-[#00d66f]"
              >
                <option value="all">Todas as Lojas</option>
                {merchantBalances.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>

              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:border-[#00d66f]"
              >
                <option value="all">Todo o histórico</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border-2 border-slate-100 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-300 font-bold text-xs uppercase italic">Sem registos encontrados</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-slate-50">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'earn' ? '↑' : '↓'}
                      </div>
                      <div>
                        <p className="font-bold text-[#0a2540] text-sm">{t.merchantName}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">
                          {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('pt-PT') : 'A processar...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
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