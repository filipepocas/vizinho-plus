// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { addTransaction } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DA OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [opCode, setOpCode] = useState(''); // PIN de 5 dígitos
  const [showScanner, setShowScanner] = useState(false);

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpCode, setNewOpCode] = useState('');
  const [showOpManager, setShowOpManager] = useState(false);

  const brandColor = activeMerchant?.primaryColor || '#1C305C';

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => { setCardNumber(text); setShowScanner(false); scanner.clear(); }, () => {});
      return () => { try { scanner.clear(); } catch(e) {} };
    }
  }, [showScanner]);

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setActiveMerchant({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setIsAuthorized(true);
    } else { alert("Lojista não registado pelo Admin."); }
  };

  const handleAddOperator = async () => {
    if (newOpCode.length !== 5) return alert("O código deve ter 5 dígitos.");
    const newOp = { id: Date.now().toString(), name: newOpName, code: newOpCode };
    const merchantRef = doc(db, 'merchants', activeMerchant.id);
    await updateDoc(merchantRef, { operators: arrayUnion(newOp) });
    setActiveMerchant({ ...activeMerchant, operators: [...(activeMerchant.operators || []), newOp] });
    setNewOpName(''); setNewOpCode('');
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !docNumber) return alert("Preencha Cartão, Valor e Documento.");
    
    // VALIDAR OPERADOR
    const operator = activeMerchant.operators?.find((o: any) => o.code === opCode);
    if (!operator) return alert("Código de Operador Inválido!");

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
      setMessage({ type: 'success', text: "Operação Registada!" });
      setAmount(''); setDocNumber(''); setOpCode('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch { setMessage({ type: 'error', text: "Erro na Cloud." }); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0_0_rgba(0,0,0,1)] w-full max-w-md">
          <h1 className="text-3xl font-black uppercase italic mb-6">Acesso Lojista</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <input type="email" placeholder="EMAIL PROFISSIONAL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" required />
            <button className="w-full bg-black text-white p-4 font-black uppercase hover:bg-vplus-blue transition-all">Entrar no Terminal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono p-4 lg:p-8 border-[12px]" style={{ borderColor: brandColor }}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER LOJA */}
        <header className="flex justify-between items-center border-b-8 border-black pb-4">
          <div>
            <h2 className="text-3xl font-black uppercase italic" style={{ color: brandColor }}>{activeMerchant.shopName}</h2>
            <p className="text-[10px] font-bold opacity-50 uppercase">NIF: {activeMerchant.nif} | {activeMerchant.cashbackPercent}% Cashback</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowOpManager(!showOpManager)} className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-black">Operadores</button>
            <button onClick={() => setIsAuthorized(false)} className="bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-black">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-gray-100 border-4 border-black p-6 space-y-4">
            <h3 className="font-black uppercase">Gestão de Equipa</h3>
            <div className="flex gap-2">
              <input placeholder="NOME" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="flex-grow p-2 border-2 border-black font-black uppercase text-xs" />
              <input placeholder="PIN (5 DIG)" value={newOpCode} onChange={e => setNewOpCode(e.target.value)} maxLength={5} className="w-24 p-2 border-2 border-black font-black text-xs" />
              <button onClick={handleAddOperator} className="bg-vplus-green border-2 border-black px-4 font-black text-xs uppercase">Adicionar</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="bg-white border-2 border-black p-2 text-[10px] font-bold">
                  {op.name} <span className="float-right opacity-40">PIN: {op.code}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FORMULÁRIO DE PICAÇÃO */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase italic">Identificar Cliente</label>
                <div className="flex gap-2">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="Nº CARTÃO / NIF / TELEM" className="flex-grow p-4 border-4 border-black text-xl font-black outline-none focus:bg-gray-100" />
                  <button onClick={() => setShowScanner(true)} className="bg-vplus-green border-4 border-black px-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">📷</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase italic">Valor (€)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 border-4 border-black text-2xl font-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase italic">Documento (FAT/NC)</label>
                  <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="Nº DOC" className="w-full p-4 border-4 border-black text-2xl font-black outline-none uppercase" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase italic text-red-600">PIN Operador (5 Dígitos)</label>
                <input type="password" value={opCode} onChange={e => setOpCode(e.target.value)} maxLength={5} placeholder="*****" className="w-full p-4 border-4 border-red-600 text-2xl font-black outline-none text-center tracking-[1em]" />
              </div>
            </div>

            {/* BOTÕES DE ACÇÃO (PÁGINA 5 DO PDF) */}
            <div className="flex flex-col gap-4 justify-center">
              <button onClick={() => processAction('earn')} className="bg-vplus-green p-6 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] font-black uppercase text-xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                (+) Adicionar Cashback
              </button>
              <button onClick={() => processAction('subtract')} className="bg-yellow-400 p-6 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] font-black uppercase text-xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                (-) Nota de Crédito
              </button>
              <button onClick={() => processAction('redeem')} className="bg-black text-white p-6 border-4 border-black shadow-[8px_8px_0_0_rgba(163,230,53,1)] font-black uppercase text-xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                ($) Descontar Saldo
              </button>
              {message.text && (
                <div className={`p-4 border-4 border-black font-black uppercase text-center ${message.type === 'success' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        )}

        {showScanner && <div className="fixed inset-0 bg-black z-50 p-4"><div id="reader"></div><button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-4 font-black mt-4 uppercase">Fechar Scanner</button></div>}
      </div>
    </div>
  );
};

export default MerchantDashboard;