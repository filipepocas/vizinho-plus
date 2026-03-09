import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { transactions, addTransaction, subscribeToTransactions } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [view, setView] = useState<'terminal' | 'history'>('terminal');
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

  // ESTADOS DE FILTRAGEM
  const [filterNif, setFilterNif] = useState('');
  const [filterDoc, setFilterDoc] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  // --- LÓGICA DE CÁLCULO DE ESTATÍSTICAS E FILTROS ---
  
  const merchantTransactions = useMemo(() => {
    return transactions.filter(t => t.merchantId === activeMerchant?.id);
  }, [transactions, activeMerchant]);

  const stats = useMemo(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    let theoretical = 0;
    let available = 0;

    merchantTransactions.forEach(t => {
      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const val = t.cashbackAmount || 0;
      const isMature = txTime <= fortyEightHoursAgo;

      if (t.type === 'earn') {
        theoretical += val;
        if (isMature) available += val;
      } else {
        theoretical -= val;
        available -= val;
      }
    });
    return { theoretical, available };
  }, [merchantTransactions]);

  const filteredHistory = useMemo(() => {
    return merchantTransactions.filter(t => {
      const matchNif = filterNif ? t.clientId.includes(filterNif) : true;
      const matchDoc = filterDoc ? t.documentNumber?.toLowerCase().includes(filterDoc.toLowerCase()) : true;
      const matchType = filterType === 'all' ? true : t.type === filterType;
      return matchNif && matchDoc && matchType;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [merchantTransactions, filterNif, filterDoc, filterType]);

  const handleExportCSV = () => {
    const headers = "Data,Cliente,Documento,Tipo,Valor Original,Cashback,Operador\n";
    const rows = filteredHistory.map(t => {
      const date = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---';
      return `${date},${t.clientId},${t.documentNumber},${t.type},${t.amount}€,${t.cashbackAmount}€,${t.operatorCode}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${activeMerchant.name}.csv`;
    a.click();
  };

  // --- LÓGICA DE AUTENTICAÇÃO E OPERAÇÕES (MANTIDA) ---

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const merchantDoc = snap.docs[0];
        const data = merchantDoc.data();
        
        if (data.firstAccess && loginPass === data.temporaryPassword) {
          setActiveMerchant({ id: merchantDoc.id, ...data });
          setLoginStep('changePass');
          return;
        }

        if (loginPass === data.password) {
          setActiveMerchant({ id: merchantDoc.id, ...data, displayName: data.name });
          setActiveOperator({ id: 'admin', name: 'Administrador (Gerência)', code: 'ADMIN' });
          setIsAuthorized(true);
          return;
        }

        const op = data.operators?.find((o: any) => o.password === loginPass);
        if (op) {
          setActiveMerchant({ id: merchantDoc.id, ...data, displayName: data.name });
          setActiveOperator({ ...op, code: op.id });
          setIsAuthorized(true);
        } else {
          alert("Credenciais inválidas.");
        }
      } else {
        alert("Lojista não encontrado.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateRecovery = async () => {
    if (!loginEmail) return alert("Insira o email.");
    setIsLoading(true);
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentRecoveryCode(mockCode);
    console.log(`[SISTEMA] Código para ${loginEmail}: ${mockCode}`);
    alert(`Código enviado.`);
    setLoginStep('recovery');
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCode !== sentRecoveryCode) return alert("Código inválido.");
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
        alert("Sucesso! Faça login.");
        setLoginStep('credentials');
      }
    } catch (err) { alert("Erro."); } finally { setIsLoading(false); }
  };

  const handleUpdateFirstPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'merchants', activeMerchant.id), {
        password: newPass,
        firstAccess: false,
        temporaryPassword: ""
      });
      setActiveOperator({ id: 'admin', name: 'Administrador', code: 'ADMIN' });
      setIsAuthorized(true);
    } catch (err) { alert("Erro."); } finally { setIsLoading(false); }
  };

  const handleAddOperator = async () => {
    if (!newOpName || newOpPass.length < 4) return alert("Dados inválidos.");
    const newOp = { id: `op_${Date.now()}`, name: newOpName, password: newOpPass, createdAt: new Date().toISOString() };
    try {
      await updateDoc(doc(db, 'merchants', activeMerchant.id), { operators: arrayUnion(newOp) });
      setActiveMerchant({ ...activeMerchant, operators: [...(activeMerchant.operators || []), newOp] });
      setNewOpName(''); setNewOpPass('');
      alert("Operador adicionado!");
    } catch (error) { alert("Erro."); }
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber) return alert("Preencha tudo.");

    if (type === 'redeem' && val > stats.available) {
      return alert(`Saldo insuficiente! Disponível: ${stats.available.toFixed(2)}€`);
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
        operatorCode: activeOperator.code,
        status: type === 'earn' ? 'pending' : 'available'
      });
      setMessage({ type: 'success', text: "Operação Concluída!" });
      setAmount(''); setDocumentNumber('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) { alert("Erro."); } finally { setIsLoading(false); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-100 font-sans">
          <h1 className="text-3xl font-black italic text-[#0a2540] mb-8 uppercase">VIZINHO+</h1>
          {loginStep === 'credentials' && (
            <form onSubmit={handleMerchantLogin} className="space-y-4">
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" placeholder="Email da Loja" required />
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" placeholder="Password" required />
              <button className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest">Entrar</button>
              <button type="button" onClick={handleInitiateRecovery} className="text-[10px] font-black uppercase text-slate-400 mt-4">Recuperar Password</button>
            </form>
          )}
          {loginStep === 'changePass' && (
            <form onSubmit={handleUpdateFirstPassword} className="space-y-4">
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-blue-200 rounded-2xl font-bold" placeholder="Nova Password" required />
              <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase">Ativar Conta</button>
            </form>
          )}
          {loginStep === 'recovery' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-orange-200 rounded-2xl font-bold text-center text-2xl" placeholder="000000" required />
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" placeholder="Nova Password" required />
              <button className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black uppercase">Redefinir</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-10">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <header className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00d66f]/10 rounded-xl flex items-center justify-center text-[#00d66f] text-2xl shadow-inner">🏪</div>
            <div>
              <h2 className="text-xl font-bold text-[#0a2540]">{activeMerchant.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sessão: {activeOperator.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setView('terminal'); setShowOpManager(false); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${view === 'terminal' ? 'bg-[#0a2540] text-white' : 'bg-slate-50 text-slate-400'}`}>Terminal</button>
            <button onClick={() => { setView('history'); setShowOpManager(false); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${view === 'history' ? 'bg-[#0a2540] text-white' : 'bg-slate-50 text-slate-400'}`}>Movimentos</button>
            {activeOperator.code === 'ADMIN' && (
              <button onClick={() => setShowOpManager(!showOpManager)} className="px-4 py-2 rounded-xl bg-slate-100 text-[#0a2540] text-xs font-bold uppercase">Equipa</button>
            )}
            <button onClick={() => setIsAuthorized(false)} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-[#0a2540] mb-6 italic uppercase">Gestão de Operadores</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <input placeholder="NOME" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <input placeholder="PASSWORD" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <button onClick={handleAddOperator} className="bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-xs">Adicionar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex justify-between items-center">
                  <p className="font-black text-[#0a2540] text-sm uppercase">{op.name}</p>
                  <span className="text-xl">👤</span>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
               <div className="space-y-3 text-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">1. Identificar Cliente (NIF)</label>
                <div className="flex gap-3">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="000000000" className="flex-grow p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none" />
                  <button onClick={() => setShowScanner(true)} className="bg-[#0a2540] p-5 rounded-2xl text-white hover:bg-black transition-all active:scale-95"><span className="text-2xl">📷</span></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">2. Valor da Operação (€)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">3. Nº Fatura / Doc</label>
                  <input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="FT 2026/1" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black uppercase" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={() => processAction('earn')} className="group bg-[#00d66f] p-8 rounded-[32px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-xl flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl">💰</span>
                <span className="font-black text-lg uppercase italic text-center leading-none">Atribuir<br/>Cashback</span>
              </button>
              <button onClick={() => processAction('redeem')} className="group bg-[#0a2540] p-8 rounded-[32px] text-white transition-all hover:bg-black shadow-xl flex flex-col items-center gap-2 active:scale-95">
                <span className="text-4xl">🎁</span>
                <span className="font-black text-lg uppercase italic text-center leading-none">Descontar<br/>Saldo</span>
              </button>
              <button onClick={() => processAction('subtract')} className="group bg-white border-2 border-slate-100 p-6 rounded-[32px] text-slate-400 transition-all hover:border-red-500 hover:text-red-500 flex flex-col items-center gap-1">
                <span className="text-2xl">📄</span>
                <span className="font-black text-xs uppercase italic">Nota de Crédito</span>
              </button>
              {message.text && (
                <div className="mt-4 p-5 rounded-2xl bg-[#00d66f]/10 text-[#00d66f] font-black text-center text-xs uppercase animate-pulse">{message.text}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            {/* PAINEL DE SALDOS DO COMERCIANTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Total Emitido (Teórico)</p>
                <h3 className="text-3xl font-black text-[#0a2540] mt-1">{stats.theoretical.toFixed(2)}€</h3>
              </div>
              <div className="bg-[#0a2540] p-6 rounded-[24px] text-white shadow-xl">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Saldo Disponível para Uso (Maduro)</p>
                <h3 className="text-3xl font-black text-[#00d66f] mt-1">{stats.available.toFixed(2)}€</h3>
              </div>
            </div>

            {/* FILTROS E TABELA */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-4 mb-8 items-end">
                <div className="flex-grow min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">NIF Cliente</label>
                  <input value={filterNif} onChange={e => setFilterNif(e.target.value)} placeholder="Filtrar por NIF..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <div className="w-48">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Documento</label>
                  <input value={filterDoc} onChange={e => setFilterDoc(e.target.value)} placeholder="FT..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
                </div>
                <div className="w-48">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Tipo</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold">
                    <option value="all">TODOS</option>
                    <option value="earn">EMITIDO</option>
                    <option value="redeem">UTILIZADO</option>
                    <option value="subtract">N. CRÉDITO</option>
                  </select>
                </div>
                <button onClick={handleExportCSV} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black">Exportar CSV</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-4">Data</th>
                      <th className="pb-4">Cliente</th>
                      <th className="pb-4">Documento</th>
                      <th className="pb-4">Cashback</th>
                      <th className="pb-4 text-right">Op</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.map((t, idx) => (
                      <tr key={idx} className="text-sm font-bold text-[#0a2540] hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 whitespace-nowrap">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}</td>
                        <td className="py-4">{t.clientId}</td>
                        <td className="py-4 uppercase">{t.documentNumber}</td>
                        <td className={`py-4 font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                          {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount?.toFixed(2)}€
                        </td>
                        <td className="py-4 text-right text-[10px] text-slate-400 font-black">{t.operatorCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-[40px] shadow-2xl w-full max-w-lg relative">
              <div id="reader" className="w-full"></div>
              <button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-5 font-black uppercase text-xs mt-4 rounded-2xl">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;