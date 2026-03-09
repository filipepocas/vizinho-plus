import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react'; // Precisarás de: npm install qrcode.react

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();

  // Ativa a escuta de transações baseada no NIF do perfil logado
  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => unsubscribe();
    }
  }, [currentUser, subscribeToTransactions]);

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
        balances[merchantId].available -= amount;
      }
    });

    return Object.values(balances);
  };

  // Se não estiver logado via Firebase Auth, redireciona ou mostra erro (O App.tsx tratará disto, mas aqui fica a proteção)
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
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[40px] shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-start">
          <div>
            <p className="text-[#00d66f] font-bold text-xs uppercase tracking-widest mb-1">Olá, {currentUser.name}</p>
            <h2 className="text-3xl font-black tracking-tighter">NIF: {currentUser.nif}</h2>
            <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase">📍 {currentUser.freguesia}</p>
          </div>
          <button 
            onClick={() => logout()} 
            className="bg-white/10 p-3 rounded-xl hover:bg-red-500 transition-all text-xs font-bold uppercase"
          >
            Sair
          </button>
        </div>

        {/* ÁREA DO QR CODE - Fase 2 do Plano */}
        <div className="max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] flex justify-between items-center shadow-xl border-b-8 border-green-700">
            <div>
              <p className="text-sm font-bold uppercase opacity-70">Saldo Disponível</p>
              <h3 className="text-5xl font-black tracking-tighter">{totalAvailable.toFixed(2)}€</h3>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          
          <div className="bg-white p-4 rounded-[32px] flex flex-col items-center justify-center shadow-lg border-2 border-slate-100">
            <QRCodeSVG value={currentUser.nif} size={100} fgColor="#0a2540" />
            <p className="text-[9px] font-black text-[#0a2540] mt-2 uppercase tracking-widest">Meu QR Code</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Saldos por Loja</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {merchantBalances.map((m, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[28px] shadow-sm border-2 border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">🏪</span>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Na Loja</p>
                  <p className="text-xl font-black text-[#0a2540]">{m.available.toFixed(2)}€</p>
                </div>
              </div>
              <h5 className="font-bold text-[#0a2540] mb-1">{m.name}</h5>
              {m.pending > 0 && (
                <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full inline-block border border-orange-100">
                  ⌛ + {m.pending.toFixed(2)}€ pendentes
                </p>
              )}
            </div>
          ))}
        </div>

        <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest mb-4 ml-2">Últimos Movimentos</h4>
        <div className="bg-white rounded-[32px] shadow-sm border-2 border-slate-100 overflow-hidden">
          <div className="divide-y-2 divide-slate-50">
            {transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="p-5 flex justify-between items-center">
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