import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { TransactionCreate, User as UserProfile } from '../../types';
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
  RotateCcw,
  LifeBuoy,
  Users,
  Loader2,
  Mail,
  AlertTriangle
} from 'lucide-react';

// URL Estável do Logótipo no Firebase Storage
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus.png?alt=media";
const WATERMARK_URL = "https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media";

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, subscribeToTransactions, logout, setCurrentUser } = useStore();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'terminal' | 'history' | 'profile' | 'customers'>('terminal');
  const [showScanner, setShowScanner] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [foundClient, setFoundClient] = useState<any>(null);
  const [merchantCustomers, setMerchantCustomers] = useState<any[]>([]);
  const [filterNif, setFilterNif] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editCashback, setEditCashback] = useState<number>(currentUser?.cashbackPercent || 0);
  const [supportEmail, setSupportEmail] = useState('suporte@vizinhoplus.pt');

  // ESTADOS PARA DUPLA CONFIRMAÇÃO
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'earn' | 'redeem' | 'cancel',
    val: number,
    cashback: number
  } | null>(null);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  
  const formatNIF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 9) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
    }
    return digits;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
  };

  const liveCashback = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return 0;
    return val * ((currentUser?.cashbackPercent || 0) / 100);
  }, [amount, currentUser?.cashbackPercent]);

  const clientStoreBalance = useMemo(() => {
    if (!foundClient || !currentUser?.id) return 0;
    return foundClient.storeWallets?.[currentUser.id]?.available || 0;
  }, [foundClient, currentUser?.id]);

  const isNifValid = useMemo(() => {
    const cleanNif = cardNumber.trim().replace(/\s/g, '');
    return /^[0-9]{9}$/.test(cleanNif);
  }, [cardNumber]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system', 'config'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.supportEmail) setSupportEmail(data.supportEmail);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentUser?.id || view !== 'customers') return;
      try {
        setIsLoading(true);
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where(`storeWallets.${currentUser.id}.available`, '>', 0)
        );
        const snap = await getDocs(q);
        const customers = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMerchantCustomers(customers);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [currentUser?.id, view]);

  useEffect(() => {
    const searchClient = async () => {
      const cleanNif = cardNumber.trim().replace(/\s/g, '');
      if (cleanNif.length === 9) {
        setIsSearching(true);
        try {
          const q = query(
            collection(db, 'users'),
            where('nif', '==', cleanNif),
            where('role', '==', 'client')
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setFoundClient({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setFoundClient(null);
          }
        } catch (err) {
          console.error("Erro na pesquisa:", err);
          setFoundClient(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setFoundClient(null);
      }
    };

    const timer = setTimeout(searchClient, 500);
    return () => clearTimeout(timer);
  }, [cardNumber]);

  useEffect(() => {
    let unsubscribe: () => void;
    if (currentUser?.id) {
      unsubscribe = subscribeToTransactions('merchant', currentUser.id);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.id, subscribeToTransactions]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: 250 },
        false
      );

      scanner.render((text) => {
        const cleanText = text.replace(/\D/g, '').slice(0, 9);
        setCardNumber(formatNIF(cleanText));
        setShowScanner(false);
        scanner.clear();
      }, (error) => {});

      return () => {
        try { scanner.clear(); } catch (e) {}
      };
    }
  }, [showScanner]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const processAction = async (type: 'earn' | 'redeem' | 'cancel') => {
    if (isLoading) return;
    const val = parseFloat(amount);
    
    if (!isNifValid || !foundClient) {
      setMessage({ type: 'error', text: "Identifique um cliente válido primeiro." });
      return;
    }
    
    if (isNaN(val) || val <= 0 || !documentNumber || !currentUser) {
      setMessage({ type: 'error', text: "Preencha o valor e o número da fatura corretamente." });
      return;
    }

    if (type === 'redeem' && val > clientStoreBalance) {
      setMessage({ type: 'error', text: `Saldo insuficiente. O cliente apenas tem ${formatCurrency(clientStoreBalance)} nesta loja.` });
      return;
    }

    const cashbackPercent: number = currentUser.cashbackPercent ?? 0;
    const calcCashback = type === 'earn' || type === 'cancel' ? (val * (cashbackPercent / 100)) : val;

    setPendingAction({ type, val, cashback: calcCashback });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || !currentUser || !foundClient) return;
    setShowConfirmModal(false);
    setIsLoading(true);

    try {
      const transactionData: any = {
        clientId: foundClient.id,
        clientName: foundClient.name,
        clientNif: foundClient.nif,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+',
        amount: pendingAction.val,
        cashbackAmount: pendingAction.cashback,
        cashbackPercent: currentUser.cashbackPercent ?? 0,
        type: pendingAction.type,
        documentNumber: documentNumber,
        createdAt: Timestamp.now()
      };
      await addTransaction(transactionData);
      
      setMessage({ 
        type: 'success', 
        text: pendingAction.type === 'earn' ? "Cashback atribuído com sucesso!" : (pendingAction.type === 'cancel' ? "Venda anulada com sucesso!" : "Saldo utilizado com sucesso!") 
      });
      setAmount('');
      setDocumentNumber('');
      setCardNumber('');
      setFoundClient(null);
      setPendingAction(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error: any) {
      console.error("Erro ao processar:", error);
      setMessage({ type: 'error', text: "Erro ao processar a operação. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return transactions.filter(t => {
      const cleanFilter = filterNif.replace(/\s/g, '');
      const clientNif = (t as any).clientNif || "";
      const matchNif = cleanFilter ? clientNif.includes(cleanFilter) : true;
      const matchType = filterType === 'all' ? true : t.type === filterType;
      return matchNif && matchType;
    });
  }, [transactions, filterNif, filterType]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isLoading) return;
    setIsLoading(true);
    try {
      const effectiveAt = new Date();
      effectiveAt.setDate(effectiveAt.getDate() + 1);
      effectiveAt.setHours(0, 0, 0, 0);

      const updates = {
        name: editName,
        email: editEmail.toLowerCase().trim(),
        phone: editPhone.trim().replace(/\s/g, ''),
        pendingCashbackPercent: editCashback,
        pendingCashbackEffectiveAt: Timestamp.fromDate(effectiveAt)
      };

      await updateDoc(doc(db, 'users', currentUser.id), updates);
      setCurrentUser({ ...currentUser, ...updates } as UserProfile);
      setMessage({ type: 'success', text: "Perfil atualizado! A nova percentagem entra em vigor amanhã às 00:00." });
      setTimeout(() => {
        setMessage({ type: '', text: '' });
        setView('terminal');
      }, 2000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "Erro ao atualizar perfil." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ 
        backgroundImage: `url('${WATERMARK_URL}')`,
        backgroundSize: '200px',
        backgroundRepeat: 'repeat'
      }} />

      <div className="max-w-7xl mx-auto p-4 lg:p-8 relative z-10 w-full flex-grow">
        <header className="bg-[#0f172a] p-8 rounded-[32px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f] relative overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
            <div className="flex flex-col items-center">
              <img src={LOGO_URL} alt="Vizinho+" className="h-10 w-auto object-contain mb-2" />
              <div className="h-1 w-full bg-[#00d66f] rounded-full"></div>
            </div>
            <div className="w-[2px] h-12 bg-white/10 mx-2 hidden lg:block"></div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">{currentUser?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-[#00d66f] uppercase bg-[#00d66f]/10 py-1 px-3 rounded-full border border-[#00d66f]/20">LOJA PARCEIRA</span>
                <span className="text-[10px] font-black text-white/40 uppercase">NIF: {formatNIF(currentUser?.nif || '')}</span>
              </div>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md relative z-10">
            <button onClick={() => setView('terminal')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0f172a] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}><LayoutDashboard size={16} strokeWidth={3} /> Terminal</button>
            <button onClick={() => setView('history')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'history' ? 'bg-[#00d66f] text-[#0f172a] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}><History size={16} strokeWidth={3} /> Movimentos</button>
            <button onClick={() => setView('customers')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'customers' ? 'bg-[#00d66f] text-[#0f172a] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}><Users size={16} strokeWidth={3} /> Clientes</button>
            <button onClick={() => setView('profile')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'profile' ? 'bg-[#00d66f] text-[#0f172a] shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}><UserCircle size={16} strokeWidth={3} /> Configurações</button>
            <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20} /></button>
          </nav>
        </header>

        {view === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-xl border-2 border-slate-100">
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest"><Search size={14} /> Identificar Cliente (NIF)</label>
                    {cardNumber.length > 0 && (
                      <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isNifValid ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {isSearching ? <Loader2 size={12} className="animate-spin" /> : isNifValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {isSearching ? 'A pesquisar...' : isNifValid ? 'NIF Válido' : 'O NIF precisa de 9 dígitos'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <input type="text" inputMode="numeric" maxLength={11} disabled={isLoading} value={cardNumber} onChange={e => setCardNumber(formatNIF(e.target.value))} placeholder="000 000 000" className={`flex-grow p-6 bg-slate-50 border-4 rounded-3xl text-3xl font-black text-[#0f172a] outline-none transition-all ${cardNumber.length === 0 ? 'border-slate-100' : isNifValid ? 'border-[#00d66f]' : 'border-red-100 focus:border-red-500'}`} />
                    <button onClick={() => setShowScanner(true)} disabled={isLoading} className="bg-[#0f172a] px-8 rounded-3xl text-[#00d66f] hover:bg-black transition-all shadow-lg"><Camera size={32} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Valor da Fatura (€)</label>
                    <input type="number" value={amount} disabled={isLoading} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0f172a] outline-none focus:border-[#00d66f]" />
                    {parseFloat(amount) > 0 && (
                      <div className="flex items-center gap-3 bg-[#00d66f]/10 p-4 rounded-2xl border-2 border-[#00d66f]/20 animate-in zoom-in">
                        <ArrowRight size={16} className="text-[#00d66f]" />
                        <span className="text-[11px] font-black uppercase text-[#0f172a]">Retorno de <span className="text-[#00d66f] text-sm">{formatCurrency(liveCashback)}</span></span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Nº Fatura / Recibo</label>
                    <input value={documentNumber} disabled={isLoading} onChange={e => setDocumentNumber(e.target.value)} placeholder="Ex: FT/123" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black uppercase text-[#0f172a] outline-none focus:border-[#00d66f]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {isNifValid && (
                <div className={`p-6 rounded-[32px] border-4 transition-all animate-in zoom-in duration-300 flex flex-col items-center gap-2 ${foundClient ? 'bg-[#0f172a] border-[#00d66f] text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                  {foundClient ? (
                    <>
                      <div className="p-3 bg-[#00d66f] rounded-2xl mb-2"><User size={24} className="text-[#0f172a]" strokeWidth={3} /></div>
                      <h4 className="font-black uppercase text-center text-sm">{foundClient.name}</h4>
                      <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">Saldo na Loja: {formatCurrency(clientStoreBalance)}</p>
                    </>
                  ) : (
                    <p className="text-[10px] font-black uppercase text-center">Aguardando NIF registado...</p>
                  )}
                </div>
              )}

              <button onClick={() => processAction('earn')} disabled={isLoading || !isNifValid || !foundClient} className="flex-1 bg-[#00d66f] p-6 rounded-[32px] text-[#0f172a] transition-all hover:scale-[1.02] shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale">
                {isLoading ? <Loader2 className="animate-spin" size={32} /> : <Coins size={32} strokeWidth={3} />}
                <span className="font-black text-lg uppercase italic tracking-tighter">Atribuir Cashback</span>
              </button>

              <button onClick={() => processAction('redeem')} disabled={isLoading || !isNifValid || !foundClient || clientStoreBalance <= 0} className="flex-1 bg-[#0f172a] p-6 rounded-[32px] text-[#00d66f] transition-all hover:scale-[1.02] shadow-lg border-b-8 border-[#00d66f] flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale">
                {isLoading ? <Loader2 className="animate-spin" size={32} /> : <Gift size={32} strokeWidth={3} />}
                <span className="font-black text-lg uppercase italic tracking-tighter">Utilizar Saldo Loja</span>
              </button>

              <button onClick={() => processAction('cancel')} disabled={isLoading || !isNifValid || !foundClient} className="flex-1 bg-white p-6 rounded-[32px] text-red-500 border-4 border-red-500 transition-all hover:bg-red-50 shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale">
                {isLoading ? <Loader2 className="animate-spin" size={32} /> : <RotateCcw size={32} strokeWidth={3} />}
                <span className="font-black text-lg uppercase italic tracking-tighter">Anular Compra</span>
              </button>
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 animate-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter">Histórico de Vendas</h3>
              <div className="flex flex-wrap gap-2">
                <input placeholder="FILTRAR NIF..." value={filterNif} onChange={e => setFilterNif(formatNIF(e.target.value))} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
                  <option value="all">TODOS</option>
                  <option value="earn">ATRIBUIÇÕES</option>
                  <option value="redeem">UTILIZAÇÕES</option>
                  <option value="cancel">ANULAÇÕES</option>
                </select>
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
                    <th className="pb-4 text-right">Valor Venda</th>
                    <th className="pb-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length > 0 ? filteredHistory.map((t: any, idx) => (
                    <tr key={idx} className="text-xs font-bold text-[#0f172a]">
                      <td className="py-4 text-slate-400 font-medium">
                        {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---')}
                      </td>
                      <td className="py-4 uppercase">{t.clientName || 'Cliente'} <span className="block text-[9px] text-slate-400">NIF: {formatNIF(t.clientNif || '')}</span></td>
                      <td className="py-4 font-black uppercase">{t.documentNumber}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${t.type === 'earn' ? 'bg-green-100 text-green-600' : (t.type === 'cancel' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600')}`}>
                          {t.type === 'earn' ? 'Atribuição' : (t.type === 'cancel' ? 'Anulação' : 'Utilização')}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black">{formatCurrency(t.amount)}</td>
                      <td className="py-4 text-right font-black text-[#00d66f]">{t.type === 'redeem' ? '-' : '+'}{formatCurrency(t.cashbackAmount)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase text-xs">Sem movimentos encontrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : view === 'customers' ? (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter mb-8">Os Seus Clientes Fidelizados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchantCustomers.length > 0 ? merchantCustomers.map((customer) => (
                <div key={customer.id} className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 hover:border-[#00d66f] transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 group-hover:border-[#00d66f] transition-all"><User size={20} className="text-slate-400 group-hover:text-[#00d66f]" /></div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Acumulado</p>
                      <p className="text-lg font-black text-[#00d66f]">{formatCurrency(customer.storeWallets?.[currentUser?.id || '']?.available || 0)}</p>
                    </div>
                  </div>
                  <h4 className="font-black text-[#0f172a] uppercase text-sm truncate">{customer.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">NIF: {formatNIF(customer.nif)}</p>
                  <button onClick={() => { setCardNumber(formatNIF(customer.nif)); setView('terminal'); }} className="w-full mt-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0f172a] hover:text-white transition-all">Selecionar para Venda</button>
                </div>
              )) : (
                <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase text-xs">Ainda não tem clientes fidelizados nesta loja</div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black text-[#0f172a] uppercase italic tracking-tighter mb-8 text-center">Definições da Conta</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="w-32 h-32 bg-[#0f172a] rounded-3xl flex items-center justify-center border-4 border-[#00d66f] shadow-lg rotate-3"><img src={LOGO_URL} alt="V+" className="w-16 h-16 object-contain" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome Comercial</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#00d66f]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email de Negócio</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#00d66f]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Contacto Telefónico</label>
                  <input value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#00d66f]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">% Cashback Atual</label>
                  <div className="relative">
                    <input type="number" step="0.5" value={editCashback} onChange={e => setEditCashback(parseFloat(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl outline-none border-2 border-transparent focus:border-[#00d66f]" />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">%</span>
                  </div>
                </div>
              </div>
              <button disabled={isLoading} className="w-full bg-[#0f172a] text-[#00d66f] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <Download size={20} />} Guardar Alterações
              </button>
            </form>
          </div>
        )}

        {message.text && view === 'terminal' && (
          <div className={`mt-8 p-5 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-in slide-in-from-top-4 shadow-xl border-b-4 ${message.type === 'success' ? 'bg-green-500 text-white border-green-700' : 'bg-red-500 text-white border-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      <footer className="mt-auto py-8 border-t border-slate-200 bg-white relative z-10">
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Contato para pedido de ajuda</span>
          <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 text-[#0f172a] font-black hover:text-[#00d66f] transition-colors">
            <Mail size={16} className="text-[#00d66f]" />
            {supportEmail}
          </a>
        </div>
      </footer>

      {showScanner && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-50 p-6 flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f]">
            <div id="reader" className="w-full overflow-hidden rounded-3xl"></div>
            <button onClick={() => setShowScanner(false)} className="w-full bg-red-500 text-white p-5 font-black uppercase mt-6 rounded-2xl hover:bg-red-600 transition-all">Cancelar Leitura</button>
          </div>
          <p className="mt-6 text-white/50 font-black uppercase text-[10px] tracking-widest">Aponte para o QR Code do Cartão Vizinho+</p>
        </div>
      )}

      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-[#0f172a] animate-in zoom-in">
            <div className={`p-8 text-center ${pendingAction.type === 'earn' ? 'bg-[#00d66f]' : (pendingAction.type === 'cancel' ? 'bg-orange-500' : 'bg-red-500')} text-[#0f172a]`}>
              <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Confirmar Operação</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span><span className="text-sm font-black text-[#0f172a] uppercase italic">{foundClient?.name}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-[10px] font-black text-slate-400 uppercase">Valor Cashback</span><span className="text-xl font-black text-[#00d66f]">{formatCurrency(pendingAction.cashback)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setShowConfirmModal(false); setPendingAction(null); }} className="py-5 bg-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={handleConfirmAction} className="py-5 bg-[#00d66f] rounded-2xl text-[11px] font-black uppercase text-[#0f172a] hover:scale-[1.05] transition-all shadow-lg">Sim, Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;