// src/features/user/UserDashboard.tsx

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { QRCodeCanvas } from 'qrcode.react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Transaction, User as UserProfile, Leaflet, AppNotification, AppEvent, AntiWasteItem, MunicipalityFAQ } from '../../types';
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHome from './components/UserHome';
import UserHistory from './components/UserHistory';
import BannerCarousel from './components/BannerCarousel';
import ProductMarketplace from './components/ProductMarketplace';
import ShoppingListModal from './components/ShoppingListModal';
import UserExplore from './components/UserExplore';

import { 
  LogOut, Wallet, MessageSquare, Settings, ShieldCheck, Mail, X, 
  IdCard, Bell, Volume2, Loader2, Printer, BookOpen, CalendarPlus, 
  Leaf, MapPin, Smartphone, HelpCircle, ShoppingBag, Search, Star, ExternalLink, Store, Building2, Link2, Phone, ChevronDown, ArrowLeft, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission, getLocalDeviceId } from '../../utils/notifications';

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser, shoppingList, locations } = useStore();
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();
  const contentRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<'home' | 'marketplace' | 'explore' | 'wallets' | 'history' | 'events' | 'anti_waste' | 'municipalities'>('home');
  const [showCart, setShowCart] = useState(false);
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  const [sysConfig, setSysConfig] = useState<any>({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '', clientFaqs: '', merchantTerms: '' });
  
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [allMerchants, setAllMerchants] = useState<UserProfile[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [activeLeaflets, setActiveLeaflets] = useState<Leaflet[]>([]);
  const [appNotification, setAppNotification] = useState<AppNotification | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [wasteItems, setWasteItems] = useState<AntiWasteItem[]>([]);
  
  const [municipalitiesFaqs, setMunicipalitiesFaqs] = useState<MunicipalityFAQ[]>([]);
  const [munFilters, setMunFilters] = useState({ distrito: currentUser?.distrito || '', concelho: currentUser?.concelho || '', freguesia: currentUser?.freguesia || '' });

  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  const [showFaqModal, setShowFaqModal] = useState(false); 
  const [emailCopied, setEmailCopied] = useState(false);

  const [isThisDeviceLinked, setIsThisDeviceLinked] = useState<boolean | null>(null);

  const displayCardNumber = currentUser?.customerNumber || currentUser?.nif || "000000000";

  useEffect(() => {
    const checkDevice = async () => {
      if (!currentUser?.id) return;
      const deviceId = getLocalDeviceId();
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.id));
        if (userSnap.exists()) {
          const devices = userSnap.data().devices || [];
          const linked = devices.some((d: any) => d.deviceId === deviceId);
          setIsThisDeviceLinked(linked);
        } else {
          setIsThisDeviceLinked(false);
        }
      } catch {
        setIsThisDeviceLinked(false);
      }
    };
    checkDevice();
  }, [currentUser?.id]);

  useEffect(() => {
    if (view !== 'home' && contentRef.current) {
      const headerOffset = window.innerWidth >= 768 ? 440 : 320; 
      const elementPosition = contentRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [view]);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 50); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingMerchants(true);
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) setSysConfig(configSnap.data());

        const q = query(collection(db, 'users'), where('role', '==', 'merchant'), where('status', '==', 'active'));
        const merchantsSnap = await getDocs(q);
        setAllMerchants(merchantsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as UserProfile[]);
      } catch (err: any) {
        console.error("Erro ao carregar lojas:", err);
        toast.error("Falha ao carregar a lista de lojas. Tente novamente mais tarde.");
        setAllMerchants([]);
      } finally {
        setLoadingMerchants(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snap: any) => { setEvaluatedIds(snap.docs.map((d: any) => d.data().transactionId)); });
    return () => unsubscribe();
  }, [currentUser?.id]);

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
            z.includes(currentUser.freguesia || '') || z.includes(currentUser.concelho || '') || z.includes(currentUser.distrito || '')
          );
          return inTime && inZone;
        });
      setActiveLeaflets(valid);
    });
    return () => unsubscribe();
  }, [currentUser]);

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
        if (matches) { setAppNotification(notif); break; }
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

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

  useEffect(() => {
    if (!currentUser || view !== 'municipalities') return;
    let q = query(collection(db, 'municipalities_faqs'), orderBy('createdAt', 'desc'));
    if (munFilters.distrito) q = query(q, where('distrito', '==', munFilters.distrito));
    if (munFilters.concelho) q = query(q, where('concelho', '==', munFilters.concelho));

    const unsubscribe = onSnapshot(q, (snap: any) => {
      let results = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MunicipalityFAQ));
      if (munFilters.freguesia) {
        results = results.filter((f: MunicipalityFAQ) => f.freguesia === '' || f.freguesia === munFilters.freguesia);
      }
      setMunicipalitiesFaqs(results);
    });
    return () => unsubscribe();
  }, [currentUser, view, munFilters]);

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
        setIsThisDeviceLinked(true);
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

  const distritos = Object.keys(locations).sort();
  const concelhos = munFilters.distrito ? Object.keys(locations[munFilters.distrito] || {}).sort() : [];
  const freguesias = munFilters.distrito && munFilters.concelho ? (locations[munFilters.distrito][munFilters.concelho] || []).sort() : [];

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans pb-32">
      
      <div className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out shadow-xl ${isScrolled ? 'h-[238px]' : 'h-[280px] md:h-[400px]'}`}>
        <BannerCarousel isScrolled={isScrolled} />
        
        <div className={`absolute left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent z-50 transition-all duration-300 ${isScrolled ? 'top-[-10px]' : 'top-0'}`}>
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 transition-all duration-300 origin-top-left ${isScrolled ? 'p-1 scale-[0.70]' : 'p-2 scale-100'}`}>
            <img src="/logo-vizinho.png" alt="Vizinho+" className="h-10 w-auto object-contain" />
          </div>
          
          <div className={`flex gap-3 transition-all duration-300 origin-top-right ${isScrolled ? 'scale-[0.75]' : 'scale-100'}`}>
            <button onClick={() => setShowCart(true)} className="relative bg-[#00d66f] p-3 rounded-full text-[#0a2540] border-2 border-[#0a2540] shadow-lg hover:scale-110 transition-all">
              <ShoppingBag size={22} strokeWidth={3} />
              {shoppingList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a2540] animate-bounce">
                  {shoppingList.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => navigate('/settings')} 
              className="relative bg-white/20 backdrop-blur-md p-3 rounded-full text-white border border-white/30 hover:bg-white/40 transition-all"
            >
              <Settings size={20} />
              {isThisDeviceLinked === false && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse shadow-lg">
                  !
                </span>
              )}
            </button>
            
            <button onClick={handleLogout} className="bg-red-500/80 backdrop-blur-md p-3 rounded-full text-white border border-red-400/30 hover:bg-red-600 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className={`max-w-2xl mx-auto px-6 relative z-20 space-y-6 transition-all duration-300 ease-in-out ${isScrolled ? 'pt-[260px]' : 'pt-[320px] md:pt-[440px]'}`}>
        
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden relative group">
          <button onClick={handlePrintCard} className="absolute top-4 right-4 bg-slate-100 hover:bg-[#00d66f] hover:text-[#0a2540] text-slate-400 p-3 rounded-full transition-colors z-10" title="Imprimir Cartão">
             <Printer size={20} />
          </button>

          <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div className="pr-12">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Cliente Vizinho+</p>
              <h1 className="text-xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none">{currentUser.name}</h1>
              {currentUser.nif && <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1"><IdCard size={12}/> NIF: {currentUser.nif}</p>}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-widest">Saldo Atual</span>
              <span className="text-2xl font-black text-[#00d66f] italic">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.available)}</span>
            </div>
          </div>
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-inner">
              <QRCodeCanvas id="user-qr-canvas" value={displayCardNumber} size={150} />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-mono font-bold tracking-[0.4em] text-[#0a2540]">{displayCardNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</h3>
              <div className="flex flex-col items-center justify-center gap-1 mt-4">
                <span className="text-[11px] font-black text-[#0a2540] uppercase tracking-widest bg-[#00d66f]/20 px-3 py-1 rounded-md">Apresente este cartão antes de pagar</span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => setView(view === 'municipalities' ? 'home' : 'municipalities')} className={`w-full p-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] shadow-lg flex items-center justify-center gap-2 border-b-4 transition-colors animate-in fade-in ${view === 'municipalities' ? 'bg-[#0a2540] text-blue-400 border-black' : 'bg-blue-500 text-white border-blue-700 hover:bg-blue-600'}`}>
          <Building2 size={20} /> Apoio ao Munícipe
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button onClick={() => setView('marketplace')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 ${view === 'marketplace' ? 'bg-[#0a2540] border-[#0a2540] text-[#00d66f] shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-[#00d66f]'}`}>
            <ShoppingBag size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Marketplace</span>
          </button>
          
          <button onClick={() => setView('wallets')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 ${view === 'wallets' ? 'bg-[#0a2540] border-[#0a2540] text-white shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-[#00d66f]'}`}>
            <Wallet size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">O meu Saldo</span>
          </button>

          <button onClick={() => setView('explore')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 ${view === 'explore' ? 'bg-[#0a2540] border-[#0a2540] text-white shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-[#00d66f]'}`}>
            <Store size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Lojas Parceiras</span>
          </button>

          <button onClick={() => setView('history')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 relative ${view === 'history' ? 'bg-[#0a2540] border-[#0a2540] text-white shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-[#00d66f]'}`}>
            {pendingEvaluations.length > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white animate-bounce">{pendingEvaluations.length}</span>}
            <MessageSquare size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Avaliar Lojas</span>
          </button>

          <button onClick={() => setView('events')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 relative ${view === 'events' ? 'bg-blue-500 border-blue-600 text-white shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-blue-500'}`}>
            {events.length > 0 && <span className="absolute top-2 right-2 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white animate-bounce">{events.length}</span>}
            <CalendarPlus size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Eventos Locais</span>
          </button>

          <button onClick={() => setView('anti_waste')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all border-2 relative ${view === 'anti_waste' ? 'bg-green-500 border-green-600 text-white shadow-inner' : 'bg-white border-slate-100 text-slate-500 shadow-sm hover:border-green-500'}`}>
            {wasteItems.length > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white animate-bounce">{wasteItems.length}</span>}
            <Leaf size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Desperdício Zero</span>
          </button>
        </div>

        {appNotification && (
          <div className="bg-[#0a2540] rounded-3xl p-6 shadow-lg flex items-start gap-4 animate-in slide-in-from-top-10 relative border-l-8 border-[#00d66f]">
            <div className="bg-[#00d66f]/10 text-[#00d66f] p-3 rounded-2xl shrink-0"><Bell size={24} /></div>
            <div className="flex-1">
              <h4 className="text-lg font-black uppercase italic text-white leading-none mb-2">{appNotification.title}</h4>
              <p className="text-xs font-bold text-slate-300">{appNotification.message}</p>
              <button onClick={dismissNotification} className="mt-4 bg-[#00d66f] text-[#0a2540] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Fechar</button>
            </div>
            <button onClick={dismissNotification} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
        )}

        <div ref={contentRef} className="mt-8 pt-6 border-t-2 border-slate-200 animate-in fade-in">
          {view !== 'home' && (
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-black uppercase italic text-[#0a2540]">
                 {view === 'marketplace' && 'Marketplace Local'}
                 {view === 'explore' && 'Lojas Parceiras'}
                 {view === 'wallets' && 'O Meu Saldo'}
                 {view === 'history' && 'Histórico e Avaliações'}
                 {view === 'events' && 'Eventos Locais'}
                 {view === 'anti_waste' && 'Desperdício Zero'}
                 {view === 'municipalities' && 'Apoio ao Munícipe'}
               </h2>
               <button onClick={() => setView('home')} className="bg-white border-2 border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-slate-50 hover:text-[#0a2540] transition-colors shadow-sm">
                 <ArrowLeft size={14} /> Voltar ao Início
               </button>
            </div>
          )}

          {view === 'home' && (
            <div className="space-y-6 animate-in fade-in">
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
            </div>
          )}

          {view === 'marketplace' && <ProductMarketplace />}
          {view === 'explore' && (
            loadingMerchants ? (
              <div className="py-20 text-center">
                <Loader2 size={40} className="animate-spin text-[#00d66f] mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400">A carregar lojas...</p>
              </div>
            ) : (
              <UserExplore allMerchants={allMerchants} />
            )
          )}
          {view === 'wallets' && <UserHome currentUser={currentUser} stats={{available: currentUser.wallet?.available || 0, pending: 0}} merchantBalances={[]} vantagensUrl="" />}
          {view === 'history' && <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />}

          {view === 'municipalities' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                {/* ... (resto da vista municipalities igual) ... */}
                <div className="bg-blue-50 p-6 rounded-[30px] border-2 border-blue-100">
                   <p className="text-[10px] font-black uppercase text-blue-800 mb-2 flex items-center gap-2"><Search size={14}/> Pesquisar por Localidade</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select value={munFilters.distrito} onChange={e=>setMunFilters({...munFilters, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-white focus:border-blue-400">
                         <option value="">Distrito</option>
                         {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select disabled={!munFilters.distrito} value={munFilters.concelho} onChange={e=>setMunFilters({...munFilters, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-white focus:border-blue-400 disabled:opacity-50">
                         <option value="">Concelho</option>
                         {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select disabled={!munFilters.concelho} value={munFilters.freguesia} onChange={e=>setMunFilters({...munFilters, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-white focus:border-blue-400 disabled:opacity-50">
                         <option value="">Freguesia (Opcional)</option>
                         {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {municipalitiesFaqs.map(faq => (
                      <details key={faq.id} className="bg-white border-2 border-slate-100 rounded-2xl shadow-sm group overflow-hidden">
                         <summary className="p-5 font-black text-[#0a2540] text-sm cursor-pointer list-none flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${faq.type === 'camara' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                  <Building2 size={16} />
                               </div>
                               {faq.question}
                            </div>
                            <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform" />
                         </summary>
                         <div className="p-5 pt-0 text-sm font-bold text-slate-600 leading-relaxed border-t-2 border-slate-50 mt-2 whitespace-pre-wrap">
                            {faq.answer}
                            {(faq.contacts || faq.links) && (
                               <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                  {faq.contacts && <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#0a2540]"><Phone size={14} className="text-[#00d66f]" /> {faq.contacts}</div>}
                                  {faq.links && <a href={faq.links} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] font-black uppercase text-blue-500 hover:text-blue-700"><Link2 size={14} /> Aceder ao Link</a>}
                               </div>
                            )}
                         </div>
                      </details>
                   ))}
                   {municipalitiesFaqs.length === 0 && (
                      <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                         <Building2 size={32} className="mx-auto text-slate-300 mb-3" />
                         <p className="text-[10px] font-black uppercase text-slate-400">Nenhuma informação disponível para esta localidade.</p>
                      </div>
                   )}
                </div>
             </div>
          )}

          {view === 'events' && (
             <div className="space-y-4 animate-in fade-in duration-500">
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
                             <p className="flex items-center gap-2 col-span-2 mt-2 pt-2 border-t border-blue-200">Da {ev.startDate.toDate().toLocaleDateString()} a {ev.endDate.toDate().toLocaleDateString()} (Início às {ev.startTime})</p>
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
                      <h4 className="font-black uppercase text-[#0a2540] flex items-center gap-2"><Store size={16} className="text-[#22c55e]"/> {w.merchantName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 mb-4">{w.address}</p>
                      <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100 mb-4">
                         <p className="text-sm font-bold text-green-900 mb-2">{w.productInfo}</p>
                         <span className="bg-white text-green-700 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-green-200 inline-block shadow-sm">🛒 {w.conditions}</span>
                      </div>
                      <p className="text-right text-[10px] font-black uppercase text-slate-500 bg-slate-100 p-3 rounded-xl border-2 border-slate-200 w-full">⚠️ Termina às {w.endTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                ))}
                {wasteItems.length === 0 && <p className="text-center p-10 bg-white border-4 border-dashed border-slate-200 rounded-[30px] font-bold text-slate-400 text-xs uppercase">Nenhuma oportunidade hoje. Tente mais tarde!</p>}
             </div>
          )}
        </div>

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

      </main>

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
                <button onClick={handleOpenEmailApp} className="w-full bg-[#0a2540] text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3">Abrir App de Email</button>
                <button onClick={handleCopyEmail} className="w-full p-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-slate-100 hover:bg-slate-50 transition-all">{emailCopied ? 'Copiado!' : 'Copiar Email'}</button>
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
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-xs font-medium text-slate-600 leading-relaxed custom-scrollbar whitespace-pre-wrap">
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
          <p className="text-slate-400 text-[8px] font-bold max-w-3xl leading-relaxed uppercase">A tecnologia, design, regras de negócio e ideologia do programa Vizinho+ estão legalmente protegidos por direitos de autor e propriedade intelectual.</p>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;