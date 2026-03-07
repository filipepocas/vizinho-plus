// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { transactions, addTransaction } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DA OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [opCode, setOpCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showOpManager, setShowOpManager] = useState(false);

  const brandColor = activeMerchant?.primaryColor || '#1C305C';

  // LOGIN DO LOJISTA
  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setActiveMerchant({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setIsAuthorized(true);
    } else { alert("Lojista não registado."); }
  };

  // FUNÇÃO AUXILIAR: CALCULAR SALDO DISPONÍVEL DO CLIENTE NESTA LOJA
  const getClientAvailableBalance = (id: string) => {
    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));
    return transactions
      .filter(t => t.clientId === id && t.merchantId === activeMerchant.id)
      .reduce((acc, t) => {
        const isAvailable = new Date(t.createdAt) <= fortyEightHoursAgo;
        if (t.type === 'earn') {
          return isAvailable ? acc + t.cashbackAmount : acc;
        } else {
          return acc - t.cashbackAmount;
        }
      }, 0);
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !docNumber) return alert("Dados incompletos.");
    
    // 1. VALIDAR OPERADOR
    const operator = activeMerchant.operators?.find((o: any) => o.code === opCode);
    if (!operator) return alert("PIN de Operador incorreto!");

    // 2. VALIDAR SALDO PARA DESCONTO (PAG 5 DO PDF)
    if (type === 'redeem') {
      const available = getClientAvailableBalance(cardNumber);
      if (val > available) {
        return alert(`Saldo Insuficiente! Disponível nesta loja: ${available.toFixed(2)}€`);
      }
    }

    // 3. CALCULAR CASHBACK (Se for 'earn' usa o % da loja, se for 'redeem/subtract' usa o valor direto)
    const cashback = type === 'earn' ? (val * (activeMerchant.cashbackPercent / 100)) : val;

    try {
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.shopName,
        amount: type === 'earn' ? val : 0,
        cashbackAmount: cashback,
        type: type,
        docNumber: docNumber,
        operatorId: operator.id,
        operatorName: operator.name,
        status: type === 'earn' ? 'pending' : 'available',
        createdAt: new Date()
      });
      
      setMessage({ type: 'success', text: "Operação Finalizada!" });
      setAmount(''); setDocNumber(''); setOpCode('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch {
      setMessage({ type: 'error', text: "Erro na gravação." });
    }
  };

  // ... (Resto do componente UI mantendo a estrutura brutalista e gestão de operadores anterior)
  // [Abaixo segue a parte visual para garantir o código completo]

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0_0_rgba(0,0,0,1)] w-full max-w-md">
          <h1 className="text-3xl font-black uppercase mb-6 italic text-center">Terminal V+</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input type="email" placeholder="E-MAIL DO ESTABELECIMENTO" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" required />
            <button className="w-full bg-black text-white p-4 font-black uppercase">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono p-4 border-[12px]" style={{ borderColor: brandColor }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b-8 border-black pb-4">
          <div>
            <h2 className="text-2xl font-black uppercase italic" style={{ color: brandColor }}>{activeMerchant.shopName}</h2>
            <p className="text-[10px] font-bold opacity-50">TAXA: {activeMerchant.cashbackPercent}% | NIF: {activeMerchant.nif}</p>
          </div>
          <button onClick={() => setShowOpManager(!showOpManager)} className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">Operadores</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Nº CARTÃO / NIF CLIENTE" className="w-full p-4 border-4 border-black text-xl font-black outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="VALOR €" className="w-full p-4 border-4 border-black text-xl font-black outline-none" />
              <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="Nº DOCUMENTO" className="w-full p-4 border-4 border-black text-xl font-black outline-none uppercase" />
            </div>
            <input type="password" value={opCode} onChange={e => setOpCode(e.target.value)} maxLength={5} placeholder="PIN OPERADOR" className="w-full p-4 border-4 border-red-600 text-xl font-black text-center tracking-widest outline-none" />
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => processAction('earn')} className="flex-1 bg-vplus-green p-4 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-black uppercase text-lg">
              (+) Adicionar Cashback
            </button>
            <button onClick={() => processAction('subtract')} className="flex-1 bg-yellow-400 p-4 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-black uppercase text-lg">
              (-) Nota de Crédito
            </button>
            <button onClick={() => processAction('redeem')} className="flex-1 bg-black text-white p-4 border-4 border-black shadow-[4px_4px_0_0_rgba(163,230,53,1)] font-black uppercase text-lg">
              ($) Descontar Saldo
            </button>
          </div>
        </div>
        {message.text && <div className={`p-4 border-4 border-black font-black uppercase text-center ${message.type === 'success' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}>{message.text}</div>}
      </div>
    </div>
  );
};

export default MerchantDashboard;