import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { transactions, addTransaction, subscribeToTransactions } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DA OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [opCode, setOpCode] = useState(''); 
  const [showScanner, setShowScanner] = useState(false);

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpCode, setNewOpCode] = useState('');
  const [showOpManager, setShowOpManager] = useState(false);

  useEffect(() => {
    if (isAuthorized && activeMerchant) {
      // Subscrição usa a coleção 'transactions' conforme a estrutura do Firebase
      const unsubscribe = subscribeToTransactions('merchant', activeMerchant.id);
      return () => unsubscribe();
    }
  }, [isAuthorized, activeMerchant, subscribeToTransactions]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text) => {
          setCardNumber(text);
          setShowScanner(false);
          scanner.clear();
        },
        () => { /* ignora erros de leitura */ }
      );
      return () => {
        try { scanner.clear(); } catch (e) { console.error(e); }
      };
    }
  }, [showScanner]);

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Procura na coleção 'merchants' pelo email exato que está no Firebase
      const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        // Mapeia shopName para garantir que o nome aparece no Dashboard
        setActiveMerchant({ 
          id: snap.docs[0].id, 
          ...data,
          displayName: data.shopName || data.name || 'Lojista' 
        });
        setIsAuthorized(true);
      } else {
        alert("Lojista não registado. Verifique o email padaria@vizinho.pt");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao aceder ao Firebase.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOperator = async () => {
    if (newOpCode.length !== 5) return alert("O PIN deve ter 5 dígitos.");
    if (!newOpName) return alert("Insira o nome do operador.");

    const newOp = {
      id: Math.random().toString(36).substr(2, 9),
      name: newOpName,
      code: newOpCode
    };

    try {
      // Atualiza o documento na coleção 'merchants'
      const merchantRef = doc(db, 'merchants', activeMerchant.id);
      await updateDoc(merchantRef, { operators: arrayUnion(newOp) });
      
      setActiveMerchant({
        ...activeMerchant,
        operators: [...(activeMerchant.operators || []), newOp]
      });
      
      setNewOpName('');
      setNewOpCode('');
      setMessage({ type: 'success', text: "Operador pronto para faturar!" });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      alert("Erro ao guardar operador no Firebase.");
    }
  };

  const getClientAvailableBalance = (clientId: string) => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    return transactions
      .filter(t => t.clientId === clientId && t.merchantId === activeMerchant.id)
      .reduce((acc, t) => {
        const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
        const isAvailable = txTime <= fortyEightHoursAgo;
        
        if (t.type === 'earn') {
          return isAvailable ? acc + (t.cashbackAmount || 0) : acc;
        } else {
          return acc - (t.cashbackAmount || 0);
        }
      }, 0);
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber || opCode.length !== 5) {
      return alert("Preencha todos os campos obrigatórios.");
    }
    
    const operator = activeMerchant.operators?.find((o: any) => o.code === opCode);
    if (!operator) return alert("PIN de Operador Inválido!");

    if (type === 'redeem') {
      const available = getClientAvailableBalance(cardNumber);
      if (val > available) {
        return alert(`Saldo insuficiente! Disponível: ${available.toFixed(2)}€`);
      }
    }

    const cashback = type === 'earn' ? (val * (activeMerchant.cashbackPercent / 100)) : val;

    try {
      setIsLoading(true);
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.displayName, // Usa o shopName capturado no login
        amount: type === 'earn' ? val : 0,
        cashbackAmount: cashback,
        type: type,
        documentNumber: documentNumber,
        operatorCode: opCode,
        status: type === 'earn' ? 'pending' : 'available'
      });
      
      setMessage({ type: 'success', text: "Transação enviada para o Vizinho!" });
      setAmount('');
      setDocumentNumber('');
      setOpCode('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: "Erro ao gravar transação." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[32px] shadow-xl w-full max-w-md border border-slate-100 text-center">
          <h1 className="text-3xl font-black italic text-[#0a2540] mb-2">VIZINHO+</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Terminal de Lojista</p>
          <form onSubmit={handleMerchantLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 ml-1">Email da Loja</label>
              <input 
                type="email" 
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]"
                placeholder="ex: padaria@vizinho.pt"
                required 
              />
            </div>
            <button className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-bold hover:bg-[#153455] shadow-lg">
              {isLoading ? 'A verificar...' : 'Abrir Terminal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        
        <header className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00d66f]/10 rounded-xl flex items-center justify-center text-[#00d66f] text-2xl">🏪</div>
            <div>
              <h2 className="text-xl font-bold text-[#0a2540] leading-none">{activeMerchant.displayName}</h2>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">NIF {activeMerchant.nif}</span>
                <span className="text-[10px] font-bold bg-[#00d66f]/10 px-2 py-0.5 rounded text-[#00d66f] uppercase">{activeMerchant.cashbackPercent}% Cashback</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowOpManager(!showOpManager)} className="px-5 py-2.5 rounded-xl bg-slate-50 text-[#0a2540] text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all">
              {showOpManager ? 'Voltar' : 'Gerir Equipa'}
            </button>
            <button onClick={() => setIsAuthorized(false)} className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-[#0a2540] mb-6 flex items-center gap-2">Configurar Operadores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <input placeholder="NOME" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
              <input placeholder="PIN (5 DÍGITOS)" value={newOpCode} onChange={e => setNewOpCode(e.target.value)} maxLength={5} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-bold" />
              <button onClick={handleAddOperator} className="bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-bold hover:bg-[#00c265]">Adicionar Operador</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl">
                  <p className="font-bold text-[#0a2540] text-sm uppercase">{op.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest">PIN: {op.code}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block text-center">1. Identificar Cliente (NIF ou Cartão)</label>
                <div className="flex gap-3">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="NIF ou Nº Cartão" className="flex-grow p-5 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold text-[#0a2540] outline-none" />
                  <button onClick={() => setShowScanner(true)} className="bg-[#0a2540] p-5 rounded-2xl text-white hover:bg-[#153455]"><span className="text-2xl">📷</span></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">2. Valor da Venda (€)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold text-[#0a2540] outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">3. Nº Fatura</label>
                  <input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Ex: FT 101" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold text-[#0a2540] outline-none uppercase" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 text-center">
                <label className="text-xs font-bold uppercase text-red-500 tracking-wider block mb-3">4. Autorização (PIN Operador)</label>
                <input type="password" value={opCode} onChange={e => setOpCode(e.target.value)} maxLength={5} placeholder="•••••" className="w-full max-w-xs mx-auto p-5 bg-red-50/30 border border-red-100 rounded-2xl text-3xl text-center font-bold tracking-[0.5em]" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={() => processAction('earn')} className="group bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-lg flex flex-col items-center gap-2">
                <span className="text-4xl">💰</span>
                <span className="font-bold text-lg text-center">Atribuir Cashback</span>
              </button>
              <button onClick={() => processAction('redeem')} className="bg-[#0a2540] p-8 rounded-[32px] text-white transition-all hover:bg-[#153455] shadow-lg flex flex-col items-center gap-2">
                <span className="text-4xl">🎁</span>
                <span className="font-bold text-lg text-center">Descontar Saldo</span>
              </button>
              {message.text && (
                <div className={`mt-4 p-5 rounded-2xl font-bold text-center ${message.type === 'success' ? 'bg-[#00d66f]/20 text-[#0a2540]' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/90 backdrop-blur-md z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-[40px] shadow-2xl w-full max-w-lg relative">
              <div id="reader" className="w-full"></div>
              <button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-5 font-bold mt-4 rounded-2xl">Sair do Scanner</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;