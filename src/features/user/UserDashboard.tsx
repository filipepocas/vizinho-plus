import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import MerchantExplore from './MerchantExplore';
import ProfileSettings from '../profile/ProfileSettings';
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import UserHistory from './UserHistory'; 
import { Timestamp, getDoc, doc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  LogOut, 
  Store, 
  Settings, 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  CheckCircle2,
  Zap,
  ChevronRight,
  Crown,
  AlertCircle,
  Star,
  CreditCard,
  Cpu,
  Mail,
  MessageSquareHeart,
  HelpCircle,
  Send,
  X,
  MessageSquare
} from 'lucide-react';

const logoVizinhoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAADvszH5AAAAnFBMVEVHcExNV09XUVZUV1daWVpcWVtdWlxvbnFwcXNyc3V4eHl5eXp+fn+AgICCgoOEhISJiYmTk5OcnJykpKSwsLCysrKzs7O0tLS1tbW4uLm7u7u8vLzExMTFxcXHx8fIyMjQ0NDR0dHV1dXW1tbY2NjZ2dna2trb29vj4+Pk5OTl5eXm5ubn5+fo6Ojr6+vs7Ozt7e3v7+/w8PD////O0v4DAAAALHRSTlMAAgYICQ0OExUXGB0fISMkLS8wMTIzPkJFS0xPVlhbXV5fX2JmampueXt8fX5/gX+BAAAA40lEQVR42u3YMRKCMBBGURARFAQUBRQFVFDWOf95T8uM8mOAmZp9K/D2Zp8G/35/v//7+Xq5Xp9P9wBv7/fX8fH5eg6wDPAWwFuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA9UlEQVR42u3YwQnCQBBEURREBAX8D9AVD+A/D6GZfRiYidm3Am9v9mmeXw+bH29vtx8A7wG8BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA9UlEQVR42u3YwQnCQBBEURREBAX8D9AVD+A/D6GZfRiYidm3Am9v9mmeXw+bH29vtx8A7wG8BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA"

