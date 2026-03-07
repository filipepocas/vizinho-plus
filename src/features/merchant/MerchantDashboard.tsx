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

  // COR DINÂMICA: Se o lojista tiver cor, usa-a. Se não, usa o azul padrão.
  const brandColor = activeMerchant?.primaryColor || '#1C305C';

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        setCardNumber(decodedText);
        setShowScanner(false);
        scanner.clear();
      }, () => {});
      return () => { try { scanner.clear(); } catch(e) {} };
    }
  }, [showScanner]);

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setActiveMerchant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
      setIsAuthorized(true);
    } else {
      alert("Lojista não encontrado.");
    }
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const saleAmount = parseFloat(amount);
    if (!cardNumber || isNaN(saleAmount) || saleAmount <= 0) return;

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
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
          <h1 className="text-3xl font-black uppercase italic mb-6">Terminal Lojista</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input type="email" placeholder="EMAIL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" />
            <button className="w-full bg-black text-white p-4 font-black uppercase hover:bg-vplus-blue">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono p-6 border-[12px]" style={{ borderColor: brandColor }}>
      <div className="max-w-xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b-8 border-black pb-4">
          <h2 className="text-2xl font-black uppercase italic" style={{ color: brandColor }}>{activeMerchant?.shopName}</h2>
          <button onClick={() => setIsAuthorized(false)} className="bg-red-500 text-white px-3 py-1 font-black text-xs border-2 border-black uppercase">Sair</button>
        </header>

        {showScanner ? (
          <div className="border-8 border-black p-4 bg-black">
            <div id="reader"></div>
            <button onClick={() => setShowScanner(false)} className="w-full bg-red-500 text-white p-4 mt-4 font-black uppercase">Cancelar</button>
          </div>
        ) : (
          <form onSubmit={handleSale} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase italic">Cliente (Litura QR ou Manual)</label>
              <div className="flex gap-2">
                <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="000 000 000" className="flex-grow p-4 border-4 border-black text-2xl font-black outline-none focus:bg-gray-100" />
                <button type="button" onClick={() => setShowScanner(true)} className="bg-vplus-green border-4 border-black px-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-2xl">📷</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase italic">Valor da Venda (€)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-6 border-4 border-black text-5xl font-black outline-none" />
            </div>

            <button className="w-full text-white p-8 text-2xl font-black uppercase border-b-[10px] border-black active:border-b-0 active:translate-y-2 transition-all shadow-[0_10px_0_0_rgba(0,0,0,0.2)]" style={{ backgroundColor: brandColor }}>
              Registar Venda
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;