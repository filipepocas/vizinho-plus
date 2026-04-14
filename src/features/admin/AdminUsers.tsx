// src/features/admin/AdminUsers.tsx

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User as UserProfile, Transaction } from '../../types/index';
import { Search, Users, Mail, Locate, Download, Phone, BellRing, BellOff, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/useStore';

interface AdminUsersProps {
  users: UserProfile[];
  transactions: Transaction[];
}

const AdminUsers: React.FC<AdminUsersProps> = ({ users, transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { deleteUserWithHistory } = useStore();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.nif && u.nif.toLowerCase().includes(q)) ||
        (u.zipCode && u.zipCode.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const updateStatus = async (id: string, status: string) => {
    try {
        await updateDoc(doc(db, 'users', id), { status });
        toast.success("ESTADO ATUALIZADO.");
    } catch (err) {
        toast.error("Erro ao atualizar.");
    }
  };

  /**
   * PONTO 2: Admin elimina cliente e todo o seu histórico
   */
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`ALERTA CRÍTICO: Estás prestes a eliminar permanentemente o vizinho "${name}" e todo o seu histórico de transações. Confirmas?`)) return;
    
    setIsDeletingId(id);
    try {
      await deleteUserWithHistory(id, 'client');
      toast.success("Cliente removido com sucesso.");
    } catch (e) {
      toast.error("Erro ao eliminar cliente.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredUsers.map(u => {
      const userTxs = transactions.filter(t => t.clientId === u.id && t.type === 'earn' && t.status !== 'cancelled');
      
      const shopStats: Record<string, { name: string, volume: number, visits: number }> = {};
      userTxs.forEach(t => {
        if (!shopStats[t.merchantId]) {
          shopStats[t.merchantId] = { name: t.merchantName, volume: 0, visits: 0 };
        }
        shopStats[t.merchantId].volume += t.amount;
        shopStats[t.merchantId].visits += 1;
      });

      let topVolumeShop = "N/D";
      let maxVolume = 0;
      let topVisitsShop = "N/D";
      let maxVisits = 0;

      Object.values(shopStats).forEach(shop => {
        if (shop.volume > maxVolume) { maxVolume = shop.volume; topVolumeShop = shop.name; }
        if (shop.visits > maxVisits) { maxVisits = shop.visits; topVisitsShop = shop.name; }
      });

      return {
        Nome: u.name || '---',
        Email: u.email || '---',
        Telefone: u.phone || '---',
        NIF: u.nif || '---',
        "Equipamentos": u.devices ? u.devices.length : 0,
        "Notificações": u.devices && u.devices.length > 0 ? 'Ativas' : 'Inativas',
        "Código Postal": u.zipCode || '---',
        Estado: u.status === 'active' ? 'Ativo' : 'Suspenso'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vizinhos");
    XLSX.writeFile(wb, `Vizinhos_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input type="text" placeholder="Pesquisar por nome, email ou CP..." className="w-full p-6 pl-14 bg-white border-4 border-[#0a2540] rounded-3xl outline-none shadow-[8px_8px_0px_0px_#0a2540] font-black text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button onClick={exportToExcel} className="bg-[#0a2540] text-white px-8 py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest border-2 border-[#00d66f]">
            <Download size={20} /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length > 0 ? filteredUsers.map((u) => {
          // PONTO 3: Cálculo de Equipamentos
          const deviceCount = u.devices ? u.devices.length : 0;
          const hasNotifs = deviceCount > 0;

          return (
            <div key={u.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group">
                
                {/* BADGE DE EQUIPAMENTOS (PONTO 3) */}
                <div className="absolute top-4 right-4 flex gap-2">
                   {hasNotifs ? (
                     <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1">
                        <BellRing size={12} /> {deviceCount} {deviceCount === 1 ? 'APARELHO' : 'APARELHOS'}
                     </div>
                   ) : (
                     <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1">
                        <BellOff size={12} /> INATIVO
                     </div>
                   )}
                </div>

                <div className="flex items-center gap-4 mb-6 mt-2">
                  <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540]">
                      <Users size={24} />
                  </div>
                  <div className="overflow-hidden">
                      <h3 className="font-black text-lg uppercase italic tracking-tighter text-[#0a2540] leading-none truncate">{u.name}</h3>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{u.email}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-500">
                      <Locate size={14} className="text-[#00d66f]" />
                      <span className="text-[10px] font-bold uppercase">{u.zipCode || 'Sem C.Postal'}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-3 text-slate-500">
                        <Phone size={14} className="text-[#00d66f]" />
                        <span className="text-[10px] font-bold truncate">{u.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {u.status === 'active' ? (
                      <button onClick={() => updateStatus(u.id, 'disabled')} className="w-full bg-slate-50 hover:bg-amber-50 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px]">Suspender</button>
                  ) : (
                      <button onClick={() => updateStatus(u.id, 'active')} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px]">Reativar</button>
                  )}
                  
                  {/* BOTÃO ELIMINAR (PONTO 2) */}
                  <button 
                    onClick={() => handleDeleteUser(u.id, u.name)} 
                    disabled={isDeletingId === u.id}
                    className="w-full bg-red-50 text-red-500 p-4 rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    {isDeletingId === u.id ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Eliminar Vizinho
                  </button>
                </div>
            </div>
          )
        }) : (
        <div className="col-span-full text-center p-12 bg-white rounded-[40px] border-4 border-dashed border-slate-200">
            <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Nenhum vizinho encontrado.</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;