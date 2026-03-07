// src/features/client/ClientDashboard.tsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';

const ClientDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [cardNumber, setCardNumber] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  // 1. FILTRAR TRANSAÇÕES DO CLIENTE
  const userTransactions = transactions.filter(t => t.clientId === cardNumber);

  // 2. LOGICA MOLECULAR: AGRUPAR SALDO POR LOJA (PAG 1 DO PDF)
  const getBalancesByStore = () => {
    const stores: { [key: string]: { name: string, total: number, available: number } } = {};
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

    userTransactions.forEach(t => {
      if (!stores[t.merchantId]) {
        stores[t.merchantId] = { name: t.merchantName, total: 0, available: 0 };
      }

      const isAvailable = new Date(t.createdAt) <= fortyEightHoursAgo;

      if (t.type === 'earn') {
        stores[t.merchantId].total += t.cashbackAmount;
        if (isAvailable) {
          stores[t.merchantId].available += t.cashbackAmount;
        }
      } else if (t.type === 'redeem' || t.type === 'subtract') {
        // Regra do PDF: Retira primeiro do disponível, depois do total
        stores[t.merchantId].total -= t.cashbackAmount;
        stores[t.merchantId].available -= t.cashbackAmount;
      }
    });
    return stores;
  };

  const storeBalances = getBalancesByStore();
  const globalTotal = Object.values(storeBalances).reduce((acc, curr) => acc + curr.total, 0);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono text-black">
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0_0_rgba(163,230,53,1)] w-full max-w-md">
          <h1 className="text-4xl font-black uppercase italic mb-2">V+ CLIENTE</h1>
          <p className="text-[10px] font-bold uppercase mb-8 opacity-60">Aceda com o seu nº de cartão</p>
          <input 
            type="text" 
            placeholder="000 000 000" 
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full p-4 border-4 border-black font-black text-2xl text-center outline-none mb-6"
          />
          <button 
            onClick={() => cardNumber.length >= 3 && setIsLogged(true)}
            className="w-full bg-black text-white p-5 font-black uppercase text-xl border-b-8 border-vplus-green active:border-b-0 active:translate-y-2 transition-all"
          >
            Ver Meus Saldos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-black pb-10">
      {/* HEADER FIXO */}
      <header className="bg-white border-b-8 border-black p-6 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase">Meu <span className="text-vplus-green">Painel</span></h2>
          <button onClick={() => setIsLogged(false)} className="text-[10px] font-black uppercase underline">Sair</button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* CARTÃO QR */}
        <section className="bg-vplus-blue text-white p-6 border-8 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center">
          <div className="bg-white p-4 border-4 border-black mb-4">
            <QRCodeSVG value={cardNumber} size={140} />
          </div>
          <p className="text-2xl font-black tracking-widest">{cardNumber}</p>
          <div className="mt-4 bg-vplus-green text-black px-4 py-1 text-[10px] font-black uppercase">
            Saldo Total: {globalTotal.toFixed(2)}€
          </div>
        </section>

        {/* LISTAGEM POR LOJA (EXIGÊNCIA PDF PÁG 1) */}
        <section className="space-y-4">
          <h3 className="font-black uppercase italic border-b-4 border-black inline-block text-sm">Saldos por Estabelecimento</h3>
          
          {Object.keys(storeBalances).length === 0 ? (
            <div className="bg-white border-4 border-black p-8 text-center italic opacity-40 text-xs">
              Ainda não tem movimentos registados.
            </div>
          ) : (
            Object.entries(storeBalances).map(([id, data]) => (
              <div key={id} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black uppercase text-lg leading-none">{data.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-vplus-green-light border-2 border-black p-2">
                    <p className="text-[8px] font-black uppercase opacity-60">Disponível</p>
                    <p className="font-black text-xl">{data.available.toFixed(2)}€</p>
                  </div>
                  <div className="bg-gray-100 border-2 border-black p-2">
                    <p className="text-[8px] font-black uppercase opacity-60">Total Acumulado</p>
                    <p className="font-black text-xl">{data.total.toFixed(2)}€</p>
                  </div>
                </div>
                <p className="text-[7px] mt-2 font-bold uppercase opacity-40 italic">
                  * O saldo ganho hoje só fica disponível passadas 48h.
                </p>
              </div>
            ))
          )}
        </section>

        {/* HISTÓRICO DE MOVIMENTOS */}
        <section className="space-y-4">
          <h3 className="font-black uppercase italic border-b-4 border-black inline-block text-sm">Últimos Movimentos</h3>
          <div className="space-y-2">
            {userTransactions.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(t => (
              <div key={t.id} className="bg-white border-2 border-black p-3 flex justify-between items-center text-[10px]">
                <div>
                  <p className="font-black uppercase">{t.merchantName}</p>
                  <p className="opacity-50">{t.createdAt.toLocaleDateString()} - Doc: {t.docNumber || '---'}</p>
                </div>
                <p className={`font-black text-sm ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-600'}`}>
                  {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;