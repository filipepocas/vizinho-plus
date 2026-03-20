import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Transaction, User as UserProfile } from '../../types';

// Componentes
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHome from './components/UserHome';
import UserHistory from './components/UserHistory';
import UserExplore from './components/UserExplore';
import { LogOut, HelpCircle, Star, ExternalLink, Wallet, MessageSquare } from 'lucide-react';

const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser } = useStore();
  
  // 'home' = Resumo, 'wallets' = Lojas com Saldo, 'history' = Movimentos, 'explore' = Lojas Aderentes
  const [view, setView] = useState<'home' | 'wallets' | 'history' | 'explore'>('home');
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '' });
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);
  const [allMerchants, setAllMerchants] = useState<UserProfile[]>([]);

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

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setEvaluatedIds(snapshot.docs.map(doc => doc.data().transactionId));
    });
  }, [currentUser?.id]);

  // Transações que podem ser avaliadas (Ganhou cashback e ainda não avaliou)
  const pendingEvaluations = useMemo(() => {
    return transactions.filter(t => t.type === 'earn' && !evaluatedIds.includes(t.id));
  }, [transactions, evaluatedIds]);

  const stats = useMemo(() => ({
    available: currentUser?.wallet?.available || 0,
    pending: currentUser?.wallet?.pending || 0,
    total: (currentUser?.wallet?.available || 0) + (currentUser?.wallet?.pending || 0)
  }), [currentUser?.wallet]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32">
      
      {/* HEADER: SAUDAÇÃO E LOGO */}
      <header className="bg-white px-8 pt-12 pb-8 flex justify-between items-center border-b border-slate-100">
        <div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Olá,</p>
          <h1 className="text-2xl font-black text-[#0a2540] italic uppercase tracking-tighter">
            {currentUser.name?.split(' ')[0]}
          </h1>
        </div>
        <img src={logoPath} alt="V+" className="h-10 w-auto" />
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 space-y-8">
        
        {/* BLOCO DE SALDOS */}
        <div className="bg-[#0a2540] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00d66f] mb-1">Saldo Disponível</p>
              <h2 className="text-5xl font-black italic tracking-tighter">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.available)}
              </h2>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between">
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Saldo em Maturação</p>
                <p className="text-sm font-bold text-white/80">+{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.pending)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Acumulado Total</p>
                <p className="text-sm font-bold text-[#00d66f]">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(stats.total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA (ÍCONES) */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setView(view === 'wallets' ? 'home' : 'wallets')}
            className={`flex flex-col items-center gap-3 p-6 rounded-[35px] border-4 transition-all ${view === 'wallets' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            <Wallet size={32} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Onde tenho Saldo?</span>
          </button>
          <button 
            onClick={() => setView(view === 'history' ? 'home' : 'history')}
            className={`flex flex-col items-center gap-3 p-6 rounded-[35px] border-4 transition-all relative ${view === 'history' ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-100 text-slate-400'}`}
          >
            {pendingEvaluations.length > 0 && (
              <span className="absolute top-4 right-4 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
                {pendingEvaluations.length}
              </span>
            )}
            <MessageSquare size={32} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Avaliar Visitas</span>
          </button>
        </div>

        {/* CONTEÚDO DINÂMICO BASEADO NOS ÍCONES ACIMA */}
        {view === 'wallets' && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <UserHome currentUser={currentUser} stats={stats} merchantBalances={[]} vantagensUrl="" hideHeader />
          </div>
        )}

        {view === 'history' && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />
          </div>
        )}

        {/* BOTÃO LOJAS ADERENTES (EXPLORAR) */}
        <button 
          onClick={() => setView(view === 'explore' ? 'home' : 'explore')}
          className={`w-full p-6 rounded-[30px] border-4 font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 transition-all ${view === 'explore' ? 'bg-[#0a2540] text-white border-[#0a2540]' : 'bg-white text-[#0a2540] border-[#0a2540] shadow-[8px_8px_0px_#0a2540]'}`}
        >
          {view === 'explore' ? 'Fechar Mapa' : 'Explorar Lojas Parceiras'}
        </button>

        {view === 'explore' && <UserExplore allMerchants={allMerchants} />}

        {/* BOTÃO DOURADO: VANTAGENS EXCLUSIVAS */}
        {sysConfig.vantagensUrl && (
          <button 
            onClick={() => window.open(sysConfig.vantagensUrl, '_blank')}
            className="w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 p-8 rounded-[35px] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 text-amber-900">
              <div className="bg-white/40 p-3 rounded-2xl">
                <Star size={32} fill="currentColor" />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black uppercase italic leading-none tracking-tighter">Vantagens Exclusivas</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Acesso VIP Vizinho+</p>
              </div>
            </div>
            <ExternalLink size={24} className="text-amber-900/50 group-hover:text-amber-900 transition-colors" />
          </button>
        )}

      </main>

      {/* FOOTER: SUPORTE */}
      <footer className="py-12 text-center">
        <button onClick={() => logout()} className="text-red-500 font-black uppercase text-[10px] tracking-[0.3em] mb-4">Sair da Conta</button>
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          Suporte: {sysConfig.supportEmail}
        </p>
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