import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Transaction, User as UserProfile, Leaflet, AppNotification } from '../../types';
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHome from './components/UserHome';
import UserHistory from './components/UserHistory';
import UserExplore from './components/UserExplore';
import BannerCarousel from './components/BannerCarousel';
import { LogOut, Star, ExternalLink, Wallet, MessageSquare, Settings, ShieldCheck, Mail, X, Smartphone, IdCard, Bell, Volume2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission } from '../../utils/notifications';

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser } = useStore();
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();

  const [view, setView] = useState<'home' | 'wallets' | 'history' | 'explore'>('home');
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '' });
  
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [allMerchants, setAllMerchants] = useState<UserProfile[]>([]);
  const [activeLeaflets, setActiveLeaflets] = useState<Leaflet[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [appNotification, setAppNotification] = useState<AppNotification | null>(null);

  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const displayCardNumber = currentUser?.customerNumber || currentUser?.nif || "000000000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) setSysConfig(configSnap.data() as any);

        const q = query(collection(db, 'users'), where('role', '==', 'merchant'), where('status', '==', 'active'));
        const merchantsSnap = await getDocs(q);
        setAllMerchants(merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProfile[]);
      } catch (err) {}
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setEvaluatedIds(snapshot.docs.map(doc => doc.data().transactionId));
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const userZipBase = currentUser.zipCode?.substring(0, 4);
    const q = query(collection(db, 'leaflets'), where('isActive', '==', true));
    
    return onSnapshot(q, (snap) => {
      const now = new Date();
      const valid = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Leaflet))
        .filter(l => {
          const start = l.startDate && typeof l.startDate.toDate === 'function' ? l.startDate.toDate() : new Date();
          const end = l.endDate && typeof l.endDate.toDate === 'function' ? l.endDate.toDate() : new Date();
          
          const isTimeValid = now >= start && now <= end;
          const hasTargetZips = l.targetZipCodes && l.targetZipCodes.length > 0;
          const isZipValid = !hasTargetZips || (userZipBase && l.targetZipCodes?.includes(userZipBase));
          return isTimeValid && isZipValid;
        });
      setActiveLeaflets(valid);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({id: d.id, ...d.data()} as AppNotification));
      for (let notif of docs) {
        if (notif.createdAt && notif.createdAt.toDate() < yesterday) continue;
        const dismissed = sessionStorage.getItem(`notif_${notif.id}`);
        if (dismissed) continue;
        
        let matches = false;
        if (notif.targetType === 'all') matches = true;
        else if (notif.targetType === 'email' && currentUser.email === notif.targetValue?.toLowerCase()) matches = true;
        else if (notif.targetType === 'zipCode' && currentUser.zipCode?.startsWith(notif.targetValue)) matches = true;
        else if (notif.targetType === 'birthDate' && currentUser.birthDate === notif.targetValue) matches = true;
        
        if (matches) {
          setAppNotification(notif);
          break; 
        }
      }
    });
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
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(res.error || "O navegador bloqueou o pedido.", { duration: 6000 });
      }
    } catch(err) {
      toast.error("Ocorreu um erro no sistema.");
    } finally {
      setIsNotifLoading(false);
    }
  };

  if (!currentUser) return null;

  const hasNotificationsInDB = currentUser.notificationsEnabled === true && currentUser.fcmTokens && currentUser.fcmTokens.length > 0;

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans pb-32">
      <div className="relative">
        <BannerCarousel />
        
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-50">
          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
            <img src="/logo-vizinho.png" alt="Vizinho+" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/settings')} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white border border-white/30 hover:bg-white/40 transition-all">
              <Settings size={20} />
            </button>
            <button onClick={handleLogout} className="bg-red-500/80 backdrop-blur-md p-3 rounded-full text-white border border-red-400/30 hover:bg-red-600 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 -mt-8 relative z-20 space-y-6">
        
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div>
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
              <QRCodeSVG value={displayCardNumber} size={150} />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-mono font-bold tracking-[0.4em] text-[#0a2540]">{displayCardNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <IdCard size={14} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Apresente para ganhar cashback</span>
              </div>
            </div>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView(view === 'wallets' ? 'home' : 'wallets')} className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${view === 'wallets' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
            <Wallet size={18} /> O meu Saldo
          </button>
          <button onClick={() => setView(view === 'history' ? 'home' : 'history')} className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest relative ${view === 'history' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
            {pendingEvaluations.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{pendingEvaluations.length}</span>}
            <MessageSquare size={18} /> Avaliar Lojas
          </button>
        </div>

        {view === 'wallets' && <UserHome currentUser={currentUser} stats={stats} merchantBalances={[]} vantagensUrl="" />}
        {view === 'history' && <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />}

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

        <button onClick={() => setView(view === 'explore' ? 'home' : 'explore')} className={`w-full p-6 rounded-2xl border-2 font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all ${view === 'explore' ? 'bg-[#0a2540] text-white border-[#0a2540]' : 'bg-white text-[#0a2540] border-[#0a2540] shadow-md hover:bg-slate-50'}`}>
          {view === 'explore' ? 'Fechar Pesquisa' : 'Ver Todas as Lojas Parceiras'}
        </button>

        {view === 'explore' && <UserExplore allMerchants={allMerchants} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isInstallable && (
            <button onClick={installApp} className="bg-slate-800 text-white rounded-2xl p-4 flex items-center gap-3 border-b-4 border-black active:translate-y-1 active:border-b-0 transition-all">
              <Smartphone size={20} className="text-[#00d66f]" />
              <span className="font-black uppercase text-[9px] tracking-widest text-left">Instalar no<br/>Ecrã Principal</span>
            </button>
          )}
          
          {!hasNotificationsInDB && (
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

      <footer className="py-12 flex flex-col items-center gap-6 border-t border-slate-200 mt-20 bg-white">
        <div className="flex gap-4">
          <button onClick={() => setShowContactModal(true)} className="flex items-center gap-2 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f]">
            <Mail size={16} /> Contacto
          </button>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f]">
            <ShieldCheck size={16} /> Privacidade
          </a>
        </div>
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest">Vizinho+ &copy; 2026 • Versão Profissional</p>
      </footer>

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
    </div>
  );
};

export default UserDashboard;