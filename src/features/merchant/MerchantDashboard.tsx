import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, subscribeToTransactions, logout, setCurrentUser } = useStore();
  
  // ESTADOS DE VISUALIZAÇÃO
  const [view, setView] = useState<'terminal' | 'history' | 'profile'>('terminal');
  const [showOpManager, setShowOpManager] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // ESTADOS DE OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DE FILTRAGEM (HISTÓRICO)
  const [filterNif, setFilterNif] = useState('');
  const [filterDoc, setFilterDoc] = useState('');
  const [filterType, setFilterType] = useState('all');

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpPass, setNewOpPass] = useState('');

  // ESTADOS DE EDIÇÃO DE PERFIL - Com Fallbacks para evitar erro de undefined
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editCashback, setEditCashback] = useState<number>(currentUser?.cashbackPercent || 0);

  // SUBSCREVER TRANSAÇÕES
  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('merchant', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser, subscribeToTransactions]);

  // SCANNER QR CODE
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text) => {
          setCardNumber(text);
          setShowScanner(false);
          scanner.clear();
        },
        () => { /* Erros de leitura ignorados */ }
      );
      return () => {
        try { scanner.clear(); } catch (e) { console.error(e); }
      };
    }
  }, [showScanner]);

  // LÓGICA DE ATUALIZAÇÃO DE PERFIL
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const currentEmail = currentUser.email || '';
      if (editEmail.toLowerCase().trim() !== currentEmail.toLowerCase()) {
        const qEmail = query(collection(db, 'merchants'), where('email', '==', editEmail.toLowerCase().trim()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) throw new Error("Este email já está registado.");
      }

      const updates: any = {
        name: editName,
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim(),
      };

      if (editCashback !== currentUser.cashbackPercent) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        updates.pendingCashbackChange = {
          newPercent: editCashback,
          effectiveDate: tomorrow.toISOString()
        };
        alert(`A nova taxa de ${editCashback}% será aplicada às 00:00 de amanhã.`);
      }

      await updateDoc(doc(db, 'merchants', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates });
      setMessage({ type: 'success', text: "Perfil atualizado!" });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setView('terminal');
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar.");
    } finally {
      setIsLoading(false);
    }
  };

  // ESTATÍSTICAS E FILTROS
  const stats = useMemo(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    let theoretical = 0;
    let available = 0;

    transactions.forEach(t => {
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
  }, [transactions]);

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const matchNif = filterNif ? t.clientId.includes(filterNif) : true;
      const matchDoc = filterDoc ? t.documentNumber?.toLowerCase().includes(filterDoc.toLowerCase()) : true;
      const matchType = filterType === 'all' ? true : t.type === filterType;
      return matchNif && matchDoc && matchType;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [transactions, filterNif, filterDoc, filterType]);

  const handleExportCSV = () => {
    const headers = "Data,Cliente,Documento,Tipo,Valor Original,Cashback\n";
    const rows = filteredHistory.map(t => {
      const date = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---';
      return `${date},${t.clientId},${t.documentNumber},${t.type},${t.amount}€,${t.cashbackAmount}€`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio_${currentUser?.name || 'loja'}.csv`; a.click();
  };

  const handleAddOperator = async () => {
    if (!newOpName || newOpPass.length < 4 || !currentUser) return alert("Dados inválidos.");
    const newOp = { id: `op_${Date.now()}`, name: newOpName, password: newOpPass, createdAt: new Date().toISOString() };
    try {
      await updateDoc(doc(db, 'merchants', currentUser.id), { operators: arrayUnion(newOp) });
      setCurrentUser({ ...currentUser, operators: [...(currentUser.operators || []), newOp] });
      setNewOpName(''); setNewOpPass('');
      alert("Operador adicionado!");
    } catch (error) { alert("Erro ao adicionar."); }
  };

  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber || !currentUser) return alert("Preencha tudo.");
    if (type === 'redeem' && val > stats.available) return alert(`Saldo insuficiente!`);

    try {
      setIsLoading(true);
      await addTransaction({
        clientId: cardNumber,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+', // Fallback aqui
        amount: type === 'earn' ? val : 0,
        cashbackAmount: type === 'earn' ? (val * ((currentUser.cashbackPercent || 0) / 100)) : val, // Fallback aqui
        type: type,
        documentNumber: documentNumber,
        operatorCode: 'LOJA', 
        status: type === 'earn' ? 'pending' : 'available'
      });
      setMessage({ type: 'success', text: "Operação Concluída!" });
      setAmount(''); setDocumentNumber('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) { alert("Erro na operação."); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-10">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <header className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00d66f]/10 rounded-xl flex items-center justify-center text-[#00d66f] text-2xl shadow-inner">🏪</div>
            <div>
              <h2 className="text-xl font-bold text-[#0a2540]">{currentUser?.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {currentUser?.nif}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setView('terminal'); setShowOpManager(false); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${view === 'terminal' ? 'bg-[#0a2540] text-white' : 'bg-slate-50 text-slate-400'}`}>Terminal</button>
            <button onClick={() => { setView('history'); setShowOpManager(false); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${view === 'history' ? 'bg-[#0a2540] text-white' : 'bg-slate-50 text-slate-400'}`}>Movimentos</button>
            <button onClick={() => { setView('profile'); setShowOpManager(false); }} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase ${view === 'profile' ? 'bg-[#0a2540] text-white' : 'bg-slate-50 text-slate-400'}`}>Perfil</button>
            <button onClick={() => setShowOpManager(!showOpManager)} className="px-4 py-2 rounded-xl bg-slate-100 text-[#0a2540] text-xs font-bold uppercase tracking-widest hover:bg-[#00d66f]">Equipa</button>
            <button onClick={() => logout()} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase">Sair</button>
          </div>
        </header>

        {showOpManager ? (
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-[#0a2540] mb-6 italic uppercase">Gestão de Equipa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <input placeholder="NOME DO OPERADOR" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <input placeholder="PASSWORD" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <button onClick={handleAddOperator} className="bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-xs">Adicionar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser?.operators?.map((op: any) => (
                <div key={op.id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex justify-between items-center">
                  <p className="font-black text-[#0a2540] text-sm uppercase">{op.name}</p>
                  <span className="text-xl">👤</span>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
               <div className="space-y-3 text-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">1. Identificar Cliente (NIF)</label>
                <div className="flex gap-3">
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="000000000" className="flex-grow p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-[#0a2540] outline-none" />
                  <button onClick={() => setShowScanner(true)} className="bg-[#0a2540] p-5 rounded-2xl text-white hover:bg-black active:scale-95"><span className="text-2xl">📷</span></button>
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
              {message.text && (
                <div className="mt-4 p-5 rounded-2xl bg-[#00d66f]/10 text-[#00d66f] font-black text-center text-xs uppercase animate-pulse">{message.text}</div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Total Emitido</p>
                <h3 className="text-3xl font-black text-[#0a2540] mt-1">{stats.theoretical.toFixed(2)}€</h3>
              </div>
              <div className="bg-[#0a2540] p-6 rounded-[24px] text-white shadow-xl text-center">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Saldo Maduro (48h+)</p>
                <h3 className="text-3xl font-black text-[#00d66f] mt-1">{stats.available.toFixed(2)}€</h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-4 mb-8 items-end">
                <div className="flex-grow min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">NIF Cliente</label>
                  <input value={filterNif} onChange={e => setFilterNif(e.target.value)} placeholder="000..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <div className="w-48">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tipo</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold">
                    <option value="all">TODOS</option>
                    <option value="earn">EMITIDO</option>
                    <option value="redeem">UTILIZADO</option>
                  </select>
                </div>
                <button onClick={handleExportCSV} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-black transition-all">Exportar CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-4">Data</th>
                      <th className="pb-4">Cliente</th>
                      <th className="pb-4">Doc</th>
                      <th className="pb-4">Cashback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.map((t, idx) => (
                      <tr key={idx} className="text-sm font-bold text-[#0a2540] hover:bg-slate-50/50">
                        <td className="py-4">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}</td>
                        <td className="py-4">{t.clientId}</td>
                        <td className="py-4 uppercase">{t.documentNumber}</td>
                        <td className={`py-4 font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                          {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount?.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-[#0a2540] mb-6 uppercase italic tracking-tighter text-center">Definições do Estabelecimento</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Nome Comercial</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Taxa de Cashback Atual (%)</label>
                <input type="number" step="0.1" value={editCashback} onChange={e => setEditCashback(parseFloat(e.target.value))} className="w-full p-4 bg-slate-50 border-2 border-[#00d66f]/30 rounded-2xl font-black text-[#00d66f] outline-none" />
              </div>
              <button disabled={isLoading} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                {isLoading ? 'A Guardar...' : 'Atualizar Dados'}
              </button>
            </form>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-[40px] shadow-2xl w-full max-w-lg relative">
              <div id="reader" className="w-full"></div>
              <button onClick={() => setShowScanner(false)} className="w-full bg-red-600 text-white p-5 font-black uppercase text-xs mt-4 rounded-2xl">Fechar Câmara</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;