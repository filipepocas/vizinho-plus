import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, Store, Plus, CheckCircle2, Hash, 
  MapPin, AlertCircle, Locate, Trash2, RefreshCw, 
  Download, MessageSquare, Send, X, CheckSquare
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface AdminMerchantsProps {
  merchants: UserProfile[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onOpenModal: () => void;
  loading?: boolean;
}

const AdminMerchants: React.FC<AdminMerchantsProps> = ({ merchants, onUpdateStatus, onOpenModal, loading }) => {
  const { deleteUserWithHistory, locations } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNif, setSearchNif] = useState('');
  const [searchDistrito, setSearchDistrito] = useState('');
  const [searchConcelho, setSearchConcelho] = useState('');
  const [searchFreguesia, setSearchFreguesia] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [setupLeavingId, setSetupLeavingId] = useState<string | null>(null);
  const [leavingDate, setLeavingDate] = useState('');

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = searchDistrito ? Object.keys(locations[searchDistrito] || {}).sort() : [];
  const freguesias = searchDistrito && searchConcelho ? (locations[searchDistrito][searchConcelho] || []).sort() : [];

  const hasActiveFilter = searchQuery !== '' || searchNif !== '' || searchDistrito !== '' || searchConcelho !== '' || searchFreguesia !== '';

  const filteredMerchants = merchants.filter((m: any) => {
    if (!hasActiveFilter) return false;
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = q === '' || (m.name?.toLowerCase() || '').includes(q) || (m.shopName?.toLowerCase() || '').includes(q) || (m.email?.toLowerCase() || '').includes(q);
    const matchNif = searchNif === '' || m.nif === searchNif;
    const matchDistrito = searchDistrito === '' || m.distrito === searchDistrito;
    const matchConcelho = searchConcelho === '' || m.concelho === searchConcelho;
    const matchFreguesia = searchFreguesia === '' || m.freguesia === searchFreguesia;
    return matchQuery && matchNif && matchDistrito && matchConcelho && matchFreguesia;
  });

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAllFiltered = () => setSelectedIds(filteredMerchants.map((m: any) => m.id));

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return toast.error("ESCREVA UMA MENSAGEM.");
    setIsSending(true);
    try {
      const promises = selectedIds.map(merchantId => addDoc(collection(db, 'merchant_messages'), { merchantId, message: adminMessage, from: 'admin', read: false, createdAt: serverTimestamp() }));
      await Promise.all(promises);
      toast.success("MENSAGEM ENVIADA!");
      setAdminMessage(''); setSelectedIds([]); setShowMessageModal(false);
    } catch (e) { toast.error("ERRO."); } finally { setIsSending(false); }
  };

  const handleDeleteMerchant = async (merchantId: string, shopName: string) => {
    if (window.confirm(`ELIMINAR ${shopName}?`)) {
      setDeletingId(merchantId);
      try { await deleteUserWithHistory(merchantId, 'merchant'); } catch (error) { toast.error("Erro."); } finally { setDeletingId(null); }
    }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-[#0a2540]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540]">
        <h2 className="text-xl font-black uppercase italic text-[#0a2540] mb-6 flex items-center gap-2"><Store/> Pesquisa de Lojas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="NOME OU EMAIL..." className="w-full p-4 pl-14 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <input type="text" placeholder="NIF" maxLength={9} value={searchNif} onChange={e=>setSearchNif(e.target.value.replace(/\D/g, ''))} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-xs uppercase" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={searchDistrito} onChange={e=>{setSearchDistrito(e.target.value); setSearchConcelho(''); setSearchFreguesia('');}} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none">
              <option value="">DISTRITO...</option>
              {distritos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select disabled={!searchDistrito} value={searchConcelho} onChange={e=>{setSearchConcelho(e.target.value); setSearchFreguesia('');}} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none disabled:opacity-50">
              <option value="">CONCELHO...</option>
              {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select disabled={!searchConcelho} value={searchFreguesia} onChange={e=>setSearchFreguesia(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none disabled:opacity-50">
              <option value="">FREGUESIA...</option>
              {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
        </div>
        <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-slate-100">
           <button onClick={selectAllFiltered} disabled={!hasActiveFilter} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540]"><CheckSquare className="inline mr-1" size={14}/> Selecionar Tudo</button>
           <div className="flex gap-2">
              {selectedIds.length > 0 && <button onClick={() => setShowMessageModal(true)} className="bg-[#0a2540] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Mensagem ({selectedIds.length})</button>}
              <button onClick={onOpenModal} className="bg-[#00d66f] text-[#0a2540] px-8 py-3 rounded-xl font-black text-[10px] uppercase border-2 border-[#0a2540]">NOVO PARCEIRO</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMerchants.map((merchant: any) => (
          <div key={merchant.id} onClick={() => toggleSelection(merchant.id)} className={`bg-white border-4 rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative cursor-pointer transition-all ${selectedIds.includes(merchant.id) ? 'border-[#00d66f] scale-[1.02]' : 'border-[#0a2540]'}`}>
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] mb-4 truncate">{merchant.shopName || merchant.name}</h3>
            <div className="space-y-2 mb-6 text-[10px] font-bold text-slate-500 uppercase">
              <p>NIF: {merchant.nif}</p>
              <p className="truncate">{merchant.distrito} &gt; {merchant.concelho} &gt; {merchant.freguesia}</p>
            </div>
            <div className="mt-auto flex gap-2">
              <span className={`flex-1 text-center py-3 rounded-xl text-[8px] font-black uppercase border-2 ${merchant.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{merchant.status === 'active' ? 'Ativo' : 'Suspenso'}</span>
              <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(merchant.id, merchant.status === 'active' ? 'disabled' : 'active'); }} className="px-4 py-3 bg-[#0a2540] text-white rounded-xl text-[8px] font-black">ALTERAR</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMerchants;