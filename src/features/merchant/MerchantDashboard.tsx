// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../../types';
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
  Store,
  XCircle,
  CheckCircle2,
  Search
} from 'lucide-react';

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, subscribeToTransactions, logout, setCurrentUser } = useStore();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'terminal' | 'history' | 'profile'>('terminal');
  const [showOpManager, setShowOpManager] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [filterNif, setFilterNif] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [newOpName, setNewOpName] = useState('');
  const [newOpPass, setNewOpPass] = useState('');

  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editCashback, setEditCashback] = useState<number>(currentUser?.cashbackPercent || 0);

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('merchant', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.id, subscribeToTransactions]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text) => {
          setCardNumber(text);
          setShowScanner(false);
          scanner.clear();
        },
        () => {}
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
      const updates = {
        name: editName,
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim(),
        cashbackPercent: editCashback
      };
      await updateDoc(doc(db, 'users', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates });
      setMessage({ type: 'success', text: "Perfil atualizado!" });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setView('terminal');
    } catch (err) {
      alert("Erro ao atualizar perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const matchNif = filterNif ? (t.clientNif || "").includes(filterNif) : true;
      const matchType = filterType === 'all' ? true : t.type === filterType;
      return matchNif && matchType;
    });
  }, [transactions, filterNif, filterType]);

  const handleExportCSV = () => {
    const headers = "Data,Cliente,Documento,Tipo,Valor Original,Cashback\n";
    const rows = filteredHistory.map(t => {
      const date = t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---';
      return `${date},${t.clientNif || t.clientId},${t.documentNumber || ''},${t.type},${t.amount}€,${t.cashbackAmount}€`;
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
    const cleanNif = cardNumber.trim().replace(/\s/g, '');

    if (!cleanNif || isNaN(val) || val <= 0 || !documentNumber || !currentUser) {
      return alert("Preencha todos os campos corretamente.");
    }

    try {
      setIsLoading(true);

      // Procurar cliente pelo NIF
      const q = query(collection(db, 'users'), where('nif', '==', cleanNif), where('role', '==', 'client'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setIsLoading(false);
        return alert("NIF não encontrado. O cliente deve registar-se na App Vizinho+ primeiro.");
      }

      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data();
      const clientId = clientDoc.id;

      // Se for resgate, verificar saldo
      if (type === 'redeem') {
        const availableBalance = clientData.wallet?.available || 0;
        if (val > availableBalance) {
          setIsLoading(false);
          return alert(`Saldo insuficiente! O cliente tem apenas ${availableBalance.toFixed(2)}€ disponíveis.`);
        }
      }

      const transactionData: Omit<Transaction, 'id'> = {
        clientId: clientId,
        clientNif: cleanNif,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+',
        amount: type === 'earn' ? val : 0,
        cashbackAmount: type === 'earn' ? (val * ((currentUser.cashbackPercent || 0) / 100)) : val,
        type: type,
        documentNumber: documentNumber,
        operatorCode: 'LOJA', 
        status: type === 'earn' ? 'pending' : 'available',
        createdAt: Timestamp.now()
      };

      await addTransaction(transactionData as Transaction);

      setMessage({ type: 'success', text: "Operação Concluída com Sucesso!" });
      setAmount(''); setDocumentNumber(''); setCardNumber('');
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) { 
      console.error(error);
      alert("Erro ao processar. Tente novamente."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* HEADER BRUTALISTA */}
        <header className="bg-[#0f172a] p-8 rounded-[32px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Store size={120} className="rotate-12 text-white" />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-[#00d66f] rounded-2xl flex items-center justify-center text-[#0f172a] rotate-3 shadow-lg">
              <Store size={32} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                {currentUser?.name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black text-[#00d66f] uppercase bg-[#00d66f]/10 py-1 px-3 rounded-full border border-[#00d66f]/20">
                  NIF: {currentUser?.nif}
                </span>
                <span className="text-[10px] font-black text-white/50 uppercase">
                  v2.0 Stable
                </span>
              </div>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md relative z-10">
            {[
              { id: 'terminal', icon: LayoutDashboard, label: 'Terminal' },
              { id: 'history', icon: History, label: 'Vendas' },
              { id: 'profile', icon: UserCircle, label: 'Config' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setView(item.id as any); setShowOpManager(false); }} 
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === item.id ? 'bg-[#00d66f] text-[#0f172a] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
              >
                <item.icon size={16} strokeWidth={3} /> {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </nav>
        </header>

        {/* TERMINAL DE VENDAS */}
        {view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-xl border-2 border-slate-100">
              <div className="space-y-10">
                
                {/* INPUT NIF */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest">
                    <Search size={14} /> Identificar Cliente (NIF)
                  </label>
                  <div className="flex gap-4">
                    <input 
                      value={cardNumber} 
                      onChange={e => setCardNumber(e.target.value)} 
                      placeholder="000000000" 
                      className="flex-grow p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-3xl font-black text-[#0f172a] outline-none focus:border-[#00d66f] transition-all" 
                    />
                    <button 
                      onClick={() => setShowScanner(true)} 
                      className="bg-[#0f172a] px-8 rounded-3xl text-[#00d66f] hover:bg-black transition-all"
                    >
                      <Camera size={32} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* VALOR VENDA */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                      Valor Total da Venda (€)
                    </label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0f172a] outline-none focus:border-[#00d66f]" 
                    />
                  </div>
                  {/* DOCUMENTO */}
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                      Nº Fatura / Recibo
                    </label>
                    <input 
                      value={documentNumber} 
                      onChange={e => setDocumentNumber(e.target.value)} 
                      placeholder="Ex: FT/123" 
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black uppercase text-[#0f172a] outline-none focus:border-[#00d66f]" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => processAction('earn')} 
                disabled={isLoading}
                className="flex-1 bg-[#00d66f] p-8 rounded-[40px] text-[#0f172a] transition-all hover:scale-[1.02] shadow-xl flex flex-col items-center justify-center gap-4 disabled:opacity-50"
              >
                <Coins size={48} strokeWidth={3} />
                <span className="font-black text-xl uppercase italic tracking-tighter">Atribuir Cashback</span>
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">({currentUser?.cashbackPercent}% de retorno)</span>
              </button>

              <button 
                onClick={() => processAction('redeem')} 
                disabled={isLoading}
                className="flex-1 bg-[#0f172a] p-8 rounded-[40px] text-white transition-all hover:bg-black shadow-xl flex flex-col items-center justify-center gap-4 disabled:opacity-50"
              >
                <Gift size={48} className="text-[#00d66f]" strokeWidth={3} />
                <span className="font-black text-xl uppercase italic tracking-tighter text-[#00d66f]">Utilizar Saldo</span>
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">(Desconto Imediato)</span>
              </button>

              {message.text && (
                <div className={`p-6 rounded-3xl font-black text-center text-sm uppercase flex items-center justify-center gap-3 animate-pulse shadow-lg ${
                  message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          /* HISTÓRICO DE VENDAS */
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 animate-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter">Últimos Movimentos</h3>
              <div className="flex gap-2">
                <input 
                  placeholder="FILTRAR NIF..." 
                  value={filterNif}
                  onChange={e => setFilterNif(e.target.value)}
                  className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-[#00d66f]"
                />
                <button onClick={handleExportCSV} className="bg-[#0f172a] text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4">Data</th>
                    <th className="pb-4">Cliente (NIF)</th>
                    <th className="pb-4">Documento</th>
                    <th className="pb-4 text-right">Valor</th>
                    <th className="pb-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length > 0 ? filteredHistory.map((t, idx) => (
                    <tr key={idx} className="text-xs font-bold text-[#0f172a] hover:bg-slate-50 transition-colors">
                      <td className="py-4 text-slate-400 font-medium">
                        {t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---'}
                      </td>
                      <td className="py-4 font-black">{t.clientNif}</td>
                      <td className="py-4 uppercase text-slate-400">{t.documentNumber}</td>
                      <td className="py-4 text-right">{t.amount > 0 ? `${t.amount.toFixed(2)}€` : '---'}</td>
                      <td className={`py-4 text-right font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount?.toFixed(2)}€
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-300 font-black uppercase text-xs">Sem movimentos registados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CONFIGURAÇÕES DO PERFIL */
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-2xl">
            <h3 className="text-2xl font-black text-[#0f172a] uppercase italic tracking-tighter mb-8 text-center">Configurações da Loja</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome Comercial</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00d66f] outline-none" />
              </div>
              <div className="p-6 bg-[#00d66f]/5 rounded-3xl border-2 border-[#00d66f]/20">
                <label className="text-[10px] font-black text-[#00d66f] uppercase mb-2 block">Percentagem de Cashback (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={editCashback} 
                    onChange={e => setEditCashback(parseFloat(e.target.value))} 
                    className="flex-grow text-4xl font-black text-[#00d66f] bg-transparent outline-none" 
                  />
                  <div className="text-[#00d66f] font-black text-2xl">%</div>
                </div>
                <p className="text-[9px] text-[#00d66f]/60 font-bold uppercase mt-2 tracking-widest">Este valor será aplicado a todas as novas vendas.</p>
              </div>
              <button disabled={isLoading} className="w-full bg-[#0f172a] text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                {isLoading ? 'A Guardar...' : 'Atualizar Perfil'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* SCANNER OVERLAY */}
      {showScanner && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f]">
            <div id="reader" className="w-full overflow-hidden rounded-3xl"></div>
            <button onClick={() => setShowScanner(false)} className="w-full bg-red-500 text-white p-5 font-black uppercase mt-6 rounded-2xl shadow-lg">Cancelar Leitura</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;