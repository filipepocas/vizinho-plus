import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Componentes e Ícones
import FeedbackForm from '../../components/dashboard/FeedbackForm';
import { 
  LogOut, 
  Store, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  Crown,
  Cpu,
  HelpCircle,
  Search,
  MapPin,
  ExternalLink
} from 'lucide-react';

// Assets
const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';
const watermarkUrl = "https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus-watermark.png?alt=media";

const UserDashboard: React.FC = () => {
  const { transactions, logout, currentUser } = useStore();
  
  // Estados de Navegação e Modais
  const [view, setView] = useState<'home' | 'history' | 'explore' | 'settings'>('home');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedTxForFeedback, setSelectedTxForFeedback] = useState<any | null>(null);
  
  // Estados de Dados
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '' });
  const [helpMessage, setHelpMessage] = useState('');
  const [evaluatedIds, setEvaluatedIds] = useState<string[]>([]);

  // Filtros para Exploração de Lojas
  const [searchName, setSearchName] = useState('');
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 1. CARREGAR CONFIGURAÇÕES E PARCEIROS
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
        setAllMerchants(merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error("Erro ao carregar sistema:", err); }
    };
    fetchData();
  }, []);

  // 2. ESCUTAR FEEDBACKS JÁ REALIZADOS (Para não repetir pedidos)
  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'feedbacks'), where('userId', '==', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setEvaluatedIds(snapshot.docs.map(doc => doc.data().transactionId));
    });
  }, [currentUser?.id]);

  // 3. LEITURA DE SALDOS (Direto do Perfil Seguro)
  // Removemos a lógica de adivinhar a maturação. Agora a verdade vem do Backend.
  const merchantBalances = useMemo(() => {
    if (!currentUser?.storeWallets) return [];
    
    return Object.entries(currentUser.storeWallets)
      .map(([id, data]: [string, any]) => ({
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

  // 4. FILTRAGEM DE LOJAS (Explorar)
  const filteredMerchants = useMemo(() => {
    return allMerchants.filter(m => {
      const matchName = (m.shopName || m.name || '').toLowerCase().includes(searchName.toLowerCase());
      const matchZip = (m.zipCode || '').startsWith(searchZip);
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchName && matchZip && matchCat;
    });
  }, [allMerchants, searchName, searchZip, selectedCategory]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(allMerchants.map(m => m.category).filter(Boolean)))], [allMerchants]);

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  const openInMaps = (addr: string, name: string) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${addr}`)}`, '_blank');

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
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Olá, {currentUser?.name?.split(' ')[0]}</h1>
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

        {view === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[35px] p-8 shadow-2xl border border-white/10 relative overflow-hidden aspect-[1.586/1] flex flex-col justify-between text-white">
              <div className="flex justify-between items-start">
                <div className="bg-[#00d66f] px-3 py-1 rounded-lg text-[#0f172a] text-[8px] font-black uppercase tracking-widest italic">V+ Member</div>
                <Cpu size={30} className="text-white/20" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
                <h3 className="text-5xl font-black italic tracking-tighter text-[#00d66f]">{formatCurrency(stats.available)}</h3>
              </div>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <span className="text-xs font-mono tracking-widest opacity-80">{currentUser?.nif}</span>
                <img src={logoPath} className="h-6 grayscale brightness-200 opacity-30" alt="" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border-4 border-[#0f172a] shadow-[10px_10px_0px_#00d66f] flex flex-col items-center gap-6">
              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
                <QRCodeSVG value={currentUser?.nif || ""} size={140} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest mb-1">Identificação Rápida</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Mostra este código para ganhar ou usar saldo</p>
              </div>
            </div>

            {sysConfig.vantagensUrl && (
              <button onClick={() => window.open(sysConfig.vantagensUrl)} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 p-6 rounded-[30px] flex items-center justify-center gap-4 shadow-xl border-b-8 border-amber-800 hover:scale-[1.02] transition-all">
                <Crown size={28} className="text-amber-900" />
                <span className="text-lg font-black uppercase italic tracking-tighter text-amber-900">Vantagens VIP+</span>
              </button>
            )}

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Saldos por Estabelecimento</h4>
              {merchantBalances.length > 0 ? merchantBalances.map((m, i) => (
                <div key={i} className="bg-white p-5 rounded-[30px] border-4 border-slate-100 flex items-center justify-between group hover:border-[#00d66f] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:text-[#00d66f] transition-colors"><Store size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-[#0f172a] uppercase tracking-tighter">{m.name}</p>
                      <p className="text-[10px] font-bold text-[#00d66f] uppercase">{formatCurrency(m.available)} disponível</p>
                    </div>
                  </div>
                  {m.pending > 0 && <div className="text-right"><p className="text-[8px] font-black text-amber-500 uppercase">A Processar</p><p className="text-xs font-black text-amber-600">+{formatCurrency(m.pending)}</p></div>}
                </div>
              )) : (
                <div className="bg-white p-12 rounded-[40px] border-4 border-dashed border-slate-100 text-center text-slate-300 uppercase font-black text-[10px]">Sem saldos acumulados.</div>
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter ml-2">Movimentos</h3>
            {transactions.length > 0 ? transactions.map((t: any, i) => (
              <div key={i} className="bg-white p-5 rounded-[30px] border-4 border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                    {t.type === 'earn' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0f172a] uppercase tracking-tighter">{t.merchantName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className={`text-sm font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
                  </p>
                  {t.type === 'earn' && !evaluatedIds.includes(t.id) && (
                    <button onClick={() => setSelectedTxForFeedback(t)} className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black uppercase text-slate-500 hover:bg-[#00d66f] hover:text-[#0f172a] transition-all">Avaliar</button>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-20 text-center text-slate-300 uppercase font-black text-[10px]">Sem atividade registada.</div>
            )}
          </div>
        )}

        {view === 'explore' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-[35px] border-4 border-[#0f172a] shadow-[6px_6px_0px_#00d66f] space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input placeholder="NOME DA LOJA..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-[10px] font-black uppercase outline-none focus:border-[#00d66f]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="CP (EX: 4700)" value={searchZip} onChange={e => setSearchZip(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-[#00d66f]" />
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none appearance-none">
                  {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'TODOS SETORES' : c?.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {filteredMerchants.map((m, i) => (
              <div key={i} className="bg-white rounded-[40px] border-4 border-slate-100 overflow-hidden group hover:border-[#00d66f] transition-all">
                <div className="flex">
                  <div className="bg-[#0f172a] p-6 w-28 flex flex-col items-center justify-center text-center">
                    <p className="text-[#00d66f] text-2xl font-black italic">{m.cashbackPercent}%</p>
                    <p className="text-[7px] text-white/50 font-black uppercase leading-tight">Cashback<br/>Direto</p>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest">{m.category || 'Comércio'}</span>
                      <h4 className="text-lg font-black text-[#0f172a] uppercase tracking-tighter leading-none">{m.shopName || m.name}</h4>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center gap-1 text-slate-400">
                        <MapPin size={12} className="text-[#00d66f]" />
                        <span className="text-[9px] font-bold uppercase truncate max-w-[120px]">{m.freguesia || m.zipCode}</span>
                      </div>
                      <button onClick={() => openInMaps(m.address || '', m.shopName || m.name)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-[#0f172a] hover:text-white transition-all"><ExternalLink size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-10 text-center border-t-4 border-slate-50 bg-white">
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
          userId={currentUser?.id || ''} 
          userName={currentUser?.name || 'Vizinho'} 
          onClose={() => setSelectedTxForFeedback(null)} 
        />
      )}
    </div>
  );
};

export default UserDashboard;