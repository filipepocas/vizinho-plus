import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Store, TrendingUp, Users, Settings, LogOut, MessageSquare, CheckSquare, Bell, Megaphone } from 'lucide-react';
import { User as UserProfile, Transaction } from '../../types';

import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';
import AdminMerchants from './AdminMerchants';
import AdminMerchantRequests from './AdminMerchantRequests'; 
import AdminSettings from './AdminSettings';
import FeedbackList from '../../components/admin/FeedbackList';
import MerchantModal from './MerchantModal';
import AdminNotifications from './AdminNotifications';
import AdminComms from './AdminComms';

const AdminDashboard: React.FC = () => {
  const { logout } = useStore();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'overview' | 'merchants' | 'requests' | 'users' | 'reviews' | 'comms' | 'notifications' | 'settings'>('overview');
  
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<UserProfile[]>([]);
  const [globalClients, setGlobalClients] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(5000));
    const unsubTx = onSnapshot(qTx, (snap) => setGlobalTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))));
    
    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerchants = onSnapshot(qMerchants, (snap) => setGlobalMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))));
    
    const qClients = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsubClients = onSnapshot(qClients, (snap) => setGlobalClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))));
    
    return () => { unsubTx(); unsubMerchants(); unsubClients(); };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-x-hidden">
      <header className="bg-[#0a2540] text-white p-6 md:p-10 rounded-b-[40px] md:rounded-b-[50px] border-b-[8px] md:border-b-[10px] border-[#00d66f] shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4 md:gap-5">
              <div className="bg-[#00d66f] p-3 md:p-4 rounded-[20px] md:rounded-[25px] text-[#0a2540] shadow-[4px_4px_0px_#ffffff]">
                <ShieldCheck size={28} className="md:w-8 md:h-8" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-[#00d66f]">Admin Console</h1>
                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1 md:mt-2">Supervisão Vizinho+</p>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => setCurrentView('settings')} className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-4 bg-white/10 rounded-xl md:rounded-2xl text-white hover:bg-[#00d66f] hover:text-[#0a2540] transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border-2 border-white/10">
                <Settings size={18} /> Master
              </button>
              <button onClick={async () => { await logout(); navigate('/login'); }} className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-4 bg-red-500/10 rounded-xl md:rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border-2 border-red-500/20">
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>

          <div className="mt-8 -mx-6 px-6 md:mx-0 md:px-0">
            <nav className="flex overflow-x-auto gap-2 bg-black/20 p-2 md:rounded-[25px] border-y md:border border-white/5 scrollbar-hide pb-2">
              {[
                { id: 'overview', label: 'Auditoria', icon: TrendingUp },
                { id: 'requests', label: 'Aprovar', icon: CheckSquare }, 
                { id: 'merchants', label: 'Lojas', icon: Store },
                { id: 'users', label: 'Vizinhos', icon: Users },
                { id: 'comms', label: 'Comunicações Pub', icon: Megaphone },
                { id: 'notifications', label: 'Avisos App', icon: Bell }, 
                { id: 'reviews', label: 'Feedback', icon: MessageSquare },
              ].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setCurrentView(item.id as any)} 
                  className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-[#00d66f] text-[#0a2540] shadow-xl md:translate-y-[-2px]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <item.icon size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={3} /> {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-12 w-full">
        {currentView === 'overview' && (
          <div className="bg-white rounded-[30px] md:rounded-[50px] border-4 border-[#0a2540] p-6 md:p-10 shadow-[8px_8px_0px_#0a2540] md:shadow-[15px_15px_0px_#0a2540] w-full overflow-hidden">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6 md:mb-10">Auditoria de Transações</h2>
              <AdminTransactions transactions={globalTransactions} clients={globalClients} merchants={globalMerchants} />
          </div>
        )}
        
        {currentView === 'requests' && <AdminMerchantRequests />}
        {currentView === 'users' && <AdminUsers users={globalClients} transactions={globalTransactions} />}
        {currentView === 'merchants' && <AdminMerchants merchants={globalMerchants} onUpdateStatus={async (id, s) => { await writeBatch(db).update(doc(db, 'users', id), { status: s }).commit(); }} onOpenModal={() => setIsModalOpen(true)} />}
        {currentView === 'comms' && <AdminComms />}
        {currentView === 'notifications' && <AdminNotifications />}
        {currentView === 'reviews' && <FeedbackList />}
        {currentView === 'settings' && <AdminSettings />}
      </main>

      <MerchantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;