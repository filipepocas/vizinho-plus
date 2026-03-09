import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { transactions, addTransaction, subscribeToTransactions } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'changePass' | 'recovery'>('credentials');
  
  // Estados de Login e Recuperação
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [activeOperator, setActiveOperator] = useState<any>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [sentRecoveryCode, setSentRecoveryCode] = useState('');
  const [newPass, setNewPass] = useState('');
  
  const [activeMerchant, setActiveMerchant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DA OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpPass, setNewOpPass] = useState('');
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
        const merchantDoc = snap.docs[0];
        const data = merchantDoc.data();
        
        // 1. Verificação de Primeiro Acesso do Admin
        if (data.firstAccess && loginPass === data.temporaryPassword) {
          setActiveMerchant({ id: merchantDoc.id, ...data });
          setLoginStep('changePass');
          return;
        }

        // 2. Verificação se é o Administrador da Loja
        if (loginPass === data.password) {
          setActiveMerchant({ id: merchantDoc.id, ...data, displayName: data.name });
          setActiveOperator({ id: 'admin', name: 'Administrador (Gerência)', code: 'ADMIN' });
          setIsAuthorized(true);
          return;
        }

        // 3. Verificação se é um Operador Interno
        const op = data.operators?.find((o: any) => o.password === loginPass);
        if (op) {
          setActiveMerchant({ id: merchantDoc.id, ...data, displayName: data.name });
          setActiveOperator({ ...op, code: op.id }); // Mapeia id para code para compatibilidade
          setIsAuthorized(true);
        } else {
          alert("Credenciais inválidas. Verifique a password.");
        }
      } else {
        alert("Lojista não encontrado.");
      }
    } catch (err) {
      alert("Erro de conexão com o sistema.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateRecovery = async () => {
    if (!loginEmail) return alert("Insira o email da conta para recuperar.");
    setIsLoading(true);
    
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentRecoveryCode(mockCode);
    
    console.log(`[SISTEMA] Código enviado para ${loginEmail}: ${mockCode}`);
    alert(`Código de segurança enviado para o email registado.`);
    setLoginStep('recovery');
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCode !== sentRecoveryCode) return alert("Código de recuperação inválido.");
    if (newPass.length < 6) return alert("A nova password deve ter pelo menos 6 caracteres.");

    setIsLoading(true);
    try {
      const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'merchants', snap.docs[0].id), {
          password: newPass,
          firstAccess: false,
          temporaryPassword: ""
        });
        alert("Password redefinida com sucesso! Faça login agora.");
        setLoginStep('credentials');
        setLoginPass('');
      }
    } catch (err) {
      alert("Erro ao atualizar password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFirstPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return alert("Mínimo 6 caracteres.");
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'merchants', activeMerchant.id), {
        password: newPass,
        firstAccess: false,
        temporaryPassword: ""
      });
      setActiveOperator({ id: 'admin', name: 'Administrador (Gerência)', code: 'ADMIN' });
      setIsAuthorized(true);
    } catch (err) {
      alert("Erro ao guardar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOperator = async () => {
    if (!newOpName || newOpPass.length < 4) return alert("Preencha nome e password (min 4 caracteres).");

    const newOp = {
      id: `op_${Date.now()}`,
      name: newOpName,
      password: newOpPass,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'merchants', activeMerchant.id), {
        operators: arrayUnion(newOp)
      });
      setActiveMerchant({
        ...activeMerchant,
        operators: [...(activeMerchant.operators || []), newOp]
      });
      setNewOpName('');
      setNewOpPass('');
      alert("Operador adicionado com sucesso!");
    } catch (error) {
      alert("Erro ao registar operador.");
    }
  };

  const getClientAvailableBalance = (clientId: string) => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
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
        let toDebit = amount;
        if (available >= toDebit) {
          available -= toDebit;
        } else {
          toDebit -= available;
          available = 0;
          pending -= toDebit;
        }
      }
    });
    return available;
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber) {
      return alert("Preencha todos os campos da transação.");
    }

    if (type === 'redeem') {
      const available = getClientAvailableBalance(cardNumber);
      if (val > available) return alert(`Saldo insuficiente! Disponível: ${available.toFixed(2)}€`);
    }

    try {
      setIsLoading(true);
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.name,
        amount: type === 'earn' ? val : 0,
        cashbackAmount: type === 'earn' ? (val * (activeMerchant.cashbackPercent / 100)) : val,
        type: type,
        documentNumber: documentNumber,
        operatorCode: activeOperator.code, // Corrigido para corresponder à interface Transaction
        status: type === 'earn' ? 'pending' : 'available'
      });
      
      setMessage({ type: 'success', text: "Operação Concluída!" });
      setAmount(''); setDocumentNumber('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      alert("Erro ao processar transação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-100 font-sans">
          <h1 className="text-3xl font-black italic text-[#0a2540] mb-8 uppercase tracking-tighter">VIZINHO+</h1>
          
          {loginStep === 'credentials' && (
            <form onSubmit={handleMerchantLogin} className="space-y-4">
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-[#00d66f]" placeholder="Email da Loja" required />
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-[#00d66f]" placeholder="Password ou Acesso Operador" required />
              <button className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">Entrar</button>
              <button type="button" onClick={handleInitiateRecovery} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540] mt-4">Recuperar Password</button>
            </form>
          )}

          {loginStep === 'changePass' && (
            <form onSubmit={handleUpdateFirstPassword} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-2xl text-left border border-blue-100 mb-4">
                <p className="text-xs font-bold text-blue-900 leading-tight">Primeiro acesso. Defina a sua password de Administrador.</p>
              </div>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-blue-200 rounded-2xl font-bold outline-none" placeholder="Nova Password" required />
              <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Ativar Conta</button>
            </form>
          )}

          {loginStep === 'recovery' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs font-bold text-orange-600 mb-4">Código enviado para o email da loja.</p>
              <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-orange-200 rounded-2xl font-bold text-center text-2xl tracking-[0.5em]" placeholder="000000" required />
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" placeholder="Nova Password" required />
              <button className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest">Redefinir Password</button>
              <button type="button" onClick={() => setLoginStep('credentials')} className="text-[10px] font-black text-slate-400 block mx-auto">Voltar</button>
            </form>
          )}
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
              <h2 className="text-xl font-bold text-[#0a2540] leading-none">{activeMerchant.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Sessão: {activeOperator.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {activeOperator.code === 'ADMIN' && (
              <button onClick={() => setShowOpManager(!showOpManager)} className="px-5 py-2.5 rounded-xl bg-slate-50 text-[#0a2540] text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all">
                {showOpManager ? 'Voltar ao Terminal' : 'Gerir Operadores'}
              </button>
            )}
            <button onClick={() => { setIsAuthorized(false); setActiveOperator(null); setLoginPass(''); }} className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 hover:bg-red-100 transition-all">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-[#0a2540] mb-6 italic uppercase tracking-tighter">Utilizadores do Ponto de Venda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <input placeholder="NOME DO OPERADOR" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-[#00d66f]" />
              <input placeholder="PASSWORD DE ACESSO" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-[#00d66f]" />
              <button onClick={handleAddOperator} className="bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg">Criar Acesso</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex justify-between items-center group">
                  <div>
                    <p className="font-black text-[#0a2540] text-sm uppercase">{op.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest italic">Acesso por Password</p>
                  </div>
                  <span className="text-xl grayscale group-hover:grayscale-0 transition-all">👤</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
               <div className="space-y-3 text-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">1. Identificar Cliente (NIF)</label>
                <div className="flex gap-3">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="000000000" className="flex-grow p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none focus:border-[#0a2540] transition-all" />
                  <button onClick={() => setShowScanner(true)} className="bg-[#0a2540] p-5 rounded-2xl text-white hover:bg-black shadow-lg transition-all active:scale-95"><span className="text-2xl">📷</span></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">2. Valor da Operação (€)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">3. Nº Fatura / Doc</label>
                  <input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="FT 2026/1" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none uppercase focus:border-[#00d66f] transition-all" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={() => processAction('earn')} className="group bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-xl flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl">💰</span>
                <span className="font-black text-lg uppercase italic">Atribuir Cashback</span>
              </button>
              <button onClick={() => processAction('redeem')} className="group bg-[#0a2540] p-8 rounded-[32px] text-white transition-all hover:bg-black shadow-xl flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl">🎁</span>
                <span className="font-black text-lg uppercase italic">Descontar Saldo</span>
              </button>
              <button onClick={() => processAction('subtract')} className="group bg-white border-2 border-slate-100 p-6 rounded-[32px] text-slate-400 transition-all hover:border-red-500 hover:text-red-500 flex flex-col items-center gap-1 active:scale-95">
                <span className="text-2xl">📄</span>
                <span className="font-black text-xs uppercase italic">Nota de Crédito</span>
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
          <div className="fixed inset-0 bg-[#0a2540]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-[40px] shadow-2xl w-full max-w-lg relative">
              <div id="reader" className="w-full"></div>
              <button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-5 font-black uppercase text-xs mt-4 rounded-2xl">Cancelar Câmara</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;