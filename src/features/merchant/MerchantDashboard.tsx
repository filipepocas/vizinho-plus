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
      setActiveMerchant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
      setIsAuthorized(true);
    } else {
      alert('E-mail não autorizado.');
    }
  };

  // MÁSCARA MOLECULAR: Apenas números e limite de 10 caracteres
  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCardNumber(val);
    setClientAvailableBalance(null); // Reset ao mudar cartão
  };

  const checkClientBalance = () => {
    if (cardNumber.length < 10) {
      alert("O número do cartão deve ter 10 dígitos.");
      return;
    }
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const balance = transactions
      .filter(t => t.clientId === cardNumber && new Date(t.createdAt) <= fortyEightHoursAgo)
      .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);
    
    setClientAvailableBalance(balance);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleAmount = parseFloat(amount);

    // Validação de Segurança
    if (cardNumber.length < 10) return alert("Cartão inválido.");
    if (isNaN(saleAmount) || saleAmount <= 0) return alert("Valor de venda inválido.");

    let cashbackToRedeem = 0;
    if (useCashback && clientAvailableBalance && clientAvailableBalance > 0) {
      cashbackToRedeem = Math.min(saleAmount, clientAvailableBalance);
    }

    const finalAmountToPay = saleAmount - cashbackToRedeem;
    const newCashbackEarned = finalAmountToPay * 0.10;

    try {
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

      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.shopName,
        amount: finalAmountToPay,
        cashbackAmount: newCashbackEarned,
        type: 'earn',
        status: 'pending'
      });

      setMessage({ type: 'success', text: `Venda Registada! Pago: ${finalAmountToPay.toFixed(2)}€` });
      setCardNumber(''); setAmount(''); setUseCashback(false); setClientAvailableBalance(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro na Cloud. Verifique a internet.' });
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6">
        <div className="bg-white p-8 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
          <h1 className="text-2xl font-black uppercase mb-6 italic">Terminal V+</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4 font-mono">
            <input type="email" placeholder="E-MAIL LOJISTA" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" />
            <button className="w-full bg-black text-white p-4 font-black uppercase hover:bg-vplus-blue">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono">
      <header className="bg-black text-white p-4 flex justify-between items-center">
        <h2 className="font-black uppercase italic">{activeMerchant?.shopName}</h2>
        <button onClick={() => setIsAuthorized(false)} className="bg-red-500 px-3 py-1 font-black text-xs">SAIR</button>
      </header>

      <main className="p-6 max-w-xl mx-auto">
        {message.text && (
          <div className={`p-4 mb-6 font-black uppercase text-center border-4 border-black ${message.type === 'success' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSale} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase">Nº Cartão (10 dígitos)</label>
            <div className="flex gap-2">
              <input type="text" value={cardNumber} onChange={handleCardInput} placeholder="0000000000" className="flex-grow p-4 border-4 border-black text-2xl font-black outline-none bg-gray-50" />
              <button type="button" onClick={checkClientBalance} className="bg-vplus-blue text-white px-4 font-black text-xs uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Validar</button>
            </div>
            {clientAvailableBalance !== null && (
              <div className="p-2 bg-vplus-blue text-white text-xs font-black inline-block uppercase italic">
                Saldo: {clientAvailableBalance.toFixed(2)}€
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase">Valor da Venda</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full p-6 border-4 border-black text-5xl font-black outline-none focus:bg-vplus-green-light transition-colors" />
          </div>

          {clientAvailableBalance && clientAvailableBalance > 0 && (
            <div className="flex items-center gap-3 p-4 bg-vplus-green-light border-4 border-black">
              <input type="checkbox" id="useCashback" checked={useCashback} onChange={(e) => setUseCashback(e.target.checked)} className="w-6 h-6 border-4 border-black" />
              <label htmlFor="useCashback" className="text-xs font-black uppercase">Descontar Saldo Disponível</label>
            </div>
          )}

          <button className="w-full bg-vplus-green text-black p-8 text-2xl font-black uppercase border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
            Concluir Venda
          </button>
        </form>
      </main>
    </div>
  );
};

export default MerchantDashboard;