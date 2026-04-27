// src/features/admin/AdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, orderBy, doc, writeBatch, limit, getDocs, deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Store, TrendingUp, Users, Settings, LogOut, 
  MessageSquare, CheckSquare, Bell, Megaphone, Crown, 
  FileText, Receipt, CalendarPlus, Leaf, MapPin, 
  Image as ImageIcon, LayoutDashboard, Euro, LayoutTemplate, ListTree, Building2
} from 'lucide-react';
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
import AdminVantagens from './AdminVantagens'; 
import AdminLeaflets from './AdminLeaflets'; 
import AdminBilling from './AdminBilling'; 
import AdminEvents from './AdminEvents'; 
import AdminAntiWaste from './AdminAntiWaste'; 
import AdminLocations from './AdminLocations'; 
import BannerManager from './BannerManager';
import AdminPricing from './AdminPricing';
import AdminFlyerGenerator from './AdminFlyerGenerator';
import AdminTaxonomy from './AdminTaxonomy';
import AdminMunicipalities from './AdminMunicipalities'; // NOVO COMPONENTE

const AdminDashboard: React.FC = () => {
  const { logout } = useStore();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<'gestao' | 'marketing'>('gestao');
  const [currentView, setCurrentView] = useState<string>('overview');
  
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [globalMerchants, setGlobalMerchants] = useState<UserProfile[]>([]);
  const [globalClients, setGlobalClients] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pendingMerchants, setPendingMerchants] = useState(0);
  const [pendingMarketing, setPendingMarketing] = useState(0);
  const [pendingEvents, setPendingEvents] = useState(0);
  const [badFeedbacks, setBadFeedbacks] = useState(0);

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(5000));
    const unsubTx = onSnapshot(qTx, (snap: any) => {
      setGlobalTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)));
    });
    
    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerchants = onSnapshot(qMerchants, (snap: any) => {
      setGlobalMerchants(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserProfile)));
    });
    
    const qClients = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsubClients = onSnapshot(qClients, (snap: any) => {
      setGlobalClients(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    const unsub1 = onSnapshot(query(collection(db, 'merchant_requests'), where('status', '==', 'pending')), (snap: any) => setPendingMerchants(snap.size));
    const unsub2 = onSnapshot(query(collection(db, 'marketing_requests'), where('status', '==', 'pending')), (snap: any) => setPendingMarketing(snap.size));
    const unsub3 = onSnapshot(query(collection(db, 'events'), where('status', '==', 'pending')), (snap: any) => setPendingEvents(snap.size));
    const unsub4 = onSnapshot(query(collection(db, 'feedbacks'), where('status', '==', 'new')), (snap: any) => {
        const bad = snap.docs.filter((d: any) => d.data().rating < 3).length;
        setBadFeedbacks(bad);
    });
    
    const cleanupExpiredData = async () => {
       const now = new Date();
       const eventsSnap = await getDocs(collection(db, 'events'));
       eventsSnap.forEach((docSnap: any) => {
          const ev = docSnap.data();
          if (ev.endDate && ev.endDate.toDate() < now) deleteDoc(doc(db, 'events', docSnap.id)).catch(console.error);
       });
       const wasteSnap = await getDocs(collection(db, 'anti_waste'));
       wasteSnap.forEach((docSnap: any) => {
          const w = docSnap.data();
          if (w.endTime && w.endTime.toDate() < now) deleteDoc(doc(db, 'anti_waste', docSnap.id)).catch(console.error);
       });
    };
    cleanupExpiredData();

    return () => { unsubTx(); unsubMerchants(); unsubClients(); unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const hasGestaoAlert = pendingMerchants > 0;
  const hasMarketingAlert = pendingMarketing > 0 || pendingEvents > 0 || badFeedbacks > 0;

  const gestaoItems = [
    { id: 'overview', label: 'Auditoria', icon: TrendingUp },
    { id: 'requests', label: 'Aprovar', icon: CheckSquare, badge: pendingMerchants }, 
    { id: 'merchants', label: 'Lojas', icon: Store },
    { id: 'users', label: 'Vizinhos', icon: Users },
    { id: 'billing', label: 'Cobranças', icon: Receipt }, 
    { id: 'pricing', label: 'Motor Preços', icon: Euro }, 
    { id: 'taxonomy', label: 'Taxonomia', icon: ListTree }, 
    { id: 'municipalities', label: 'Apoio Municipal', icon: Building2 }, // NOVO BOTÃO
    { id: 'locations', label: 'Zonas', icon: MapPin },
    { id: 'admin_msg', label: 'Comunicados', icon: MessageSquare }
  ];

  const marketingItems = [
    { id: 'events', label: 'Eventos', icon: CalendarPlus, badge: pendingEvents },
    { id: 'anti_waste', label: 'Desperdício', icon: Leaf },
    { id: 'comms', label: 'Aprovar Pub', icon: Megaphone, badge: pendingMarketing },
    { id: 'flyer_gen', label: 'Gerar Folheto', icon: LayoutTemplate },
    { id: 'leaflets', label: 'Gestão Folhetos', icon: FileText },
    { id: 'vantagens', label: 'Vantagens VIP', icon: Crown },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'notifications', label: 'Avisos App', icon: Bell },
    { id: 'reviews', label: 'Feedback', icon: MessageSquare, badge: badFeedbacks }
  ];

  const currentMenuItems = activeMenu === 'gestao' ? gestaoItems : marketingItems;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-x-hidden">
      <header className="bg-[#0a2540] text-white p-6 md:p-10 rounded-b-[40px] md:rounded-b-[50px] border-b-[8px] md:border-b-[10px] border-[#00d66f] shadow-2xl z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
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
              <button onClick={() => {setActiveMenu('gestao'); setCurrentView('settings');}} className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-4 bg-white/10 rounded-xl md:rounded-2xl text-white hover:bg-[#00d66f] hover:text-[#0a2540] transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border-2 border-white/10"><Settings size={18} /> Master</button>
              <button onClick={async () => { await logout(); navigate('/'); }} className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-4 bg-red-500/10 rounded-xl md:rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border-2 border-red-500/20"><LogOut size={18} /> Sair</button>
            </div>
          </div>
          <div className="flex gap-4 border-b-2 border-white/10 pb-4 mb-4">
              <button onClick={() => {setActiveMenu('gestao'); setCurrentView('overview');}} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 transition-all ${activeMenu === 'gestao' ? 'bg-[#00d66f] text-[#0a2540] shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}><LayoutDashboard size={20} /> GESTÃO {hasGestaoAlert && <span className="bg-red-500 text-white text-[9px] px-2 py-1 rounded-full animate-pulse shadow-sm border border-red-700">NOVO</span>}</button>
              <button onClick={() => {setActiveMenu('marketing'); setCurrentView('events');}} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 transition-all ${activeMenu === 'marketing' ? 'bg-[#00d66f] text-[#0a2540] shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}><Megaphone size={20} /> MARKETING {hasMarketingAlert && <span className="bg-red-500 text-white text-[9px] px-2 py-1 rounded-full animate-pulse shadow-sm border border-red-700">NOVO</span>}</button>
          </div>
          <div className="-mx-6 px-6 md:mx-0 md:px-0"><nav className="flex overflow-x-auto gap-2 bg-black/20 p-2 md:rounded-[25px] border border-white/5 scrollbar-hide">
              {currentMenuItems.map(item => (
                <button key={item.id} onClick={() => setCurrentView(item.id)} className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${currentView === item.id ? 'bg-white text-[#0a2540] shadow-xl md:translate-y-[-2px]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <item.icon size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={3} /> {item.label} {item.badge ? <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full animate-pulse ml-1">{item.badge}</span> : null}
                </button>
              ))}
          </nav></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 w-full">
        {currentView === 'overview' && <div className="bg-white rounded-[30px] border-4 border-[#0a2540] p-6 shadow-xl w-full overflow-hidden"><h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6">Auditoria de Transações</h2><AdminTransactions transactions={globalTransactions} clients={globalClients} merchants={globalMerchants} /></div>}
        {currentView === 'requests' && <AdminMerchantRequests />}
        {currentView === 'users' && <AdminUsers users={globalClients} transactions={globalTransactions} />}
        {currentView === 'merchants' && <AdminMerchants merchants={globalMerchants} onUpdateStatus={async (id, s) => { await writeBatch(db).update(doc(db, 'users', id), { status: s }).commit(); }} onOpenModal={() => setIsModalOpen(true)} />}
        {currentView === 'events' && <AdminEvents />} 
        {currentView === 'anti_waste' && <AdminAntiWaste />} 
        {currentView === 'comms' && <AdminComms />}
        {currentView === 'flyer_gen' && <AdminFlyerGenerator />} 
        {currentView === 'taxonomy' && <AdminTaxonomy />} 
        {currentView === 'municipalities' && <AdminMunicipalities />} {/* AQUI RENDERIZA O NOVO COMPONENTE */}
        {currentView === 'billing' && <AdminBilling />} 
        {currentView === 'leaflets' && <AdminLeaflets />} 
        {currentView === 'vantagens' && <AdminVantagens />} 
        {currentView === 'notifications' && <AdminNotifications />}
        {currentView === 'reviews' && <FeedbackList />}
        {currentView === 'settings' && <AdminSettings />}
        {currentView === 'locations' && <AdminLocations />} 
        {currentView === 'pricing' && <AdminPricing />} 
        {currentView === 'banners' && <BannerManager />} 
        {currentView === 'admin_msg' && (<div className="bg-white p-20 rounded-[40px] border-4 border-dashed border-slate-200 text-center"><MessageSquare size={64} className="mx-auto text-slate-300 mb-4" /><h2 className="text-2xl font-black uppercase text-slate-400">Comunicados Avançados</h2><p className="text-slate-400 font-bold mt-2">Esta funcionalidade com filtros de zona está a ser preparada.</p></div>)}
      </main>
      <MerchantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;