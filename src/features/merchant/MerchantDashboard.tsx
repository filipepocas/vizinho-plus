// src/features/merchant/MerchantDashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { User as UserProfile } from '../../types';
import { 
  LayoutDashboard, BarChart3, LogOut, Settings, History, Save, X, 
  Smartphone, AlertTriangle, CheckCircle2, Megaphone, Download, 
  MessageSquare, BellRing, Send, Clock, Calendar, Users, Filter,
  Loader2, Trash2 
} from 'lucide-react';
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

  // --- ESTADOS DO PONTO 6 (CAMPANHA PUSH) ---
  const [pushForm, setPushForm] = useState({ 
    title: '', text: '', targetType: 'all' as 'all' | 'multiple_zip' | 'top' | 'birthDate', targetValue: '' 
  });
  const [pushSimulation, setPushSimulation] = useState<{ count: number, cost: number } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [pushPrices, setPushPrices] = useState({ perClient: 0.05, minService: 5.00 });

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
    const unsubMsg = onSnapshot(qMsg, (snap) => {
      setAdminMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const fetchPrices = async () => {
      const configSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        setPushPrices({ 
          perClient: parseFloat(data.push_cost_per_client) || 0.05, 
          minService: parseFloat(data.push_min_cost) || 5.00 
        });
      }
    };
    fetchPrices();

    return () => unsubMsg();
  }, [currentUser?.id]);

  // --- LÓGICA DE SIMULAÇÃO DO PONTO 6 ---
  const handleSimulatePush = async () => {
    if (!pushForm.title || !pushForm.text) {
      toast.error("PREENCHA O TÍTULO E A MENSAGEM.");
      return;
    }
    setSimulating(true);

    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('role', '==', 'client'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      let clients = snap.docs.map(d => d.data());

      // Aplicar filtros de segmentação
      if (pushForm.targetType === 'multiple_zip') {
        const zips = pushForm.targetValue.split(',').map(z => z.trim());
        clients = clients.filter((c: any) => zips.some(z => (c.zipCode || '').startsWith(z)));
      } else if (pushForm.targetType === 'top') {
        // Filtra clientes que já tiveram transações com este merchant
        clients = clients.filter((c: any) => c.storeWallets?.[currentUser?.id || ""]);
      } else if (pushForm.targetType === 'birthDate') {
        const currentMonth = new Date().getMonth() + 1;
        clients = clients.filter((c: any) => {
          if (!c.birthDate) return false;
          const month = parseInt(c.birthDate.split('-')[1]);
          return month === currentMonth;
        });
      }

      const count = clients.length;
      let totalCost = count * pushPrices.perClient;
      if (totalCost < pushPrices.minService && count > 0) totalCost = pushPrices.minService;
      if (count === 0) totalCost = 0;

      setPushSimulation({ count, cost: totalCost });
    } catch (e) {
      toast.error("ERRO AO CALCULAR ALCANCE.");
    } finally {
      setSimulating(false);
    }
  };

  const submitPushRequest = async () => {
    if (!pushSimulation) return;
    try {
      await addDoc(collection(db, 'marketing_requests'), {
        merchantId: currentUser?.id,
        merchantName: currentUser?.shopName || currentUser?.name,
        type: 'push_notification',
        ...pushForm,
        targetCount: pushSimulation.count,
        cost: pushSimulation.cost,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("PEDIDO ENVIADO PARA APROVAÇÃO!");
      setPushSimulation(null);
      setPushForm({ title: '', text: '', targetType: 'all', targetValue: '' });
      setView('marketing');
    } catch (e) { toast.error("ERRO AO ENVIAR."); }
  };

  const handleDeleteMessage = async (id: string) => {
    await deleteDoc(doc(db, 'merchant_messages', id));
    toast.success("MENSAGEM ELIMINADA.");
  };

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('merchant', currentUser.id);
      return () => unsubscribe();
    }
  }, [currentUser?.id, subscribeToTransactions]);

  const processAction = (type: 'earn' | 'redeem' | 'cancel', redeemAmount?: number) => {
    const val = type === 'redeem' ? redeemAmount : parseFloat(amount);
    setPendingAction({ type, val: val || 0 });
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
        merchantName: currentUser.shopName || currentUser.name || 'Loja',
        amount: pendingAction.val,
        type: pendingAction.type,
        documentNumber: documentNumber,
        clientName: foundClient.name,
        clientCardNumber: foundClient.customerNumber,
        clientBirthDate: foundClient.birthDate
      });
      setPostTxModal({ isOpen: true, txId: newTxId || '', needsInvoice: !documentNumber.trim() });
      setAmount(''); setDocumentNumber(''); setCardNumber(''); setFoundClient(null);
    } catch (e) { toast.error("ERRO AO REGISTAR."); } finally { setIsLoading(false); }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-20">
      
      <header className="bg-[#0f172a] p-8 rounded-b-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f]">
        <div className="flex items-center gap-6 text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{currentUser.shopName || currentUser.name}</h2>
          
          {/* SINO DE MENSAGENS DO ADMIN (PONTO 5) */}
          <button onClick={() => setShowInbox(true)} className="relative bg-white/10 p-3 rounded-2xl hover:bg-[#00d66f] hover:text-[#0a2540] transition-all">
             <MessageSquare size={24} />
             {adminMessages.length > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f172a] animate-pulse">
                 {adminMessages.length}
               </span>
             )}
          </button>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setView('terminal')} className={`px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}>Terminal</button>
          <button onClick={() => setView('push_campaign')} className={`px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'push_campaign' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><BellRing size={16} className="inline mr-1" /> Notificar Clientes</button>
          <button onClick={() => setView('marketing')} className={`px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'marketing' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}>Marketing</button>
          <button onClick={() => setView('bi')} className={`px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'bi' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}>B.I.</button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="p-3 text-red-400"><LogOut size={20} /></button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full space-y-6">
        
        {/* ABA DE CAMPANHAS PUSH (PONTO 6) */}
        {view === 'push_campaign' && (
          <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <div className="bg-white p-8 md:p-10 rounded-[40px] border-4 border-[#0a2540] shadow-xl space-y-6">
                <div>
                   <h3 className="text-xl font-black uppercase italic text-[#0a2540] flex items-center gap-2">
                      <Send className="text-[#00d66f]" /> Pedir Envio de Notificações
                   </h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Desperte o telemóvel dos seus clientes</p>
                </div>

                <div className="space-y-4">
                   <input type="text" placeholder="Título (Ex: Promoção de Verão!)" value={pushForm.title} onChange={e=>setPushForm({...pushForm, title: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-[#00d66f]" />
                   <textarea rows={4} placeholder="Mensagem curta e apelativa (Máx. 100 caracteres)..." value={pushForm.text} onChange={e=>setPushForm({...pushForm, text: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f] resize-none" maxLength={100} />
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quem deve receber?</label>
                   <select value={pushForm.targetType} onChange={e=>setPushForm({...pushForm, targetType: e.target.value as any, targetValue: ''})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                      <option value="all">Todos na Base de Dados</option>
                      <option value="multiple_zip">Por Código Postal (CP4)</option>
                      <option value="top">Meus Clientes (Top de Vendas)</option>
                      <option value="birthDate">Aniversariantes do Mês</option>
                   </select>

                   {pushForm.targetType === 'multiple_zip' && (
                     <input type="text" placeholder="Insira CP4 separados por vírgula (Ex: 4620, 4400)" value={pushForm.targetValue} onChange={e=>setPushForm({...pushForm, targetValue: e.target.value})} className="w-full p-4 bg-blue-50 border-4 border-blue-100 rounded-2xl font-black text-xs" />
                   )}
                </div>

                <button onClick={handleSimulatePush} disabled={simulating} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg flex items-center justify-center gap-3">
                   {simulating ? <Loader2 className="animate-spin" /> : <><Filter size={18} /> Simular Alcance e Custo</>}
                </button>
             </div>

             {/* RESULTADO DA SIMULAÇÃO (PONTO 6) */}
             {pushSimulation && (
               <div className="bg-[#00d66f] p-8 md:p-10 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540] flex flex-col justify-center text-center animate-in zoom-in">
                  <h4 className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest mb-6 opacity-60">Orçamento Detalhado</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-white/20 p-6 rounded-3xl border-2 border-[#0a2540]/10">
                        <span className="text-[9px] font-black uppercase block mb-1">Clientes</span>
                        <span className="text-3xl font-black italic">{pushSimulation.count}</span>
                     </div>
                     <div className="bg-white/20 p-6 rounded-3xl border-2 border-[#0a2540]/10">
                        <span className="text-[9px] font-black uppercase block mb-1">Investimento</span>
                        <span className="text-3xl font-black italic">{formatCurrency(pushSimulation.cost)}</span>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <button onClick={submitPushRequest} className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Avançar com o Pedido</button>
                     <button onClick={() => setPushSimulation(null)} className="w-full bg-white/20 text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Anular / Corrigir</button>
                  </div>
                  <p className="mt-6 text-[8px] font-black uppercase text-[#0a2540]/60 italic">* Valor sujeito a aprovação manual da administração.</p>
               </div>
             )}
          </div>
        )}

        {/* INBOX DO LOJISTA (PONTO 5) */}
        {showInbox && (
          <div className="fixed inset-0 z-[200] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-lg rounded-[40px] border-4 border-[#00d66f] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
                <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
                   <h3 className="font-black uppercase italic tracking-tighter text-lg flex items-center gap-3"><BellRing className="text-[#00d66f]" /> Mensagens do Sistema</h3>
                   <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                   {adminMessages.length === 0 ? (
                     <p className="text-center text-slate-400 font-black uppercase text-[10px] py-10">Sem mensagens novas.</p>
                   ) : adminMessages.map(msg => (
                     <div key={msg.id} className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 relative group">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed">{msg.message}</p>
                        <div className="mt-4 flex justify-between items-center border-t border-slate-200 pt-3">
                           <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(msg.createdAt?.seconds * 1000).toLocaleString()}</span>
                           <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* OUTRAS ABAS MANTIDAS INTACTAS */}
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
        {view === 'bi' && <BusinessIntelligence merchantId={currentUser.id} transactions={transactions} />}
        {view === 'marketing' && <MerchantMarketing merchantId={currentUser.id} merchantName={currentUser.shopName || currentUser.name || ""} />}
        {view === 'settings' && <MerchantSettings currentUser={currentUser} />}

      </main>

      {showScanner && <QRScannerModal onScan={(text) => { setCardNumber(text); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      
    </div>
  );
};

export default MerchantDashboard;