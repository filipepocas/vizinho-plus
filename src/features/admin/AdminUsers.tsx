import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User as UserProfile, Transaction } from '../../types/index';
import { 
  Search, Users, Mail, Locate, Download, Phone, 
  BellRing, BellOff, Trash2, RefreshCw, AlertCircle, MapPin, Hash, IdCard 
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/useStore';

interface AdminUsersProps {
  users: UserProfile[];
  transactions: Transaction[];
}

const AdminUsers: React.FC<AdminUsersProps> = ({ users, transactions }) => {
  const { deleteUserWithHistory, locations } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNif, setSearchNif] = useState('');
  const [searchCard, setSearchCard] = useState('');
  const [searchDistrito, setSearchDistrito] = useState('');
  const [searchConcelho, setSearchConcelho] = useState('');
  const [searchFreguesia, setSearchFreguesia] = useState('');
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = searchDistrito ? Object.keys(locations[searchDistrito] || {}).sort() : [];
  const freguesias = searchDistrito && searchConcelho ? (locations[searchDistrito][searchConcelho] || []).sort() : [];

  const hasActiveFilter = searchQuery !== '' || searchNif !== '' || searchCard !== '' || searchDistrito !== '' || searchConcelho !== '' || searchFreguesia !== '';

  const filteredUsers = users.filter(u => {
    if (!hasActiveFilter) return false; // Oculta tudo se não houver filtro

    const q = searchQuery.toLowerCase().trim();
    const matchQuery = q === '' || (u.name?.toLowerCase() || '').includes(q) || (u.email?.toLowerCase() || '').includes(q);
    const matchNif = searchNif === '' || u.nif === searchNif;
    const matchCard = searchCard === '' || u.customerNumber === searchCard;
    const matchDistrito = searchDistrito === '' || u.distrito === searchDistrito;
    const matchConcelho = searchConcelho === '' || u.concelho === searchConcelho;
    const matchFreguesia = searchFreguesia === '' || u.freguesia === searchFreguesia;

    return matchQuery && matchNif && matchCard && matchDistrito && matchConcelho && matchFreguesia;
  });

  const updateStatus = async (id: string, status: string) => {
    try { await updateDoc(doc(db, 'users', id), { status }); toast.success("ESTADO ATUALIZADO."); } catch (err) { toast.error("Erro ao atualizar."); }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`ALERTA: Eliminar permanentemente o vizinho "${name}" e todos os seus dados? Esta ação não pode ser revertida.`)) return;
    setIsDeletingId(id);
    try { await deleteUserWithHistory(id, 'client'); toast.success("Cliente eliminado com sucesso."); } catch (e) { toast.error("Erro."); } finally { setIsDeletingId(null); }
  };

  const exportToExcel = () => {
    const dataToExport = filteredUsers.map(u => {
      const userTxs = transactions.filter(t => t.clientId === u.id && t.type === 'earn' && t.status !== 'cancelled');
      const shopStats: Record<string, { name: string, volume: number, visits: number }> = {};
      userTxs.forEach(t => {
        if (!shopStats[t.merchantId]) shopStats[t.merchantId] = { name: t.merchantName, volume: 0, visits: 0 };
        shopStats[t.merchantId].volume += t.amount;
        shopStats[t.merchantId].visits += 1;
      });

      let topVolumeShop = "N/D", maxVolume = 0, topVisitsShop = "N/D", maxVisits = 0;
      Object.values(shopStats).forEach(shop => {
        if (shop.volume > maxVolume) { maxVolume = shop.volume; topVolumeShop = shop.name; }
        if (shop.visits > maxVisits) { maxVisits = shop.visits; topVisitsShop = shop.name; }
      });

      return {
        Nome: u.name || '---', Email: u.email || '---', Telefone: u.phone || '---', NIF: u.nif || '---',
        Cartão: u.customerNumber || '---', Distrito: u.distrito || '', Concelho: u.concelho || '', Freguesia: u.freguesia || '',
        "Equipamentos Ativos": u.devices ? u.devices.length : 0, "Código Postal": u.zipCode || '---',
        "Data Adesão": u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '---', "Loja (Mais Visitas)": topVisitsShop, Estado: u.status === 'active' ? 'Ativo' : 'Suspenso'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vizinhos");
    XLSX.writeFile(wb, `Vizinhos_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-6 md:p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
           <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] flex items-center gap-2"><Users/> Pesquisa de Clientes</h2>
           <button onClick={exportToExcel} disabled={!hasActiveFilter || filteredUsers.length === 0} className="bg-[#0a2540] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center gap-2 disabled:opacity-50">
              <Download size={16} /> Exportar
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="NOME OU EMAIL..." className="w-full p-4 pl-14 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="relative">
             <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
             <input type="text" placeholder="NIF" maxLength={9} value={searchNif} onChange={e=>setSearchNif(e.target.value.replace(/\D/g, ''))} className="w-full p-4 pl-14 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" />
          </div>
          <div className="relative">
             <IdCard className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
             <input type="text" placeholder="Nº CARTÃO" maxLength={9} value={searchCard} onChange={e=>setSearchCard(e.target.value.replace(/\D/g, ''))} className="w-full p-4 pl-14 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xs uppercase" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={searchDistrito} onChange={e=>{setSearchDistrito(e.target.value); setSearchConcelho(''); setSearchFreguesia('');}} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
              <option value="">DISTRITO...</option>
              {distritos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select disabled={!searchDistrito} value={searchConcelho} onChange={e=>{setSearchConcelho(e.target.value); setSearchFreguesia('');}} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f] disabled:opacity-50">
              <option value="">CONCELHO...</option>
              {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select disabled={!searchConcelho} value={searchFreguesia} onChange={e=>setSearchFreguesia(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f] disabled:opacity-50">
              <option value="">FREGUESIA...</option>
              {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
        </div>
      </div>

      {!hasActiveFilter ? (
        <div className="text-center p-20 bg-white border-4 border-dashed border-slate-200 rounded-[40px]">
           <Search size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-sm">Utilize os filtros acima para pesquisar vizinhos.</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center p-20 bg-white border-4 border-dashed border-slate-200 rounded-[40px]">
           <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-sm">Nenhum vizinho encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => {
            const deviceCount = u.devices ? u.devices.length : 0;
            const hasNotifications = deviceCount > 0;

            return (
              <div key={u.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group hover:-translate-y-1 transition-transform">
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    {hasNotifications ? (
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1 border border-green-200">
                          <BellRing size={12} /> {deviceCount} APP
                      </div>
                    ) : (
                      <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1">
                          <BellOff size={12} /> SEM APP
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-6 mt-4">
                    <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors"><Users size={24} /></div>
                    <div className="overflow-hidden">
                        <h3 className="font-black text-lg uppercase italic tracking-tighter text-[#0a2540] leading-none truncate">{u.name}</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">CARTÃO: {u.customerNumber || '---'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 text-slate-500"><Hash size={14} className="text-[#00d66f]" /><span className="text-[10px] font-bold">NIF: {u.nif || '---'}</span></div>
                    <div className="flex items-center gap-3 text-slate-500"><MapPin size={14} className="text-[#00d66f]" /><span className="text-[10px] font-bold truncate">{u.distrito} &gt; {u.concelho} &gt; {u.freguesia}</span></div>
                    <div className="flex items-center gap-3 text-slate-500"><Mail size={14} className="text-[#00d66f]" /><span className="text-[10px] font-bold truncate">{u.email}</span></div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {u.status === 'active' ? (
                          <button onClick={() => updateStatus(u.id, 'disabled')} className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px] transition-colors">Suspender</button>
                      ) : (
                          <button onClick={() => updateStatus(u.id, 'active')} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] shadow-md border-b-4 border-[#0a2540]/20 hover:bg-[#00c265]">Ativar</button>
                      )}
                      <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={isDeletingId === u.id} className="w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-4 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2">
                        {isDeletingId === u.id ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Eliminar
                      </button>
                    </div>
                  </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;