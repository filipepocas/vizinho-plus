// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const MerchantDashboard: React.FC = () => {
  const { addTransaction } = useStore();
  
  // Estados de Login da Loja
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);

  // Estados do Formulário de Venda
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Função para "Entrar" como Loja
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

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !amount) return;

    const saleAmount = parseFloat(amount);
    const cashbackGenerated = saleAmount * 0.10; // 10% Fixo

    try {
      // Gravamos diretamente com o ID da loja ativa
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.shopName,
        amount: saleAmount,
        cashbackAmount: cashbackGenerated,
        type: 'earn',
        status: 'pending'
      });

      setMessage({ type: 'success', text: `Venda de ${saleAmount}€ registada!` });
      setCardNumber('');
      setAmount('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao registar venda.' });
    }
  };

  // ECRÃ DE LOGIN DO LOJISTA
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6">
        <div className="bg-white p-8 border-4 border-vplus-blue shadow-[10px_10px_0px_0px_rgba(28,48,92,1)] w-full max-w-md">
          <h1 className="text-2xl font-black text-vplus-blue uppercase mb-6">Acesso Lojista</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="E-mail da Loja" 
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full p-4 border-2 border-vplus-blue font-bold outline-none"
            />
            <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-colors">
              Abrir Terminal de Vendas
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ECRÃ DE VENDAS (SÓ APARECE APÓS LOGIN)
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-vplus-blue text-white p-4 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase opacity-70">Loja Ativa</p>
          <h2 className="font-black uppercase">{activeMerchant?.shopName}</h2>
        </div>
        <button onClick={() => setIsAuthorized(false)} className="text-[10px] bg-red-500 px-2 py-1 font-bold">SAIR</button>
      </header>

      <main className="p-6 max-w-xl mx-auto">
        {message.text && (
          <div className={`p-4 mb-6 font-black uppercase text-center border-2 ${
            message.type === 'success' ? 'bg-vplus-green border-vplus-blue' : 'bg-red-500 text-white'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSale} className="space-y-8 mt-10">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase">Número do Cartão Vizinho+</label>
            <input 
              type="text" 
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Ex: 5601234567"
              className="w-full p-6 border-4 border-vplus-blue text-3xl font-mono focus:bg-vplus-blue-light outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase">Valor da Compra (€)</label>
            <input 
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-6 border-4 border-vplus-blue text-5xl font-black focus:bg-vplus-green-light outline-none"
            />
          </div>

          <button className="w-full bg-vplus-green text-vplus-blue p-8 text-2xl font-black uppercase border-b-8 border-vplus-blue active:border-b-0 active:translate-y-2 transition-all">
            GERAR CASHBACK
          </button>
        </form>
      </main>
    </div>
  );
};

export default MerchantDashboard;