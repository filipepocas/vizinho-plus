import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
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

  // ESTADOS DE FILTRAGEM
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

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('merchant', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser, subscribeToTransactions]);

  // QR CODE SCANNER
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text) => {
          setCardNumber(text);
          setShowScanner(false);
          scanner.clear();
        },
        () => { /* Ignorar erros de leitura contínua */ }
      );
      return () => {
        try { scanner.clear(); } catch (e) { console.error(e); }
      };
    }
  }, [showScanner]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    try {
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

      await updateDoc(doc(db, 'users', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates });
      setMessage({ type: 'success', text: "Perfil atualizado!" });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setView('terminal');
    } catch (err: any) {
      alert("Erro ao atualizar perfil.");
    } finally {
      setIsLoading(false);
    }
  };

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
      await updateDoc(doc(db, 'users', currentUser.id), { operators: arrayUnion(newOp) });
      setCurrentUser({ ...currentUser, operators: [...(currentUser.operators || []), newOp] });
      setNewOpName(''); setNewOpPass('');
    } catch (error) { alert("Erro ao adicionar operador."); }
  };

  const processAction = async (type: 'earn' | 'redeem') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !documentNumber || !currentUser) return alert("Preencha todos os campos.");
    if (type === 'redeem' && val > stats.available) return alert(`Saldo insuficiente na conta do lojista!`);

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
    <div className="min-h-screen bg-[#f6f9fc] pb-12 font-sans">
      <div className="max-w-7xl mx-auto p-4 lg:p-10">
        
        {/* HEADER BRUTALISTA */}
        <header className="bg-[#0a2540] p-8 rounded-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-10 gap-8 border-b-4 border-[#00d66f] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Store size={150} className="rotate-12" />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-[#00d66f] rounded-3xl flex items-center justify-center text-[#0a2540] shadow-[6px_6px_0px_rgba(255,255,255,0.1)] rotate-3">
              <Store size={40} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                {currentUser?.name}
              </h2>
              <p className="text-[11px] font-black text-[#00d66f] uppercase tracking-[0.3em] mt-3 bg-white/5 py-1 px-3 rounded-full inline-block">
                NIF: {currentUser?.nif} • LOJA PARCEIRA
              </p>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-3 bg-white/5 p-3 rounded-[24px] backdrop-blur-md relative z-10">
            {[
              { id: 'terminal', icon: LayoutDashboard, label: 'Terminal' },
              { id: 'history', icon: History, label: 'Movimentos' },
              { id: 'profile', icon: UserCircle, label: 'Perfil' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setView(item.id as any); setShowOpManager(false); }} 
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all ${view === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
              >
                <item.icon size={18} strokeWidth={3} /> {item.label}
              </button>
            ))}
            <button onClick={() => setShowOpManager(!showOpManager)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all ${showOpManager ? 'bg-white text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>
              <Users size={18} strokeWidth={3} /> Equipa
            </button>
            <button onClick={() => logout()} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all">
              <LogOut size={18} strokeWidth={3} />
            </button>
          </nav>
        </header>

        {/* GESTÃO DE OPERADORES */}
        {showOpManager && (
          <div className="bg-white p-10 rounded-[48px] shadow-xl border-2 border-slate-100 mb-10 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-[#0a2540] p-3 rounded-xl text-white">
                <Users size={24} />
              </div>
              <h3 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">Equipa de Vendas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome do Colaborador</label>
                <input placeholder="EX: MARIA SILVA" value={newOpName} onChange={e => setNewOpName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase text-sm outline-none focus:border-[#00d66f] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">PIN de Acesso</label>
                <input placeholder="****" type="password" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-[#00d66f] transition-all" />
              </div>
              <div className="flex items-end">
                <button onClick={handleAddOperator} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg active:scale-95">Registar Operador</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentUser?.operators?.map((op: any) => (
                <div key={op.id} className="p-6 border-2 border-slate-100 bg-white rounded-[32px] flex justify-between items-center group hover:border-[#0a2540] transition-all shadow-sm">
                  <div>
                    <p className="font-black text-[#0a2540] text-sm uppercase tracking-tighter">{op.name}</p>
                    <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-widest mt-1">Operador Ativo</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-[#0a2540] group-hover:text-white transition-all shadow-inner">
                    <UserCircle size={24} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TERMINAL VIEW */}
        {view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white p-10 md:p-14 rounded-[56px] shadow-xl border-2 border-slate-100 space-y-12">
              
              <div className="space-y-6">
                <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[#0a2540]">1</div>
                  Identificar Cliente (NIF)
                </label>
                <div className="flex gap-4">
                  <input 
                    value={cardNumber} 
                    onChange={e => setCardNumber(e.target.value)} 
                    placeholder="999 999 999" 
                    className="flex-grow p-8 bg-slate-50 border-4 border-slate-100 rounded-[32px] text-4xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all placeholder:text-slate-200" 
                  />
                  <button 
                    onClick={() => setShowScanner(true)} 
                    className="bg-[#0a2540] px-10 rounded-[32px] text-[#00d66f] hover:bg-black active:scale-90 transition-all shadow-2xl border-b-8 border-black/20"
                  >
                    <Camera size={40} strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[#0a2540]">2</div>
                    Valor da Venda (€)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-[32px] text-5xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all placeholder:text-slate-200" 
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">€</div>
                  </div>
                </div>
                <div className="space-y-6">
                  <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-[0.2em] ml-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[#0a2540]">3</div>
                    Nº Fatura / Doc
                  </label>
                  <input 
                    value={documentNumber} 
                    onChange={e => setDocumentNumber(e.target.value)} 
                    placeholder="FT 2026/01" 
                    className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-[32px] text-3xl font-black uppercase text-[#0a2540] outline-none focus:border-[#00d66f] focus:bg-white transition-all placeholder:text-slate-200" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <button 
                onClick={() => processAction('earn')} 
                disabled={isLoading}
                className="group relative bg-[#00d66f] p-12 rounded-[56px] text-[#0a2540] transition-all hover:scale-[1.02] shadow-[0_30px_60px_rgba(0,214,111,0.2)] flex flex-col items-center gap-6 active:scale-95 border-b-8 border-black/10 disabled:opacity-50"
              >
                <div className="bg-white/30 p-5 rounded-3xl group-hover:rotate-12 transition-transform shadow-sm">
                  <Coins size={48} strokeWidth={3} />
                </div>
                <span className="font-black text-2xl uppercase italic text-center leading-none tracking-tighter">
                  Atribuir<br/>Cashback
                </span>
              </button>

              <button 
                onClick={() => processAction('redeem')} 
                disabled={isLoading}
                className="group bg-[#0a2540] p-12 rounded-[56px] text-white transition-all hover:bg-black shadow-2xl flex flex-col items-center gap-6 active:scale-95 border-b-8 border-black/40 disabled:opacity-50"
              >
                <div className="bg-white/10 p-5 rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
                  <Gift size={48} className="text-[#00d66f]" strokeWidth={3} />
                </div>
                <span className="font-black text-2xl uppercase italic text-center leading-none tracking-tighter text-[#00d66f]">
                  Utilizar<br/>Saldo
                </span>
              </button>

              {message.text && (
                <div className={`p-8 rounded-[32px] font-black text-center text-sm uppercase flex items-center justify-center gap-4 animate-bounce shadow-lg ${
                  message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo Total Emitido</p>
                  <h3 className="text-5xl font-black text-[#0a2540] mt-3 italic tracking-tighter">{stats.theoretical.toFixed(2)}€</h3>
                </div>
                <Coins size={100} className="text-slate-50 absolute -right-6 -bottom-6 rotate-12" />
              </div>
              <div className="bg-[#0a2540] p-10 rounded-[48px] text-white shadow-2xl flex items-center justify-between overflow-hidden relative border-b-8 border-[#00d66f]">
                <div className="relative z-10">
                  <p className="text-[11px] font-black text-[#00d66f] uppercase tracking-[0.2em]">Saldo Disponível p/ Resgate</p>
                  <h3 className="text-5xl font-black text-[#00d66f] mt-3 italic tracking-tighter">{stats.available.toFixed(2)}€</h3>
                </div>
                <ShieldCheck size={100} className="text-white/5 absolute -right-6 -bottom-6 -rotate-12" />
              </div>
            </div>

            <div className="bg-white p-10 rounded-[56px] shadow-xl border-2 border-slate-100">
              <div className="flex flex-wrap gap-8 mb-12 items-end">
                <div className="flex-grow min-w-[300px] space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Pesquisa por NIF</label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input value={filterNif} onChange={e => setFilterNif(e.target.value)} placeholder="Procurar cliente..." className="w-full p-5 pl-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] transition-all" />
                  </div>
                </div>
                <div className="w-64 space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 block">Tipo</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[#0a2540] outline-none cursor-pointer focus:border-[#00d66f]">
                    <option value="all">TODOS</option>
                    <option value="earn">GANHOS</option>
                    <option value="redeem">RESGATES</option>
                  </select>
                </div>
                <button onClick={handleExportCSV} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-3 active:scale-95">
                  <Download size={20} /> Exportar CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-4 border-slate-50 text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">
                      <th className="pb-8 pl-6">Data</th>
                      <th className="pb-8">Cliente (NIF)</th>
                      <th className="pb-8">Documento</th>
                      <th className="pb-8 text-right pr-6">Cashback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.map((t, idx) => (
                      <tr key={idx} className="text-sm font-black text-[#0a2540] hover:bg-slate-50 transition-colors group">
                        <td className="py-8 pl-6 text-slate-400 font-bold">{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}</td>
                        <td className="py-8">{t.clientId}</td>
                        <td className="py-8 uppercase italic tracking-tighter text-slate-400 group-hover:text-[#0a2540] transition-colors">{t.documentNumber}</td>
                        <td className={`py-8 text-right pr-6 font-black text-xl italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
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
          <div className="max-w-3xl mx-auto bg-white p-12 md:p-16 rounded-[56px] border-2 border-slate-100 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none">Configurações</h3>
              <p className="text-[11px] font-black text-[#00d66f] uppercase tracking-[0.3em] mt-4">Gestão do Estabelecimento</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-4">Nome da Loja</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-[#0a2540] outline-none focus:border-[#0a2540] transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-4">Email de Contacto</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-[#0a2540] outline-none focus:border-[#0a2540] transition-all" />
                </div>
              </div>
              <div className="p-10 bg-[#00d66f]/5 rounded-[40px] border-4 border-[#00d66f]/20 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Clock size={80} className="text-[#00d66f]" />
                </div>
                <label className="text-[11px] font-black text-[#00d66f] uppercase tracking-widest ml-4 block flex items-center gap-2 relative z-10">
                  <Clock size={16} strokeWidth={3} /> Taxa de Cashback (%)
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={editCashback} 
                  onChange={e => setEditCashback(parseFloat(e.target.value))} 
                  className="w-full p-8 bg-white border-4 border-[#00d66f] rounded-[32px] font-black text-5xl text-[#00d66f] outline-none text-center shadow-inner relative z-10" 
                />
                <p className="text-[10px] text-slate-400 font-black text-center uppercase tracking-tighter relative z-10">A nova taxa será aplicada automaticamente às 00:00 do próximo dia.</p>
              </div>
              <button disabled={isLoading} className="w-full bg-[#0a2540] text-[#00d66f] p-8 rounded-[32px] font-black uppercase tracking-widest text-sm hover:bg-black transition-all shadow-2xl active:scale-95 border-b-8 border-black/30">
                {isLoading ? 'A GUARDAR...' : 'CONFIRMAR ALTERAÇÕES'}
              </button>
            </form>
          </div>
        )}

        {/* SCANNER MODAL */}
        {showScanner && (
          <div className="fixed inset-0 bg-[#0a2540]/98 backdrop-blur-3xl z-50 p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-[64px] shadow-[0_0_100px_rgba(0,214,111,0.4)] w-full max-w-xl relative border-8 border-[#00d66f] animate-in zoom-in-90">
              <div className="mb-8 text-center">
                <h4 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">Ler QR Code Vizinho+</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Aponte a câmara para o código do cliente</p>
              </div>
              <div id="reader" className="w-full overflow-hidden rounded-[40px] border-4 border-slate-100"></div>
              <button 
                onClick={() => setShowScanner(false)} 
                className="w-full bg-red-500 text-white p-8 font-black uppercase tracking-widest text-xs mt-8 rounded-[32px] hover:bg-red-600 transition-all shadow-xl active:scale-95 border-b-8 border-black/20"
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