const UserDashboard: React.FC = () => {
  const { transactions = [], logout, currentUser } = useStore();
  const [view, setView] = useState<'home' | 'merchants' | 'profile'>('home');
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<any | null>(null);
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);

  const [sysConfig, setSysConfig] = useState({
    supportEmail: 'ajuda@vizinho-plus.pt',
    vantagensUrl: '',
    maturationHours: 48
  });

  // 1. Carregar Configurações e Mercadores (Executa uma vez)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMerchants(true);
        const docRef = doc(db, 'system', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSysConfig({
            supportEmail: data.supportEmail || 'ajuda@vizinho-plus.pt',
            vantagensUrl: data.vipUrl || data.vantagensUrl || '', 
            maturationHours: data.maturationHours || 48
          });
        }

        const merchantsQuery = query(collection(db, 'users'), where('role', '==', 'merchant'));
        const merchantsSnap = await getDocs(merchantsQuery);
        const merchantsList = merchantsSnap.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data()
        }));
        setAllMerchants(merchantsList);
      } catch (err) {
        console.error("Erro ao carregar dados do sistema:", err);
      } finally {
        setLoadingMerchants(false);
      }
    };
    fetchData();
  }, []);

  // 2. Escuta em tempo real dos feedbacks do utilizador (Correção da Audit)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const feedbackQuery = query(
      collection(db, 'feedbacks'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().transactionId);
      setEvaluatedIds(ids);
    }, (error) => {
      console.error("Erro ao escutar feedbacks:", error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Cálculo de Saldos
  const merchantBalances = useMemo(() => {
    const maturationMs = (sysConfig.maturationHours || 48) * 60 * 60 * 1000;
    const maturityThreshold = Date.now() - maturationMs;
    const txBalances: { [key: string]: { available: number, pending: number, total: number } } = {};

    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    safeTransactions.forEach(t => {
      if (!t || t.status === 'cancelled') return;
      const mId = t.merchantId;
      if (!mId) return;
      if (!txBalances[mId]) txBalances[mId] = { available: 0, pending: 0, total: 0 };

      const txTime = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : Date.now();
      const isAvailable = t.status === 'available' || (t.status === 'pending' && txTime <= maturityThreshold);
      const amount = Number(t.cashbackAmount) || 0;

      if (t.type === 'earn') {
        txBalances[mId].total += amount;
        if (isAvailable) txBalances[mId].available += amount;
        else txBalances[mId].pending += amount;
      } else if (t.type === 'redeem') {
        txBalances[mId].available -= amount;
        txBalances[mId].total -= amount;
      }
    });

    return (allMerchants || [])
      .filter(m => m !== undefined && m !== null)
      .map(merchant => {
        const mId = merchant.uid || merchant.id;
        const balance = txBalances[mId] || { available: 0, pending: 0, total: 0 };
        return {
          id: mId,
          name: merchant.storeName || merchant.name || 'Loja Parceira',
          ...balance
        };
      });
  }, [transactions, allMerchants, sysConfig.maturationHours]);

  const totalAvailable = useMemo(() => 
    merchantBalances.reduce((acc, curr) => acc + curr.available, 0), 
  [merchantBalances]);

  const totalPending = useMemo(() => 
    merchantBalances.reduce((acc, curr) => acc + curr.pending, 0), 
  [merchantBalances]);

  // 4. Filtragem de Avaliações Pendentes Reativa
  useEffect(() => {
    if (Array.isArray(transactions) && transactions.length > 0) {
      const earnTransactions = transactions.filter(t => t.type === 'earn');
      
      const pending = earnTransactions.filter(t => {
        return t.id && !evaluatedIds.includes(t.id);
      });

      const enrichedPending = pending.map(tx => {
        if (!tx.merchantName) {
          const merchant = allMerchants.find(m => (m.uid || m.id) === tx.merchantId);
          return { ...tx, merchantName: merchant?.storeName || merchant?.name || 'Loja Parceira' };
        }
        return tx;
      });
      
      setPendingEvaluations(enrichedPending.slice(0, 5));
    } else {
      setPendingEvaluations([]);
    }
  }, [transactions, evaluatedIds, allMerchants]);

  const handleVantagens = () => {
    if (sysConfig.vantagensUrl?.trim()) window.open(sysConfig.vantagensUrl, '_blank');
    else alert("As vantagens exclusivas estão a ser preparadas. Tenta novamente mais tarde!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  if (view === 'merchants') return <MerchantExplore onBack={() => setView('home')} />;
  if (view === 'profile') return <ProfileSettings onBack={() => setView('home')} />;
  if (!currentUser) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-8 border-[#00d66f] border-t-transparent rounded-2xl animate-spin mb-6"></div>
      <p className="font-black text-white uppercase tracking-[0.3em] text-[10px]">A sincronizar carteira...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32 relative flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media')`, backgroundSize: '200px', backgroundRepeat: 'repeat' }} />
      <div className="fixed top-6 left-6 z-[100]"><img src={logoVizinhoBase64} alt="Vizinho+" className="h-10 w-auto drop-shadow-sm" /></div>

      {selectedTxForFeedback && (
        <FeedbackForm 
          transactionId={selectedTxForFeedback.id} 
          merchantId={selectedTxForFeedback.merchantId} 
          merchantName={selectedTxForFeedback.merchantName} 
          userId={currentUser.uid || ''} 
          userName={currentUser.name || ''} 
          onClose={() => setSelectedTxForFeedback(null)} 
        />
      )}

      <header className="bg-[#0f172a] px-6 pt-16 pb-32 text-white rounded-b-[60px] shadow-2xl relative overflow-hidden border-b-8 border-[#00d66f]">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><CreditCard size={150} className="rotate-12 text-white" /></div>
        <div className="max-w-5xl mx-auto flex justify-end items-center relative z-10">
          <div className="flex gap-3">
            <button onClick={() => setShowHelpModal(true)} className="bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white p-4 rounded-2xl transition-all border-2 border-blue-500/30 shadow-lg"><HelpCircle size={24} strokeWidth={3} /></button>
            <button onClick={() => logout()} className="bg-white/5 hover:bg-red-500 text-white p-4 rounded-2xl transition-all border-2 border-white/10 shadow-lg"><LogOut size={24} strokeWidth={3} /></button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 text-center relative z-10">
          <h1 className="font-black italic text-4xl tracking-tighter uppercase leading-none">Minha Área</h1>
          <p className="text-[#00d66f] text-xs font-black uppercase tracking-[0.4em] mt-2 italic">Cliente Oficial</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 relative z-10 flex-grow">
        <div className="relative -mt-24 mb-12 perspective-1000">
          <div className="bg-gradient-to-br from-[#2a3447] via-[#1a2233] to-[#0a0f1a] rounded-[30px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden aspect-[1.586/1] flex flex-col justify-between group transition-all duration-500 hover:scale-[1.02] border-t-white/20 border-l-white/10">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-8 bg-gradient-to-br from-[#bf953f] to-[#fcf6ba] rounded-md shadow-inner flex items-center justify-center border border-white/20"><Cpu size={20} className="text-black/60" /></div>
                <span className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em] drop-shadow-md">Membro Premium</span>
              </div>
              <img src="https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-vizinho-plus-white.png?alt=media" alt="V+" className="h-8 w-auto opacity-80" />
            </div>
            <div className="mt-8 relative z-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Saldo Disponível</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">{totalAvailable.toFixed(2)}</span>
                <span className="text-2xl font-black text-[#00d66f] drop-shadow-md">€</span>
              </div>
            </div>
            <div className="flex items-end justify-between relative z-10 pt-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Titular</p>
                <h2 className="text-xl font-black text-white/90 tracking-tight uppercase italic truncate max-w-[200px]">{currentUser?.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">NIF Associado</p>
                <p className="text-lg font-mono font-black text-white/90 tracking-[0.2em]">{currentUser?.nif}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-xl border-4 border-[#0f172a] mb-12 flex flex-col items-center gap-6 group hover:border-[#00d66f] transition-colors relative">
          <div className="bg-white p-5 rounded-[30px] border-4 border-[#0f172a] group-hover:border-[#00d66f] shadow-[8px_8px_0px_#0f172a] transition-all">
            <QRCodeSVG value={currentUser?.nif || ""} size={160} level="H" includeMargin={false} className="rounded-lg" />
          </div>
          <div className="text-center">
             <p className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest mb-1">IDENTIFICAÇÃO RÁPIDA</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight px-8">Usa este código no lojista para movimentos imediatos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <button onClick={handleVantagens} className="col-span-2 group bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] p-6 rounded-[30px] flex items-center justify-center gap-4 shadow-[0_10px_30px_rgba(184,134,11,0.3)] hover:scale-[1.02] transition-all border-b-4 border-[#8a6d29]">
            <Crown size={28} className="text-[#0f172a]" strokeWidth={3} />
            <span className="text-lg font-black uppercase italic tracking-tighter text-[#0f172a]">Vantagens Exclusivas</span>
          </button>

          {totalPending > 0 && (
            <div className="col-span-2 bg-amber-50 border-4 border-amber-200 p-6 rounded-[30px] flex items-center gap-5 animate-pulse shadow-sm">
              <div className="w-14 h-14 bg-amber-200 rounded-2xl flex items-center justify-center text-amber-700 shadow-sm shrink-0"><Clock size={28} strokeWidth={3} /></div>
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">A Processar (48h)</p>
                <p className="text-xl font-black text-amber-600 italic">+{formatCurrency(totalPending)} <span className="text-sm">pendente</span></p>
              </div>
            </div>
          )}

          <button onClick={() => setView('merchants')} className="group bg-[#0f172a] text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:bg-black transition-all shadow-xl border-b-8 border-black active:translate-y-1">
            <div className="bg-[#00d66f] p-3 rounded-2xl group-hover:rotate-12 transition-transform"><Store size={28} className="text-[#0f172a]" strokeWidth={3} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Lojas Parceiras</span>
          </button>
          
          <button onClick={() => setView('profile')} className="group bg-white text-[#0f172a] p-8 rounded-[40px] flex flex-col items-center gap-4 border-4 border-[#0f172a] shadow-xl hover:bg-slate-50 transition-all">
            <div className="bg-slate-100 p-3 rounded-2xl group-hover:rotate-[-12deg] transition-transform"><Settings size={28} strokeWidth={3} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Minha Conta</span>
          </button>
        </div>

        <div className="mb-12">
           <div className="flex items-center gap-3 mb-6 ml-2">
            <Zap size={20} className="text-[#00d66f]" fill="#00d66f" />
            <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Saldos por Estabelecimento</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6">
            {!loadingMerchants && merchantBalances.length > 0 ? merchantBalances.map((m, idx) => (
              <div key={idx} className="min-w-[280px] bg-white p-6 rounded-[35px] shadow-lg border-4 border-slate-100 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-[#00d66f]/5 transition-colors"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[180px]">{m.name}</p>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-[#00d66f] transition-colors" />
                </div>
                <p className="text-4xl font-black text-[#0f172a] mb-6 italic tracking-tighter relative z-10">{m.total.toFixed(2)}€</p>
                <div className="flex justify-between items-end pt-4 border-t-4 border-slate-50 relative z-10">
                   <div>
                    <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-tighter mb-1">Livre para Uso</p>
                    <p className="text-2xl font-black text-[#0f172a]">{m.available.toFixed(2)}€</p>
                  </div>
                  {m.pending > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">Aguardando</p>
                      <p className="text-sm font-black text-orange-500 italic">+{m.pending.toFixed(2)}€</p>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="w-full bg-slate-100/50 p-12 rounded-[35px] border-4 border-dashed border-slate-200 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  {loadingMerchants ? "A carregar parceiros..." : "Sem saldos registados"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SECÇÃO DE AVALIAÇÕES CORRIGIDA */}
        <div className="mb-8 bg-[#00d66f]/10 border-4 border-dashed border-[#00d66f]/30 rounded-[40px] p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-[#00d66f] p-4 rounded-3xl shadow-lg rotate-3"><MessageSquareHeart size={32} className="text-[#0f172a]" strokeWidth={2.5} /></div>
          <div className="text-center md:text-left flex-grow">
            <h4 className="font-black text-[#0f172a] uppercase italic text-sm mb-1 tracking-tight">A sua opinião é o nosso motor!</h4>
            <p className="text-[10px] font-bold text-slate-600 uppercase leading-relaxed mb-4">Avalie a sua última experiência de compra. O seu feedback ajuda-nos a melhorar.</p>
            
            {pendingEvaluations.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {pendingEvaluations.map(tx => (
                  <button 
                    key={tx.id}
                    onClick={() => setSelectedTxForFeedback(tx)}
                    className="bg-white border-2 border-[#00d66f] px-4 py-2 rounded-xl text-[9px] font-black text-[#0f172a] uppercase hover:bg-[#00d66f] transition-all flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-bottom-2"
                  >
                    <MessageSquare size={12} /> {tx.merchantName}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] font-black text-slate-400 uppercase italic">Nenhuma compra pendente para avaliar.</p>
            )}
          </div>
        </div>

        <UserHistory />

      </main>

      <footer className="w-full py-12 px-6 flex flex-col items-center justify-center gap-2 border-t-4 border-slate-100 bg-white relative z-10">
        <div className="flex items-center gap-2 text-slate-400"><Mail size={14} strokeWidth={3} /><p className="text-[10px] font-black uppercase tracking-widest">Contato para pedido de ajuda</p></div>
        <a href={`mailto:${sysConfig.supportEmail}`} className="text-sm font-black text-[#0f172a] hover:text-[#00d66f] transition-colors border-b-2 border-[#0f172a]/10">{sysConfig.supportEmail}</a>
      </footer>

      {showHelpModal && (
        <div className="fixed inset-0 bg-[#0a2540]/90 backdrop-blur-md z-[100] p-6 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-[12px_12px_0px_#00d66f] border-4 border-[#0f172a] relative animate-in zoom-in duration-300">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"><X size={20} strokeWidth={3} /></button>
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4 border-2 border-blue-200"><HelpCircle size={32} strokeWidth={3} /></div>
              <h3 className="text-2xl font-black text-[#0f172a] uppercase italic tracking-tighter">Ajuda Vizinho</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Estamos aqui para o que precisar.</p>
            </div>
            <textarea value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} placeholder="Descreva a sua dúvida..." className="w-full h-32 bg-slate-50 border-4 border-slate-200 rounded-3xl p-5 text-sm font-bold outline-none focus:border-[#00d66f] transition-all resize-none" />
            <button onClick={() => { alert("Pedido de ajuda enviado com sucesso!"); setShowHelpModal(false); setHelpMessage(''); }} className="w-full bg-[#00d66f] text-[#0f172a] p-5 rounded-2xl font-black uppercase tracking-widest mt-6 flex items-center justify-center gap-3 shadow-[4px_4px_0px_#0f172a] hover:translate-y-1 hover:shadow-none transition-all border-2 border-[#0f172a]">Enviar Mensagem <Send size={18} strokeWidth={3} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;