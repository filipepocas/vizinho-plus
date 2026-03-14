import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import MerchantExplore from './MerchantExplore';
import ProfileSettings from '../profile/ProfileSettings';
import { Timestamp, getDoc, doc } from 'firebase/firestore';
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
  LifeBuoy
} from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout, currentUser } = useStore();
  
  const [view, setView] = useState<'home' | 'merchants' | 'profile'>('home');
  const [dateFilter, setDateFilter] = useState('all'); 
  const [supportEmail, setSupportEmail] = useState('suporte@vizinhoplus.pt');

  useEffect(() => {
    if (currentUser?.nif) {
      const unsubscribe = subscribeToTransactions('client', currentUser.nif);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.nif, subscribeToTransactions]);

  // Carregar configurações de suporte
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists() && settingsDoc.data().supportEmail) {
          setSupportEmail(settingsDoc.data().supportEmail);
        }
      } catch (err) {
        console.error("Erro ao carregar suporte:", err);
      }
    };
    fetchSettings();
  }, []);

  const merchantBalances = useMemo(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const balances: { [key: string]: { name: string, available: number, pending: number, total: number } } = {};

    transactions.forEach(t => {
      const merchantId = t.merchantId || 'unknown';
      if (!balances[merchantId]) {
        balances[merchantId] = { name: t.merchantName || 'Loja Parceira', available: 0, pending: 0, total: 0 };
      }

      const txTime = t.createdAt instanceof Timestamp ? t.createdAt.toMillis() : Date.now();
      const isAvailable = txTime <= fortyEightHoursAgo;
      const amount = t.cashbackAmount || 0;

      if (t.type === 'earn') {
        balances[merchantId].total += amount;
        if (isAvailable) {
          balances[merchantId].available += amount;
        } else {
          balances[merchantId].pending += amount;
        }
      } else if (t.type === 'redeem') {
        let remainingToDebit = amount;
        if (balances[merchantId].available >= remainingToDebit) {
          balances[merchantId].available -= remainingToDebit;
          remainingToDebit = 0;
        } else {
          remainingToDebit -= balances[merchantId].available;
          balances[merchantId].available = 0;
          balances[merchantId].pending -= remainingToDebit;
        }
        balances[merchantId].total -= amount;
      }
    });

    return Object.values(balances);
  }, [transactions]);

  const totalBalance = merchantBalances.reduce((acc, curr) => acc + curr.total, 0);
  const totalAvailable = merchantBalances.reduce((acc, curr) => acc + curr.available, 0);

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

  const handleHelp = () => {
    const subject = encodeURIComponent(`Suporte Vizinho: ${currentUser?.name}`);
    const body = encodeURIComponent(`Olá Equipa Vizinho+,\n\nPreciso de ajuda com a minha conta:\n\nNome: ${currentUser?.name}\nNIF: ${currentUser?.nif}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
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
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media')`,
          backgroundSize: '200px',
          backgroundRepeat: 'repeat'
        }}
      />

      <header className="bg-[#0f172a] px-6 pt-12 pb-24 text-white rounded-b-[60px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wallet size={150} className="rotate-12 text-white" />
        </div>

        <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#00d66f] p-3 rounded-2xl rotate-[-8deg] shadow-[4px_4px_0px_#ffffff]">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-vizinho-plus-white.png?alt=media" 
                alt="V+" 
                className="h-6 w-auto"
              />
            </div>
            <div>
              <h1 className="font-black italic text-2xl tracking-tighter uppercase leading-none">Minha Área</h1>
              <p className="text-[#00d66f] text-[9px] font-black uppercase tracking-[0.2em] mt-1 italic">Vizinho+ Oficial</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleHelp} className="bg-white/5 hover:bg-[#00d66f]/20 text-[#00d66f] p-4 rounded-2xl transition-all border-2 border-[#00d66f]/20">
              <LifeBuoy size={20} strokeWidth={3} />
            </button>
            <button onClick={() => logout()} className="bg-white/5 hover:bg-red-500 text-white p-4 rounded-2xl transition-all border-2 border-white/10">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 relative z-10">
        
        {/* O CARTÃO DE CRÉDITO BLACK/GOLD */}
        <div className="relative -mt-16 mb-12 perspective-1000">
          <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-white/10 relative overflow-hidden min-h-[260px] flex flex-col justify-between group transition-transform duration-500 hover:rotate-x-2">
            
            {/* Elementos Decorativos do Cartão */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d66f] opacity-[0.03] rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-[0.02] rounded-full -ml-20 -mb-20 blur-2xl"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em]">Membro Vizinho+</span>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  {currentUser?.name}
                </h2>
              </div>
              <div className="bg-gradient-to-br from-[#bf953f] via-[#fcf6ba] to-[#b38728] w-14 h-10 rounded-lg shadow-inner flex items-center justify-center border border-white/20">
                <div className="w-10 h-6 border border-black/10 rounded flex items-center justify-center overflow-hidden opacity-30">
                  <div className="w-1/3 h-full bg-black/20 mr-1"></div>
                  <div className="w-1/3 h-full bg-black/20 mr-1"></div>
                  <div className="w-1/3 h-full bg-black/20"></div>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Saldo Disponível</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white tracking-tighter italic">{totalAvailable.toFixed(2)}</span>
                  <span className="text-2xl font-black text-[#00d66f]">€</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">NIF Associado</p>
                <p className="text-lg font-mono font-black text-white tracking-[0.1em]">{currentUser?.nif}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA QR CODE EXPANSÍVEL */}
        <div className="bg-white rounded-[40px] p-8 shadow-xl border-4 border-[#0f172a] mb-12 flex flex-col items-center gap-6">
          <div className="bg-slate-50 p-4 rounded-[30px] border-2 border-dashed border-slate-200">
            <QRCodeSVG value={currentUser?.nif || "NO-NIF"} size={140} level="H" includeMargin={false} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-8">Apresente este código na loja para acumular ou usar cashback</p>
        </div>

        {/* BOTÕES DE ACÇÃO COM VANTAGENS DOURADO */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <button 
            onClick={() => window.location.href = '/vantagens'}
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
            <span className="text-[10px] font-black uppercase tracking-widest">Lojas</span>
          </button>
          
          <button 
            onClick={() => setView('profile')}
            className="group bg-white text-[#0f172a] p-8 rounded-[40px] flex flex-col items-center gap-4 border-4 border-[#0f172a] shadow-xl hover:bg-slate-50 transition-all"
          >
            <div className="bg-slate-100 p-3 rounded-2xl group-hover:rotate-[-12deg] transition-transform">
              <Settings size={28} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </div>

        {/* SALDOS POR ESTABELECIMENTO */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 ml-2">
            <Zap size={20} className="text-[#00d66f]" fill="#00d66f" />
            <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">O Teu Cashback por Loja</h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6">
            {merchantBalances.length > 0 ? merchantBalances.map((m, idx) => (
              <div key={idx} className="min-w-[260px] bg-white p-6 rounded-[35px] shadow-lg border-2 border-slate-100 group">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{m.name}</p>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-[#00d66f] transition-colors" />
                </div>
                <p className="text-3xl font-black text-[#0f172a] mb-6 italic tracking-tighter">{m.total.toFixed(2)}€</p>
                <div className="flex justify-between items-center pt-4 border-t-2 border-slate-50">
                  <div>
                    <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-tighter">Disponível</p>
                    <p className="text-xl font-black text-[#0f172a]">{m.available.toFixed(2)}€</p>
                  </div>
                  {m.pending > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">Em análise</p>
                      <p className="text-sm font-black text-orange-500 italic">+{m.pending.toFixed(2)}€</p>
                    </div>
                  )}
                </div>
              </div>
            )) : (
                <div className="w-full bg-slate-100/50 p-8 rounded-[35px] border-2 border-dashed border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ainda não tens cashback acumulado.</p>
                </div>
            )}
          </div>
        </div>

        {/* ATIVIDADE RECENTE */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3">
                <History size={20} className="text-[#0f172a]" />
                <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.2em]">Histórico</h4>
            </div>
            <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border-4 border-[#0f172a] rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:bg-[#00d66f] transition-all cursor-pointer"
            >
                <option value="all">Sempre</option>
                <option value="7d">7 Dias</option>
                <option value="30d">30 Dias</option>
            </select>
          </div>

          <div className="bg-white rounded-[45px] shadow-2xl border-4 border-[#0f172a] overflow-hidden">
            {filteredTransactions.length > 0 ? (
              <div className="divide-y-4 divide-slate-50">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-8 flex justify-between items-center hover:bg-slate-50 transition-all group">
                    <div className="flex gap-5 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform ${
                        t.type === 'earn' ? 'bg-[#00d66f] text-[#0f172a]' : 'bg-red-500 text-white'
                      }`}>
                        {t.type === 'earn' ? <ArrowUpRight size={24} strokeWidth={4} /> : <ArrowDownLeft size={24} strokeWidth={4} />}
                      </div>
                      <div>
                        <p className="font-black text-[#0f172a] text-sm uppercase tracking-tight leading-none mb-1">{t.merchantName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                          <Clock size={12} /> {t.createdAt instanceof Timestamp ? t.createdAt.toDate().toLocaleDateString() : '---'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black italic tracking-tighter ${t.type === 'earn' ? 'text-[#0f172a]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{(t.cashbackAmount || 0).toFixed(2)}€
                      </p>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Cashback</span>
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

      {/* BOTÃO FLUTUANTE DE AJUDA */}
      <button 
        onClick={handleHelp}
        className="fixed bottom-6 right-6 bg-[#00d66f] text-[#0f172a] p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-40 border-4 border-[#0f172a]"
        title="Ajuda / Suporte"
      >
        <LifeBuoy size={28} strokeWidth={3} />
      </button>
    </div>
  );
};

export default UserDashboard;