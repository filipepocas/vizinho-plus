import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Transaction, User as UserProfile } from '../../types';
import { 
  LayoutDashboard, 
  History, 
  UserCircle, 
  LogOut, 
  Camera, 
  Coins, 
  Gift, 
  Download, 
  Store,
  XCircle,
  CheckCircle2,
  Search,
  AlertCircle,
  User,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, subscribeToTransactions, logout, setCurrentUser } = useStore();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'terminal' | 'history' | 'profile'>('terminal');
  const [showScanner, setShowScanner] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Dados do cliente identificado
  const [foundClient, setFoundClient] = useState<any>(null);

  const [filterNif, setFilterNif] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editCashback, setEditCashback] = useState<number>(currentUser?.cashbackPercent || 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatNIF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
  };

  // CÁLCULO DE CASHBACK A ATRIBUIR
  const liveCashback = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return 0;
    return val * ((currentUser?.cashbackPercent || 0) / 100);
  }, [amount, currentUser?.cashbackPercent]);

  // SALDO DO CLIENTE NESTA LOJA ESPECÍFICA
  const clientStoreBalance = useMemo(() => {
    if (!foundClient || !currentUser?.id) return 0;
    return foundClient.storeWallets?.[currentUser.id]?.available || 0;
  }, [foundClient, currentUser?.id]);

  const isNifValid = useMemo(() => {
    const cleanNif = cardNumber.trim().replace(/\s/g, '');
    return /^[0-9]{9}$/.test(cleanNif);
  }, [cardNumber]);

  // BUSCA DE CLIENTE E SEUS SALDOS
  useEffect(() => {
    const searchClient = async () => {
      const cleanNif = cardNumber.trim().replace(/\s/g, '');
      if (cleanNif.length === 9) {
        try {
          const q = query(collection(db, 'users'), where('nif', '==', cleanNif), where('role', '==', 'client'));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setFoundClient({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setFoundClient(null);
          }
        } catch (err) {
          console.error("Erro na busca:", err);
          setFoundClient(null);
        }
      } else {
        setFoundClient(null);
      }
    };
    searchClient();
  }, [cardNumber]);

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
          setCardNumber(formatNIF(text));
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

  const handleFirebaseError = (error: any, defaultMsg: string) => {
    console.error("Erro Firebase:", error);
    setMessage({ type: 'error', text: !navigator.onLine ? "Sem ligação à internet." : defaultMsg });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const updates = {
        name: editName,
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim().replace(/\s/g, ''),
        cashbackPercent: editCashback
      };
      await updateDoc(doc(db, 'users', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates } as UserProfile);
      setMessage({ type: 'success', text: "Perfil atualizado!" });
      setTimeout(() => { setMessage({ type: '', text: '' }); setView('terminal'); }, 2000);
    } catch (err) {
      handleFirebaseError(err, "Erro ao atualizar perfil.");
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
      const cleanFilter = filterNif.replace(/\s/g, '');
      const matchNif = cleanFilter ? (t.clientNif || "").includes(cleanFilter) : true;
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

  const processAction = async (type: 'earn' | 'redeem' | 'cancel') => {
    const val = parseFloat(amount);
    const cleanNif = cardNumber.trim().replace(/\s/g, '');

    if (!isNifValid || !foundClient) {
      setMessage({ type: 'error', text: "Identifique um cliente válido primeiro." });
      return;
    }
    
    if (isNaN(val) || val <= 0 || !documentNumber || !currentUser) {
      setMessage({ type: 'error', text: "Preencha o valor e fatura corretamente." });
      return;
    }

    // VALIDAÇÃO CRÍTICA: Se for resgate, o cliente tem saldo nesta loja?
    if (type === 'redeem' && val > clientStoreBalance) {
      setMessage({ type: 'error', text: `Saldo insuficiente nesta loja. Disponível: ${formatCurrency(clientStoreBalance)}` });
      return;
    }

    try {
      setIsLoading(true);

      const transactionData = {
        clientId: foundClient.id,
        clientNif: cleanNif,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+',
        amount: type === 'earn' || type === 'cancel' ? val : 0,
        cashbackAmount: type === 'earn' || type === 'cancel' 
          ? (val * ((currentUser.cashbackPercent || 0) / 100)) 
          : val,
        cashbackPercent: currentUser.cashbackPercent,
        type: type,
        documentNumber: documentNumber,
        operatorCode: 'LOJA', 
        status: type === 'earn' ? 'pending' : (type === 'cancel' ? 'cancelled' : 'available'),
        createdAt: Timestamp.now()
      };

      await addTransaction(transactionData as any);

      setMessage({ type: 'success', text: "Operação Concluída!" });
      setAmount(''); setDocumentNumber(''); setCardNumber(''); setFoundClient(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error: any) { 
      handleFirebaseError(error, error.message || "Erro ao processar.");
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* HEADER */}
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
                  NIF: {formatNIF(currentUser?.nif || '')}
                </span>
                <span className="text-[10px] font-black text-white/50 uppercase">
                  v2.5 Multi-Wallet System
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
                onClick={() => setView(item.id as any)} 
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
                  <div className="flex justify-between items-center px-2">
                    <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest">
                      <Search size={14} /> Identificar Cliente (NIF)
                    </label>
                    {cardNumber.length > 0 && (
                      <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isNifValid ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {isNifValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {isNifValid ? 'NIF Válido' : 'Precisa de 9 dígitos'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      value={cardNumber} 
                      onChange={e => setCardNumber(formatNIF(e.target.value))} 
                      placeholder="000 000 000" 
                      className={`flex-grow p-6 bg-slate-50 border-4 rounded-3xl text-3xl font-black text-[#0f172a] outline-none transition-all ${
                        cardNumber.length === 0 
                          ? 'border-slate-100' 
                          : isNifValid 
                            ? 'border-[#00d66f]' 
                            : 'border-red-100 focus:border-red-500'
                      }`} 
                    />
                    <button 
                      onClick={() => setShowScanner(true)} 
                      className="bg-[#0f172a] px-8 rounded-3xl text-[#00d66f] hover:bg-black transition-all shadow-lg"
                    >
                      <Camera size={32} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">
                      Valor da Fatura (€)
                    </label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0f172a] outline-none focus:border-[#00d66f]" 
                    />
                    {parseFloat(amount) > 0 && (
                      <div className="flex items-center gap-3 bg-[#00d66f]/10 p-4 rounded-2xl border-2 border-[#00d66f]/20 animate-in zoom-in">
                        <ArrowRight size={16} className="text-[#00d66f]" />
                        <span className="text-[11px] font-black uppercase text-[#0f172a]">
                          Retorno de <span className="text-[#00d66f] text-sm">{formatCurrency(liveCashback)}</span> para o cliente
                        </span>
                      </div>
                    )}
                  </div>
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

            <div className="flex flex-col gap-4">
              {/* CARD DE INFORMAÇÃO DO CLIENTE COM SALDO LOCAL */}
              {isNifValid && (
                <div className={`p-6 rounded-[32px] border-4 transition-all animate-in zoom-in duration-300 flex flex-col items-center gap-2 ${foundClient ? 'bg-white border-[#00d66f] shadow-lg' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <div className={`p-3 rounded-2xl ${foundClient ? 'bg-[#00d66f] text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <User size={24} strokeWidth={3} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente:</p>
                    <h4 className={`text-lg font-black uppercase italic ${foundClient ? 'text-[#0f172a]' : 'text-slate-400'}`}>
                      {foundClient?.name || 'Não registado'}
                    </h4>
                    {foundClient && (
                      <div className="mt-2 py-1 px-4 bg-[#0a2540] rounded-full">
                        <p className="text-[10px] font-black text-white uppercase">Saldo nesta Loja:</p>
                        <p className="text-sm font-black text-[#00d66f]">{formatCurrency(clientStoreBalance)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button 
                onClick={() => processAction('earn')} 
                disabled={isLoading || !isNifValid || !foundClient}
                className="flex-1 bg-[#00d66f] p-6 rounded-[32px] text-[#0f172a] transition-all hover:scale-[1.02] shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
              >
                <Coins size={32} strokeWidth={3} />
                <span className="font-black text-lg uppercase italic tracking-tighter">Atribuir Cashback</span>
              </button>

              <button 
                onClick={() => processAction('redeem')} 
                disabled={isLoading || !isNifValid || !foundClient || clientStoreBalance <= 0}
                className="flex-1 bg-[#0f172a] p-6 rounded-[32px] text-white transition-all hover:bg-black shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
              >
                <Gift size={32} className="text-[#00d66f]" strokeWidth={3} />
                <span className="font-black text-lg uppercase italic tracking-tighter text-[#00d66f]">Utilizar Saldo Loja</span>
              </button>

              <button 
                onClick={() => processAction('cancel')} 
                disabled={isLoading || !isNifValid || !foundClient}
                className="flex-1 bg-white p-6 rounded-[32px] text-red-500 border-4 border-red-500 transition-all hover:bg-red-50 shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
              >
                <RotateCcw size={32} strokeWidth={3} />
                <span className="font-black text-lg uppercase italic tracking-tighter">Anular Compra</span>
              </button>

              {message.text && (
                <div className={`p-5 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-in slide-in-from-top-4 shadow-xl border-b-4 ${
                  message.type === 'success' ? 'bg-green-500 text-white border-green-700' : 'bg-red-500 text-white border-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={16} strokeWidth={3} /> : <XCircle size={16} strokeWidth={3} />}
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 animate-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter">Últimos Movimentos</h3>
              <div className="flex gap-2">
                <input 
                  placeholder="FILTRAR NIF..." 
                  value={filterNif}
                  onChange={e => setFilterNif(formatNIF(e.target.value))}
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
                    <th className="pb-4">Tipo</th>
                    <th className="pb-4 text-right">Valor Original</th>
                    <th className="pb-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length > 0 ? filteredHistory.map((t, idx) => (
                    <tr key={idx} className="text-xs font-bold text-[#0f172a] hover:bg-slate-50 transition-colors">
                      <td className="py-4 text-slate-400 font-medium">
                        {t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---'}
                      </td>
                      <td className="py-4 font-black">{formatNIF(t.clientNif || '')}</td>
                      <td className="py-4 uppercase text-slate-400">{t.documentNumber}</td>
                      <td className="py-4 uppercase">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black ${
                          t.type === 'earn' ? 'bg-green-100 text-green-600' : 
                          t.type === 'redeem' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {t.type === 'earn' ? 'Atribuição' : t.type === 'redeem' ? 'Utilização' : 'Anulação'}
                        </span>
                      </td>
                      <td className="py-4 text-right">{t.amount > 0 ? formatCurrency(t.amount) : '---'}</td>
                      <td className={`py-4 text-right font-black ${
                        t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'
                      }`}>
                        {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount || 0)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-300 font-black uppercase text-xs">Sem movimentos registados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-2xl">
            <h3 className="text-2xl font-black text-[#0f172a] uppercase italic tracking-tighter mb-8 text-center">Configurações da Loja</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome Comercial</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00d66f] outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Telefone de Contacto</label>
                <input 
                  value={editPhone} 
                  onChange={e => setEditPhone(formatPhone(e.target.value))} 
                  placeholder="912 345 678"
                  className="w-full p-5 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00d66f] outline-none" 
                />
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
              </div>
              <button disabled={isLoading} className="w-full bg-[#0f172a] text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                {isLoading ? 'A Guardar...' : 'Atualizar Perfil'}
              </button>
            </form>
          </div>
        )}
      </div>

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