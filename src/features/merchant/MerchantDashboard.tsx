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
      const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setActiveMerchant({ 
          id: snap.docs[0].id, 
          ...data,
          displayName: data.shopName || data.name || 'Lojista' 
        });
        setIsAuthorized(true);
      } else {
        alert("Lojista não registado. Verifique o email.");
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
      alert("Erro ao guardar operador.");
    }
  };

  // Cálculo de Saldo Disponível com regra de prioridade de débito
  const getClientAvailableBalance = (clientId: string) => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    
    // Filtramos apenas as transações deste cliente nesta loja
    const merchantClientTxs = transactions.filter(t => t.clientId === clientId && t.merchantId === activeMerchant.id);
    
    let available = 0;
    let pending = 0;

    merchantClientTxs.forEach(t => {
      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const amount = t.cashbackAmount || 0;
      const isMature = txTime <= fortyEightHoursAgo;

      if (t.type === 'earn') {
        if (isMature) available += amount;
        else pending += amount;
      } else {
        // Débito: tira primeiro do disponível
        let toDebit = amount;
        if (available >= toDebit) {
          available -= toDebit;
        } else {
          toDebit -= available;
          available = 0;
          pending -= toDebit; // Pode ficar negativo aqui se for 'subtract' (Nota de Crédito)
        }
      }
    });

    return available;
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber || opCode.length !== 5) {
      return alert("Preencha todos os campos obrigatórios (Cliente, Valor, Fatura e PIN).");
    }
    
    const operator = activeMerchant.operators?.find((o: any) => o.code === opCode);
    if (!operator) return alert("PIN de Operador Inválido!");

    // REGRA: Compras (redeem) não podem deixar saldo negativo
    if (type === 'redeem') {
      const available = getClientAvailableBalance(cardNumber);
      if (val > available) {
        return alert(`Saldo insuficiente para compra! Disponível: ${available.toFixed(2)}€`);
      }
    }

    const cashback = type === 'earn' ? (val * (activeMerchant.cashbackPercent / 100)) : val;

    try {
      setIsLoading(true);
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.displayName,
        amount: type === 'earn' ? val : 0,
        cashbackAmount: cashback,
        type: type,
        documentNumber: documentNumber,
        operatorCode: opCode,
        status: type === 'earn' ? 'pending' : 'available'
      });
      
      setMessage({ 
        type: 'success', 
        text: type === 'subtract' ? "Nota de Crédito registada!" : "Transação enviada para o Vizinho!" 
      });
      
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
            <button className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-bold hover:bg-[#153455] shadow-lg transition-all">
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
            <div className="w-12 h-12 bg-[#00d66f]/10 rounded-xl flex items-center justify-center text-[#00d66f] text-2xl shadow-inner">🏪</div>
            <div>
              <h2 className="text-xl font-bold text-[#0a2540] leading-none">{activeMerchant.displayName}</h2>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase italic">NIF {activeMerchant.nif}</span>
                <span className="text-[10px] font-bold bg-[#00d66f]/10 px-2 py-0.5 rounded text-[#00d66f] uppercase">{activeMerchant.cashbackPercent}% Cashback</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowOpManager(!showOpManager)} className="px-5 py-2.5 rounded-xl bg-slate-50 text-[#0a2540] text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all">
              {showOpManager ? 'Voltar ao Terminal' : 'Gerir Equipa'}
            </button>
            <button onClick={() => setIsAuthorized(false)} className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 hover:bg-red-100 transition-all">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-[#0a2540] mb-6 flex items-center gap-2">Configurar Operadores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <input placeholder="NOME DO OPERADOR" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" />
              <input placeholder="PIN (5 DÍGITOS)" value={newOpCode} onChange={e => setNewOpCode(e.target.value)} maxLength={5} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-bold outline-none focus:border-[#00d66f]" />
              <button onClick={handleAddOperator} className="bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-bold hover:bg-[#00c265] shadow-lg transition-all active:scale-95">Adicionar Operador</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#0a2540] text-sm uppercase">{op.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest leading-none">PIN: {op.code}</p>
                  </div>
                  <span className="text-xl grayscale opacity-30">👤</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
              <div className="space-y-3 text-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">1. Identificar Cliente (NIF ou Cartão)</label>
                <div className="flex gap-3">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="NIF ou Nº Cartão" className="flex-grow p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none focus:border-[#0a2540] transition-all" />
                  <button onClick={() => setShowScanner(true)} className="bg-[#0a2540] p-5 rounded-2xl text-white hover:bg-black shadow-lg transition-all active:scale-95"><span className="text-2xl">📷</span></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">2. Valor da Operação (€)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">3. Nº Documento (Fatura/NC)</label>
                  <input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Ex: FT 101" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none uppercase focus:border-[#00d66f] transition-all" />
                </div>
              </div>

              <div className="pt-8 border-t-2 border-slate-50 text-center">
                <label className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] block mb-4">4. Autorização Final (PIN Operador)</label>
                <input type="password" value={opCode} onChange={e => setOpCode(e.target.value)} maxLength={5} placeholder="•••••" className="w-full max-w-xs mx-auto p-5 bg-red-50/30 border-2 border-red-100 rounded-2xl text-3xl text-center font-black tracking-[0.5em] focus:border-red-500 transition-all outline-none" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={() => processAction('earn')} className="group bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-xl shadow-green-500/10 flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl group-hover:rotate-12 transition-transform">💰</span>
                <span className="font-black text-lg uppercase tracking-tighter italic">Atribuir Cashback</span>
                <p className="text-[9px] font-bold opacity-60 uppercase">Venda Normal</p>
              </button>

              <button onClick={() => processAction('redeem')} className="group bg-[#0a2540] p-8 rounded-[32px] text-white transition-all hover:bg-black shadow-xl shadow-blue-900/10 flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl group-hover:scale-110 transition-transform">🎁</span>
                <span className="font-black text-lg uppercase tracking-tighter italic">Descontar Saldo</span>
                <p className="text-[9px] font-bold opacity-60 uppercase">Uso de Cashback</p>
              </button>

              <button onClick={() => processAction('subtract')} className="group bg-white border-2 border-slate-100 p-6 rounded-[32px] text-slate-400 transition-all hover:border-red-500 hover:text-red-500 flex flex-col items-center gap-1 active:scale-95">
                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">📄</span>
                <span className="font-black text-xs uppercase tracking-widest">Nota de Crédito</span>
                <p className="text-[8px] font-bold opacity-60 uppercase">Permite Saldo Negativo</p>
              </button>

              {message.text && (
                <div className={`mt-4 p-5 rounded-2xl font-black text-center text-xs uppercase tracking-widest animate-pulse ${message.type === 'success' ? 'bg-[#00d66f]/10 text-[#00d66f]' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-[40px] shadow-2xl w-full max-w-lg relative overflow-hidden">
              <div id="reader" className="w-full"></div>
              <button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-5 font-black uppercase text-xs tracking-[0.2em] mt-4 rounded-2xl active:scale-95 transition-all">Cancelar Leitura</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;