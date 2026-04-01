import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { User as UserProfile } from '../../types';
import { LayoutDashboard, BarChart3, LogOut, Settings, History, Save, X, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';

import MerchantTerminal from './components/MerchantTerminal';
import QRScannerModal from './components/QRScannerModal';
import BusinessIntelligence from './components/BusinessIntelligence';
import MerchantSettings from './components/MerchantSettings';
import { usePWAInstall } from '../../hooks/usePWAInstall'; 

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, updateTransactionDocument, subscribeToTransactions, logout } = useStore();
  const navigate = useNavigate();
  
  const { isInstallable, installApp } = usePWAInstall();

  const [view, setView] = useState<'terminal' | 'bi' | 'settings' | 'history'>('terminal');
  const [showScanner, setShowScanner] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [foundClient, setFoundClient] = useState<UserProfile | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'earn' | 'redeem' | 'cancel', val: number} | null>(null);

  const [postTxModal, setPostTxModal] = useState<{isOpen: boolean, txId: string, needsInvoice: boolean}>({ isOpen: false, txId: '', needsInvoice: false });
  const [postInvoiceNum, setPostInvoiceNum] = useState('');

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceVal, setEditingInvoiceVal] = useState('');

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  const isNifValid = useMemo(() => cardNumber.replace(/\s/g, '').length === 9, [cardNumber]);

  const previewCashbackValue = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const percent = currentUser?.cashbackPercent || 0;
    return (numAmount * percent) / 100;
  }, [amount, currentUser?.cashbackPercent]);

  // PESQUISA ATUALIZADA: Tenta o Nº de Cartão (customerNumber) PRIMEIRO, se não encontrar, tenta o NIF.
  useEffect(() => {
    const search = async () => {
      const cleanInput = cardNumber.replace(/\s/g, '');
      if (cleanInput.length === 9) {
        setIsSearching(true);
        try {
          // 1. Tenta pesquisar pelo Número do Cartão
          let q = query(collection(db, 'users'), where('customerNumber', '==', cleanInput), where('role', '==', 'client'));
          let snap = await getDocs(q);
          
          // 2. Se não encontrou pelo cartão, tenta pelo NIF
          if (snap.empty) {
            q = query(collection(db, 'users'), where('nif', '==', cleanInput), where('role', '==', 'client'));
            snap = await getDocs(q);
          }

          if (!snap.empty) setFoundClient({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
          else setFoundClient(null);
        } catch (error) { console.error(error); } finally { setIsSearching(false); }
      } else { setFoundClient(null); }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [cardNumber]);

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('merchant', currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser?.id, subscribeToTransactions]);

  const processAction = (type: 'earn' | 'redeem' | 'cancel', redeemAmount?: number) => {
    const invoiceVal = parseFloat(amount);
    if (!currentUser || !foundClient || isNaN(invoiceVal) || invoiceVal <= 0) {
      alert("Preencha o valor da nova compra corretamente.");
      return;
    }
    let valToProcess = invoiceVal;
    if (type === 'redeem') {
      if (!redeemAmount || redeemAmount <= 0) return;
      valToProcess = redeemAmount;
    }
    setPendingAction({ type, val: valToProcess });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction || !currentUser || !foundClient) return;
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      const newTxId = await addTransaction({
        clientId: foundClient.id,
        merchantId: currentUser.id,
        merchantName: currentUser.shopName || currentUser.name || 'Loja Parceira',
        amount: pendingAction.val,
        type: pendingAction.type,
        documentNumber: documentNumber
      });
      setPostTxModal({ isOpen: true, txId: newTxId || '', needsInvoice: !documentNumber.trim() });
      setAmount(''); setDocumentNumber(''); setCardNumber(''); setFoundClient(null);
    } catch (e) {
      setMessage({ type: 'error', text: "Erro ao registar." });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const savePostInvoice = async () => {
    if (postTxModal.txId && postInvoiceNum.trim()) {
      await updateTransactionDocument(postTxModal.txId, postInvoiceNum);
    }
    setPostTxModal({ isOpen: false, txId: '', needsInvoice: false });
    setPostInvoiceNum('');
  };

  const handleUpdateHistoryInvoice = async (id: string) => {
    if (!editingInvoiceVal.trim()) return;
    await updateTransactionDocument(id, editingInvoiceVal);
    setEditingInvoiceId(null);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative pb-20">
      <header className="bg-[#0f172a] p-8 rounded-b-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f]">
        <div className="flex items-center gap-4 text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{currentUser.shopName || currentUser.name}</h2>
          <span className="text-[10px] font-black text-[#00d66f] bg-[#00d66f]/10 py-1 px-3 rounded-full border border-[#00d66f]/20 uppercase">Loja Parceira</span>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md">
          <button onClick={() => setView('terminal')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><LayoutDashboard size={16} /> Terminal</button>
          <button onClick={() => setView('history')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'history' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><History size={16} /> Histórico</button>
          <button onClick={() => setView('bi')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'bi' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><BarChart3 size={16} /> Business Intelligence</button>
          <button onClick={() => setView("settings")} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === "settings" ? "bg-[#00d66f] text-[#0f172a]" : "text-white hover:bg-white/10"}`}><Settings size={16} /> Definições</button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20} /></button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full">
        
        {isInstallable && (
          <div className="bg-[#00d66f] border-4 border-[#0a2540] rounded-[30px] p-4 flex items-center justify-between shadow-[6px_6px_0px_#0a2540] animate-in fade-in zoom-in duration-500 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-[#0a2540] p-2 rounded-xl text-[#00d66f]">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="font-black uppercase text-[11px] text-[#0a2540] tracking-tighter">Instalar App Vizinho+</p>
                <p className="text-[9px] font-bold text-[#0a2540] opacity-80 uppercase">Acesso rápido no ecrã para si e para a sua equipa</p>
              </div>
            </div>
            <button onClick={installApp} className="bg-[#0a2540] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
              Instalar
            </button>
          </div>
        )}

        {view === 'terminal' && (
          <MerchantTerminal 
            cardNumber={cardNumber} setCardNumber={setCardNumber}
            isNifValid={isNifValid} isSearching={isSearching} foundClient={foundClient}
            amount={amount} setAmount={setAmount}
            previewCashback={previewCashbackValue}
            documentNumber={documentNumber} setDocumentNumber={setDocumentNumber}
            onOpenScanner={() => setShowScanner(true)}
            onProcessAction={processAction}
            isLoading={isLoading}
            clientStoreBalance={foundClient?.storeWallets?.[currentUser.id]?.available || 0}
            formatCurrency={formatCurrency}
          />
        )}

        {view === 'history' && (
            <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] animate-in fade-in">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Últimos Movimentos (60 dias)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4 rounded-l-2xl">Data</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Valor Base</th>
                                <th className="p-4">Movimento</th>
                                <th className="p-4 rounded-r-2xl text-center">Nº Fatura / Recibo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-xs font-bold text-slate-600">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'Recente'}</td>
                                    <td className="p-4 text-[10px] font-black uppercase tracking-widest">
                                        <span className={`px-2 py-1 rounded-md ${t.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {t.type === 'earn' ? 'Atribuição' : 'Desconto'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black">{formatCurrency(t.amount)}</td>
                                    <td className={`p-4 font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-blue-500'}`}>
                                        {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.type === 'earn' ? t.cashbackAmount : t.amount)}
                                    </td>
                                    <td className="p-4">
                                        {editingInvoiceId === t.id ? (
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" value={editingInvoiceVal} onChange={e=>setEditingInvoiceVal(e.target.value.toUpperCase())}
                                                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-[#00d66f]" 
                                                    placeholder="Nº Fatura"
                                                />
                                                <button onClick={() => handleUpdateHistoryInvoice(t.id)} className="bg-[#0a2540] text-[#00d66f] px-3 rounded-lg"><Save size={14}/></button>
                                                <button onClick={() => setEditingInvoiceId(null)} className="bg-slate-100 text-slate-500 px-3 rounded-lg"><X size={14}/></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center items-center gap-3">
                                                <span className={`text-xs font-bold ${t.documentNumber ? 'text-slate-600' : 'text-red-400 italic'}`}>
                                                    {t.documentNumber || 'Falta Fatura'}
                                                </span>
                                                <button onClick={() => { setEditingInvoiceId(t.id); setEditingInvoiceVal(t.documentNumber || ''); }} className="text-slate-400 hover:text-[#00d66f] transition-colors"><Settings size={14}/></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">Nenhum movimento recente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'bi' && <BusinessIntelligence merchantId={currentUser.id} transactions={transactions} />}
        {view === 'settings' && <MerchantSettings currentUser={currentUser} />}

      </main>

      {showScanner && <QRScannerModal onScan={(text) => { setCardNumber(text); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}

      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-[#0f172a] animate-in zoom-in">
            <div className={`p-8 text-center ${pendingAction.type === 'earn' ? 'bg-[#00d66f]' : 'bg-blue-500 text-white'} text-[#0f172a]`}>
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Confirmar Operação?</h3>
              <p className="font-bold text-[10px] uppercase opacity-70 mt-2">{foundClient?.name}</p>
              
              <div className="mt-4 p-4 bg-white/20 rounded-2xl border border-white/30">
                 <p className="font-black text-lg">
                    {pendingAction.type === 'earn' 
                      ? `Atribuir Cashback sobre ${formatCurrency(parseFloat(amount))}` 
                      : `Descontar ${formatCurrency(pendingAction.val)}`}
                 </p>
              </div>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] text-slate-400">Cancelar</button>
              <button onClick={handleConfirm} className="py-4 bg-[#0a2540] rounded-2xl font-black uppercase text-[10px] text-[#00d66f] shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {postTxModal.isOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border-4 border-[#0a2540] animate-in zoom-in">
                <div className="p-8 text-center bg-[#00d66f] text-[#0a2540] flex flex-col items-center">
                    <CheckCircle2 size={56} className="mb-4" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Concluído!</h3>
                    <p className="font-bold text-[10px] uppercase mt-2 opacity-80">A transação foi validada e registada no sistema.</p>
                </div>
                <div className="p-8 bg-white">
                    {postTxModal.needsInvoice ? (
                        <div className="space-y-4 text-center">
                            <p className="text-xs font-bold text-slate-500">Para um melhor controlo, é recomendado associar um número de Fatura ou Recibo a esta transação.</p>
                            <input 
                                type="text" value={postInvoiceNum} onChange={e => setPostInvoiceNum(e.target.value.toUpperCase())}
                                placeholder="Insira o nº da Fatura (Opcional)"
                                className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-center font-black uppercase outline-none focus:border-[#00d66f]" 
                            />
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setPostTxModal({isOpen: false, txId:'', needsInvoice: false})} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                                <button onClick={savePostInvoice} disabled={!postInvoiceNum.trim()} className="flex-1 py-4 bg-[#0a2540] text-[#00d66f] rounded-2xl font-black uppercase text-[10px] disabled:opacity-50">Guardar Fatura</button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center pt-2">
                            <p className="text-sm font-bold text-slate-500 mb-6">A fatura já está registada no movimento.</p>
                            <button onClick={() => setPostTxModal({isOpen: false, txId:'', needsInvoice: false})} className="w-full py-5 bg-[#0a2540] text-white rounded-3xl font-black uppercase tracking-widest text-[11px]">Fechar Aviso</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default MerchantDashboard;