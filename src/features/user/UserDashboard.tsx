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

  // Lógica de alternância de vista para exploração de lojas
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
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <img src="/logo-vizinho.png" alt="Vizinho+" className="w-16 h-16 mx-auto mb-4 object-contain animate-pulse" />
          <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black text-white uppercase tracking-widest text-xs">A carregar o teu cartão...</p>
        </div>
      </div>
    );
  }

  const merchantBalances = getBalancesByMerchant();
  const totalBalance = merchantBalances.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      {/* HEADER BRUTALISTA COM LOGOTIPO REAL */}
      <header className="bg-[#0a2540] p-6 text-white rounded-b-[40px] shadow-2xl mb-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-[4px_4px_0px_#00d66f]">
              <img src="/logo-vizinho.png" alt="V+" className="h-8 w-8 object-contain" />
            </div>
            <h1 className="font-black italic text-2xl tracking-tighter uppercase">VIZINHO+</h1>
          </div>
          <button 
            onClick={() => logout()} 
            className="bg-white/10 hover:bg-red-500/20 text-[10px] font-black uppercase px-4 py-2 rounded-full border border-white/20 transition-all"
          >
            Sair [→]
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        
        {/* O CARTÃO VIZINHO+ (COM LOGOTIPO INTEGRADO) */}
        <div className="relative group max-w-md mx-auto mb-12">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#00d66f] to-blue-400 rounded-[45px] blur-xl opacity-20 group-hover:opacity-40 transition duration-700"></div>
          <div className="relative bg-white p-8 rounded-[40px] shadow-2xl border-b-8 border-[#00d66f] overflow-hidden transition-transform hover:scale-[1.02]">
            
            {/* MARCA DE ÁGUA DO LOGO NO CARTÃO */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
              <img src="/logo-vizinho.png" alt="" className="w-32 h-32 object-contain rotate-12" />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em]">Membro Oficial</p>
                <h2 className="text-2xl font-black text-[#0a2540] tracking-tight uppercase leading-none break-words max-w-[200px]">
                  {currentUser.name}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Saldo Total</p>
                <p className="text-3xl font-black text-[#0a2540] leading-none">{totalBalance.toFixed(2)}€</p>
                <div className="mt-2 bg-[#00d66f] px-3 py-1 rounded-lg inline-block shadow-sm">
                  <p className="text-[10px] font-black text-[#0a2540] uppercase leading-none">Pronto: {totalAvailable.toFixed(2)}€</p>
                </div>
              </div>
            </div>

            {/* BARCODE & QR CODE AREA */}
            <div className="bg-slate-50 p-6 rounded-[24px] border-2 border-slate-100 flex flex-col items-center gap-4 relative z-10">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Barcode 
                  value={currentUser.customerNumber || "0000000000"} 
                  width={1.5} 
                  height={50} 
                  displayValue={false}
                  lineColor="#0a2540"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Cliente</p>
                <p className="text-lg font-mono font-black tracking-[0.3em] text-[#0a2540]">
                  {currentUser.customerNumber?.match(/.{1,4}/g)?.join(' ') || "0000 0000 00"}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-end relative z-10">
              <div className="flex items-center gap-2">
                <img src="/logo-vizinho.png" alt="" className="h-5 w-5 grayscale opacity-50" />
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">NIF Registado</p>
                  <p className="text-sm font-black text-[#0a2540]">{currentUser.nif}</p>
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                 <QRCodeSVG value={currentUser.nif} size={40} />
              </div>
            </div>
          </div>
        </div>

        {/* ACÇÕES RÁPIDAS */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-12">
          <button 
            onClick={() => setView('merchants')}
            className="bg-[#0a2540] text-white p-6 rounded-[32px] flex flex-col items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95 group"
          >
            <span className="text-3xl group-hover:bounce transition-transform">🏪</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Explorar Lojas</span>
          </button>

          <button className="bg-white text-[#0a2540] p-6 rounded-[32px] flex flex-col items-center justify-center gap-2 border-4 border-slate-100 hover:border-[#00d66f] transition-all active:scale-95 group">
            <span className="text-3xl group-hover:rotate-12 transition-transform">⚙️</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Definições</span>
          </button>
        </div>

        {/* SALDOS POR LOJA */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4 ml-2">
            <div className="w-2 h-6 bg-[#00d66f] rounded-full"></div>
            <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Carteira por Estabelecimento</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
            {merchantBalances.length === 0 ? (
              <div className="w-full bg-white p-8 rounded-[32px] border-4 border-dashed border-slate-100 text-center">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Ainda sem cashback aqui.</p>
              </div>
            ) : (
              merchantBalances.map((m, idx) => (
                <div key={idx} className="min-w-[240px] bg-white p-6 rounded-[32px] shadow-lg border-2 border-slate-50 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tight truncate">{m.name}</p>
                    <h5 className="text-2xl font-black text-[#0a2540]">{m.total.toFixed(2)}€</h5>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-[#00d66f] uppercase">Disponível</p>
                      <p className="font-black text-[#0a2540]">{m.available.toFixed(2)}€</p>
                    </div>
                    {m.pending > 0 && (
                      <div className="text-right">
                        <p className="text-[9px] font-black text-orange-400 uppercase">Pendente</p>
                        <p className="font-black text-orange-500 text-sm italic">{m.pending.toFixed(2)}€</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HISTÓRICO COM FILTROS */}
        <div className="space-y-4 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ml-2">
            <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest flex items-center gap-2">
               Últimos Movimentos
            </h4>
            
            <div className="flex gap-2">
              <select 
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] cursor-pointer"
              >
                <option value="all">Todas as Lojas</option>
                {merchantBalances.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>

              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] cursor-pointer"
              >
                <option value="all">Sempre</option>
                <option value="7d">7 Dias</option>
                <option value="30d">30 Dias</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border-2 border-slate-100 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-slate-300 font-black text-xs uppercase italic tracking-widest text-center">Nenhum registo</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-slate-50">
                {[...filteredTransactions].reverse().map((t) => (
                  <div key={t.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${t.type === 'earn' ? 'bg-[#00d66f]/10 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-black text-[#0a2540] text-sm uppercase tracking-tight">{t.merchantName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${t.type === 'earn' ? 'text-[#0a2540]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Cashback</p>
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