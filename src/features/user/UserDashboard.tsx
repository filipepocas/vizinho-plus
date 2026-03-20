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
import { LogOut, Store, Wallet, History, HelpCircle } from 'lucide-react';

const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';
const watermarkUrl = "https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media";

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser } = useStore();
  
  const [view, setView] = useState<'home' | 'history' | 'explore'>('home');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<Transaction | null>(null);
  
  const [allMerchants, setAllMerchants] = useState<UserProfile[]>([]);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '' });
  const [helpMessage, setHelpMessage] = useState('');
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists()) {
          setSysConfig({
            supportEmail: configSnap.data().supportEmail || 'ajuda@vizinho-plus.pt',
            vantagensUrl: configSnap.data().vantagensUrl || ''
          });
        }
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

  const merchantBalances = useMemo(() => {
    if (!currentUser?.storeWallets) return [];
    return Object.entries(currentUser.storeWallets)
      .map(([id, data]) => ({
        merchantId: id,
        name: data.merchantName || 'Loja Vizinho+',
        available: data.available || 0,
        pending: data.pending || 0,
        total: (data.available || 0) + (data.pending || 0)
      }))
      .filter(b => b.total > 0);
  }, [currentUser?.storeWallets]);

  const stats = useMemo(() => ({
    available: currentUser?.wallet?.available || 0,
    pending: currentUser?.wallet?.pending || 0
  }), [currentUser?.wallet]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32 relative flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url('${watermarkUrl}')`, backgroundSize: '200px' }} />
      
      <header className="bg-[#0f172a] px-6 pt-12 pb-24 text-white rounded-b-[50px] shadow-2xl relative overflow-hidden border-b-8 border-[#00d66f]">
        <img src={logoPath} alt="V+" className="absolute top-6 left-6 h-8 opacity-90" />
        <div className="max-w-5xl mx-auto flex justify-end gap-3 relative z-10">
          <button onClick={() => setShowHelpModal(true)} className="bg-white/5 p-4 rounded-2xl border-2 border-white/10 hover:bg-blue-500 transition-all"><HelpCircle size={22} /></button>
          <button onClick={() => logout()} className="bg-white/5 p-4 rounded-2xl border-2 border-white/10 hover:bg-red-500 transition-all"><LogOut size={22} /></button>
        </div>
        <div className="text-center mt-6">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Olá, {currentUser.name?.split(' ')[0]}</h1>
          <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.3em]">Vizinho Premium</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 -mt-16 relative z-10 flex-grow w-full">
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { id: 'home', icon: Wallet, label: 'Carteira' },
            { id: 'history', icon: History, label: 'Movimentos' },
            { id: 'explore', icon: Store, label: 'Lojas' }
          ].map(btn => (
            <button key={btn.id} onClick={() => setView(btn.id as any)} className={`p-4 rounded-[25px] border-4 flex flex-col items-center gap-2 transition-all ${view === btn.id ? 'bg-[#00d66f] border-[#0f172a] text-[#0f172a] shadow-[4px_4px_0px_#0f172a]' : 'bg-white border-slate-100 text-slate-300'}`}>
              <btn.icon size={20} strokeWidth={3} />
              <span className="text-[8px] font-black uppercase tracking-widest">{btn.label}</span>
            </button>
          ))}
        </div>

        {view === 'home' && <UserHome currentUser={currentUser} stats={stats} merchantBalances={merchantBalances} vantagensUrl={sysConfig.vantagensUrl} />}
        {view === 'history' && <UserHistory transactions={transactions} evaluatedIds={evaluatedIds} onSelectTxForFeedback={setSelectedTxForFeedback} />}
        {view === 'explore' && <UserExplore allMerchants={allMerchants} />}
      </main>

      <footer className="py-10 text-center border-t-4 border-slate-50 bg-white relative z-20">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Suporte Vizinho+</p>
        <a href={`mailto:${sysConfig.supportEmail}`} className="text-xs font-black text-[#0f172a] hover:text-[#00d66f] transition-colors">{sysConfig.supportEmail}</a>
      </footer>

      {showHelpModal && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 border-4 border-[#0f172a] shadow-[10px_10px_0px_#00d66f] animate-in zoom-in">
            <h3 className="text-2xl font-black text-[#0f172a] uppercase italic tracking-tighter mb-4">Ajuda Vizinho</h3>
            <textarea value={helpMessage} onChange={e => setHelpMessage(e.target.value)} placeholder="Como podemos ajudar?" className="w-full h-32 bg-slate-50 border-4 border-slate-100 rounded-3xl p-5 text-sm font-bold outline-none focus:border-[#00d66f]" />
            <button onClick={() => { alert("Enviado!"); setShowHelpModal(false); }} className="w-full bg-[#00d66f] text-[#0f172a] p-5 rounded-2xl font-black uppercase mt-6 shadow-[4px_4px_0px_#0f172a] border-2 border-[#0f172a]">Enviar Mensagem</button>
            <button onClick={() => setShowHelpModal(false)} className="w-full mt-4 text-[10px] font-black text-slate-300 uppercase">Fechar</button>
          </div>
        </div>
      )}

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