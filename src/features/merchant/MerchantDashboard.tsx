import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  LayoutDashboard, 
  History, 
  UserCircle, 
  Users, 
  LogOut, 
  Camera, 
  Coins, 
  Gift, 
  Download, 
  Search,
  Store,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

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
  const [filterType, setFilterType] = useState('all');

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpPass, setNewOpPass] = useState('');

  // ESTADOS DE EDIÇÃO DE PERFIL
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
      }

      await updateDoc(doc(db, 'merchants', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates });
      setMessage({ type: 'success', text: "Perfil atualizado com sucesso!" });
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
      const matchType = filterType === 'all' ? true : t.type === filterType;
      return matchNif && matchType;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [transactions, filterNif, filterType]);

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
      alert("Operador adicionado com sucesso!");
    } catch (error) { alert("Erro ao adicionar."); }
  };

  const processAction = async (type: 'earn' | 'redeem') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber || !currentUser) return alert("Preencha todos os campos.");
    if (type === 'redeem' && val > stats.available) return alert(`Saldo insuficiente para esta operação!`);

    try {
      setIsLoading(true);
      await addTransaction({
        clientId: cardNumber,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+',
        amount: type === 'earn' ? val : 0,
        cashbackAmount: type === 'earn' ? (val * ((currentUser.cashbackPercent || 0) / 100)) : val,
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
    <div className="min-h-screen bg-[#f6f9fc] pb-12">
      <div className="max-w-7xl mx-auto p-4 lg:p-10">
        
        {/* HEADER BRUTALISTA */}
        <header className="bg-[#0a2540] p-6 rounded-[32px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-10 gap-6 border-b-4 border-[#00d66f]">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#00d66f] rounded-2xl flex items-center justify-center text-[#0a2540] shadow-lg rotate-3 transition-transform hover:rotate-0">
              <Store size={32} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                {currentUser?.name}
              </h2>
              <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.2em] mt-2">
                NIF: {currentUser?.nif} • LOJA PARCEIRA
              </p>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md">
            <button onClick={() => { setView('terminal'); setShowOpManager(false); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>
              <LayoutDashboard size={16} /> Terminal
            </button>
            <button onClick={() => { setView('history'); setShowOpManager(false); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'history' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>
              <History size={16} /> Movimentos
            </button>
            <button onClick={() => { setView('profile'); setShowOpManager(false); }} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'profile' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>
              <UserCircle size={16} /> Perfil
            </button>
            <button onClick={() => setShowOpManager(!showOpManager)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${showOpManager ? 'bg-white text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>
              <Users size={16} /> Equipa
            </button>
            <button onClick={() => logout()} className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-red-400 hover:bg-red-500/10">
              <LogOut size={16} /> Sair
            </button>
          </nav>
        </header>

        {/* OPERATOR MANAGER */}
        {showOpManager && (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 mb-10 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <Users className="text-[#0a2540]" size={28} />
              <h3 className="text-xl font-black text-[#0a2540] uppercase italic tracking-tighter">Gestão de Operadores</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <input placeholder="NOME DO OPERADOR" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase text-sm outline-none focus:border-[#00d66f]" />
              <input placeholder="CÓDIGO / PIN" type="password" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-[#00d66f]" />
              <button onClick={handleAddOperator} className="bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all">Registar Operador</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser?.operators?.map((op: any) => (
                <div key={op.id} className="p-5 border-2 border-slate-100 bg-slate-50 rounded-[24px] flex justify-between items-center group hover:border-[#0a2540] transition-all">
                  <div>
                    <p className="font-black text-[#0a2540] text-sm uppercase tracking-tighter">{op.name}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Operador Ativo</p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-[#0a2540] group-hover:text-white transition-colors">
                    <UserCircle size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN VIEWS */}
        {view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-xl border-2 border-slate-100 space-y-10">
               
               <div className="space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                  <Search size={14} /> 1. Identificar Cliente (NIF)
                </label>
                <div className="flex gap-4">
                  <input 
                    value={cardNumber} 
                    onChange={e => setCardNumber(e.target.value)} 
                    placeholder="NIF DO CLIENTE..." 
                    className="flex-grow p-6 bg-slate-50 border-2 border-slate-100 rounded-[28px] text-3xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all" 
                  />
                  <button 
                    onClick={() => setShowScanner(true)} 
                    className="bg-[#0a2540] px-8 rounded-[28px] text-white hover:bg-black active:scale-90 transition-all shadow-lg"
                  >
                    <Camera size={32} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                    <Coins size={14} /> 2. Valor da Venda (€)
                  </label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0,00" 
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[28px] text-4xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                    <History size={14} /> 3. Nº Fatura / Doc
                  </label>
                  <input 
                    value={documentNumber} 
                    onChange={e => setDocumentNumber(e.target.value)} 
                    placeholder="EX: FT 2026/1" 
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[28px] text-3xl font-black uppercase text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <button 
                onClick={() => processAction('earn')} 
                className="group relative bg-[#00d66f] p-10 rounded-[40px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-[0_20px_40px_rgba(0,214,111,0.2)] flex flex-col items-center gap-4 active:scale-95 border-b-8 border-black/10"
              >
                <div className="bg-white/20 p-4 rounded-2xl group-hover:rotate-12 transition-transform">
                  <Coins size={40} />
                </div>
                <span className="font-black text-xl uppercase italic text-center leading-none tracking-tighter">
                  Atribuir<br/>Cashback
                </span>
              </button>

              <button 
                onClick={() => processAction('redeem')} 
                className="group bg-[#0a2540] p-10 rounded-[40px] text-white transition-all hover:bg-black shadow-2xl flex flex-col items-center gap-4 active:scale-95 border-b-8 border-black/40"
              >
                <div className="bg-white/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <Gift size={40} className="text-[#00d66f]" />
                </div>
                <span className="font-black text-xl uppercase italic text-center leading-none tracking-tighter">
                  Descontar<br/>Saldo
                </span>
              </button>

              {message.text && (
                <div className={`p-6 rounded-[28px] font-black text-center text-xs uppercase flex items-center justify-center gap-3 animate-bounce ${
                  message.type === 'success' ? 'bg-green-50 text-green-600 border-2 border-green-100' : 'bg-red-50 text-red-600 border-2 border-red-100'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-xl flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Emitido</p>
                  <h3 className="text-4xl font-black text-[#0a2540] mt-2 italic tracking-tighter">{stats.theoretical.toFixed(2)}€</h3>
                </div>
                <Coins size={80} className="text-slate-50 absolute -right-4 -bottom-4 rotate-12" />
              </div>
              <div className="bg-[#0a2540] p-8 rounded-[32px] text-white shadow-2xl flex items-center justify-between overflow-hidden relative border-b-8 border-[#00d66f]">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Saldo Maduro (48h+)</p>
                  <h3 className="text-4xl font-black text-[#00d66f] mt-2 italic tracking-tighter">{stats.available.toFixed(2)}€</h3>
                </div>
                <ShieldCheck size={80} className="text-white/5 absolute -right-4 -bottom-4 -rotate-12" />
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-xl border-2 border-slate-100">
              <div className="flex flex-wrap gap-6 mb-10 items-end">
                <div className="flex-grow min-w-[250px] space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">NIF Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input value={filterNif} onChange={e => setFilterNif(e.target.value)} placeholder="Pesquisar NIF..." className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540]" />
                  </div>
                </div>
                <div className="w-56 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Tipo de Operação</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540] appearance-none cursor-pointer focus:border-[#00d66f]">
                    <option value="all">TODOS OS MOVIMENTOS</option>
                    <option value="earn">CASHBACK EMITIDO</option>
                    <option value="redeem">SALDO UTILIZADO</option>
                  </select>
                </div>
                <button onClick={handleExportCSV} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-3">
                  <Download size={18} /> Exportar Relatório
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-4 border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="pb-6 pl-4">Data</th>
                      <th className="pb-6">Cliente (NIF)</th>
                      <th className="pb-6">Documento</th>
                      <th className="pb-6 text-right pr-4">Valor Cashback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.map((t, idx) => (
                      <tr key={idx} className="text-sm font-black text-[#0a2540] hover:bg-slate-50 transition-colors">
                        <td className="py-6 pl-4 text-slate-400 font-bold">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}</td>
                        <td className="py-6">{t.clientId}</td>
                        <td className="py-6 uppercase italic tracking-tighter text-slate-500">{t.documentNumber}</td>
                        <td className={`py-6 text-right pr-4 font-black text-lg ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
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
          <div className="max-w-2xl mx-auto bg-white p-10 md:p-14 rounded-[40px] border-2 border-slate-100 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none">Definições</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Estabelecimento Parceiro</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Nome Comercial</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540] outline-none focus:border-[#0a2540]" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Email Público</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540] outline-none focus:border-[#0a2540]" />
                </div>
              </div>
              <div className="p-6 bg-[#00d66f]/5 rounded-[28px] border-2 border-[#00d66f]/20 space-y-3">
                <label className="text-[10px] font-black text-[#00d66f] uppercase tracking-widest ml-2 block flex items-center gap-2">
                  <Clock size={14} /> Taxa de Cashback (%)
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={editCashback} 
                  onChange={e => setEditCashback(parseFloat(e.target.value))} 
                  className="w-full p-5 bg-white border-2 border-[#00d66f] rounded-2xl font-black text-3xl text-[#00d66f] outline-none text-center" 
                />
                <p className="text-[9px] text-slate-400 font-bold text-center uppercase">Alterações na taxa entram em vigor às 00:00 do dia seguinte.</p>
              </div>
              <button disabled={isLoading} className="w-full bg-[#0a2540] text-white p-6 rounded-[28px] font-black uppercase tracking-widest text-sm hover:bg-black transition-all shadow-xl active:scale-95">
                {isLoading ? 'A Processar...' : 'Confirmar Alterações'}
              </button>
            </form>
          </div>
        )}

        {/* SCANNER MODAL */}
        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/95 backdrop-blur-2xl z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-6 rounded-[48px] shadow-[0_0_100px_rgba(0,214,111,0.3)] w-full max-w-lg relative border-4 border-[#00d66f]">
              <div id="reader" className="w-full overflow-hidden rounded-[32px]"></div>
              <button 
                onClick={() => setShowScanner(false)} 
                className="w-full bg-red-500 text-white p-6 font-black uppercase tracking-widest text-xs mt-6 rounded-[24px] hover:bg-red-600 transition-colors shadow-lg"
              >
                Cancelar Leitura
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;