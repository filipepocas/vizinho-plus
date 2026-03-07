// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const [showScanner, setShowScanner] = useState(false);

  // Lógica do Scanner QR
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        setCardNumber(decodedText);
        setShowScanner(false);
        scanner.clear();
      }, (error) => { /* ignora erros de scan */ });
      return () => { scanner.clear(); };
    }
  }, [showScanner]);

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setActiveMerchant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
      setIsAuthorized(true);
    }
  };

  const checkBalance = () => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const balance = transactions
      .filter(t => t.clientId === cardNumber && new Date(t.createdAt) <= fortyEightHoursAgo)
      .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);
    setClientAvailableBalance(balance);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleAmount = parseFloat(amount);
    if (!cardNumber || isNaN(saleAmount) || saleAmount <= 0) return alert("Dados inválidos");

    let redeemAmount = (useCashback && clientAvailableBalance) ? Math.min(saleAmount, clientAvailableBalance) : 0;
    const finalPayable = saleAmount - redeemAmount;
    const earned = finalPayable * 0.10;

    try {
      if (redeemAmount > 0) {
        await addTransaction({ clientId: cardNumber, merchantId: activeMerchant.id, merchantName: activeMerchant.shopName, amount: 0, cashbackAmount: redeemAmount, type: 'redeem', status: 'available' });
      }
      await addTransaction({ clientId: cardNumber, merchantId: activeMerchant.id, merchantName: activeMerchant.shopName, amount: finalPayable, cashbackAmount: earned, type: 'earn', status: 'pending' });
      
      setMessage({ type: 'success', text: `Venda concluída! Pago: ${finalPayable.toFixed(2)}€` });
      setCardNumber(''); setAmount(''); setUseCashback(false); setClientAvailableBalance(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch { setMessage({ type: 'error', text: 'Erro na Cloud.' }); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] w-full max-w-md">
          <h1 className="text-2xl font-black uppercase mb-6 italic">Terminal V+</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input type="email" placeholder="EMAIL LOJISTA" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none focus:bg-gray-100" />
            <button className="w-full bg-black text-white p-4 font-black uppercase hover:bg-vplus-blue">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b-4 border-black pb-4">
          <h2 className="font-black uppercase italic">{activeMerchant?.shopName}</h2>
          <button onClick={() => setIsAuthorized(false)} className="bg-red-500 text-white px-2 py-1 font-black text-xs">SAIR</button>
        </header>

        {message.text && <div className={`p-4 font-black uppercase text-center border-4 border-black ${message.type === 'success' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}>{message.text}</div>}

        {showScanner ? (
          <div className="border-4 border-black p-4 bg-black">
            <div id="reader"></div>
            <button onClick={() => setShowScanner(false)} className="w-full bg-red-500 text-white p-2 mt-4 font-black uppercase">Cancelar Scanner</button>
          </div>
        ) : (
          <form onSubmit={handleSale} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic">Identificar Cliente</label>
              <div className="flex gap-2">
                <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="CARTÃO" className="flex-grow p-4 border-4 border-black text-xl font-black outline-none" />
                <button type="button" onClick={() => setShowScanner(true)} className="bg-vplus-green border-4 border-black px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">📷</button>
              </div>
              <button type="button" onClick={checkBalance} className="w-full bg-vplus-blue text-white p-2 font-black uppercase text-xs">Consultar Saldo</button>
              {clientAvailableBalance !== null && <p className="text-xs font-black">Disponível: <span className="text-vplus-green">{clientAvailableBalance.toFixed(2)}€</span></p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic">Valor Total (€)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 border-4 border-black text-4xl font-black outline-none focus:bg-vplus-green-light" />
            </div>

            {clientAvailableBalance! > 0 && (
              <div className="flex items-center gap-3 p-4 bg-gray-100 border-2 border-black">
                <input type="checkbox" checked={useCashback} onChange={e => setUseCashback(e.target.checked)} className="w-6 h-6 border-2 border-black" />
                <span className="text-[10px] font-black uppercase">Descontar Saldo</span>
              </div>
            )}

            <button className="w-full bg-black text-white p-6 text-xl font-black uppercase border-b-8 border-vplus-blue active:border-b-0 active:translate-y-2 transition-all">Confirmar</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;