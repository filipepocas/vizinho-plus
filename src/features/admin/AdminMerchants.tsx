import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, 
  Store, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Percent, 
  Hash,
  MapPin,
  AlertCircle,
  Mail,
  Locate,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface AdminMerchantsProps {
  merchants: UserProfile[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onOpenModal: () => void;
  loading?: boolean;
}

const AdminMerchants: React.FC<AdminMerchantsProps> = ({ 
  merchants, 
  onUpdateStatus, 
  onOpenModal, 
  loading 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteUserWithHistory, isLoading: isDeleting } = useStore();

  const filteredMerchants = merchants.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      (m.name?.toLowerCase() || '').includes(q) || 
      (m.nif?.toLowerCase() || '').includes(q) || 
      (m.email?.toLowerCase() || '').includes(q) ||
      (m.zipCode?.toLowerCase() || '').includes(q) ||
      (m.freguesia?.toLowerCase() || '').includes(q)
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
      try {
        await deleteUserWithHistory(merchantId, 'merchant');
        alert("Parceiro e histórico eliminados com sucesso.");
      } catch (error) {
        alert("Erro ao eliminar parceiro. Verifica a consola.");
      }
    }
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
      
      {/* CABEÇALHO DE ACÇÕES */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] border-2 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540]">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="PESQUISAR LOJA, NIF, EMAIL OU CÓDIGO POSTAL..." 
            className="w-full p-4 pl-14 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white transition-all font-black text-xs uppercase tracking-wider"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={onOpenModal}
          className="w-full md:w-auto bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-3 border-2 border-[#0a2540]"
        >
          <Plus size={18} strokeWidth={4} /> Registar Novo Parceiro
        </button>
      </div>

      {/* GRELHA DE LOJISTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMerchants.length > 0 ? (
          filteredMerchants.map((m) => (
            <div key={m.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group hover:-translate-y-1 transition-all">
              
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                  <Store size={24} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDeleteMerchant(m.id, m.name || m.email)}
                    disabled={isDeleting}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar parceiro e histórico"
                  >
                    {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border-2 ${
                    m.status === 'active' 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {m.status || 'Pendente'}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2 leading-none">
                {m.name || 'Loja sem nome'}
              </h3>

              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail size={12} className="text-[#00d66f]" />
                  <span className="text-[10px] font-bold lowercase tracking-tight truncate">{m.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Hash size={12} className="text-[#00d66f]" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">NIF: {m.nif || '---'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Locate size={12} className="text-[#00d66f]" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">CP: {m.zipCode || '0000-000'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate">{m.freguesia || 'Localização não definida'}</span>
                </div>
              </div>

              {/* DASH DE CASHBACK */}
              <div className="bg-[#0a2540] rounded-3xl p-5 mb-8 flex items-center justify-between border-b-4 border-[#00d66f]">
                <div className="flex items-center gap-3">
                  <div className="bg-[#00d66f]/20 p-2 rounded-lg">
                    <Percent size={14} className="text-[#00d66f]" />
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Configuração</span>
                </div>
                <span className="text-xl font-black text-[#00d66f] italic">{m.cashbackPercent || 0}%</span>
              </div>

              {/* BOTÕES DE ACÇÃO */}
              <div className="mt-auto flex gap-3">
                {m.status !== 'active' ? (
                  <button 
                    onClick={() => onUpdateStatus(m.id, 'active')}
                    className="flex-1 bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]"
                  >
                    <CheckCircle2 size={14} strokeWidth={3} /> Ativar
                  </button>
                ) : (
                  <button 
                    onClick={() => onUpdateStatus(m.id, 'disabled')}
                    className="flex-1 bg-white text-slate-300 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-red-500 hover:border-red-500 border-2 border-slate-100 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} strokeWidth={3} /> Suspender
                  </button>
                )}
                <button className="bg-slate-100 p-4 rounded-2xl text-slate-400 hover:bg-[#0a2540] hover:text-white transition-all border-2 border-transparent">
                  <Settings size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 bg-white border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center gap-4 opacity-40">
            <AlertCircle size={48} />
            <p className="font-black uppercase tracking-widest text-xs">Nenhum parceiro encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMerchants;