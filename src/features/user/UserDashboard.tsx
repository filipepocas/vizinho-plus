// src/features/user/UserDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const [userCardNumber, setUserCardNumber] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Ativa a escuta de transações apenas para este cliente
  useEffect(() => {
    if (isLoggedIn && userCardNumber) {
      const unsubscribe = subscribeToTransactions('client', userCardNumber);
      return () => unsubscribe();
    }
  }, [isLoggedIn, userCardNumber, subscribeToTransactions]);

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userCardNumber.trim().length >= 4) {
      setIsLoggedIn(true);
    } else {
      alert("Insira um NIF ou Número de Cartão válido.");
    }
  };

  // Cálculo de Saldos por Loja (Lógica preservada e blindada)
  const getBalancesByMerchant = () => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const balances: { [key: string]: { name: string, available: number, pending: number } } = {};

    transactions.forEach(t => {
      const merchantId = t.merchantId || 'unknown';
      if (!balances[merchantId]) {
        balances[merchantId] = { name: t.merchantName || 'Loja Vizinha', available: 0, pending: 0 };
      }

      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const isAvailable = txTime <= fortyEightHoursAgo;
      const amount = t.cashbackAmount || 0;

      if (t.type === 'earn') {
        if (isAvailable) {
          balances[merchantId].available += amount;
        } else {
          balances[merchantId].pending += amount;
        }
      } else {
        // Reduções/Resgates retiram sempre do saldo disponível
        balances[merchantId].available -= amount;
      }
    });

    return Object.values(balances);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#00d66f] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center border-4 border-[#0a2540]">
          <h1 className="text-4xl font-black italic text-[#0a2540] mb-2">VIZINHO+</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Área do Cliente</p>
          
          <form onSubmit={handleUserLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold uppercase text-slate-400 ml-1">NIF ou Nº do Cartão</label>
              <input 
                type="text" 
                value={userCardNumber} 
                onChange={e => setUserCardNumber(e.target.value)} 
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-bold text-[#0a2540] outline-none focus:border-[#0a2540] transition-all"
                placeholder="000 000 000"
                required 
              />
            </div>
            <button className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-lg active:scale-95">
              VER MEU SALDO
            </button>
          </form>
          <p className="mt-6 text-xs text-slate-400 font-medium px-4">
            Consulte o seu cashback acumulado nas lojas aderentes da sua vizinhança.
          </p>
        </div>
      </div>
    );
  }

  const merchantBalances = getBalancesByMerchant();
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      {/* HEADER UTILIZADOR - Design Brutalista Mantido */}
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[40px] shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-start">
          <div>
            <p className="text-[#00d66f] font-bold text-xs uppercase tracking-widest mb-1">Bem-vindo, Vizinho</p>
            <h2 className="text-3xl font-black tracking-tighter">{userCardNumber}</h2>
          </div>
          <button onClick={() => logout()} className="bg-white/10 p-3 rounded-xl hover:bg-red-500 transition-all text-xs font-bold uppercase">Sair</button>
        </div>

        <div className="max-w-4xl mx-auto mt-10 bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] flex justify-between items-center shadow-xl shadow-green-900/20 border-b-8 border-green-700">
          <div>
            <p className="text-sm font-bold uppercase opacity-70">Saldo Total Disponível</p>
            <h3 className="text-5xl font-black tracking-tighter">{totalAvailable.toFixed(2)}€</h3>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 -mt-6">
        {/* CARDS POR LOJA */}
        <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Saldos por Estabelecimento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {merchantBalances.map((m, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[28px] shadow-sm border-2 border-slate-100 hover:border-[#00d66f] transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">🏪</span>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Disponível</p>
                  <p className="text-xl font-black text-[#0a2540]">{m.available.toFixed(2)}€</p>
                </div>
              </div>
              <h5 className="font-bold text-[#0a2540] mb-1">{m.name}</h5>
              {m.pending > 0 && (
                <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full inline-block border border-orange-100">
                  ⌛ + {m.pending.toFixed(2)}€ pendentes (48h)
                </p>
              )}
            </div>
          ))}
          {merchantBalances.length === 0 && (
            <div className="col-span-full bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center text-slate-400 font-bold italic">
              Ainda não tens movimentos registados na vizinhança.
            </div>
          )}
        </div>

        {/* ÚLTIMOS MOVIMENTOS */}
        <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Histórico Recente</h4>
        <div className="bg-white rounded-[32px] shadow-sm border-2 border-slate-100 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                    {t.type === 'earn' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-bold text-[#0a2540] text-sm">{t.merchantName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'A processar...'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                  </p>
                  <p className="text-[9px] text-slate-300 font-bold uppercase">{t.documentNumber}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;