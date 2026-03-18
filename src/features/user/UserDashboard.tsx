// src/features/user/UserDashboard.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import MerchantExplore from './MerchantExplore';
import ProfileSettings from '../profile/ProfileSettings';
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import { Timestamp, getDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
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
  LifeBuoy,
  AlertCircle,
  Star,
  CreditCard,
  Cpu,
  MessageSquareMore,
  HelpCircle,
  X,
  Send
} from 'lucide-react';

// --- LOGOTIPO EMBUTIDO PARA EVITAR FALHAS DE CARREGAMENTO ---
const logoVizinhoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAADvszH5AAAAnFBMVEVHcExNV09XUVZUV1daWVpcWVtdWlxvbnFwcXNyc3V4eHl5eXp+fn+AgICCgoOEhISJiYmTk5OcnJykpKSwsLCysrKzs7O0tLS1tbW4uLm7u7u8vLzExMTFxcXHx8fIyMjQ0NDR0dHV1dXW1tbY2NjZ2dna2trb29vj4+Pk5OTl5eXm5ubn5+fo6Ojr6+vs7Ozt7e3v7+/w8PD////O0v4DAAAALHRSTlMAAgYICQ0OExUXGB0fISMkLS8wMTIzPkJFS0xPVlhbXV5fX2JmampueXt8fX5/gX+BAAAA40lEQVR42u3YMRKCMBBGURARFAQUBRQFVFDWOf95T8uM8mOAmZp9K/D2Zp8G/35/v//7+Xq5Xp9P9wBv7/fX8fH5eg6wDPAWwFuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA9UlEQVR42u3YwQnCQBBEURREBAX8D9AVD+A/D6GZfRiYidm3Am9v9mmeXw+bH29vtx8A7wG8BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA9UlEQVR42u3YwQnCQBBEURREBAX8D9AVD+A/D6GZfRiYidm3Am9v9mmeXw+bH29vtx8A7wG8BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4FuAbwG+BfAW4Psc8G2+4S8vAAAA"

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  const [view, setView] = useState<'home' | 'merchants' | 'profile'>('home');
  const [dateFilter, setDateFilter] = useState('all'); 
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<any | null>(null);
  
  // Estados para o Modal de Suporte Interno
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingHelp, setIsSendingHelp] = useState(false);

  // Estado para armazenar TODAS as lojas parceiras
  const [allMerchants, setAllMerchants] = useState<any[]>([]);

  // Estados de Configuração do Sistema (Sincronizados com Admin)
  const [sysConfig, setSysConfig] = useState({
    supportEmail: 'ajuda@vizinho-plus.pt',
    vantagensUrl: '',
    maturationHours: 48
  });

  // Subscrição de transações é feita globalmente em App.tsx com base em currentUser.id e role.

  // Carregamento das Configurações do Admin e de todas as Lojas
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Carregar Configurações (Email e URL VIP)
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

        // 2. Carregar Todas as Lojas
        const merchantsQuery = query(collection(db, 'users'), where('role', '==', 'merchant'));
        const merchantsSnap = await getDocs(merchantsQuery);
        const merchantsList = merchantsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllMerchants(merchantsList);

      } catch (err) {
        console.error("Erro ao carregar dados do sistema:", err);
      }
    };
    fetchData();
  }, []);

  // Lógica de Saldos Cruzada com a Lista de Lojas
  const merchantBalances = useMemo(() => {
    const maturationMs = sysConfig.maturationHours * 60 * 60 * 1000;
    const maturityThreshold = Date.now() - maturationMs;
    
    const txBalances: { [key: string]: { available: number, pending: number, total: number } } = {};

    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      const mId = t.merchantId;
      if (!mId) return;

      if (!txBalances[mId]) {
        txBalances[mId] = { available: 0, pending: 0, total: 0 };
      }

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

    return allMerchants.map(merchant => {
      const balance = txBalances[merchant.uid || merchant.id] || { available: 0, pending: 0, total: 0 };
      return {
        id: merchant.uid || merchant.id,
        name: merchant.storeName || merchant.name || 'Loja Parceira',
        ...balance
      };
    });
  }, [transactions, allMerchants, sysConfig.maturationHours]);

  const totalAvailable = useMemo(() => 
    merchantBalances.reduce((acc, curr) => acc + curr.available, 0), 
  [merchantBalances]);

  const filteredTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    }).filter(t => {
      if (dateFilter === 'all') return true;
      const txDate = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : Date.now();
      const diffDays = (Date.now() - txDate) / (1000 * 60 * 60 * 24);
      return dateFilter === '7d' ? diffDays <= 7 : diffDays <= 30;
    });
  }, [transactions, dateFilter]);

  // Efeito para abrir o modal de avaliação automaticamente se houver uma transação pendente de feedback
  useEffect(() => {
    if (transactions.length > 0 && currentUser) {
      // Procurar a transação mais recente do tipo 'earn' que não tenha feedback associado
      // Nota: Em escala, isto deve ser verificado contra a coleção de feedbacks
      const checkFeedbacks = async () => {
        const latestEarn = transactions.find(t => t.type === 'earn');
        if (latestEarn) {
          const feedbackQuery = query(
            collection(db, 'feedbacks'),
            where('transactionId', '==', latestEarn.id)
          );
          const feedbackSnap = await getDocs(feedbackQuery);
          if (feedbackSnap.empty) {
            setSelectedTxForFeedback(latestEarn);
          }
        }
      };
      checkFeedbacks();
    }
  }, [transactions, currentUser]);

  // Função para processar o envio da mensagem do suporte através do Modal
  const handleSendSupport = () => {
    if (!supportMessage.trim()) return;
    setIsSendingHelp(true);
    
    const subject = encodeURIComponent(`SUPORTE VIZINHO+: ${currentUser?.name}`);
    const body = encodeURIComponent(
      `MENSAGEM DO CLIENTE:\n${supportMessage}\n\n` +
      `--------------------------\n` +
      `DADOS DO TITULAR:\n` +
      `Nome: ${currentUser?.name}\n` +
      `NIF: ${currentUser?.nif}\n` +
      `Email: ${currentUser?.email}`
    );
    
    window.location.href = `mailto:${sysConfig.supportEmail}?subject=${subject}&body=${body}`;
    
    setTimeout(() => {
      setSupportMessage('');
      setIsSupportOpen(false);
      setIsSendingHelp(false);
    }, 500);
  };

  const handleVantagens = () => {
    if (sysConfig.vantagensUrl && sysConfig.vantagensUrl.trim() !== "") {
      window.open(sysConfig.vantagensUrl, '_blank');
    } else {
      alert("As vantagens exclusivas estão a ser preparadas. Tenta novamente mais tarde!");
    }
  };

  if (view === 'merchants') return <MerchantExplore onBack={() => setView('home')} />;
  if (view === 'profile') return <ProfileSettings onBack={() => setView('home')} />;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-8 border-[#00d66f] border-t-transparent rounded-2xl animate-spin mb-6"></div>
        <p className="font-black text-white uppercase tracking-[0.3em] text-[10px]">A sincronizar carteira...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-32 relative">
      {/* MARCA DE ÁGUA DE FUNDO */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media')`,
          backgroundSize: '200px',
          backgroundRepeat: 'repeat'
        }}
      />

      {/* LOGOTIPO FIXO COM CORREÇÃO BASE64 */}
      <div className="fixed top-6 left-6 z-[100]">
        <img 
          src={logoVizinhoBase64} 
          alt="Vizinho+" 
          className="h-10 w-auto drop-shadow-sm"
        />
      </div>

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

      {/* MODAL DE SUPORTE INTERNO (CAIXA DE MENSAGEM) */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#0f172a] shadow-[12px_12px_0px_#00d66f] p-8 relative">
            <button 
              onClick={() => setIsSupportOpen(false)}
              className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full border-4 border-[#0f172a] hover:rotate-90 transition-transform"
            >
              <X size={24} strokeWidth={3} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#00d66f] p-3 rounded-2xl">
                <MessageSquareMore size={24} className="text-[#0f172a]" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic leading-none">Pedir Ajuda</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suporte Direto</p>
              </div>
            </div>

            <textarea 
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Como podemos ajudar hoje? Escreve aqui a tua mensagem..."
              className="w-full h-40 bg-slate-50 border-4 border-[#0f172a] rounded-[25px] p-5 font-bold text-[#0f172a] placeholder:text-slate-300 focus:ring-0 outline-none resize-none mb-6"
            />

            <button 
              onClick={handleSendSupport}
              disabled={isSendingHelp || !supportMessage.trim()}
              className="w-full bg-[#0f172a] text-white py-5 rounded-[25px] flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
            >
              <Send size={20} strokeWidth={3} />
              <span className="font-black uppercase tracking-tighter">Enviar para Suporte</span>
            </button>
          </div>
        </div>
      )}

      <header className="bg-[#0f172a] px-6 pt-16 pb-32 text-white rounded-b-[60px] shadow-2xl relative overflow-hidden border-b-8 border-[#00d66f]">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <CreditCard size={150} className="rotate-12 text-white" />
        </div>

        <div className="max-w-5xl mx-auto flex justify-end items-center relative z-10">
          <div className="flex gap-3">
            <button 
              onClick={() => setIsSupportOpen(true)} 
              title="Pedir Ajuda"
              className="bg-white/5 hover:bg-[#00d66f] hover:text-[#0f172a] text-[#00d66f] p-4 rounded-2xl transition-all border-2 border-[#00d66f]/20 shadow-lg group"
            >
              <HelpCircle size={24} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
            </button>
            <button 
              onClick={() => logout()} 
              title="Sair"
              className="bg-white/5 hover:bg-red-500 text-white p-4 rounded-2xl transition-all border-2 border-white/10 shadow-lg"
            >
              <LogOut size={24} strokeWidth={3} />
            </button>
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto mt-8 text-center relative z-10">
          <h1 className="font-black italic text-4xl tracking-tighter uppercase leading-none">Minha Área</h1>
          <p className="text-[#00d66f] text-xs font-black uppercase tracking-[0.4em] mt-2 italic">Cliente Oficial</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 relative z-10">
        
        {/* CARTÃO PREMIUM */}
        <div className="relative -mt-24 mb-12 perspective-1000">
          <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-black rounded-[30px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/20 relative overflow-hidden aspect-[1.586/1] flex flex-col justify-between group transition-all duration-500 hover:scale-[1.02] border-t-white/30 border-l-white/20">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-8 bg-gradient-to-br from-[#bf953f] to-[#fcf6ba] rounded-md shadow-inner flex items-center justify-center border border-white/20">
                    <Cpu size={20} className="text-black/60" />
                </div>
                <span className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em]">Membro Premium</span>
              </div>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-vizinho-plus-white.png?alt=media" 
                alt="V+" 
                className="h-8 w-auto opacity-80"
              />
            </div>

            <div className="mt-8 relative z-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Saldo Disponível</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter italic drop-shadow-lg">
                  {totalAvailable.toFixed(2)}
                </span>
                <span className="text-2xl font-black text-[#00d66f] drop-shadow-md">€</span>
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10 pt-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Titular</p>
                <h2 className="text-xl font-black text-white tracking-tight uppercase italic drop-shadow-md truncate max-w-[200px]">
                  {currentUser?.name}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">NIF Associado</p>
                <p className="text-lg font-mono font-black text-white tracking-[0.2em]">{currentUser?.nif}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR CODE */}
        <div className="bg-white rounded-[40px] p-8 shadow-xl border-4 border-[#0f172a] mb-12 flex flex-col items-center gap-6 group hover:border-[#00d66f] transition-colors relative">
          <div className="bg-white p-5 rounded-[30px] border-4 border-[#0f172a] group-hover:border-[#00d66f] shadow-[8px_8px_0px_#0f172a] transition-all">
            <QRCodeSVG 
              value={currentUser?.nif || ""} 
              size={160} 
              level="H" 
              includeMargin={false} 
              className="rounded-lg"
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest mb-1">IDENTIFICAÇÃO RÁPIDA</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight px-8">Usa este código no lojista para movimentos imediatos</p>
          </div>
        </div>

        {/* BOTÕES DE ACÇÃO */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <button 
            onClick={handleVantagens}
            className="col-span-2 group bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] p-6 rounded-[30px] flex items-center justify-center gap-4 shadow-[0_10px_30px_rgba(184,134,11,0.3)] hover:scale-[1.02] transition-all border-b-4 border-[#8a6d29]"
          >
            <Crown size={28} className="text-[#0f172a]" strokeWidth={3} />
            <span className="text-lg font-black uppercase italic tracking-tighter text-[#0f172a]">Vantagens Exclusivas</span>
          </button>

          <button 
            onClick={() => setView('merchants')}
            className="group bg-[#0f172a] text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:bg-black transition-all shadow-xl border-b-8 border-black active:translate-y-1"
          >
            <div className="bg-[#00d66f] p-3 rounded-2xl group-hover:rotate-12 transition-transform">
              <Store size={28} className="text-[#0f172a]" strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Lojas Parceiras</span>
          </button>
          
          <button 
            onClick={() => setView('profile')}
            className="group bg-white text-[#0f172a] p-8 rounded-[40px] flex flex-col items-center gap-4 border-4 border-[#0f172a] shadow-xl hover:bg-slate-50 transition-all"
          >
            <div className="bg-slate-100 p-3 rounded-2xl group-hover:rotate-[-12deg] transition-transform">
              <Settings size={28} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Minha Conta</span>
          </button>
        </div>

        {/* LISTA DE SALDOS */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 ml-2">
            <Zap size={20} className="text-[#00d66f]" fill="#00d66f" />
            <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Saldos por Estabelecimento</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6">
            {merchantBalances.length > 0 ? merchantBalances.map((m, idx) => (
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">A atualizar parceiros...</p>
                </div>
            )}
          </div>
        </div>

        {/* HISTÓRICO */}
        <div className="space-y-6 pb-12">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3">
                <History size={20} className="text-[#0f172a]" />
                <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Últimos Movimentos</h4>
            </div>
            <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-4 border-[#0f172a] rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:bg-[#00d66f] transition-all cursor-pointer shadow-[4px_4px_0px_#0f172a]"
            >
                <option value="all">Todo o Tempo</option>
                <option value="7d">7 Dias</option>
                <option value="30d">30 Dias</option>
            </select>
          </div>

          <div className="bg-white rounded-[45px] shadow-2xl border-4 border-[#0f172a] overflow-hidden">
            {filteredTransactions.length > 0 ? (
              <div className="divide-y-4 divide-slate-100">
                {filteredTransactions.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => t.type === 'earn' && setSelectedTxForFeedback(t)}
                    className="p-8 flex justify-between items-center hover:bg-slate-50 transition-all group cursor-pointer active:bg-[#00d66f]/5"
                  >
                    <div className="flex gap-5 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform ${
                        t.type === 'earn' ? 'bg-[#00d66f] text-[#0f172a]' : 'bg-red-500 text-white'
                      }`}>
                        {t.type === 'earn' ? <ArrowUpRight size={24} strokeWidth={4} /> : <ArrowDownLeft size={24} strokeWidth={4} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-[#0f172a] text-sm uppercase tracking-tight leading-none group-hover:text-[#00d66f] transition-colors">{t.merchantName}</p>
                          {t.status === 'pending' && <Clock size={12} className="text-orange-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black italic tracking-tighter ${t.type === 'earn' ? 'text-[#0f172a]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(Number(t.cashbackAmount) || 0).toFixed(2)}€
                      </p>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t.status === 'cancelled' ? 'Anulado' : 'Cashback'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Sem movimentos registados</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* BOTÃO FLUTUANTE QUE ABRE O MODAL DE SUPORTE */}
      <button 
        onClick={() => setIsSupportOpen(true)}
        className="fixed bottom-8 right-8 bg-[#00d66f] text-[#0f172a] p-5 rounded-[25px] shadow-[8px_8px_0px_#0f172a] hover:scale-110 hover:-translate-y-1 transition-all z-[100] border-4 border-[#0f172a] active:scale-95 group"
      >
        <div className="flex items-center gap-3">
          <MessageSquareMore size={32} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
          <div className="flex flex-col items-start leading-none">
            <span className="font-black uppercase text-[10px] tracking-widest">Suporte</span>
            <span className="font-bold uppercase text-[7px] opacity-70">Vizinho+</span>
          </div>
        </div>
      </button>
    </div>
  );
};

export default UserDashboard;