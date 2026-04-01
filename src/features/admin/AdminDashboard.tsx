import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Store, TrendingUp, Users, Settings, LogOut, MessageSquare, Image as ImageIcon, CheckSquare, FileText } from 'lucide-react';
import { User as UserProfile, Transaction } from '../../types';

import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';
import AdminMerchants from './AdminMerchants';
import AdminMerchantRequests from './AdminMerchantRequests'; 
import AdminSettings from './AdminSettings';
import FeedbackList from '../../components/admin/FeedbackList';
import MerchantModal from './MerchantModal';
import BannerManager from './BannerManager';
import AdminLeaflets from './AdminLeaflets';

const AdminDashboard: React.FC = () => {
  const { logout } = useStore();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'requests' | 'users' | 'reviews' | 'banners' | 'leaflets' | 'settings'>('overview');
  
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<UserProfile[]>([]);
  const [globalClients, setGlobalClients] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // LIMITES ADICIONADOS PARA POUPAR A FREE TIER DO FIREBASE
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500));
    const unsubTx = onSnapshot(qTx, (snap) => setGlobalTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))));
    
    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'), limit(200));
    const unsubMerchants = onSnapshot(qMerchants, (snap) => setGlobalMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))));
    
    const qClients = query(collection(db, 'users'), where('role', '==', 'client'), limit(1000));
    const unsubClients = onSnapshot(qClients, (snap) => setGlobalClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))));
    
    return () => { unsubTx(); unsubMerchants(); unsubClients(); };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-[#0a2540] text-white p-6 md:p-10 rounded-b-[50px] border-b-[10px] border-[#00d66f] shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-[#00d66f] p-4 rounded-[25px] text-[#0a2540] shadow-[4px_4px_0px_#ffffff]">
                <ShieldCheck size={32} strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-[#00d66f]">Admin Console</h1>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Supervisão Vizinho+</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentView('settings')} className="px-6 py-4 bg-white/10 rounded-2xl text-white hover:bg-[#00d66f] hover:text-[#0a2540] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border-2 border-white/10">
                <Settings size={20} /> Master
              </button>
              <button onClick={async () => { await logout(); navigate('/login'); }} className="px-6 py-4 bg-red-500/10 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border-2 border-red-500/20">
                <LogOut size={20} /> Sair
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 mt-10 bg-black/20 p-2 rounded-[25px] border border-white/5 inline-flex">
            {[
              { id: 'overview', label: 'Auditoria', icon: TrendingUp },
              { id: 'requests', label: 'Aprovar', icon: CheckSquare }, 
              { id: 'merchants', label: 'Lojas', icon: Store },
              { id: 'users', label: 'Vizinhos', icon: Users },
              { id: 'banners', label: 'Banners', icon: ImageIcon },
              { id: 'leaflets', label: 'Folhetos', icon: FileText },
              { id: 'reviews', label: 'Feedback', icon: MessageSquare },
            ].map(item => (
              <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl translate-y-[-2px]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={18} strokeWidth={3} /> {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 w-full">
        {currentView === 'overview' && (
          <div className="bg-white rounded-[50px] border-4 border-[#0a2540] p-10 shadow-[15px_15px_0px_#0a2540]">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-10">Auditoria de Transações</h2>
              <AdminTransactions transactions={globalTransactions} users={[]} />
          </div>
        )}
        
        {currentView === 'requests' && <AdminMerchantRequests />}
        {currentView === 'users' && <AdminUsers users={globalClients} />}
        {currentView === 'merchants' && <AdminMerchants merchants={globalMerchants} onUpdateStatus={async (id, s) => { await writeBatch(db).update(doc(db, 'users', id), { status: s }).commit(); }} onOpenModal={() => setIsModalOpen(true)} />}
        {currentView === 'reviews' && <FeedbackList />}
        {currentView === 'banners' && <BannerManager />}
        {currentView === 'leaflets' && <AdminLeaflets />}
        {currentView === 'settings' && <AdminSettings />}
      </main>

      <MerchantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;