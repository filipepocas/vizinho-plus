// src/features/user/UserDashboard.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { QRCodeCanvas } from 'qrcode.react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Transaction, User as UserProfile, Leaflet, AppNotification, AppEvent, AntiWasteItem } from '../../types';
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHome from './components/UserHome';
import UserHistory from './components/UserHistory';
import BannerCarousel from './components/BannerCarousel';
import ProductMarketplace from './components/ProductMarketplace';
import ShoppingListModal from './components/ShoppingListModal';

import { 
  LogOut, Wallet, MessageSquare, Settings, ShieldCheck, Mail, X, 
  IdCard, Bell, Volume2, Loader2, Printer, BookOpen, CalendarPlus, 
  Leaf, MapPin, Smartphone, HelpCircle, ShoppingBag, Search, Star, ExternalLink, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission } from '../../utils/notifications';

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser, shoppingList } = useStore();
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();

  // ESTADOS DE NAVEGAÇÃO E UI
  const [view, setView] = useState<'home' | 'marketplace' | 'wallets' | 'history' | 'events' | 'anti_waste'>('home');
  const [showCart, setShowCart] = useState(false);
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  const [sysConfig, setSysConfig] = useState<any>({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '', clientFaqs: '', merchantTerms: '' });
  
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [activeLeaflets, setActiveLeaflets] = useState<Leaflet[]>([]);
  const [appNotification, setAppNotification] = useState<AppNotification | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [wasteItems, setWasteItems] = useState<AntiWasteItem[]>([]);
  
  // ESTADO DO SCROLL INTELIGENTE
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [localNotifGranted, setLocalNotifGranted] = useState(false);
  
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  const [showFaqModal, setShowFaqModal] = useState(false); 
  const [emailCopied, setEmailCopied] = useState(false);

  const displayCardNumber = currentUser?.customerNumber || currentUser?.nif || "000000000";

  // 1. MONITOR DE SCROLL
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. CARREGAR CONFIGURAÇÕES GLOBAIS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) setSysConfig(configSnap.data());
      } catch (err) {
        console.error("Erro ao carregar config:", err);
      }
    };
    fetchData();
  }, []);

  // 3. SUBSCREVER FEEDBACKS (Para saber o que falta avaliar)
  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snap: any) => {
      setEvaluatedIds(snap.docs.map((d: any) => d.data().transactionId));
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // 4. SUBSCREVER FOLHETOS ATIVOS
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'leaflets'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snap: any) => {
      const now = new Date();
      const valid = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() } as Leaflet))
        .filter((l: any) => {
          const start = l.startDate?.toDate ? l.startDate.toDate() : new Date();
          const end = l.endDate?.toDate ? l.endDate.toDate() : new Date();
          const inTime = now >= start && now <= end;
          const zones = l.targetZones || [];
          const inZone = zones.length === 0 || zones.some((z: string) => 
            z.includes(currentUser.freguesia || '') || 
            z.includes(currentUser.concelho || '') || 
            z.includes(currentUser.distrito || '')
          );
          return inTime && inZone;
        });
      setActiveLeaflets(valid);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 5. SUBSCREVER NOTIFICAÇÕES IN-APP
  useEffect(() => {
    if (!currentUser) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap: any) => {
      const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AppNotification));
      for (let notif of docs) {
        if (notif.createdAt && notif.createdAt.toDate() < yesterday) continue;
        const dismissed = sessionStorage.getItem(`notif_${notif.id}`);
        if (dismissed) continue;
        
        let matches = false;
        if (notif.targetType === 'all') matches = true;
        else if (notif.targetType === 'email' && currentUser.email === notif.targetValue?.toLowerCase()) matches = true;
        else if (notif.targetType === 'birthDate' && currentUser.birthDate === notif.targetValue) matches = true;
        else if (notif.targetType === 'zonas') {
           const zones = (notif as any).targetZones || [];
           matches = zones.some((z: string) => z.includes(currentUser.freguesia || '') || z.includes(currentUser.concelho || '') || z.includes(currentUser.distrito || ''));
        }
        
        if (matches) {
          setAppNotification(notif);
          break; 
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 6. SUBSCREVER EVENTOS E DESPERDÍCIO
  useEffect(() => {
    if (!currentUser) return;
    const qEvents = query(collection(db, 'events'), where('status', '==', 'approved'), orderBy('startDate', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap: any) => {
      const now = new Date();
      const validEvents = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AppEvent))
        .filter((e: any) => {
            const isFuture = e.endDate.toDate() >= now;
            const targetZones = (e as any).targetZones || [];
            const matchZip = targetZones.length === 0 || targetZones.some((z: string) => z.includes(currentUser.freguesia || '') || z.includes(currentUser.concelho || '') || z.includes(currentUser.distrito || ''));
            return isFuture && matchZip;
        });
      setEvents(validEvents);
    });

    const qWaste = query(collection(db, 'anti_waste'), orderBy('createdAt', 'desc'));
    const unsubWaste = onSnapshot(qWaste, (snap: any) => {
      const now = new Date();
      const active = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AntiWasteItem))
        .filter((w: any) => {
            const isFuture = w.endTime.toDate() > now;
            const targetZones = (w as any).targetZones || [];
            const matchZip = targetZones.length === 0 || targetZones.some((z: string) => z.includes(currentUser.concelho || ''));
            return isFuture && matchZip;
        });
      setWasteItems(active);
    });

    return () => { unsubEvents(); unsubWaste(); };
  }, [currentUser]);

  const dismissNotification = () => {
    if (appNotification?.id) sessionStorage.setItem(`notif_${appNotification.id}`, "true");
    setAppNotification(null);
  };

  const pendingEvaluations = useMemo(() => transactions.filter(t => t.type === 'earn' && !evaluatedIds.includes(t.id)), [transactions, evaluatedIds]);
  const stats = useMemo(() => ({ available: currentUser?.wallet?.available || 0, pending: 0 }), [currentUser?.wallet]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const openLeaflet = () => { if (activeLeaflets.length > 0) window.open(activeLeaflets[0].leafletUrl, '_blank'); };

  const handleOpenEmailApp = () => {
    const subject = encodeURIComponent(`Apoio ao Cliente: Conta ${displayCardNumber}`);
    const body = encodeURIComponent(`Olá equipa Vizinho+,\n\nPreciso de ajuda com...`);
    window.location.href = `mailto:${sysConfig.supportEmail}?subject=${subject}&body=${body}`;
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(sysConfig.supportEmail);
    setEmailCopied(true);
    toast.success("E-mail copiado!");
    setTimeout(() => setEmailCopied(false), 3000);
  };

  const enableNotifications = async () => {
    setIsNotifLoading(true);
    try {
      const res = await requestNotificationPermission(currentUser!.id);
      if(res.success) {
        toast.success("Notificações ativadas com sucesso!");
        setLocalNotifGranted(true); 
      } else {
        toast.error(res.error || "O navegador bloqueou o pedido.", { duration: 6000 });
      }
    } catch(err) {
      toast.error("Ocorreu um erro no sistema.");
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handlePrintCard = () => {
    const qrCanvas = document.getElementById('user-qr-canvas') as HTMLCanvasElement;
    const qrImage = qrCanvas ? qrCanvas.toDataURL('image/png') : '';
    const logoUrl = window.location.origin + '/logo-vizinho.png';

    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cartão Vizinho+ - ${currentUser?.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
            .card-container { display: flex; gap: 20px; }
            .card { width: 330px; height: 210px; border-radius: 16px; box-sizing: border-box; overflow: hidden; position: relative; }
            .card-front { background: linear-gradient(135deg, #0a2540 0%, #0a2540 50%, #00d66f 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid #0a2540; padding: 20px; }
            .card-front img { max-width: 80%; max-height: 60px; object-fit: contain; margin-bottom: 15px; }
            .tagline { font-size: 11px; letter-spacing: 2px; font-weight: bold; text-transform: uppercase; color: #fff; text-align: center; }
            .card-back { background: #ffffff; color: #0a2540; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 2px solid #94a3b8; }
            .qr-code { width: 100px; height: 100px; margin-bottom: 15px; }
            .number { font-size: 18px; font-family: monospace; letter-spacing: 4px; font-weight: 900; margin-bottom: 8px; }
            .name { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0a2540; line-height: 1.2; padding: 0 10px; }
            .nif { font-size: 10px; color: #64748b; margin-top: 5px; font-weight: bold; text-transform: uppercase; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="card card-front">
              <img src="${logoUrl}" alt="Vizinho+" />
              <div class="tagline">Valoriza o que é local</div>
            </div>
            <div class="card card-back">
              ${qrImage ? `<img src="${qrImage}" class="qr-code" />` : '<div style="height:100px; display:flex; align-items:center; color:red; font-size:10px;">Erro no QR</div>'}
              <div class="number">${displayCardNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</div>
              <div class="name">${currentUser?.name}</div>
              <div class="nif">${currentUser?.nif ? 'NIF: ' + currentUser.nif : 'CLIENTE VIZINHO+'}</div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!currentUser) return null;

  const hasNotificationsInDB = currentUser.notificationsEnabled === true && currentUser.fcmTokens && currentUser.fcmTokens.length > 0;
  const isButtonHidden = hasNotificationsInDB || localNotifGranted || Notification.permission === 'granted';

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans pb-32">
      
      {/* HEADER FIXO COM ANIMAÇÃO DE SCROLL */}
      <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out shadow-xl ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[350px]'}`}>
        <BannerCarousel isScrolled={isScrolled} />
        
        <div className={`absolute left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent z-50 transition-all duration-300 ${isScrolled ? 'top-[-10px]' : 'top-0'}`}>
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 transition-all duration-300 origin-top-left ${isScrolled ? 'p-1 scale-[0.70]' : 'p-2 scale-100'}`}>
            <img src="/logo-vizinho.png" alt="Vizinho+" className="h-10 w-auto object-contain" />
          </div>
          
          <div className={`flex gap-3 transition-all duration-300 origin-top-right ${isScrolled ? 'scale-[0.75]' : 'scale-100'}`}>
            {/* BOTÃO LISTA DE COMPRAS */}
            <button onClick={() => setShowCart(true)} className="relative bg-[#00d66f] p-3 rounded-full text-[#0a2540] border-2 border-[#0a2540] shadow-lg hover:scale-110 transition-all">
              <ShoppingBag size={22} strokeWidth={3} />
              {shoppingList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a2540] animate-bounce">
                  {shoppingList.length}
                </span>
              )}
            </button>
            
            <button onClick={() => navigate('/settings')} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white border border-white/30 hover:bg-white/40 transition-all">
              <Settings size={20} />
            </button>
            
            <button onClick={handleLogout} className="bg-red-500/80 backdrop-blur-md p-3 rounded-full text-white border border-red-400/30 hover:bg-red-600 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL COM COMPENSAÇÃO DE ALTURA */}
      <main className={`max-w-2xl mx-auto px-6 relative z-20 space-y-6 transition-all duration-300 ${isScrolled ? 'pt-[260px]' : 'pt-[290px] md:pt-[360px]'}`}>
        
        {/* NAVEGAÇÃO RÁPIDA */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView(view === 'marketplace' ? 'home' : 'marketplace')} className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${view === 'marketplace' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-200 text-slate-500 shadow-sm hover:scale-[1.02]'}`}>
            <Search size={18} /> Explorar Artigos
          </button>
          <button onClick={() => setView(view === 'wallets' ? 'home' : 'wallets')} className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${view === 'wallets' ? 'bg-[#0a2540] border-[#0a2540] text-white' : 'bg-white border-slate-200 text-slate-500 shadow-sm hover:scale-[1.02]'}`}>
            <Wallet size={18} /> O meu Saldo
          </button>
        </div>

        {/* VISTAS DINÂMICAS */}
        {view === 'home' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden p-8 flex flex-col items-center gap-6">
                <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-inner">
                  <QRCodeCanvas id="user-qr-canvas" value={displayCardNumber} size={150} />
                </div>
                <div className="text-center">
                   <h3 className="text-2xl font-mono font-bold tracking-[0.4em] text-[#0a2540] mb-2">{displayCardNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</h3>
                   <span className="text-[10px] font-black uppercase text-slate-400">Apresente este cartão antes de pagar</span>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setView('history')} className="bg-white p-5 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2 relative hover:border-[#0a2540] transition-all">
                   {pendingEvaluations.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce">{pendingEvaluations.length}</span>}
                   <MessageSquare className="text-[#0a2540]" />
                   <span className="text-[9px] font-black uppercase text-slate-400">Avaliar Lojas</span>
                </button>
                <button onClick={() => setView('events')} className="bg-white p-5 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2 hover:border-blue-500 transition-all">
                   {events.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce">{events.length}</span>}
                   <CalendarPlus className="text-blue-500" />
                   <span className="text-[9px] font-black uppercase text-slate-400">Eventos Locais</span>
                </button>
             </div>
             <button onClick={() => setView('anti_waste')} className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 flex items-center justify-center gap-3 hover:border-green-500 transition-all relative">
                {wasteItems.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce">{wasteItems.length}</span>}
                <Leaf className="text-green-500" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Desperdício Zero</span>
             </button>
          </div>
        )}

        {view === 'marketplace' && <ProductMarketplace />}
        {view === 'wallets' && <UserHome currentUser={currentUser} stats={{available: currentUser.wallet?.available || 0, pending: 0}} merchantBalances={[]} vantagensUrl="" />}
        {view === 'history' && <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />}

        {view === 'events' && (
           <div className="space-y-4 animate-in fade-in duration-500">
              <h3 className="text-xl font-black text-[#0a2540] uppercase italic tracking-tighter mb-4 flex items-center gap-2"><CalendarPlus className="text-blue-500" /> Agenda da Freguesia</h3>
              {events.map((ev: any) => (
                 <div key={ev.id} className="bg-white border-4 border-blue-500 rounded-[30px] p-6 shadow-lg flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 shrink-0 bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden flex items-center justify-center p-2">
                       <img src={ev.imageUrl} alt="Cartaz" className="w-full h-auto max-h-48 object-contain" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black uppercase text-[#0a2540] text-xl mb-1">{ev.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Org: {ev.entityName} | {ev.eventType}</p>
                        
                        <p className="text-xs font-bold text-slate-600 leading-relaxed mb-4">{ev.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 text-[10px] font-black uppercase text-blue-900">
                           <p className="flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> {ev.location}</p>
                           <p className="flex items-center gap-2"><Star size={14} className="text-blue-500" /> {ev.ticketPrice}</p>
                           <p className="flex items-center gap-2 col-span-2 mt-2 pt-2 border-t border-blue-200">
                             Da {ev.startDate.toDate().toLocaleDateString()} a {ev.endDate.toDate().toLocaleDateString()} (Início às {ev.startTime})
                           </p>
                        </div>
                    </div>
                 </div>
              ))}
              {events.length === 0 && <p className="text-center p-10 bg-white border-4 border-dashed border-slate-200 rounded-[30px] font-bold text-slate-400 text-xs uppercase">Nenhum evento agendado para breve.</p>}
           </div>
        )}

        {view === 'anti_waste' && (
           <div className="space-y-4 animate-in fade-in duration-500">
              <div className="bg-[#22c55e] text-white p-6 rounded-[30px] shadow-lg mb-6 border-4 border-[#22c55e]">
                 <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2"><Leaf /> Ofertas Limite</h3>
                 <p className="text-xs font-bold opacity-90 mt-2">Sobras do dia com descontos acentuados. Válido apenas nas lojas.</p>
              </div>
              {wasteItems.map((w: any) => (
                 <div key={w.id} className="bg-white border-4 border-[#22c55e] rounded-[30px] p-6 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 border-b-2 border-slate-100 pb-4">
                       <div>
                          <h4 className="font-black uppercase text-[#0a2540] flex items-center gap-2"><Store size={16} className="text-[#22c55e]"/> {w.merchantName}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{w.address}</p>
                       </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100 mb-4">
                       <p className="text-sm font-bold text-green-900 mb-2">{w.productInfo}</p>
                       <span className="bg-white text-green-700 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-green-200 inline-block shadow-sm">
                         🛒 Condições: {w.conditions}
                       </span>
                    </div>
                    <p className="text-right text-[10px] font-black uppercase text-slate-500 bg-slate-100 p-3 rounded-xl border-2 border-slate-200 inline-block w-full">
                       ⚠️ Termina às {w.endTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                 </div>
              ))}
              {wasteItems.length === 0 && <p className="text-center p-10 bg-white border-4 border-dashed border-slate-200 rounded-[30px] font-bold text-slate-400 text-xs uppercase">Nenhuma oportunidade hoje. Tente mais tarde!</p>}
           </div>
        )}

        {/* BOTÕES DE SUPORTE E PWA */}
        <button onClick={openLeaflet} disabled={activeLeaflets.length === 0} className={`w-full overflow-hidden rounded-3xl transition-all border-2 ${activeLeaflets.length > 0 ? 'bg-white border-[#0a2540] shadow-xl hover:scale-[1.01]' : 'bg-slate-200 border-slate-300 opacity-60'}`}>
          <div className="flex items-center">
            <div className={`p-8 ${activeLeaflets.length > 0 ? 'bg-[#0a2540]' : 'bg-slate-400'}`}>
              <Star size={32} className="text-[#00d66f]" />
            </div>
            <div className="p-6 text-left flex-1">
              <h4 className="text-lg font-black uppercase italic leading-none text-[#0a2540]">Oportunidades da Semana</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{activeLeaflets.length > 0 ? 'Clique para abrir o folheto digital' : 'Não existem folhetos ativos'}</p>
            </div>
            {activeLeaflets.length > 0 && <div className="pr-6"><ExternalLink size={20} className="text-[#0a2540] opacity-30" /></div>}
          </div>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {isInstallable && (
            <button onClick={installApp} className="bg-slate-800 text-white rounded-2xl p-4 flex items-center gap-3 border-b-4 border-black active:translate-y-1 transition-all">
              <Smartphone size={20} className="text-[#00d66f]" />
              <span className="font-black uppercase text-[9px] tracking-widest text-left">Instalar no<br/>Ecrã Principal</span>
            </button>
          )}
          
          {(!currentUser.notificationsEnabled || Notification.permission !== 'granted') && (
            <button onClick={enableNotifications} disabled={isNotifLoading} className={`bg-white text-[#0a2540] rounded-2xl p-4 flex items-center justify-center md:justify-start gap-3 border-2 border-slate-200 shadow-sm hover:border-[#00d66f] transition-all ${!isInstallable && 'md:col-span-2'}`}>
              {isNotifLoading ? <Loader2 size={20} className="animate-spin text-[#00d66f]" /> : (
                <>
                  <Volume2 size={20} className="text-[#00d66f] shrink-0" />
                  <span className="font-black uppercase text-[9px] tracking-widest text-left">Ativar Notificações<br/>(Recomendado)</span>
                </>
              )}
            </button>
          )}
        </div>

        {sysConfig.vantagensUrl && (
          <button onClick={() => window.open(sysConfig.vantagensUrl, '_blank')} className="w-full relative overflow-hidden p-8 rounded-3xl shadow-xl hover:scale-[1.01] transition-all group bg-[#0a2540] border-2 border-[#bf953f]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-[#bf953f] p-3 rounded-2xl"><Star size={24} className="text-white fill-white" /></div>
                <div className="text-left">
                  <h4 className="text-lg font-black uppercase italic leading-none tracking-tighter text-[#bf953f]">Vantagens VIP</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Exclusivo para membros Vizinho+</p>
                </div>
              </div>
              <ExternalLink size={20} className="text-[#bf953f]" />
            </div>
          </button>
        )}

      </main>

      {/* MODAIS */}
      {showCart && <ShoppingListModal onClose={() => setShowCart(false)} />}
      
      {selectedTxForFeedback && <FeedbackForm transactionId={selectedTxForFeedback.id} merchantId={selectedTxForFeedback.merchantId} merchantName={selectedTxForFeedback.merchantName} userId={currentUser.id} userName={currentUser.name || 'Vizinho'} onClose={() => setSelectedTxForFeedback(null)} />}

      {showContactModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a2540]/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Mail className="text-[#00d66f]" size={20} />
                <h2 className="font-black uppercase italic tracking-tighter text-lg">Apoio ao Cliente</h2>
              </div>
              <button onClick={() => setShowContactModal(false)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6 text-center">
              <p className="text-sm font-bold text-slate-500">Equipa pronta a ajudar.</p>
              <div className="space-y-3">
                <button onClick={handleOpenEmailApp} className="w-full bg-[#0a2540] text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3">
                  Abrir App de Email
                </button>
                <button onClick={handleCopyEmail} className="w-full p-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-slate-100 hover:bg-slate-50 transition-all">
                  {emailCopied ? 'Copiado!' : 'Copiar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-amber-500 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic flex items-center gap-2 text-[#0a2540]"><BookOpen className="text-[#0a2540]" /> Regras de Utilização</h3>
              <button onClick={() => setShowRulesModal(false)} className="p-2 hover:bg-white/20 rounded-full text-[#0a2540]"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-xs font-medium text-slate-600 leading-relaxed custom-scrollbar">
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">1. Isenção de Responsabilidade</h4>
                <p>A plataforma Vizinho+ atua exclusivamente como um intermediário tecnológico facilitador de cashback. O Vizinho+ isenta-se de qualquer responsabilidade sobre litígios comerciais entre Lojistas e Clientes, qualidade de produtos ou serviços prestados.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">2. Natureza do Saldo (Cashback)</h4>
                <p>O saldo acumulado não possui valor fiduciário, não é convertível em numerário e não pode ser transferido para contas bancárias. Serve unicamente como desconto em compras futuras na rede aderente.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">3. Apresentação do Cartão</h4>
                <p>O Cliente deve apresentar obrigatoriamente o seu Cartão Digital ou QR Code ao lojista antes do encerramento da fatura para garantir a atribuição ou o resgate de saldo.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">4. Limites de Desconto (Regra dos 50%)</h4>
                <p>O desconto de saldo acumulado nunca poderá ser superior a 50% do valor total da nova compra, independentemente do saldo disponível na carteira do cliente.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">5. Acumulação em Resgates</h4>
                <p>Ao resgatar saldo, o cliente continua a acumular novo cashback sobre o valor remanescente efetivamente pago na fatura.</p>
              </div>
              <div>
                <h4 className="font-black text-red-600 mb-1 uppercase">6. Prevenção de Fraude</h4>
                <p>Qualquer tentativa de fraude, uso de dados de terceiros ou manipulação do sistema resultará na suspensão imediata da conta e perda total dos benefícios acumulados.</p>
              </div>
            </div>
            <div className="p-6 border-t-2 border-slate-100 bg-slate-50"><button onClick={() => setShowRulesModal(false)} className="w-full bg-amber-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-md hover:bg-amber-600">Compreendi e Aceito as Regras</button></div>
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
              {sysConfig.clientFaqs || "O guia está a ser atualizado pela administração. Por favor, tente mais tarde."}
            </div>
            <div className="p-6 border-t-2 border-slate-100 bg-slate-50">
              <button onClick={() => setShowFaqModal(false)} className="w-full bg-blue-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-md hover:bg-blue-600">Fechar Guia</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 flex flex-col items-center gap-6 border-t border-slate-200 mt-20 bg-white relative z-20">
        <div className="flex gap-4">
          <button onClick={() => setShowContactModal(true)} className="flex items-center gap-2 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f]"><Mail size={16} /> Contacto</button>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f]"><ShieldCheck size={16} /> Privacidade</a>
        </div>
        <div className="text-center px-6">
          <p className="text-[#0a2540] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local</p>
          <p className="text-slate-400 text-[8px] font-bold max-w-3xl leading-relaxed uppercase">A tecnologia, design, regras de negócio e ideologia do programa Vizinho+ estão legalmente protegidos por direitos de autor e propriedade intelectual. É estritamente proibida a sua reprodução, cópia, venda ou adaptação por entidades não autorizadas.</p>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;