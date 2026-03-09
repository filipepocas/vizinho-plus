import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  // Estados para Filtros
  const [merchantFilter, setMerchantFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, 7d, 30d, 90d

  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToTransactions]);

  // Cálculo de Saldos com a regra das 48h
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
        balances[merchantId].available -= amount;
        balances[merchantId].total -= amount;
      }
    });

    return Object.values(balances);
  };

  // Lógica de Filtragem de Transações
  const filteredTransactions = transactions.filter(t => {
    // Filtro por Loja
    const matchMerchant = merchantFilter === 'all' || t.merchantId === merchantFilter;
    
    // Filtro por Data
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
        <p className="font-bold text-slate-400 uppercase tracking-widest">A carregar perfil do vizinho...</p>
      </div>
    );
  }

  const merchantBalances = getBalancesByMerchant();
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      {/* HEADER & CARTÃO VIRTUAL */}
      <header className="bg-[#0a2540] text-white p-6 md:p-10 rounded-b-[50px] shadow-2xl">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-black italic tracking-tighter">VIZINHO+</h1>
            <button 
              onClick={() => logout()} 
              className="bg-red-500/10 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Sair
            </button>
          </div>

          {/* O CARTÃO DESENHADO */}
          <div className="relative group max-w-md mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00d66f] to-blue-500 rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white text-[#0a2540] p-8 rounded-[30px] shadow-2xl overflow-hidden">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Cartão de Vizinho</p>
                  <h2 className="text-xl font-black tracking-tight uppercase">{currentUser.name}</h2>
                </div>
                <div className="bg-[#0a2540] text-white p-2 rounded-lg text-xs font-black">V+</div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl w-full flex justify-center border border-slate-100">
                  <Barcode 
                    value={currentUser.customerNumber || "0000000000"} 
                    width={1.5} 
                    height={50} 
                    displayValue={false}
                    background="transparent"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Número de Cliente</p>
                  <p className="text-2xl font-mono font-black tracking-[0.2em]">
                    {currentUser.customerNumber?.match(/.{1,4}/g)?.join(' ') || "0000 0000 00"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE ACESSO RÁPIDO */}
          <div className="flex justify-center gap-3 mt-10">
            <button className="bg-[#00d66f] text-[#0a2540] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20">
              Movimentos
            </button>
            <button className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20">
              Lojas
            </button>
            <button className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20">
              O meu Perfil
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 -mt-8">
        {/* RESUMO DE SALDO */}
        <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 flex justify-between items-center mb-10">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Total Disponível</p>
              <p className="text-4xl font-black text-[#0a2540]">{totalAvailable.toFixed(2)}€</p>
           </div>
           <div className="bg-green-50 p-4 rounded-2xl">
              <QRCodeSVG value={currentUser.nif} size={40} />
           </div>
        </div>

        {/* DETALHE POR LOJA */}
        <div className="mb-10">
          <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Carteira por Loja</h4>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {merchantBalances.map((m, idx) => (
              <div key={idx} className="min-w-[240px] bg-white p-6 rounded-[28px] shadow-sm border-2 border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{m.name}</p>
                <p className="text-xl font-black text-[#0a2540] mb-3">{m.available.toFixed(2)}€</p>
                {m.pending > 0 && (
                  <p className="text-[9px] font-bold text-orange-500 uppercase italic">+{m.pending.toFixed(2)}€ em validação</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* HISTÓRICO COM FILTROS */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
            <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Histórico Detalhado</h4>
            
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
                <option value="all">Todo o tempo</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border-2 border-slate-50 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-300 font-bold text-xs uppercase italic">Sem movimentos para estes filtros</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-slate-50">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}
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
                        {(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
                      <p className="text-[8px] font-bold text-slate-300 uppercase italic">{t.type === 'earn' ? 'Ganho' : 'Utilizado'}</p>
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