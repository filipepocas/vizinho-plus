import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, limit, doc, updateDoc, increment, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Wallet, 
  QrCode, 
  History, 
  Store, 
  ArrowUpRight, 
  ArrowDownLeft,
  LogOut,
  MapPin,
  ChevronRight,
  Info,
  HelpCircle,
  CreditCard,
  X,
  Send,
  Star,
  ExternalLink
} from 'lucide-react';

const ClientDashboard: React.FC = () => {
  const { currentUser, transactions, subscribeToTransactions, logout, setCurrentUser } = useStore();
  const [view, setView] = useState<'home' | 'history' | 'partners'>('home');
  const [merchants, setMerchants] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [vantagensUrl, setVantagensUrl] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
  };

  // Carregar URL das Vantagens do Admin
  useEffect(() => {
    const fetchSystemConfig = async () => {
      try {
        const docRef = doc(db, 'system', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().vantagensUrl) {
          setVantagensUrl(snap.data().vantagensUrl);
        }
      } catch (error) {
        console.error("Erro ao carregar link de vantagens:", error);
      }
    };
    fetchSystemConfig();
  }, []);

  // PONTO 5: Lógica de conversão automática (48h) - Revisada para Precisão Molecular
  useEffect(() => {
    const checkPendingTransactions = async () => {
      if (!currentUser?.id || transactions.length === 0) return;

      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

      const pendingToConvert = transactions.filter(t => 
        t.status === 'pending' && 
        t.type === 'earn' &&
        t.createdAt instanceof Timestamp && 
        t.createdAt.toDate() < fortyEightHoursAgo
      );

      if (pendingToConvert.length === 0) return;

      for (const t of pendingToConvert) {
        try {
          const transRef = doc(db, 'transactions', t.id);
          const userRef = doc(db, 'users', currentUser.id);

          // Atualização atómica para evitar duplicagem de saldo
          await updateDoc(transRef, { 
            status: 'available',
            convertedAt: Timestamp.now()
          });
          
          await updateDoc(userRef, {
            [`storeWallets.${t.merchantId}.available`]: increment(t.cashbackAmount),
            [`storeWallets.${t.merchantId}.pending`]: increment(-t.cashbackAmount)
          });
        } catch (error) {
          console.error("Erro ao converter saldo 48h para transação " + t.id, error);
        }
      }
    };

    checkPendingTransactions();
  }, [transactions, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      const unsubscribe = subscribeToTransactions('client', currentUser.id);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [currentUser?.id, subscribeToTransactions]);

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'merchant'), limit(20));
        const snap = await getDocs(q);
        setMerchants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro ao carregar parceiros:", error);
      }
    };
    fetchMerchants();
  }, []);

  const totalStats = useMemo(() => {
    let available = 0;
    let pending = 0;
    if (currentUser?.storeWallets) {
      Object.values(currentUser.storeWallets).forEach((wallet: any) => {
        available += wallet.available || 0;
        pending += wallet.pending || 0;
      });
    }
    return { available, pending };
  }, [currentUser?.storeWallets]);

  const storeWalletsList = useMemo(() => {
    if (!currentUser?.storeWallets) return [];
    return Object.entries(currentUser.storeWallets).map(([id, data]: [string, any]) => ({
      id,
      ...data
    })).filter(w => (w.available || 0) > 0 || (w.pending || 0) > 0);
  }, [currentUser?.storeWallets]);
  return (
    <div className="min-h-screen bg-[#f6f9fc] pb-32 font-sans relative">
      {/* HEADER */}
      <header className="bg-white p-6 border-b-2 border-slate-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-dark.png?alt=media" 
            alt="V+" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Olá, Vizinho!</p>
            <h2 className="text-sm font-black text-[#0a2540] uppercase truncate max-w-[150px]">{currentUser?.name}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="p-3 bg-blue-50 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <HelpCircle size={20} />
          </button>
          <button onClick={() => logout()} className="p-3 bg-red-50 rounded-xl text-red-500 hover:bg-red-100 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        
        {/* CARTÃO VIRTUAL - Design Brutalista Premium */}
        <div className="relative group perspective-1000">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d66f] to-[#00b35c] rounded-[24px] blur opacity-20 transition duration-1000"></div>
          
          <div className="relative bg-[#0a2540] aspect-[1.586/1] rounded-[22px] p-6 text-white overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-white.png?alt=media" 
                  alt="Vizinho+" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-90">VIZINHO+</span>
              </div>
              <div className="w-11 h-9 bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-600 rounded-lg opacity-90 border border-white/20 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                  <div className="border-[0.5px] border-black"></div>
                  <div className="border-[0.5px] border-black"></div>
                  <div className="border-[0.5px] border-black"></div>
                </div>
              </div>
            </div>

            <div className="z-10 mt-2">
              <p className="text-[9px] font-black text-[#00d66f] uppercase tracking-[0.3em] mb-1">SALDO DISPONÍVEL</p>
              <h3 className="text-4xl font-black italic tracking-tighter">
                {formatCurrency(totalStats.available)}
              </h3>
            </div>

            <div className="flex justify-between items-end z-10">
              <div>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">CLIENTE VIZINHO+</p>
                <p className="text-lg font-mono font-bold tracking-[0.2em] text-white/95">
                  {currentUser?.nif ? currentUser.nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : '--- --- ---'}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-[#00d66f] text-[#0a2540] px-3 py-1 rounded-md">
                   <span className="text-[8px] font-black uppercase tracking-widest italic">PREMIUM</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-10 opacity-[0.03] -rotate-12">
               <QrCode size={200} />
            </div>
          </div>
        </div>

        {/* BOTÃO VANTAGENS+ (DINÂMICO) */}
        {vantagensUrl && (
          <a 
            href={vantagensUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full group relative"
          >
            <div className="absolute -inset-1 bg-amber-400 rounded-[24px] blur-[2px] opacity-40 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 p-[2px] rounded-[24px] shadow-lg overflow-hidden">
              <div className="bg-white rounded-[22px] p-5 flex items-center justify-between group-hover:bg-transparent transition-colors duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-white/20 group-hover:text-white transition-all">
                    <Star size={24} className="fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#0a2540] uppercase italic tracking-tighter group-hover:text-white transition-colors">Vantagens+</h4>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest group-hover:text-white/80 transition-colors">Exclusivo para Vizinhos</p>
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl text-amber-500 group-hover:bg-white/20 group-hover:text-white transition-all">
                  <ExternalLink size={18} />
                </div>
              </div>
            </div>
          </a>
        )}

        {/* INFO DE SALDO PENDENTE */}
        {totalStats.pending > 0 && (
          <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-3xl flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">A Processar (48h)</p>
              <p className="text-[15px] font-black text-amber-700 italic">+{formatCurrency(totalStats.pending)} pendente</p>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO RÁPIDA */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'home', icon: Wallet, label: 'Carteira' },
            { id: 'history', icon: History, label: 'Movimentos' },
            { id: 'partners', icon: Store, label: 'Parceiros' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`flex flex-col items-center gap-2 p-5 rounded-[28px] border-4 transition-all ${
                view === item.id 
                ? 'bg-white border-[#00d66f] shadow-xl scale-105 z-10 text-[#00d66f]' 
                : 'bg-transparent border-slate-50 text-slate-300'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="space-y-6">
          {view === 'home' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest">Saldos por Loja</h4>
                <Info size={14} className="text-slate-300" />
              </div>
              
              {storeWalletsList.length > 0 ? (
                <div className="grid gap-3">
                  {storeWalletsList.map((wallet) => (
                    <div key={wallet.id} className="bg-white p-5 rounded-[28px] border-2 border-slate-50 flex items-center justify-between group hover:border-[#00d66f] transition-all shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0a2540] group-hover:bg-[#00d66f] group-hover:text-white transition-colors">
                          <Store size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{wallet.merchantName}</p>
                          <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">
                            {formatCurrency(wallet.available)} disponível
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-200 group-hover:text-[#00d66f]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[32px] border-4 border-dashed border-slate-100 text-center">
                  <p className="text-xs font-black text-slate-300 uppercase italic">Nenhum cashback ativo.</p>
                </div>
              )}
            </div>
          )}

          {view === 'history' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
               <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest px-2">Últimos Movimentos</h4>
               {transactions.length > 0 ? (
                 transactions.map((t, idx) => (
                   <div key={idx} className="bg-white p-5 rounded-[28px] border-2 border-slate-50 flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'
                        }`}>
                          {t.type === 'earn' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-[#0a2540] uppercase tracking-tighter">{t.merchantName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Recentemente'}
                            {t.status === 'pending' && <span className="text-amber-500 italic"> • PENDENTE</span>}
                          </p>
                        </div>
                     </div>
                     <p className={`text-sm font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                       {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount || 0)}
                     </p>
                   </div>
                 ))
               ) : (
                 <div className="text-center p-10 text-slate-300 font-black uppercase text-[10px]">Sem movimentos registados</div>
               )}
            </div>
          )}

          {view === 'partners' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-xs font-black text-[#0a2540] uppercase tracking-widest px-2">Lojas Parceiras</h4>
              <div className="grid grid-cols-1 gap-4">
                {merchants.map((m, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0a2540] group-hover:bg-[#00d66f] group-hover:text-white transition-colors shadow-sm">
                        <Store size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{m.shopName || m.name}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00d66f]">{m.cashbackPercent}% Cashback</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-slate-300 group-hover:text-[#0a2540] transition-colors">
                      <MapPin size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER FIXO */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f6f9fc] via-[#f6f9fc] to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={() => setView('partners')}
            className="w-full bg-[#0a2540] text-white p-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:bg-black transition-all border-b-4 border-black/40"
          >
            Ganhar mais Cashback <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* MODAL DE AJUDA */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-[#0a2540]/90 backdrop-blur-md z-[100] p-6 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in duration-300 border-b-8 border-slate-100">
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
                <HelpCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">Ajuda Vizinho</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2">Estamos aqui para o que precisar.</p>
            </div>
            <textarea 
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              placeholder="Descreva o seu problema..."
              className="w-full h-32 bg-slate-50 border-4 border-slate-100 rounded-3xl p-4 text-sm font-bold outline-none focus:border-[#00d66f] transition-all resize-none"
            />
            <button 
              onClick={() => {
                alert("Pedido de ajuda enviado com sucesso!");
                setShowHelpModal(false);
                setHelpMessage('');
              }}
              className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest mt-6 flex items-center justify-center gap-3 shadow-lg"
            >
              Enviar Mensagem <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;