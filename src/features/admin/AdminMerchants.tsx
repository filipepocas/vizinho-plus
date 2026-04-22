// src/features/admin/AdminMerchants.tsx

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, Store, CheckCircle2, Hash, 
  MapPin, RefreshCw, Download, X, CheckSquare, Filter, Trash2, CalendarClock, AlertTriangle
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
  
  // FILTROS MÚLTIPLOS
  const [selectedDistritos, setSelectedDistritos] = useState<string[]>([]);
  const [selectedConcelhos, setSelectedConcelhos] = useState<string[]>([]);
  const [selectedFreguesias, setSelectedFreguesias] = useState<string[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Estados de Saída / Eliminação (Ponto 2)
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [setupLeavingId, setSetupLeavingId] = useState<string | null>(null);
  const [leavingDate, setLeavingDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const distritos = Object.keys(locations || {}).sort();

  const handleAddFilter = (val: string, type: 'distrito' | 'concelho' | 'freguesia') => {
    if (!val) return;
    if (type === 'distrito' && !selectedDistritos.includes(val)) setSelectedDistritos([...selectedDistritos, val]);
    if (type === 'concelho' && !selectedConcelhos.includes(val)) setSelectedConcelhos([...selectedConcelhos, val]);
    if (type === 'freguesia' && !selectedFreguesias.includes(val)) setSelectedFreguesias([...selectedFreguesias, val]);
  };

  const filteredMerchants = merchants.filter((m: any) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = q === '' || (m.name?.toLowerCase() || '').includes(q) || (m.shopName?.toLowerCase() || '').includes(q) || (m.email?.toLowerCase() || '').includes(q);
    const matchNif = searchNif === '' || m.nif === searchNif;
    
    const matchDistrito = selectedDistritos.length === 0 || selectedDistritos.includes(m.distrito || '');
    const matchConcelho = selectedConcelhos.length === 0 || selectedConcelhos.includes(m.concelho || '');
    const matchFreguesia = selectedFreguesias.length === 0 || selectedFreguesias.includes(m.freguesia || '');

    return matchQuery && matchNif && matchDistrito && matchConcelho && matchFreguesia;
  });

  const exportToExcel = (data: UserProfile[], filename: string) => {
    const dataToExport = data.map((m: any) => ({
      "ID": m.id,
      "Nome da Loja": m.shopName || m.name || '---',
      "Responsável": m.responsibleName || '---',
      "Email": m.email || '---',
      "Telemóvel": m.phone || '---',
      "NIF": m.nif || '---',
      "Setor/Categoria": m.category || '---',
      "Cashback %": m.cashbackPercent || 0,
      "Distrito": m.distrito || '---',
      "Concelho": m.concelho || '---',
      "Freguesia": m.freguesia || '---',
      "Código Postal": m.zipCode || '---',
      "Website": m.websiteUrl || '---',
      "Email Público": m.publicEmail || '---',
      "Estado": m.status === 'active' ? 'Ativo' : 'Suspenso',
      "Data de Registo": m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : '---',
      "Saldo Acumulado (Global)": m.wallet?.available || 0,
      "Em Saída?": m.isLeaving ? 'Sim' : 'Não',
      "Data Saída": m.leavingDate || '---'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lojas");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) return toast.error("ESCREVA UMA MENSAGEM.");
    setIsSending(true);
    try {
      const promises = selectedIds.map(merchantId => addDoc(collection(db, 'merchant_messages'), { 
        merchantId, 
        message: adminMessage, 
        from: 'admin', 
        read: false, 
        createdAt: serverTimestamp() 
      }));
      await Promise.all(promises);
      toast.success("MENSAGEM ENVIADA!");
      setAdminMessage(''); setSelectedIds([]); setShowMessageModal(false);
    } catch (e) { toast.error("ERRO."); } finally { setIsSending(false); }
  };

  // Funções de Gestão de Saída / Eliminação
  const handleDeleteMerchant = async (id: string, name: string) => {
    if (!window.confirm(`ALERTA GRAVE: Eliminar a loja ${name} fisicamente do sistema? Isto irá apagar todas as faturas e saldos associados. Esta ação é irreversível.`)) return;
    setDeletingId(id);
    try {
      await deleteUserWithHistory(id, 'merchant');
      toast.success("Loja eliminada do sistema.");
    } catch (err) {
      toast.error("Erro ao eliminar a loja.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleScheduleLeaving = async () => {
    if (!setupLeavingId) return;
    if (!leavingDate) return toast.error("Defina a data de saída oficial.");
    
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'users', setupLeavingId);
      await updateDoc(docRef, {
        isLeaving: true,
        leavingDate: leavingDate
      });
      toast.success("Saída agendada com sucesso. A loja já não poderá emitir cashback.");
      setSetupLeavingId(null);
      setLeavingDate('');
    } catch (err) {
      toast.error("Erro ao agendar saída.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelLeaving = async (id: string) => {
    if (!window.confirm("Cancelar processo de saída e reativar a loja normalmente?")) return;
    try {
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, {
        isLeaving: false,
        leavingDate: ''
      });
      toast.success("Loja reativada.");
    } catch (err) {
      toast.error("Erro ao cancelar saída.");
    }
  };

  if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-[#0a2540]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase italic text-[#0a2540] flex items-center gap-2"><Store/> Pesquisa de Lojas</h2>
          <div className="flex gap-2">
            <button onClick={() => exportToExcel(merchants, 'Todas_As_Lojas_VizinhoPlus')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-slate-200 transition-all flex items-center gap-2">
              <Download size={14} /> Exportar Tudo
            </button>
            <button 
              disabled={filteredMerchants.length === 0}
              onClick={() => exportToExcel(filteredMerchants, 'Lojas_Filtradas_VizinhoPlus')} 
              className="bg-[#0a2540] text-[#00d66f] px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:scale-105 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Exportar Filtrados ({filteredMerchants.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="NOME OU EMAIL..." className="w-full p-4 pl-14 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <input type="text" placeholder="NIF" maxLength={9} value={searchNif} onChange={e=>setSearchNif(e.target.value.replace(/\D/g, ''))} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-xs uppercase" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <select onChange={e=>handleAddFilter(e.target.value, 'distrito')} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none">
                <option value="">+ FILTRAR DISTRITO...</option>
                {distritos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">
                {selectedDistritos.map(d => (
                  <span key={d} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-blue-100">
                    {d} <X size={12} className="cursor-pointer" onClick={() => setSelectedDistritos(selectedDistritos.filter(i => i !== d))} />
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <select onChange={e=>handleAddFilter(e.target.value, 'concelho')} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none">
                <option value="">+ FILTRAR CONCELHO...</option>
                {selectedDistritos.length > 0 ? selectedDistritos.flatMap(d => Object.keys(locations[d] || {})).sort().map(c => <option key={c} value={c}>{c}</option>) : <option disabled>Selecione um Distrito primeiro</option>}
              </select>
              <div className="flex flex-wrap gap-1">
                {selectedConcelhos.map(c => (
                  <span key={c} className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-emerald-100">
                    {c} <X size={12} className="cursor-pointer" onClick={() => setSelectedConcelhos(selectedConcelhos.filter(i => i !== c))} />
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <select onChange={e=>handleAddFilter(e.target.value, 'freguesia')} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none">
                <option value="">+ FILTRAR FREGUESIA...</option>
                {selectedConcelhos.length > 0 ? selectedConcelhos.flatMap(c => {
                  for (let d of selectedDistritos) { if (locations[d][c]) return locations[d][c]; }
                  return [];
                }).sort().map(f => <option key={f} value={f}>{f}</option>) : <option disabled>Selecione um Concelho primeiro</option>}
              </select>
              <div className="flex flex-wrap gap-1">
                {selectedFreguesias.map(f => (
                  <span key={f} className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-amber-100">
                    {f} <X size={12} className="cursor-pointer" onClick={() => setSelectedFreguesias(selectedFreguesias.filter(i => i !== f))} />
                  </span>
                ))}
              </div>
            </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-slate-100">
           <button onClick={() => setSelectedIds(filteredMerchants.map((m: any) => m.id))} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540]"><CheckSquare className="inline mr-1" size={14}/> Selecionar Tudo Filtrado</button>
           <div className="flex gap-2">
              {selectedIds.length > 0 && <button onClick={() => setShowMessageModal(true)} className="bg-[#0a2540] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Mensagem ({selectedIds.length})</button>}
              <button onClick={onOpenModal} className="bg-[#00d66f] text-[#0a2540] px-8 py-3 rounded-xl font-black text-[10px] uppercase border-2 border-[#0a2540]">NOVO PARCEIRO</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMerchants.map((merchant: any) => (
          <div key={merchant.id} onClick={() => setSelectedIds(prev => prev.includes(merchant.id) ? prev.filter(i => i !== merchant.id) : [...prev, merchant.id])} className={`bg-white border-4 rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative cursor-pointer transition-all ${merchant.isLeaving ? 'border-amber-500 bg-amber-50/50' : selectedIds.includes(merchant.id) ? 'border-[#00d66f] scale-[1.02]' : 'border-[#0a2540]'}`}>
            
            {merchant.isLeaving && (
              <div className="absolute -top-3 -right-3 bg-red-500 text-white px-4 py-1 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-lg border-2 border-white">
                <AlertTriangle size={12}/> Saída a {new Date(merchant.leavingDate).toLocaleDateString()}
              </div>
            )}

            <h3 className="text-xl font-black uppercase italic text-[#0a2540] mb-4 truncate">{merchant.shopName || merchant.name}</h3>
            
            <div className="space-y-2 mb-6 text-[10px] font-bold text-slate-500 uppercase">
              <p>NIF: {merchant.nif}</p>
              <p className="truncate">{merchant.distrito} &gt; {merchant.concelho} &gt; {merchant.freguesia}</p>
              <p className="text-blue-500">{merchant.email}</p>
            </div>
            
            <div className="mt-auto flex flex-col gap-2">
              <div className="flex gap-2">
                <span className={`flex-1 text-center py-3 rounded-xl text-[8px] font-black uppercase border-2 ${merchant.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{merchant.status === 'active' ? 'Ativo' : 'Suspenso'}</span>
                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(merchant.id, merchant.status === 'active' ? 'disabled' : 'active'); }} className="px-4 py-3 bg-[#0a2540] text-white rounded-xl text-[8px] font-black hover:bg-black transition-colors">ALTERAR</button>
              </div>

              <div className="flex gap-2 pt-2 border-t-2 border-dashed border-slate-200 mt-2">
                {merchant.isLeaving ? (
                  <button onClick={(e) => { e.stopPropagation(); handleCancelLeaving(merchant.id); }} className="flex-1 bg-amber-100 text-amber-700 py-3 rounded-xl text-[8px] font-black uppercase hover:bg-amber-200 transition-colors flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> Cancelar Saída
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setSetupLeavingId(merchant.id); }} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl text-[8px] font-black uppercase hover:bg-slate-200 transition-colors flex items-center justify-center gap-1">
                    <CalendarClock size={12} /> Agendar Saída
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDeleteMerchant(merchant.id, merchant.shopName || merchant.name); }} disabled={deletingId === merchant.id} className="w-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                  {deletingId === merchant.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredMerchants.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
            <Filter size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black uppercase text-slate-300 text-xs">Nenhuma loja encontrada com estes filtros.</p>
          </div>
        )}
      </div>

      {showMessageModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[40px] border-4 border-[#00d66f] p-8 shadow-2xl animate-in zoom-in">
            <h3 className="text-xl font-black uppercase text-[#0a2540] mb-6">Mensagem para {selectedIds.length} Lojas</h3>
            <textarea value={adminMessage} onChange={e=>setAdminMessage(e.target.value)} className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl mb-6 font-bold text-sm outline-none focus:border-[#00d66f] resize-none" placeholder="Escreva aqui..." />
            <div className="flex gap-4">
              <button onClick={() => setShowMessageModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] bg-slate-100 text-slate-400">Cancelar</button>
              <button onClick={handleSendMessage} disabled={isSending} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] bg-[#00d66f] text-[#0a2540] shadow-lg flex justify-center items-center gap-2">
                {isSending ? <RefreshCw className="animate-spin" size={16}/> : 'Enviar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AGENDAMENTO DE SAÍDA */}
      {setupLeavingId && (
        <div className="fixed inset-0 z-[200] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-amber-500 p-8 shadow-2xl animate-in zoom-in text-center">
            <CalendarClock size={48} className="mx-auto text-amber-500 mb-4" />
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] mb-2">Agendar Saída do Programa</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-6 leading-relaxed">
              Ao confirmar esta data, a loja deixa de poder emitir novo cashback aos clientes, podendo apenas descontar os saldos existentes até ao dia de encerramento.
            </p>
            
            <div className="text-left mb-6">
              <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2">Data Oficial de Saída</label>
              <input 
                type="date" 
                value={leavingDate} 
                onChange={(e) => setLeavingDate(e.target.value)} 
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm mt-2 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => {setSetupLeavingId(null); setLeavingDate('');}} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-200">Cancelar</button>
              <button onClick={handleScheduleLeaving} disabled={isProcessing} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] bg-amber-500 text-white shadow-lg flex justify-center items-center gap-2 hover:bg-amber-600 border-b-4 border-amber-700">
                {isProcessing ? <RefreshCw className="animate-spin" size={16}/> : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMerchants;