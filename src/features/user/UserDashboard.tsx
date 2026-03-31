import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Transaction, User as UserProfile, Leaflet } from '../../types';

import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHome from './components/UserHome';
import UserHistory from './components/UserHistory';
import UserExplore from './components/UserExplore';
import BannerCarousel from './components/BannerCarousel';

import { LogOut, Star, ExternalLink, Wallet, MessageSquare, QrCode, Settings, ShieldCheck, Mail, Sparkles } from 'lucide-react';

const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser } = useStore();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'home' | 'wallets' | 'history' | 'explore'>('home');
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '' });
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [allMerchants, setAllMerchants] = useState<UserProfile[]>([]);
  
  // FOLHETOS
  const [activeLeaflets, setActiveLeaflets] = useState<Leaflet[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) setSysConfig(configSnap.data() as any);
        
        const merchantsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'merchant'), where('status', '==', 'active')));
        setAllMerchants(merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProfile[]);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  // Buscar Feedbacks
  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setEvaluatedIds(snapshot.docs.map(doc => doc.data().transactionId));
    });
  }, [currentUser?.id]);

  // Buscar Folhetos Ativos (Com link URL)
  useEffect(() => {
    const q = query(collection(db, 'leaflets'), where('isActive', '==', true));
    return onSnapshot(q, (snap) => {
      const now = new Date();
      const valid = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Leaflet))
        .filter(l => {
          const start = l.startDate.toDate();
          const end = l.endDate.toDate();
          return now >= start && now <= end;
        });
      setActiveLeaflets(valid);
    });
  }, []);

  const pendingEvaluations = useMemo(() => {
    return transactions.filter(t => t.type === 'earn' && !evaluatedIds.includes(t.id));
  }, [transactions, evaluatedIds]);

  const stats = useMemo(() => ({
    available: currentUser?.wallet?.available || 0,
    pending: currentUser?.wallet?.pending || 0,
    total: (currentUser?.wallet?.available || 0) + (currentUser?.wallet?.pending || 0)
  }), [currentUser?.wallet]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openLeaflet = () => {
    if (activeLeaflets.length > 0) {
      window.open(activeLeaflets[0].leafletUrl, '_blank');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32">
      
      <header className="bg-white px-8 pt-10 pb-6 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Bem-vindo,</p>
          <h1 className="text-2xl font-black text-[#0a2540] italic uppercase tracking-tighter leading-none">
            {currentUser.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate('/settings')}
                className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-[#0a2540] hover:bg-slate-100 transition-colors border-2 border-slate-100"
                title="Definições de Perfil"
            >
                <Settings size={20} />
            </button>
            <img src={logoPath} alt="V+" className="h-8 w-auto hidden sm:block" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6 mt-6">
        
        <BannerCarousel />

        {/* BOTÃO GRANDES OPORTUNIDADES COM CRACHÁ NOVO */}
        <button 
          onClick={openLeaflet}
          disabled={activeLeaflets.length === 0}
          className={`w-full relative overflow-hidden p-8 rounded-[35px] shadow-2xl transition-all group border-4 border-[#0a2540] flex justify-between items-center ${
            activeLeaflets.length > 0 
              ? 'bg-[#00d66f] hover:scale-[1.02] active:scale-95 cursor-pointer' 
              : 'bg-slate-200 border-slate-300 opacity-60 cursor-not-allowed'
          }`}
        >
          {activeLeaflets.length > 0 && (
             <div className="absolute -top-3 -right-3 bg-red-500 text-white w-14 h-14 rounded-full flex flex-col items-center justify-center font-black uppercase tracking-widest text-[9px] border-4 border-[#0a2540] animate-pulse rotate-12 shadow-xl z-20">
               <Star size={12} fill="currentColor" className="mb-0.5" /> Novo
             </div>
          )}
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-[#0a2540] p-3 rounded-2xl">
              <Sparkles size={32} className="text-[#00d66f]" />
            </div>
            <div className="text-left">
              <h4 className="text-xl font-black uppercase italic leading-none tracking-tighter text-[#0a2540]">
                Grandes Oportunidades
              </h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0a2540] opacity-70 mt-1">
                {activeLeaflets.length > 0 ? 'Toca para ver folheto' : 'Sem folhetos ativos no momento'}
              </p>
            </div>
          </div>
          {activeLeaflets.length > 0 && (
            <ExternalLink size={20} className="text-[#0a2540] opacity-50 relative z-10" />
          )}
        </button>

        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] p-6 shadow-[12px_12px_0px_#00d66f] flex flex-col items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#0a2540] text-white px-4 py-1 rounded-bl-2xl font-black text-[8px] uppercase tracking-widest">
                Cartão Digital
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 mt-4">
                <QRCodeSVG value={currentUser.nif || ""} size={120} />
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Apresente este código na loja</p>
                <h3 className="text-xl font-mono font-bold tracking-[0.3em] text-[#0a2540]">
                    {currentUser.nif?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                </h3>
            </div>
            <div className="bg-amber-50 px-6 py-2 rounded-full border border-amber-100 flex items-center gap-2">
                <QrCode size={14} className="text-amber-600" />
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight italic">
                    Apresente sempre o seu cartão ao fazer compras
                </p>
            </div>
        </div>

        <div className="bg-[#0a2540] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00d66f] mb-1">Saldo Disponível</p>
              <h2 className="text-5xl font-black italic tracking-tighter text-[#00d66f]">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.available)}
              </h2>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between">
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Em Processamento</p>
                <p className="text-sm font-bold text-white/80">+{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.pending)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Total Ganho</p>
                <p className="text-sm font-bold text-white">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setView(view === 'wallets' ? 'home' : 'wallets')}
            className={`flex flex-col items-center gap-3 p-6 rounded-[35px] border-4 transition-all ${view === 'wallets' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540] -rotate-2' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            <Wallet size={32} />
            <span className="text-[9px] font-black uppercase tracking-widest">O meu Saldo</span>
          </button>
          <button 
            onClick={() => setView(view === 'history' ? 'home' : 'history')}
            className={`flex flex-col items-center gap-3 p-6 rounded-[35px] border-4 transition-all relative ${view === 'history' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540] rotate-2' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            {pendingEvaluations.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-4 border-[#f8fafc] animate-bounce">
                {pendingEvaluations.length}
              </span>
            )}
            <MessageSquare size={32} />
            <span className="text-[9px] font-black uppercase tracking-widest">Avaliar Lojas</span>
          </button>
        </div>

        {view === 'wallets' && <UserHome currentUser={currentUser} stats={stats} merchantBalances={[]} vantagensUrl="" />}
        {view === 'history' && <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />}
        
        <button 
          onClick={() => setView(view === 'explore' ? 'home' : 'explore')}
          className={`w-full p-6 rounded-[30px] border-4 font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 transition-all ${view === 'explore' ? 'bg-[#0a2540] text-white border-[#0a2540]' : 'bg-white text-[#0a2540] border-[#0a2540] shadow-[6px_6px_0px_#0a2540] active:translate-y-1 active:shadow-none'}`}
        >
          {view === 'explore' ? 'Fechar Pesquisa' : 'Ver Lojas Parceiras'}
        </button>

        {view === 'explore' && <UserExplore allMerchants={allMerchants} />}

        {sysConfig.vantagensUrl && (
          <button 
            onClick={() => window.open(sysConfig.vantagensUrl, '_blank')}
            className="w-full relative overflow-hidden p-8 rounded-[35px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all group"
            style={{
                background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 45%, #b38728 50%, #fcf6ba 55%, #aa771c 100%)',
                border: '4px solid #aa771c'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-black/20 p-3 rounded-2xl">
                  <Star size={32} className="text-white fill-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xl font-black uppercase italic leading-none tracking-tighter text-[#5c4414]">Vantagens Exclusivas</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5c4414] opacity-80">Acesso VIP Vizinho+</p>
                </div>
              </div>
              <ExternalLink size={24} className="text-[#5c4414]" />
            </div>
          </button>
        )}

      </main>

      <footer className="py-12 flex flex-col items-center gap-4 border-t-2 border-slate-100 mt-10">
        
        <a 
          href={`mailto:${sysConfig.supportEmail}`} 
          className="flex items-center gap-2 bg-white px-8 py-4 rounded-3xl border-4 border-slate-100 shadow-sm text-[#0a2540] font-black uppercase text-[10px] tracking-widest hover:border-[#00d66f] transition-all"
        >
            <Mail size={16} className="text-[#00d66f]" /> Entrar em Contacto
        </a>

        <button onClick={() => navigate('/terms')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#0a2540] mt-4">
            <ShieldCheck size={14} /> Termos e Privacidade
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-red-700">
            <LogOut size={14} /> Sair da Conta
        </button>
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest mt-4">Vizinho+ &copy; 2026</p>
      </footer>

      {selectedTxForFeedback && (
        <FeedbackForm 
          transactionId={selectedTxForFeedback.id} 
          merchantId={selectedTxForFeedback.merchantId} 
          merchantName={selectedTxForFeedback.merchantName} 
          userId={currentUser.id} 
          userName={currentUser.name || 'Vizinho'} 
          onClose={() => setSelectedTxForFeedback(null)} 
        />
      )}
    </div>
  );
};

export default UserDashboard;