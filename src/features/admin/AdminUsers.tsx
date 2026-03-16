import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types/index';
import { 
  Search, 
  Users, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert,
  Mail,
  Hash,
  ArrowUpRight,
  Locate,
  MapPin,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface AdminUsersProps {
  users: UserProfile[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  loading?: boolean;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ users, onUpdateStatus, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteUserWithHistory, isLoading: isDeleting } = useStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `ATENÇÃO: Estás prestes a eliminar DEFINITIVAMENTE o Vizinho "${userName}".\n\n` +
      `Isto irá apagar:\n` +
      `- O perfil do utilizador\n` +
      `- Todo o histórico de transações e cashback\n\n` +
      `Esta ação não pode ser desfeita. Desejas continuar?`
    );

    if (confirmed) {
      try {
        await deleteUserWithHistory(userId, 'client');
        alert("Vizinho e histórico eliminados com sucesso.");
      } catch (error) {
        alert("Erro ao eliminar vizinho. Verifica a consola.");
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const user = u as any; // Cast para evitar erros de tipo TS2339
    const q = searchQuery.toLowerCase();
    const userName = user.name?.toLowerCase() || '';
    const userNif = user.nif?.toLowerCase() || '';
    const userEmail = user.email?.toLowerCase() || '';
    const userZip = user.zipCode?.toLowerCase() || '';
    return userName.includes(q) || userNif.includes(q) || userEmail.includes(q) || userZip.includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0a2540] border-t-[#00d66f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* BARRA DE PESQUISA BRUTALISTA */}
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          placeholder="PESQUISAR VIZINHO POR NOME, NIF, EMAIL OU CÓDIGO POSTAL..." 
          className="w-full p-6 pl-14 bg-white border-2 border-[#0a2540] rounded-3xl outline-none shadow-[4px_4px_0px_0px_#0a2540] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-black text-xs uppercase tracking-wider"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* GRELHA DE UTILIZADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
            const user = u as any; // Cast para acesso seguro às propriedades dinâmicas
            return (
              <div key={user.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all">
                
                {/* STATUS INDICATOR & DELETE */}
                <div className="absolute top-6 right-8 flex items-center gap-2">
                  <button 
                    onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                    disabled={isDeleting}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar permanentemente"
                  >
                    {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border-2 ${
                    user.status === 'active' 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                    <Users size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase italic tracking-tighter text-[#0a2540] leading-none">
                      {user.name || 'Sem Nome'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Hash size={10} className="text-[#00d66f]" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{user.nif || 'NIF Pendente'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Mail size={14} className="text-[#00d66f]" />
                    <span className="text-xs font-bold truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Locate size={14} className="text-[#00d66f]" />
                    <span className="text-xs font-bold uppercase">{user.zipCode || '0000-000'}</span>
                  </div>
                  {user.freguesia && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <MapPin size={14} />
                      <span className="text-xs font-bold uppercase truncate">{user.freguesia}</span>
                    </div>
                  )}
                </div>

                {/* ÁREA DE SALDOS */}
                <div className="bg-slate-50 rounded-3xl p-5 border-2 border-slate-100 mb-8 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Wallet size={8}/> Disponível
                    </p>
                    <p className="text-sm font-black text-[#00d66f] italic">{formatCurrency(user.wallet?.available || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <ArrowUpRight size={8}/> Pendente
                    </p>
                    <p className="text-sm font-black text-amber-500 italic">{formatCurrency(user.wallet?.pending || 0)}</p>
                  </div>
                </div>

                {/* ACÇÕES */}
                <div className="mt-auto">
                  {user.status === 'active' ? (
                    <button 
                      onClick={() => onUpdateStatus(user.id, 'disabled')}
                      className="w-full bg-slate-100 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} strokeWidth={3} /> Suspender Conta
                    </button>
                  ) : (
                    <button 
                      onClick={() => onUpdateStatus(user.id, 'active')}
                      className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} strokeWidth={3} /> Reativar Vizinho
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-20 bg-white border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center gap-4 opacity-40">
            <ShieldAlert size={48} />
            <p className="font-black uppercase tracking-widest text-xs">Nenhum vizinho encontrado com este critério</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;