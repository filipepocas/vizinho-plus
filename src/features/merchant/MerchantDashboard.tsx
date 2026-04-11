// src/features/merchant/MerchantDashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { User as UserProfile } from '../../types';
import { LayoutDashboard, BarChart3, LogOut, Settings, History, Save, X, Smartphone, AlertTriangle, CheckCircle2, Megaphone, Download, MessageSquare, BellRing, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import MerchantTerminal from './components/MerchantTerminal';
import QRScannerModal from './components/QRScannerModal';
import BusinessIntelligence from './components/BusinessIntelligence';
import MerchantSettings from './components/MerchantSettings';
import MerchantMarketing from './components/MerchantMarketing'; 
import { usePWAInstall } from '../../hooks/usePWAInstall'; 

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, updateTransactionDocument, subscribeToTransactions, logout } = useStore();
  const navigate = useNavigate();
  
  const { isInstallable, installApp } = usePWAInstall();

  const [view, setView] = useState<'terminal' | 'bi' | 'settings' | 'history' | 'marketing' | 'push_campaign'>('terminal');
  
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundClient, setFoundClient] = useState<UserProfile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'earn' | 'redeem' | 'cancel', val: number} | null>(null);

  const [postTxModal, setPostTxModal] = useState<{isOpen: boolean, txId: string, needsInvoice: boolean}>({ isOpen: false, txId: '', needsInvoice: false });
  const [postInvoiceNum, setPostInvoiceNum] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceVal, setEditingInvoiceVal] = useState('');

  const [pushPrices, setPushPrices] = useState({ cost: 0.05, min: 5.00 });
  const [pushForm, setPushForm] = useState({ text: '', targetCriteria: 'all', targetValue: '' });
  const [pushSimulation, setPushSimulation] = useState<{ count: number, cost: number } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  const isNifValid = useMemo(() => cardNumber.replace(/\s/g, '').length === 9, [cardNumber]);

  const previewCashbackValue = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const percent = currentUser?.cashbackPercent || 0;
    return (numAmount * percent) / 100;
  }, [amount, currentUser?.cashbackPercent]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const qMsg = query(collection(db, 'merchant_messages'), where('merchantId', '==', currentUser.id));
    const unsubMsg = onSnapshot(qMsg, snap => setAdminMessages(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const fetchPrices = async () => {
       const docSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
       if(docSnap.exists()) {
           const d = docSnap.data();
           setPushPrices({ cost: parseFloat(d.push_cost_per_client) || 0.05, min: parseFloat(d.push_min_cost) || 5.00 });
       }
    };
    fetchPrices();

    return () => unsubMsg();
  }, [currentUser?.id]);

  useEffect(() => {
    const search = async () => {
      const cleanInput = cardNumber.replace(/\s/g, '');
      if (cleanInput.length === 9) {
        setIsSearching(true);
        try {
          let q = query(collection(db, 'users'), where('customerNumber', '==', cleanInput), where('role', '==', 'client'));
          let snap = await getDocs(q);
          
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

  const simulatePushCampaign = async () => {
    if(!pushForm.text.trim()) return toast.error("Escreve a mensagem da notificação primeiro.");
    setSimulating(true);
    try {
        const qClients = query(collection(db, 'users'), where('role', '==', 'client'));
        const snap = await getDocs(qClients);
        let clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));

        clients = clients.filter(c => c.devices && c.devices.length > 0);

        if (pushForm.targetCriteria === 'cp') {
            clients = clients.filter(c => c.zipCode && c.zipCode.startsWith(pushForm.targetValue));
        } else if (pushForm.targetCriteria === 'top') {
            const myClientIds = new Set(transactions.map(t => t.clientId));
            clients = clients.filter(c => myClientIds.has(c.id));
        } else if (pushForm.targetCriteria === 'birthday') {
            const currentMonth = new Date().getMonth() + 1;
            clients = clients.filter(c => {
               if(!c.birthDate) return false;
               const month = parseInt(c.birthDate.split('-')[1]);
               return month === currentMonth;
            });
        }

        const count = clients.length;
        let cost = count * pushPrices.cost;
        if (cost > 0 && cost < pushPrices.min) cost = pushPrices.min;
        if (count === 0) cost = 0;

        setPushSimulation({ count, cost });
    } catch(e) { toast.error("Erro ao simular."); } 
    finally { setSimulating(false); }
  };

  const submitPushRequest = async () => {
     if(!pushSimulation) return;
     try {
         await addDoc(collection(db, 'marketing_requests'), {
            merchantId: currentUser?.id,
            merchantName: currentUser?.shopName || currentUser?.name,
            type: 'push_notification',
            text: pushForm.text,
            targetCriteria: pushForm.targetCriteria,
            targetValue: pushForm.targetValue,
            targetCount: pushSimulation.count,
            cost: pushSimulation.cost,
            status: 'pending',
            createdAt: serverTimestamp()
         });
         toast.success("Pedido de Campanha Enviado!");
         setPushForm({ text: '', targetCriteria: 'all', targetValue: '' });
         setPushSimulation(null);
     } catch(e) { toast.error("Erro ao enviar pedido."); }
  };

  // ERRO CORRIGIDO AQUI: val: valToProcess
  const processAction = (type: 'earn' | 'redeem' | 'cancel', redeemAmount?: number) => {
    const invoiceVal = parseFloat(amount);
    if (!currentUser || !foundClient || isNaN(invoiceVal) || invoiceVal <= 0) return alert("Preencha o valor da nova compra.");
    let valToProcess = invoiceVal;
    if (type === 'redeem') { if (!redeemAmount || redeemAmount <= 0) return; valToProcess = redeemAmount; }
    setPendingAction({ type, val: valToProcess }); setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction || !currentUser || !foundClient) return;
    setShowConfirmModal(false); setIsLoading(true);
    try {
      const newTxId = await addTransaction({
        clientId: foundClient.id, merchantId: currentUser.id, merchantName: currentUser.shopName || currentUser.name || 'Loja Parceira',
        amount: pendingAction.val, type: pendingAction.type, documentNumber: documentNumber,
        clientName: foundClient.name, clientCardNumber: foundClient.customerNumber, clientBirthDate: foundClient.birthDate
      });
      setPostTxModal({ isOpen: true, txId: newTxId || '', needsInvoice: !documentNumber.trim() });
      setAmount(''); setDocumentNumber(''); setCardNumber(''); setFoundClient(null);
    } catch (e) { toast.error("Erro ao registar."); } finally { setIsLoading(false); }
  };

  const savePostInvoice = async () => {
    if (postTxModal.txId && postInvoiceNum.trim()) await updateTransactionDocument(postTxModal.txId, postInvoiceNum);
    setPostTxModal({ isOpen: false, txId: '', needsInvoice: false }); setPostInvoiceNum('');
  };

  const exportHistoryToExcel = () => {
    const data = transactions.slice(0, 60).map(t => ({
      "Data e Hora": t.createdAt?.toDate().toLocaleString() || "Recente",
      "Cartão do Cliente": t.clientCardNumber || t.clientNif || "---",
      "Nome do Cliente": t.clientName || "---",
      "Tipo": t.type === 'earn' ? 'Atribuição' : 'Desconto',
      "Valor (€)": t.type === 'earn' ? (t.cashbackAmount || 0) : t.amount,
      "Nº Fatura": t.documentNumber || "---"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, "Historico_60_Movimentos.xlsx");
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative pb-20">
      
      <header className="bg-[#0f172a] p-8 rounded-b-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f]">
        <div className="flex items-center gap-4 text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{currentUser.shopName || currentUser.name}</h2>
          
          <button onClick={() => setShowInbox(true)} className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all ml-4">
              <MessageSquare size={20} className="text-[#00d66f]" />
              {adminMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{adminMessages.length}</span>}
          </button>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md">
          <button onClick={() => setView('terminal')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><LayoutDashboard size={16} /> Terminal</button>
          <button onClick={() => setView('history')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'history' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><History size={16} /> Histórico</button>
          <button onClick={() => setView('push_campaign')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'push_campaign' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><BellRing size={16} /> Push Clientes</button>
          <button onClick={() => setView('marketing')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'marketing' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><Megaphone size={16} /> Folhetos</button>
          <button onClick={() => setView('bi')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'bi' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><BarChart3 size={16} /> B.I.</button>
          <button onClick={() => setView("settings")} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === "settings" ? "bg-[#00d66f] text-[#0f172a]" : "text-white hover:bg-white/10"}`}><Settings size={16} /> Definições</button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20} /></button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full">
        
        {isInstallable && (
          <div className="bg-[#00d66f] border-4 border-[#0a2540] rounded-[30px] p-4 flex items-center justify-between shadow-[6px_6px_0px_#0a2540] mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-[#0a2540] p-2 rounded-xl text-[#00d66f]"><Smartphone size={20} /></div>
              <div>
                <p className="font-black uppercase text-[11px] text-[#0a2540] tracking-tighter">Instalar App Vizinho+</p>
                <p className="text-[9px] font-bold text-[#0a2540] opacity-80 uppercase">Acesso rápido no ecrã para a sua equipa</p>
              </div>
            </div>
            <button onClick={installApp} className="bg-[#0a2540] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Instalar</button>
          </div>
        )}

        {view === 'push_campaign' && (
          <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] animate-in fade-in">
              <div className="flex items-center gap-4 mb-8">
                  <div className="bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl"><Send size={32} /></div>
                  <div>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Alertas Diretos</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase mt-1">Acorda o telemóvel dos clientes da tua zona.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Texto da Notificação</label>
                          <textarea rows={3} maxLength={100} placeholder="Ex: Hoje temos 10% Extra Cashback em todo o peixe fresco!" value={pushForm.text} onChange={e => { setPushForm({...pushForm, text: e.target.value}); setPushSimulation(null); }} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#00d66f] resize-none" />
                          <p className="text-[9px] text-right text-slate-400 font-bold">{pushForm.text.length} / 100 caracteres</p>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Público-Alvo na App</label>
                          <select value={pushForm.targetCriteria} onChange={e => { setPushForm({...pushForm, targetCriteria: e.target.value, targetValue: ''}); setPushSimulation(null); }} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-[#00d66f] appearance-none">
                              <option value="all">Todos os Clientes Registados na BD</option>
                              <option value="top">Os Meus Clientes (Histórico de Compras)</option>
                              <option value="cp">Por Código Postal (Público Geral)</option>
                              <option value="birthday">Aniversariantes do Mês (Público Geral)</option>
                          </select>
                      </div>

                      {pushForm.targetCriteria === 'cp' && (
                          <div className="space-y-2 animate-in slide-in-from-top-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Qual o Código Postal? (Ex: 4000 ou 4000-123)</label>
                              <input type="text" value={pushForm.targetValue} onChange={e => { setPushForm({...pushForm, targetValue: e.target.value}); setPushSimulation(null); }} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#00d66f]" />
                          </div>
                      )}

                      <button onClick={simulatePushCampaign} disabled={simulating} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg border-b-4 border-black/20">
                          {simulating ? 'A calcular...' : 'Simular Alcance e Custo'}
                      </button>
                  </div>

                  {pushSimulation !== null && (
                      <div className="bg-slate-50 border-4 border-slate-100 rounded-[30px] p-8 flex flex-col justify-center animate-in zoom-in-95">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center mb-6">Orçamento do Pedido</h4>
                          
                          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-slate-100 mb-4">
                              <span className="text-xs font-bold text-slate-500 uppercase">Clientes Alcançados</span>
                              <span className="text-xl font-black text-[#0a2540]">{pushSimulation.count}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 border-slate-100 mb-6">
                              <span className="text-xs font-bold text-slate-500 uppercase">Custo Estimado</span>
                              <span className="text-xl font-black text-[#00d66f]">{formatCurrency(pushSimulation.cost)}</span>
                          </div>
                          
                          <p className="text-[9px] font-bold text-slate-400 text-center mb-6 leading-relaxed">
                              *O custo base é de {formatCurrency(pushPrices.cost)} por cliente atingido (com telemóvel ativo). Serviço mínimo de {formatCurrency(pushPrices.min)}.
                          </p>

                          <div className="flex gap-4">
                              <button onClick={() => setPushSimulation(null)} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100">Corrigir</button>
                              <button onClick={submitPushRequest} disabled={pushSimulation.count === 0} className="flex-1 py-4 bg-[#00d66f] border-b-4 border-[#0a2540]/20 text-[#0a2540] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale">Avançar</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
        )}

        {view === 'history' && (
            <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540]">Últimos Movimentos (60 dias)</h3>
                  <button onClick={exportHistoryToExcel} className="bg-[#0a2540] text-[#00d66f] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                    <Download size={16} /> Excel (60 Movimentos)
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4 rounded-l-2xl">Data</th>
                                <th className="p-4">Cliente (Nome / Cartão)</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Fatura Base</th>
                                <th className="p-4">Movimento</th>
                                <th className="p-4 rounded-r-2xl text-center">Nº Fatura / Recibo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-xs font-bold text-slate-600">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'Recente'}</td>
                                    <td className="p-4">
                                        <p className="font-black uppercase text-xs text-[#0a2540]">{t.clientName || 'Cliente'}</p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.clientCardNumber || t.clientNif || '---'}</p>
                                    </td>
                                    <td className="p-4 text-[10px] font-black uppercase tracking-widest">
                                        <span className={`px-2 py-1 rounded-md ${t.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {t.type === 'earn' ? 'Atribuição' : 'Desconto'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black">{formatCurrency(t.amount)}</td>
                                    <td className={`p-4 font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-blue-500'}`}>
                                        {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.type === 'earn' ? (t.cashbackAmount || 0) : t.amount)}
                                    </td>
                                    <td className="p-4">
                                        {editingInvoiceId === t.id ? (
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" value={editingInvoiceVal} onChange={e=>setEditingInvoiceVal(e.target.value.toUpperCase())}
                                                    className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-[#00d66f]" 
                                                    placeholder="Nº Fatura"
                                                />
                                                <button onClick={() => { if (editingInvoiceVal.trim()) { updateTransactionDocument(t.id, editingInvoiceVal); setEditingInvoiceId(null); } }} className="bg-[#0a2540] text-[#00d66f] px-3 rounded-lg"><Save size={14}/></button>
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
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">Nenhum movimento recente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'terminal' && <MerchantTerminal cardNumber={cardNumber} setCardNumber={setCardNumber} isNifValid={isNifValid} isSearching={isSearching} foundClient={foundClient} amount={amount} setAmount={setAmount} previewCashback={previewCashbackValue} documentNumber={documentNumber} setDocumentNumber={setDocumentNumber} onOpenScanner={() => setShowScanner(true)} onProcessAction={processAction} isLoading={isLoading} clientStoreBalance={foundClient?.storeWallets?.[currentUser.id]?.available || 0} formatCurrency={formatCurrency} />}
        {view === 'marketing' && <MerchantMarketing merchantId={currentUser.id} merchantName={currentUser.shopName || currentUser.name || 'Loja'} />}
        {view === 'bi' && <BusinessIntelligence merchantId={currentUser.id} transactions={transactions} />}
        {view === 'settings' && <MerchantSettings currentUser={currentUser} />}
      </main>

      {showInbox && (
          <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl border-4 border-[#0a2540] animate-in zoom-in flex flex-col max-h-[80vh]">
                  <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3"><MessageSquare className="text-[#00d66f]" size={24} /><h3 className="text-xl font-black uppercase italic tracking-tighter">Avisos do Sistema</h3></div>
                      <button onClick={() => setShowInbox(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4">
                      {adminMessages.length === 0 && <p className="text-center text-xs font-bold text-slate-400 uppercase py-10">Não tens mensagens.</p>}
                      {adminMessages.map(msg => (
                          <div key={msg.id} className="bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl relative group">
                              <p className="text-xs font-bold text-slate-600 mb-4 whitespace-pre-wrap">{msg.message}</p>
                              <div className="flex justify-between items-end border-t-2 border-slate-100 pt-3">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Recente'}</span>
                                  <button onClick={() => deleteDoc(doc(db, 'merchant_messages', msg.id))} className="text-[9px] font-black text-red-500 uppercase hover:underline">Apagar Aviso</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showScanner && <QRScannerModal onScan={(text: string) => { setCardNumber(text); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-[#0f172a] animate-in zoom-in">
            <div className={`p-8 text-center ${pendingAction.type === 'earn' ? 'bg-[#00d66f]' : 'bg-blue-500 text-white'} text-[#0f172a]`}>
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Confirmar Operação?</h3>
              <p className="font-bold text-[10px] uppercase opacity-70 mt-2">{foundClient?.name}</p>
              <div className="mt-4 p-4 bg-white/20 rounded-2xl border border-white/30">
                 <p className="font-black text-lg">{pendingAction.type === 'earn' ? `Atribuir Cashback sobre ${formatCurrency(parseFloat(amount))}` : `Descontar ${formatCurrency(pendingAction.val)}`}</p>
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
                </div>
                <div className="p-8 bg-white">
                    {postTxModal.needsInvoice ? (
                        <div className="space-y-4 text-center">
                            <input type="text" value={postInvoiceNum} onChange={e => setPostInvoiceNum(e.target.value.toUpperCase())} placeholder="Insira o nº da Fatura (Opcional)" className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-4 text-center font-black uppercase outline-none focus:border-[#00d66f]" />
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setPostTxModal({isOpen: false, txId:'', needsInvoice: false})} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                                <button onClick={savePostInvoice} disabled={!postInvoiceNum.trim()} className="flex-1 py-4 bg-[#0a2540] text-[#00d66f] rounded-2xl font-black uppercase text-[10px]">Guardar Fatura</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setPostTxModal({isOpen: false, txId:'', needsInvoice: false})} className="w-full py-5 bg-[#0a2540] text-white rounded-3xl font-black uppercase tracking-widest text-[11px]">Fechar Aviso</button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default MerchantDashboard;