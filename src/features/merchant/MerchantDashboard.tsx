// src/features/merchant/MerchantDashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, getDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { User as UserProfile, Transaction } from '../../types';
import { 
  LogOut, Settings, X, 
  Smartphone, AlertTriangle, Megaphone, 
  MessageSquare, BellRing, Send, Clock, Calendar, Users, Filter,
  Loader2, Trash2, BookOpen, Leaf, ArrowRight, HelpCircle, Package, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

import MerchantTerminal from './components/MerchantTerminal';
import QRScannerModal from './components/QRScannerModal';
import BusinessIntelligence from './components/BusinessIntelligence';
import MerchantSettings from './components/MerchantSettings';
import MerchantMarketing from './components/MerchantMarketing'; 
import MerchantCatalog from './components/MerchantCatalog';
import { usePWAInstall } from '../../hooks/usePWAInstall'; 

const MerchantDashboard: React.FC = () => {
  const { currentUser, addTransaction, logout, locations } = useStore();
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();

  const [view, setView] = useState<'terminal' | 'catalog' | 'bi' | 'settings' | 'marketing' | 'anti_waste'>('terminal');
  
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  const [showFaqModal, setShowFaqModal] = useState(false); 
  const [sysConfig, setSysConfig] = useState({ merchantTerms: 'A carregar...', merchantFaqs: 'A carregar guia...' });

  const [showScanner, setShowScanner] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundClient, setFoundClient] = useState<UserProfile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'earn' | 'redeem' | 'cancel', val: number, invAmount: number} | null>(null);

  // Estados de Desperdício
  const [wasteForm, setWasteForm] = useState({ productInfo: '', conditions: '', endTime: '19:00' });
  const [wasteDistrito, setWasteDistrito] = useState('');
  const [wasteConcelho, setWasteConcelho] = useState('');
  const [wasteZones, setWasteZones] = useState<string[]>([]);
  const [activeWasteOffers, setActiveWasteOffers] = useState<any[]>([]);
  const [loadingWaste, setLoadingWaste] = useState(false);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = wasteDistrito ? Object.keys(locations[wasteDistrito] || {}).sort() : [];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  const isNifValid = useMemo(() => cardNumber.replace(/\s/g, '').length === 9, [cardNumber]);

  const previewCashbackValue = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const percent = currentUser?.cashbackPercent || 0;
    return (numAmount * percent) / 100;
  }, [amount, currentUser?.cashbackPercent]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchConfig = async () => {
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        const data = configSnap.data() as any;
        setSysConfig({ 
          merchantTerms: data.merchantTerms || '', 
          merchantFaqs: data.merchantFaqs || '' 
        });
      }
    };
    fetchConfig();

    const qMsg = query(collection(db, 'merchant_messages'), where('merchantId', '==', currentUser.id));
    const unsubMsg = onSnapshot(qMsg, (snap: any) => setAdminMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))));

    const qWaste = query(collection(db, 'anti_waste'), where('merchantId', '==', currentUser.id));
    const unsubWaste = onSnapshot(qWaste, (snap: any) => {
        const now = new Date();
        setActiveWasteOffers(snap.docs.map((d: any) => ({id: d.id, ...d.data()})).filter((w: any) => w.endTime.toDate() > now));
    });

    return () => { unsubMsg(); unsubWaste(); };
  }, [currentUser?.id]);

  useEffect(() => {
    const searchClient = async () => {
      if (!isNifValid) { setFoundClient(null); return; }
      setIsSearching(true);
      try {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        let q = query(collection(db, 'users'), where('customerNumber', '==', cleanNumber), where('role', '==', 'client'));
        let snap = await getDocs(q);
        if (snap.empty) {
          q = query(collection(db, 'users'), where('nif', '==', cleanNumber), where('role', '==', 'client'));
          snap = await getDocs(q);
        }
        if (!snap.empty) setFoundClient({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
        else setFoundClient(null);
      } catch (err) { setFoundClient(null); } finally { setIsSearching(false); }
    };
    const timeoutId = setTimeout(() => searchClient(), 500);
    return () => clearTimeout(timeoutId);
  }, [cardNumber, isNifValid]);

  const handleDeleteMessage = async (id: string) => {
    try { await deleteDoc(doc(db, 'merchant_messages', id)); toast.success("MENSAGEM APAGADA."); if (adminMessages.length <= 1) setShowInbox(false); } catch (e) { toast.error("ERRO."); }
  };

  const processAction = (type: 'earn' | 'redeem' | 'cancel', redeemAmount?: number) => {
    const val = type === 'redeem' ? redeemAmount : parseFloat(amount);
    setPendingAction({ type, val: val || 0, invAmount: parseFloat(amount) || 0 });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction || !currentUser || !foundClient) return;
    setShowConfirmModal(false); setIsLoading(true);
    try {
      await addTransaction({
        clientId: foundClient.id, merchantId: currentUser.id, merchantName: currentUser.shopName || currentUser.name || 'Loja',
        amount: pendingAction.val, invoiceAmount: pendingAction.invAmount, type: pendingAction.type, documentNumber: documentNumber,
        clientName: foundClient.name, clientCardNumber: foundClient.customerNumber, clientBirthDate: foundClient.birthDate
      });
      setAmount(''); setDocumentNumber(''); setCardNumber(''); setFoundClient(null);
    } catch (e) { toast.error("ERRO NO REGISTO."); } finally { setIsLoading(false); }
  };

  const handleAddWasteZone = () => {
    if (wasteZones.length >= 2) return toast.error("Máximo de 2 concelhos permitidos.");
    if (!wasteConcelho) return toast.error("Selecione o Concelho.");
    const zoneStr = `${wasteConcelho} (${wasteDistrito})`;
    if (!wasteZones.includes(zoneStr)) { setWasteZones([...wasteZones, zoneStr]); setWasteConcelho(''); }
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(activeWasteOffers.length > 0) return toast.error("Só pode ter 1 anúncio ativo.");
    if(wasteZones.length === 0) return toast.error("Selecione pelo menos 1 Concelho.");
    setLoadingWaste(true);
    try {
        const [hours, minutes] = wasteForm.endTime.split(':');
        const endDate = new Date();
        endDate.setHours(Number(hours), Number(minutes), 0, 0);
        if (endDate <= new Date()) { setLoadingWaste(false); return toast.error("A hora de fim tem que ser no futuro."); }
        await addDoc(collection(db, 'anti_waste'), {
            merchantId: currentUser?.id, merchantName: currentUser?.shopName || currentUser?.name,
            address: currentUser?.address || currentUser?.freguesia || '',
            productInfo: wasteForm.productInfo, conditions: wasteForm.conditions,
            targetZones: wasteZones, endTime: Timestamp.fromDate(endDate), createdAt: serverTimestamp()
        });
        toast.success("Anúncio publicado!");
        setWasteForm({...wasteForm, productInfo: '', conditions: ''});
        setWasteZones([]); setWasteDistrito('');
    } catch(err) { toast.error("Erro ao publicar."); } finally { setLoadingWaste(false); }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-20 font-sans">
      
      <header className="bg-[#0f172a] p-6 lg:p-8 rounded-b-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f]">
        <div className="flex items-center gap-6 text-white">
          <h2 className="text-xl lg:text-2xl font-black uppercase italic tracking-tighter">{currentUser.shopName || currentUser.name}</h2>
          
          <button onClick={() => setShowInbox(true)} className="relative bg-white/10 p-3 rounded-2xl hover:bg-[#00d66f] hover:text-[#0a2540] transition-all">
             <MessageSquare size={24} />
             {adminMessages.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f172a] animate-pulse">{adminMessages.length}</span>}
          </button>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setView('terminal')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>Terminal</button>
          <button onClick={() => setView('catalog')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'catalog' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}><Package size={14} className="inline mr-1"/> Catálogo</button>
          <button onClick={() => setView('marketing')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'marketing' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}>Marketing</button>
          <button onClick={() => setView('anti_waste')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'anti_waste' ? 'bg-[#22c55e] text-white' : 'text-green-400 hover:bg-green-500/20'}`}>Desperdício</button>
          <button onClick={() => setView('bi')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'bi' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}><Activity size={14} className="inline mr-1"/> B.I.</button>
          <button onClick={() => setView('settings')} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'settings' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white hover:bg-white/10'}`}><Settings size={14} className="inline mr-1"/></button>
          <button onClick={async () => { await logout(); navigate('/'); }} className="p-3 text-red-400 hover:text-red-500 hover:bg-white/10 rounded-xl transition-all"><LogOut size={20} /></button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <button onClick={() => setShowFaqModal(true)} className="w-full bg-blue-500 text-white p-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 border-b-4 border-blue-700 hover:bg-blue-600 transition-colors">
             <HelpCircle size={20} /> Guia Passo-a-Passo da App
           </button>

           <button onClick={() => setShowRulesModal(true)} className="w-full bg-amber-500 text-white p-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 border-b-4 border-amber-700 hover:bg-amber-600 transition-colors">
             <BookOpen size={20} /> Ler Condições de Adesão
           </button>
        </div>

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
            formatCurrency={(v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)}
            isLeaving={currentUser.isLeaving}
          />
        )}

        {view === 'catalog' && <MerchantCatalog merchant={currentUser} />}
        {view === 'bi' && <BusinessIntelligence merchantId={currentUser.id} transactions={[]} />}
        {view === 'marketing' && <MerchantMarketing merchantId={currentUser.id} merchantName={currentUser.shopName || currentUser.name || ""} />}
        {view === 'settings' && <MerchantSettings currentUser={currentUser} />}

        {view === 'anti_waste' && (
           <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 md:p-10 rounded-[40px] border-4 border-[#22c55e] shadow-[12px_12px_0px_#22c55e] space-y-6">
                 <div>
                    <h3 className="text-xl font-black uppercase italic text-green-700 flex items-center gap-2"><Leaf /> Combate ao Desperdício</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Anuncie gratuitamente produtos com validade curta ou sobras diárias.</p>
                 </div>
                 
                 <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100">
                    <p className="text-[10px] font-black text-green-800 uppercase mb-1">Regras:</p>
                    <ul className="text-[9px] font-bold text-green-700 space-y-1 ml-4 list-disc">
                       <li>O anúncio é válido apenas para o dia de hoje.</li>
                       <li>Só pode ter um anúncio ativo por dia.</li>
                       <li>Pode anunciar num máximo de 2 Concelhos à escolha.</li>
                    </ul>
                 </div>

                 <form onSubmit={handleWasteSubmit} className="space-y-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Produtos / Sobras</label><input required placeholder="Ex: 5 caixas de pão, 3 bolos..." value={wasteForm.productInfo} onChange={e=>setWasteForm({...wasteForm, productInfo: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-green-500" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Condições (Ex: 50% desc)</label><input required placeholder="Ex: Tudo com 50% de desconto" value={wasteForm.conditions} onChange={e=>setWasteForm({...wasteForm, conditions: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-green-500" /></div>
                    
                    <div className="space-y-2 border-t-2 border-slate-100 pt-4">
                      <label className="text-[10px] font-black uppercase text-slate-400">Onde vai Anunciar? (Máx 2 Concelhos)</label>
                      <select value={wasteDistrito} onChange={e=>{setWasteDistrito(e.target.value); setWasteConcelho('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-green-500">
                         <option value="">Escolha o Distrito</option>
                         {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select disabled={!wasteDistrito} value={wasteConcelho} onChange={e=>setWasteConcelho(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-green-500 disabled:opacity-50">
                         <option value="">Escolha o Concelho</option>
                         {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={handleAddWasteZone} disabled={!wasteConcelho} className="w-full bg-green-100 text-green-700 border-2 border-green-200 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-green-200 transition-colors disabled:opacity-50">
                        + Adicionar este Concelho
                      </button>
                      
                      {wasteZones.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {wasteZones.map((z, idx) => (
                            <span key={idx} className="bg-[#22c55e] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-sm">
                              {z} <X size={14} className="cursor-pointer hover:text-red-200" onClick={() => setWasteZones(wasteZones.filter((_, i) => i !== idx))}/>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div><label className="text-[10px] font-black uppercase text-slate-400 mt-2">Hora Limite (Hoje)</label><input required type="time" value={wasteForm.endTime} onChange={e=>setWasteForm({...wasteForm, endTime: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-green-500" /></div>
                    
                    <button type="submit" disabled={loadingWaste || activeWasteOffers.length > 0} className="w-full bg-[#22c55e] text-white p-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-green-600 transition-all shadow-lg flex justify-center items-center gap-3 disabled:opacity-50 border-b-4 border-green-800">
                       {loadingWaste ? <Loader2 className="animate-spin"/> : <><Send size={18}/> Publicar Imediatamente</>}
                    </button>
                 </form>
              </div>

              <div className="space-y-4">
                 <h3 className="text-lg font-black uppercase text-slate-400">Anúncio Ativo Hoje</h3>
                 {activeWasteOffers.map((o: any) => (
                    <div key={o.id} className="bg-white border-4 border-[#22c55e] p-6 rounded-[30px] relative">
                       <p className="font-black text-lg text-[#0a2540] uppercase">{o.merchantName}</p>
                       <p className="text-[10px] font-bold text-slate-400 mb-4">{o.address}</p>
                       <div className="space-y-2 bg-green-50 p-4 rounded-2xl border-2 border-green-100">
                          <p className="text-sm font-bold text-green-900">{o.productInfo}</p>
                          <p className="text-xs font-black text-green-700 bg-white inline-block px-3 py-1 rounded-lg shadow-sm">{o.conditions}</p>
                       </div>
                       <p className="text-[9px] font-black uppercase text-green-800 mb-2 mt-4">Visível em:</p>
                       <div className="flex flex-wrap gap-1 mb-4">
                         {(o.targetZones || []).map((z:string, i:number) => <span key={i} className="text-[8px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded border border-green-200">{z}</span>)}
                       </div>

                       <div className="mt-4 flex justify-between items-center border-t-2 border-slate-100 pt-4">
                          <p className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border-2 border-slate-200">
                             Expira às: {o.endTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <button onClick={() => deleteDoc(doc(db, 'anti_waste', o.id))} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-xl transition-colors"><Trash2 size={16}/></button>
                       </div>
                    </div>
                 ))}
                 {activeWasteOffers.length === 0 && <p className="text-center p-10 bg-white border-4 border-dashed border-slate-200 rounded-[30px] font-bold text-slate-300 text-sm uppercase">Nenhum anúncio ativo hoje.</p>}
              </div>
           </div>
        )}

        {showConfirmModal && foundClient && pendingAction && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in">
               <div className="bg-[#0a2540] p-6 text-white text-center"><AlertTriangle size={32} className="mx-auto text-[#00d66f] mb-2" /><h3 className="font-black uppercase italic tracking-tighter text-xl">Confirmação</h3></div>
               <div className="p-8 text-center space-y-4">
                 <p className="text-xs font-bold text-slate-500 uppercase">Cliente</p>
                 <p className="text-lg font-black text-[#0a2540]">{foundClient.name}</p>
                 <div className="border-t-2 border-dashed border-slate-100 my-4"></div>
                 <p className="text-xs font-bold text-slate-500 uppercase">{pendingAction.type === 'earn' ? 'Fatura Base' : 'Valor a Descontar'}</p>
                 <p className={`text-4xl font-black italic ${pendingAction.type === 'earn' ? 'text-[#0a2540]' : 'text-red-500'}`}>{formatCurrency(pendingAction.val)}</p>
                 <div className="flex gap-4 mt-8">
                   <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] text-slate-400 bg-slate-100 hover:bg-slate-200">Cancelar</button>
                   <button onClick={handleConfirm} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] text-[#0a2540] bg-[#00d66f] shadow-lg hover:scale-105 transition-all border-b-4 border-black/10">Confirmar</button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {showRulesModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-amber-500 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
              <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
                <h3 className="font-black uppercase italic flex items-center gap-2 text-[#0a2540]"><BookOpen className="text-[#0a2540]" /> Condições de Adesão</h3>
                <button onClick={() => setShowRulesModal(false)} className="p-2 hover:bg-white/20 rounded-full text-[#0a2540]"><X /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-6 text-sm font-bold text-slate-600 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                {sysConfig.merchantTerms}
              </div>
              <div className="p-6 border-t-2 border-slate-100 bg-slate-50">
                <button onClick={() => setShowRulesModal(false)} className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-md">Compreendi as Regras</button>
              </div>
            </div>
          </div>
        )}

        {showFaqModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-blue-500 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
              <div className="bg-blue-500 p-6 text-white flex justify-between items-center">
                <h3 className="font-black uppercase italic flex items-center gap-2"><HelpCircle size={24} /> Guia de Utilização (FAQs)</h3>
                <button onClick={() => setShowFaqModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-6 text-sm font-bold text-slate-600 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                {sysConfig.merchantFaqs}
              </div>
              <div className="p-6 border-t-2 border-slate-100 bg-slate-50">
                <button onClick={() => setShowFaqModal(false)} className="w-full bg-blue-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-md">Fechar Guia</button>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="py-12 flex flex-col items-center gap-6 mt-20">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center px-6">Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local</p>
      </footer>

      {showScanner && <QRScannerModal onScan={(text: string) => { setCardNumber(text); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
      
      {showInbox && (
        <div className="fixed inset-0 z-[200] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[40px] border-4 border-[#00d66f] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center"><h3 className="font-black uppercase italic tracking-tighter text-lg flex items-center gap-3"><BellRing className="text-[#00d66f]" /> Mensagens da Administração</h3><button onClick={() => setShowInbox(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                 {adminMessages.length === 0 ? (<p className="text-center text-slate-400 font-black uppercase text-[10px] py-10">Sem mensagens novas.</p>) : adminMessages.map((msg: any) => (
                   <div key={msg.id} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 relative group transition-colors hover:border-blue-100 hover:bg-blue-50/30">
                      <p className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <div className="mt-4 flex justify-between items-center border-t-2 border-slate-100 pt-4">
                         <span className="text-[9px] font-black text-slate-400 uppercase">Enviada a: {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString() : 'Recente'}</span>
                         <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all"><Trash2 size={14} /> Apagar</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;