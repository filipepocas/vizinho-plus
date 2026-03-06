// src/features/merchant/MerchantDashboard.tsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const MerchantDashboard: React.FC = () => {
  const { addTransaction, transactions } = useStore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [useCashback, setUseCashback] = useState(false);
  const [clientAvailableBalance, setClientAvailableBalance] = useState<number | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const merchantData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      setActiveMerchant(merchantData);
      setIsAuthorized(true);
    } else {
      alert('E-mail de lojista não encontrado!');
    }
  };

  const checkClientBalance = () => {
    if (!cardNumber) return;
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const balance = transactions
      .filter(t => t.clientId === cardNumber && new Date(t.createdAt) <= fortyEightHoursAgo)
      .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);
    
    setClientAvailableBalance(balance);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !amount) return;

    const saleAmount = parseFloat(amount);
    let cashbackToRedeem = 0;

    if (useCashback && clientAvailableBalance && clientAvailableBalance > 0) {
      cashbackToRedeem = Math.min(saleAmount, clientAvailableBalance);
    }

    const finalAmountToPay = saleAmount - cashbackToRedeem;
    const newCashbackEarned = finalAmountToPay * 0.10;

    try {
      // 1. Se usou cashback, regista a redenção
      if (cashbackToRedeem > 0) {
        await addTransaction({
          clientId: cardNumber,
          merchantId: activeMerchant.id,
          merchantName: activeMerchant.shopName,
          amount: 0,
          cashbackAmount: cashbackToRedeem,
          type: 'redeem',
          status: 'available'
        });
      }

      // 2. Regista o ganho sobre o valor restante pago
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.shopName,
        amount: finalAmountToPay,
        cashbackAmount: newCashbackEarned,
        type: 'earn',
        status: 'pending'
      });

      setMessage({ 
        type: 'success', 
        text: `Venda concluída! Pago: ${finalAmountToPay.toFixed(2)}€ | Desconto: ${cashbackToRedeem.toFixed(2)}€` 
      });
      
      setCardNumber('');
      setAmount('');
      setUseCashback(false);
      setClientAvailableBalance(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na transação.' });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 border-4 border-vplus-blue shadow-[10px_10px_0px_0px_rgba(28,48,92,1)] w-full max-w-md">
          <h1 className="text-2xl font-black text-vplus-blue uppercase mb-6">Terminal Lojista</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input type="email" placeholder="E-mail da Loja" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full p-4 border-2 border-vplus-blue font-bold outline-none" />
            <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-colors">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono">
      <header className="bg-vplus-blue text-white p-4 flex justify-between items-center border-b-4 border-black">
        <h2 className="font-black uppercase tracking-tighter">{activeMerchant?.shopName}</h2>
        <button onClick={() => setIsAuthorized(false)} className="text-[10px] bg-red-500 px-2 py-1 font-black">SAIR</button>
      </header>

      <main className="p-6 max-w-xl mx-auto">
        {message.text && (
          <div className={`p-4 mb-6 font-black uppercase text-center border-4 border-black ${message.type === 'success' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSale} className="space-y-6">
          <div>
            <label className="text-xs font-black uppercase block mb-1 text-vplus-blue">ID Cartão Cliente</label>
            <div className="flex gap-2">
              <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="000000" className="flex-grow p-4 border-4 border-vplus-blue text-2xl font-black outline-none" />
              <button type="button" onClick={checkClientBalance} className="bg-vplus-blue text-white px-4 font-black text-xs uppercase hover:bg-black">Validar</button>
            </div>
            {clientAvailableBalance !== null && (
              <p className="mt-2 text-sm font-black text-vplus-blue">Saldo Disponível: <span className="text-vplus-green bg-vplus-blue px-2">{clientAvailableBalance.toFixed(2)}€</span></p>
            )}
          </div>

          <div>
            <label className="text-xs font-black uppercase block mb-1 text-vplus-blue">Valor Total da Venda (€)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 border-4 border-vplus-blue text-4xl font-black outline-none bg-vplus-green-light" />
          </div>

          {clientAvailableBalance && clientAvailableBalance > 0 && (
            <div className="flex items-center gap-3 p-4 bg-gray-100 border-2 border-black">
              <input type="checkbox" id="useCashback" checked={useCashback} onChange={(e) => setUseCashback(e.target.checked)} className="w-6 h-6 border-2 border-black" />
              <label htmlFor="useCashback" className="text-xs font-black uppercase cursor-pointer">Descontar Saldo Disponível nesta compra</label>
            </div>
          )}

          <button className="w-full bg-vplus-blue text-white p-6 text-xl font-black uppercase border-b-8 border-black active:border-b-0 active:translate-y-2">Confirmar Transação</button>
        </form>
      </main>
    </div>
  );
};

export default MerchantDashboard;