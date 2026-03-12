import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Adicionado para navegação
import { useStore } from '../../store/useStore';
import { 
  collection, 
  serverTimestamp, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDoc, 
  writeBatch, 
  increment,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Users, 
  Store, 
  TrendingUp, 
  Download, 
  Plus, 
  Settings, 
  LogOut, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Tag,
  Mail,
  MapPin,
  Phone,
  Percent,
  Hash
} from 'lucide-react';
import AdminSettings from './AdminSettings';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, logout } = useStore();
  const navigate = useNavigate(); // Hook para redirecionar
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'users' | 'settings'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [merchants, setMerchants] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newMerchant, setNewMerchant] = useState({
    name: '', 
    address: '', 
    city: '',
    category: '',
    nif: '', 
    zipCode: '', 
    phone: '', 
    email: '', 
    cashbackPercent: 10 
  });

  // Função de Logout melhorada
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
      // Força o redirecionamento mesmo que haja erro no Firebase
      navigate('/login');
    }
  };

  const processMaturation = async () => {
    setIsProcessing(true);
    try {
      const configRef = doc(db, 'system', 'config');
      const configSnap = await getDoc(configRef);
      const hours = configSnap.exists() ? configSnap.data().maturationHours : 48;
      
      const limitDate = new Date();
      limitDate.setHours(limitDate.getHours() - hours);

      const q = query(
        collection(db, 'transactions'), 
        where('status', '==', 'pending'),
        where('createdAt', '<=', Timestamp.fromDate(limitDate))
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert(`Nenhum cashback pendente (+${hours}h) para processar.`);
        setIsProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach((txDoc) => {
        const txData = txDoc.data();
        
        batch.update(doc(db, 'transactions', txDoc.id), {
          status: 'available',
          maturedAt: serverTimestamp()
        });

        const userRef = doc(db, 'users', txData.clientId);
        batch.update(userRef, {
          'wallet.available': increment(txData.cashbackAmount || 0),
          'wallet.pending': increment(-(txData.cashbackAmount || 0))
        });
      });

      await batch.commit();
      alert(`${querySnapshot.size} transações maturadas com sucesso!`);
    } catch (error) {
      console.error("Erro na maturação:", error);
      alert("Erro ao processar maturação.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribeToTransactions]);

  useEffect(() => {
    const fetchData = async () => {
      if (currentView === 'merchants' || currentView === 'users') {
        setLoading(true);
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const allData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMerchants(allData.filter((u: any) => u.role === 'merchant'));
          setRegisteredUsers(allData.filter((u: any) => u.role === 'user' || u.role === 'client'));
        } catch (e) {
          console.error("Erro ao carregar dados:", e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [currentView]);

  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalCashback = transactions.reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);
    const pendingCashback = transactions
      .filter(t => t.status === 'pending')
      .reduce((acc, t) => acc + (t.cashbackAmount || 0), 0);
    const uniqueClients = new Set(transactions.map(t => t.clientId)).size;
    
    return {
      volume: totalVolume,
      cashback: totalCashback,
      pending: pendingCashback,
      clients: uniqueClients,
      count: transactions.length
    };
  }, [transactions]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const cleanEmail = newMerchant.email.toLowerCase().trim();
    const tempPassword = `parceiro${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, tempPassword);
      const authUser = userCredential.user;

      await setDoc(doc(db, 'users', authUser.uid), {
        ...newMerchant,
        email: cleanEmail,
        status: 'active',
        role: 'merchant',
        createdAt: serverTimestamp(),
        wallet: { available: 0, pending: 0 }
      });

      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        alert(`Lojista criado com sucesso!\n\nEmail enviado para ${cleanEmail}.\nPassword temporária: ${tempPassword}`);
      } catch (authErr) {
        console.warn("Falha no envio do email:", authErr);
        alert('Lojista criado, mas falhou o envio do e-mail de recuperação. Verifique as configurações do Firebase.');
      }

      setIsModalOpen(false);
      setNewMerchant({ 
        name: '', address: '', city: '', category: '', 
        nif: '', zipCode: '', phone: '', email: '', 
        cashbackPercent: 10 
      });
      
      setCurrentView('overview');
      setTimeout(() => setCurrentView('merchants'), 100);

    } catch (error: any) {
      console.error("Erro ao criar lojista:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Este e-mail já está registado no sistema!');
      } else {
        alert('Erro ao criar lojista: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { status: newStatus });
      setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    } catch (e) {
      alert("Erro ao atualizar status.");
    }
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Data': t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : '---',
      'Loja': t.merchantName || '---',
      'Vizinho (ID)': t.clientId || '---',
      'Volume': (t.amount || 0).toFixed(2) + '€',
      'Cashback': (t.cashbackAmount || 0).toFixed(2) + '€',
      'Status': t.status || 'pending'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `VizinhoPlus_Admin.xlsx`);
  };

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return (t.clientId?.toLowerCase().includes(q) || 
            t.merchantName?.toLowerCase().includes(q) || 
            t.documentNumber?.toLowerCase().includes(q));
  });

  if (currentView === 'settings') return <AdminSettings onBack={() => setCurrentView('overview')} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0a2540]">
      
      <header className="bg-[#0a2540] text-white p-8 rounded-b-[64px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-[#00d66f] p-4 rounded-3xl text-[#0a2540] shadow-lg rotate-3">
              <ShieldCheck size={40} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Admin <span className="text-[#00d66f]">Console</span></h1>
              <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.3em] mt-3">Gestão Central Vizinho+</p>
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-3xl backdrop-blur-md border border-white/10">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'settings', label: 'Definições', icon: Settings },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl scale-105' : 'hover:bg-white/10 text-white/70'}`}
              >
                <item.icon size={16} strokeWidth={3} /> {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} strokeWidth={3} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        
        {currentView === 'overview' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 group">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Vendas</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{stats.volume.toFixed(2)}€</h3>
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 group">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendente (+48h)</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{stats.pending.toFixed(2)}€</h3>
                 <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase text-slate-300">
                   <Clock size={10}/> Aguardando maturação
                 </div>
              </div>
              <div className="bg-[#00d66f] p-8 rounded-[40px] shadow-xl border-2 border-[#00d66f] text-[#0a2540]">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Gestão de Saldos</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{(stats.cashback - stats.pending).toFixed(2)}€</h3>
                 <button 
                  onClick={processMaturation} 
                  disabled={isProcessing} 
                  className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase bg-[#0a2540] text-white px-4 py-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                 >
                   <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''}/> 
                   {isProcessing ? 'A Processar...' : 'Gerar Cashback'}
                 </button>
              </div>
              <div className="bg-[#0a2540] p-8 rounded-[40px] shadow-xl text-white">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Vizinhos Ativos</p>
                 <h3 className="text-3xl font-black italic tracking-tighter">{stats.clients}</h3>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f]" size={20} />
                <input 
                  type="text" 
                  placeholder="PROCURAR POR ID CLIENTE, LOJA OU DOCUMENTO..." 
                  className="w-full p-6 pl-12 rounded-3xl border-2 border-slate-100 outline-none focus:border-[#00d66f] font-black text-xs uppercase"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={exportToExcel} 
                className="bg-white border-2 border-slate-100 px-8 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-[#0a2540] hover:text-white transition-all flex items-center gap-3 shadow-sm"
              >
                <Download size={18} /> Exportar Excel
              </button>
            </div>

            <div className="bg-white rounded-[48px] shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                      <th className="p-8">Data</th>
                      <th className="p-8">Loja</th>
                      <th className="p-8">ID Vizinho</th>
                      <th className="p-8 text-right">Volume</th>
                      <th className="p-8 text-right">Status</th>
                      <th className="p-8 text-right">Cashback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-8 text-xs font-bold text-slate-400">
                          {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}
                        </td>
                        <td className="p-8 font-black uppercase text-sm tracking-tighter">{t.merchantName}</td>
                        <td className="p-8 font-mono text-slate-400 font-bold text-[10px]">{t.clientId}</td>
                        <td className="p-8 text-right font-black text-slate-400">{(t.amount || 0).toFixed(2)}€</td>
                        <td className="p-8 text-right uppercase text-[9px] font-black tracking-widest">
                          <span className={t.status === 'available' ? 'text-[#00d66f]' : 'text-amber-500'}>
                            {t.status === 'available' ? 'Disponível' : 'Pendente'}
                          </span>
                        </td>
                        <td className={`p-8 text-right font-black text-lg ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                          {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'merchants' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
             <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-xl">
               <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Rede de Parceiros</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestão de Lojistas Registados</p>
               </div>
               <button onClick={() => setIsModalOpen(true)} className="bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3">
                  <Plus size={18} strokeWidth={3} /> Registar Novo Parceiro
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {merchants.map(m => (
                  <div key={m.id} className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-slate-50 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors"><Store size={24} /></div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${m.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {m.status || 'pending'}
                      </span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">{m.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">NIF: {m.nif}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                      <Tag size={10} /> {m.category || 'Atividade não definida'}
                    </p>
                    <p className="text-[9px] font-bold text-[#00d66f] uppercase mb-6 flex items-center gap-1">
                      <Percent size={10} /> {m.cashbackPercent}% Cashback
                    </p>
                    <div className="flex gap-2">
                       {m.status !== 'active' ? (
                         <button onClick={() => handleUpdateStatus(m.id, 'active')} className="flex-1 bg-[#00d66f] text-[#0a2540] p-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-md"><CheckCircle2 size={14} /> Ativar</button>
                       ) : (
                         <button onClick={() => handleUpdateStatus(m.id, 'disabled')} className="flex-1 bg-slate-50 text-slate-400 p-3 rounded-xl font-black uppercase text-[10px] hover:text-red-500 transition-colors flex items-center justify-center gap-2"><XCircle size={14} /> Suspender</button>
                       )}
                       <button className="bg-slate-100 p-3 rounded-xl text-slate-400 hover:bg-[#0a2540] hover:text-white transition-all"><Settings size={14} /></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {currentView === 'users' && (
          <div className="bg-white p-12 rounded-[48px] shadow-xl border-2 border-slate-100 animate-in slide-in-from-bottom-6">
             <h3 className="text-3xl font-black text-[#0a2540] uppercase italic tracking-tighter mb-10 flex items-center gap-4">
                <Users size={32} className="text-[#00d66f]" /> Vizinhos na Plataforma
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {registeredUsers.map(u => (
                  <div key={u.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] group hover:border-[#0a2540] transition-all">
                    <p className="font-black text-[#0a2540] text-sm uppercase tracking-tighter">{u.name || 'Sem Nome'}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{u.nif || 'NIF Pendente'}</p>
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-[#00d66f]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00d66f]"></div> Conta Ativa
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a2540]/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-[48px] p-10 shadow-2xl overflow-y-auto max-h-[95vh] border-4 border-[#00d66f]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter">Registo de Parceiro</h2>
                <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-widest">Preenche todos os dados do estabelecimento</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-4 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateMerchant} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <Store size={12}/> Nome Comercial
                  </label>
                  <input type="text" required placeholder="NOME DA LOJA" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={newMerchant.name} onChange={e => setNewMerchant({...newMerchant, name: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <Hash size={12}/> NIF Empresa
                  </label>
                  <input type="text" required maxLength={9} placeholder="9 DÍGITOS" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs" value={newMerchant.nif} onChange={e => setNewMerchant({...newMerchant, nif: e.target.value.replace(/\D/g, '')})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <Tag size={12}/> Categoria
                  </label>
                  <select required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={newMerchant.category} onChange={e => setNewMerchant({...newMerchant, category: e.target.value})}>
                    <option value="">Selecionar Categoria</option>
                    <option value="Restauração">Restauração</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Moda">Moda</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <Mail size={12}/> Email de Login
                  </label>
                  <input type="email" required placeholder="EMAIL@EXEMPLO.PT" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs" value={newMerchant.email} onChange={e => setNewMerchant({...newMerchant, email: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <Phone size={12}/> Telemóvel
                  </label>
                  <input type="tel" required placeholder="912 345 678" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs" value={newMerchant.phone} onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-2 border-t-2 border-slate-50 pt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                    <MapPin size={12}/> Morada Completa
                  </label>
                  <input type="text" required placeholder="RUA, NÚMERO, ANDAR..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={newMerchant.address} onChange={e => setNewMerchant({...newMerchant, address: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Código Postal</label>
                  <input type="text" required placeholder="0000-000" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs" value={newMerchant.zipCode} onChange={e => setNewMerchant({...newMerchant, zipCode: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Cidade</label>
                  <input type="text" required placeholder="EX: PORTO" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={newMerchant.city} onChange={e => setNewMerchant({...newMerchant, city: e.target.value})} />
                </div>

                <div className="md:col-span-2 bg-[#00d66f]/5 p-6 rounded-[32px] border-2 border-[#00d66f]/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest flex items-center gap-2">
                        <Percent size={14}/> Percentagem de Cashback
                      </label>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Valor que o vizinho recebe de volta</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1" max="50" step="0.5" className="w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00d66f]" value={newMerchant.cashbackPercent} onChange={e => setNewMerchant({...newMerchant, cashbackPercent: parseFloat(e.target.value)})} />
                      <span className="text-2xl font-black text-[#0a2540] w-16 text-right">{newMerchant.cashbackPercent}%</span>
                    </div>
                  </div>
                </div>

              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full p-6 bg-[#0a2540] text-[#00d66f] rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
              >
                {isProcessing ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <>Finalizar Registo do Parceiro <CheckCircle2 size={20}/></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;