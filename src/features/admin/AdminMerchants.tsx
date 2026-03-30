import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, Store, Plus, CheckCircle2, XCircle, Percent, Hash,
  MapPin, AlertCircle, Mail, Locate, Trash2, RefreshCw, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface AdminMerchantsProps {
  merchants: UserProfile[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onOpenModal: () => void;
  loading?: boolean;
}

const AdminMerchants: React.FC<AdminMerchantsProps> = ({ 
  merchants, onUpdateStatus, onOpenModal, loading 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteUserWithHistory } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredMerchants = merchants.filter(merchant => {
    const q = searchQuery.toLowerCase();
    return (
      (merchant.name?.toLowerCase() || '').includes(q) || 
      (merchant.shopName?.toLowerCase() || '').includes(q) || 
      (merchant.nif?.toLowerCase() || '').includes(q) || 
      (merchant.email?.toLowerCase() || '').includes(q) ||
      (merchant.zipCode?.toLowerCase() || '').includes(q) ||
      (merchant.freguesia?.toLowerCase() || '').includes(q)
    );
  });

  const handleDeleteMerchant = async (merchantId: string, shopName: string) => {
    const confirmed = window.confirm(
      `ALERTA CRÍTICO: Estás a eliminar o Parceiro "${shopName}".\n\n` +
      `Esta ação irá apagar permanentemente:\n` +
      `- O perfil do Lojista\n` +
      `- TODAS as transações registadas por esta loja\n\n` +
      `Esta operação é irreversível. Confirmas a eliminação total?`
    );

    if (confirmed) {
      setDeletingId(merchantId);
      try {
        await deleteUserWithHistory(merchantId, 'merchant');
      } catch (error) {
        toast.error("Erro ao eliminar parceiro.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  // RESOLUÇÃO 6: Exportar Comerciantes
  const exportToExcel = () => {
    const dataToExport = filteredMerchants.map(m => ({
      Loja: m.shopName || m.name || '---',
      Categoria: m.category || '---',
      Email: m.email || '---',
      NIF: m.nif || '---',
      "Cashback %": m.cashbackPercent || 0,
      Freguesia: m.freguesia || '---',
      "Código Postal": m.zipCode || '---',
      Estado: m.status === 'active' ? 'Ativo' : 'Suspenso'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comerciantes");
    XLSX.writeFile(wb, `Comerciantes_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0a2540] border-t-[#00d66f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540]">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="PESQUISAR LOJA, NIF, EMAIL OU C. POSTAL..." 
            className="w-full p-5 pl-16 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] focus:bg-white transition-all font-black text-xs uppercase tracking-wider shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={exportToExcel}
                className="bg-slate-100 text-[#0a2540] px-6 py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border-2 border-slate-200"
            >
                <Download size={20} /> Excel
            </button>
            <button 
                onClick={onOpenModal}
                className="flex-1 md:w-auto bg-[#00d66f] text-[#0a2540] px-8 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-[4px_4px_0px_#0a2540] hover:scale-[1.02] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]"
            >
                <Plus size={20} strokeWidth={4} /> Novo Parceiro
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMerchants.length > 0 ? (
          filteredMerchants.map((merchant) => {
            return (
              <div key={merchant.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#00d66f] flex flex-col relative group hover:-translate-y-2 transition-transform duration-300">
                
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors border-2 border-slate-200">
                    <Store size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDeleteMerchant(merchant.id, merchant.shopName || merchant.name || merchant.email)}
                      disabled={deletingId === merchant.id}
                      className="p-3 bg-red-50 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all border-2 border-red-100"
                      title="Eliminar parceiro e histórico"
                    >
                      {deletingId === merchant.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={3} />}
                    </button>
                    <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border-2 shadow-sm ${
                      merchant.status === 'active' 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-amber-100 text-amber-700 border-amber-300'
                    }`}>
                      {merchant.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-3 leading-tight truncate" title={merchant.shopName || merchant.name}>
                  {merchant.shopName || merchant.name || 'Loja sem nome'}
                </h3>

                <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Mail size={14} className="text-[#00d66f]" />
                    <span className="text-[10px] font-bold tracking-widest truncate" title={merchant.email}>{merchant.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Hash size={14} className="text-[#00d66f]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">NIF: {merchant.nif || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Locate size={14} className="text-[#00d66f]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">CP: {merchant.zipCode || '0000-000'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <MapPin size={14} className="text-[#0a2540]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate" title={merchant.freguesia}>{merchant.freguesia || 'Não definida'}</span>
                  </div>
                </div>

                <div className="bg-[#0a2540] rounded-3xl p-5 mb-8 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#00d66f]/20 p-2 rounded-xl">
                      <Percent size={16} className="text-[#00d66f]" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Retorno Configurado</span>
                  </div>
                  <span className="text-2xl font-black text-[#00d66f] italic tracking-tighter">{merchant.cashbackPercent || 0}%</span>
                </div>

                <div className="mt-auto flex gap-3">
                  {merchant.status !== 'active' ? (
                    <button 
                      onClick={() => onUpdateStatus(merchant.id, 'active')}
                      className="flex-1 bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_#0a2540] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]"
                    >
                      <CheckCircle2 size={16} strokeWidth={3} /> Ativar Conta
                    </button>
                  ) : (
                    <button 
                      onClick={() => onUpdateStatus(merchant.id, 'disabled')}
                      className="flex-1 bg-white text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 shadow-[4px_4px_0px_#0a2540] border-2 border-[#0a2540] transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} strokeWidth={3} /> Suspender Conta
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-20 bg-white border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center gap-4 text-slate-300">
            <AlertCircle size={64} />
            <p className="font-black uppercase tracking-[0.3em] text-sm">Nenhum parceiro encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMerchants;