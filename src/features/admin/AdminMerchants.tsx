import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, Store, Plus, CheckCircle2, XCircle, Percent, Hash, 
  MapPin, AlertCircle, Mail, Locate, Trash2, RefreshCw, 
  Download, User, Phone, MessageSquare, Send, X, CheckSquare,
  Loader2, Calendar
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
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteUserWithHistory } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // ESTADO PARA CONFIGURAR SAÍDA (ITEM 9)
  const [setupLeavingId, setSetupLeavingId] = useState<string | null>(null);
  const [leavingDate, setLeavingDate] = useState('');

  const filteredMerchants = merchants.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.name?.toLowerCase() || '').includes(q) || 
      (m.shopName?.toLowerCase() || '').includes(q) || 
      (m.nif?.toLowerCase() || '').includes(q) || 
      (m.email?.toLowerCase() || '').includes(q) ||
      (m.zipCode?.toLowerCase() || '').includes(q)
    );
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredMerchants.map(m => m.id);
    setSelectedIds(allFilteredIds);
    toast.success(`${allFilteredIds.length} LOJISTAS SELECIONADOS`);
  };

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return toast.error("ESCREVE UMA MENSAGEM.");
    setIsSending(true);
    try {
      const promises = selectedIds.map(merchantId => 
        addDoc(collection(db, 'merchant_messages'), {
          merchantId, message: adminMessage, from: 'admin', read: false, createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      toast.success("MENSAGEM ENVIADA PARA OS PAINÉIS!");
      setAdminMessage(''); setSelectedIds([]); setShowMessageModal(false);
    } catch (e) { toast.error("ERRO AO ENVIAR MENSAGENS."); } finally { setIsSending(false); }
  };

  const handleDeleteMerchant = async (merchantId: string, shopName: string) => {
    if (window.confirm(`ALERTA: Eliminar o Parceiro "${shopName}"?`)) {
      setDeletingId(merchantId);
      try {
        await deleteUserWithHistory(merchantId, 'merchant');
      } catch (error) { toast.error("Erro ao eliminar."); } finally { setDeletingId(null); }
    }
  };

  const exportToExcel = () => {
    const data = filteredMerchants.map(m => ({
      Loja: m.shopName || m.name, Responsável: m.responsibleName || '---',
      Email: m.email, NIF: m.nif, CP: m.zipCode, Estado: m.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parceiros");
    XLSX.writeFile(wb, "Lojistas_VPlus.xlsx");
  };

  // ITEM 9: Função para guardar o estado de Saída
  const handleSaveLeaving = async (id: string) => {
      if (!leavingDate) return toast.error("Insira a data.");
      try {
          await updateDoc(doc(db, 'users', id), {
              isLeaving: true,
              leavingDate: leavingDate
          });
          toast.success("Loja marcada para saída.");
          setSetupLeavingId(null);
          setLeavingDate('');
      } catch(err) { toast.error("Erro."); }
  };
  const handleCancelLeaving = async (id: string) => {
    if(!window.confirm("Desfazer a saída desta loja? Ela voltará a atribuir cashback.")) return;
    try {
        await updateDoc(doc(db, 'users', id), { isLeaving: false, leavingDate: '' });
        toast.success("Loja reativada completamente.");
    } catch(err) { toast.error("Erro."); }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-[#0a2540]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      
      <div className="bg-white p-6 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="FILTRAR POR NOME, NIF, EMAIL OU CÓDIGO POSTAL..." className="w-full p-5 pl-16 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
              <button onClick={exportToExcel} className="bg-slate-100 text-[#0a2540] px-6 py-5 rounded-3xl font-black text-[11px] uppercase border-2 border-slate-200">EXCEL</button>
              <button onClick={onOpenModal} className="flex-1 md:w-auto bg-[#00d66f] text-[#0a2540] px-8 py-5 rounded-3xl font-black text-[11px] uppercase shadow-[4px_4px_0px_#0a2540] border-2 border-[#0a2540]">NOVO PARCEIRO</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-dashed border-slate-100">
           <button onClick={selectAllFiltered} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-[#0a2540] transition-colors"><CheckSquare size={16} /> Selecionar Todos os Filtrados</button>
           <div className="h-4 w-px bg-slate-200 hidden md:block" />
           <span className="text-[10px] font-black uppercase text-[#00d66f]">{selectedIds.length} Lojistas Selecionados</span>
           {selectedIds.length > 0 && (<button onClick={() => setShowMessageModal(true)} className="bg-[#0a2540] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 animate-bounce"><MessageSquare size={14} /> Enviar Comunicado</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMerchants.map((merchant) => (
          <div 
            key={merchant.id} 
            onClick={() => toggleSelection(merchant.id)}
            className={`bg-white border-4 rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative cursor-pointer transition-all ${selectedIds.includes(merchant.id) ? 'border-[#00d66f] scale-[1.02]' : 'border-[#0a2540]'}`}
          >
            {selectedIds.includes(merchant.id) && <div className="absolute -top-3 -left-3 bg-[#00d66f] text-[#0a2540] p-2 rounded-full border-4 border-[#0a2540] z-10"><CheckCircle2 size={20} strokeWidth={3} /></div>}

            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540]"><Store size={24} /></div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteMerchant(merchant.id, merchant.shopName || merchant.name || ""); }} className="p-3 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
            </div>

            <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 truncate">{merchant.shopName || merchant.name}</h3>

            <div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <div className="flex items-center gap-3 text-slate-500"><Mail size={14} className="text-[#00d66f]" /><span className="text-[9px] font-bold truncate">{merchant.email}</span></div>
              <div className="flex items-center gap-3 text-slate-500"><Hash size={14} className="text-[#00d66f]" /><span className="text-[9px] font-bold">NIF: {merchant.nif}</span></div>
              <div className="flex items-center gap-3 text-slate-500"><Locate size={14} className="text-[#00d66f]" /><span className="text-[9px] font-bold uppercase">CP: {merchant.zipCode}</span></div>
            </div>

            {/* CONTROLO DA SAÍDA DA LOJA (ITEM 9) */}
            <div className="mb-6 border-t-2 border-dashed border-slate-200 pt-4" onClick={(e) => e.stopPropagation()}>
               {merchant.isLeaving ? (
                  <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 text-center relative group">
                     <p className="text-[9px] font-black uppercase text-red-600 mb-1 flex items-center justify-center gap-2"><AlertCircle size={14}/> Loja a sair</p>
                     <p className="text-xs font-bold text-red-500">{new Date(merchant.leavingDate!).toLocaleDateString()}</p>
                     <button onClick={() => handleCancelLeaving(merchant.id)} className="absolute inset-0 bg-red-500 text-white font-black text-[10px] uppercase rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center">Desfazer Saída</button>
                  </div>
               ) : setupLeavingId === merchant.id ? (
                  <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200">
                     <label className="text-[9px] font-black uppercase text-orange-800 mb-2 block">Data de Saída Efetiva</label>
                     <input type="date" value={leavingDate} onChange={e=>setLeavingDate(e.target.value)} className="w-full p-2 rounded-xl text-xs font-bold mb-2 border border-orange-300 outline-none" />
                     <div className="flex gap-2">
                        <button onClick={() => setSetupLeavingId(null)} className="flex-1 bg-white text-orange-600 py-2 rounded-lg text-[9px] font-black uppercase border border-orange-200">Cancelar</button>
                        <button onClick={() => handleSaveLeaving(merchant.id)} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm">Confirmar Saída</button>
                     </div>
                  </div>
               ) : (
                  <button onClick={() => setSetupLeavingId(merchant.id)} className="w-full py-3 bg-white text-orange-400 border-2 border-orange-100 rounded-2xl text-[9px] font-black uppercase hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">Configurar Saída da Plataforma</button>
               )}
            </div>

            <div className="mt-auto flex gap-2">
              <span className={`flex-1 text-center py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 ${merchant.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {merchant.status === 'active' ? 'Acesso Ativo' : 'Acesso Suspenso'}
              </span>
              <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(merchant.id, merchant.status === 'active' ? 'disabled' : 'active'); }} className="px-4 py-3 bg-[#0a2540] text-white rounded-xl text-[8px] font-black uppercase">Alterar</button>
            </div>
          </div>
        ))}
      </div>

      {showMessageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in">
             <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center"><h3 className="font-black uppercase italic text-lg">Comunicado Massivo</h3><button onClick={() => setShowMessageModal(false)}><X /></button></div>
             <div className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100"><p className="text-[10px] font-black uppercase text-blue-800">Destinatários: {selectedIds.length} Lojistas</p></div>
                <textarea value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} placeholder="Escreve aqui o comunicado..." className="w-full h-40 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-bold text-sm" />
                <button onClick={handleSendMessage} disabled={isSending} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase flex items-center justify-center gap-3 shadow-xl border-b-8 border-black/10">
                   {isSending ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Enviar Mensagem Agora</>}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMerchants;