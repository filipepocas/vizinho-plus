// src/features/admin/AdminUsers.tsx

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User as UserProfile, Transaction } from '../../types/index';
import { 
  Search, Users, Mail, Download, Phone, 
  BellRing, Trash2, RefreshCw, Hash, IdCard, MapPin, AlertCircle, X, Filter, CheckSquare, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/useStore';

interface AdminUsersProps {
  users: UserProfile[];
  transactions: Transaction[];
}

const AdminUsers: React.FC<AdminUsersProps> = ({ users, transactions }) => {
  const { deleteUserWithHistory, locations, checkCardNumberExists } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNif, setSearchNif] = useState('');
  const [searchCard, setSearchCard] = useState('');
  
  const [selectedDistritos, setSelectedDistritos] = useState<string[]>([]);
  const [selectedConcelhos, setSelectedConcelhos] = useState<string[]>([]);
  const [selectedFreguesias, setSelectedFreguesias] = useState<string[]>([]);
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isGeneratingCardId, setIsGeneratingCardId] = useState<string | null>(null);

  const distritos = Object.keys(locations || {}).sort();

  const handleAddFilter = (val: string, type: 'distrito' | 'concelho' | 'freguesia') => {
    if (!val) return;
    if (type === 'distrito' && !selectedDistritos.includes(val)) setSelectedDistritos([...selectedDistritos, val]);
    if (type === 'concelho' && !selectedConcelhos.includes(val)) setSelectedConcelhos([...selectedConcelhos, val]);
    if (type === 'freguesia' && !selectedFreguesias.includes(val)) setSelectedFreguesias([...selectedFreguesias, val]);
  };

  const filteredUsers = users.filter((u: any) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = q === '' || (u.name?.toLowerCase() || '').includes(q) || (u.email?.toLowerCase() || '').includes(q);
    const matchNif = searchNif === '' || u.nif === searchNif;
    const matchCard = searchCard === '' || u.customerNumber === searchCard;
    
    const matchDistrito = selectedDistritos.length === 0 || selectedDistritos.includes(u.distrito || '');
    const matchConcelho = selectedConcelhos.length === 0 || selectedConcelhos.includes(u.concelho || '');
    const matchFreguesia = selectedFreguesias.length === 0 || selectedFreguesias.includes(u.freguesia || '');

    return matchQuery && matchNif && matchCard && matchDistrito && matchConcelho && matchFreguesia;
  });

  const updateStatus = async (id: string, status: string) => {
    try { 
      await updateDoc(doc(db, 'users', id), { status }); 
      toast.success("ESTADO ATUALIZADO."); 
    } catch (err) { 
      toast.error("Erro ao atualizar."); 
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`ALERTA: Eliminar permanentemente o vizinho "${name}"?`)) return;
    setIsDeletingId(id);
    try { 
      await deleteUserWithHistory(id, 'client'); 
      toast.success("Cliente eliminado."); 
    } catch (e) { 
      toast.error("Erro."); 
    } finally { 
      setIsDeletingId(null); 
    }
  };

  const generateUniqueCardNumber = async (): Promise<string> => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const randomNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
      const exists = await checkCardNumberExists(randomNumber);
      if (!exists) return randomNumber;
    }
    throw new Error("Não foi possível gerar um número único. Tente novamente.");
  };

  const handleGenerateNewCard = async (userId: string, currentName: string) => {
    if (!window.confirm(`Gerar um NOVO cartão para "${currentName}"? O cartão antigo será invalidado imediatamente.`)) return;
    
    setIsGeneratingCardId(userId);
    try {
      const newNumber = await generateUniqueCardNumber();
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { customerNumber: newNumber });
      toast.success(`Novo cartão gerado: ${newNumber}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar novo cartão.");
    } finally {
      setIsGeneratingCardId(null);
    }
  };

  const exportToExcel = (data: UserProfile[], filename: string) => {
    const dataToExport = data.map((u: any) => ({
      "Nome": u.name || '---',
      "Email": u.email || '---',
      "Telefone": u.phone || '---',
      "NIF": u.nif || '---',
      "Nº Cartão": u.customerNumber || '---',
      "Data Nascimento": u.birthDate || '---',
      "Distrito": u.distrito || '---',
      "Concelho": u.concelho || '---',
      "Freguesia": u.freguesia || '---',
      "Código Postal": u.zipCode || '---',
      "Estado": u.status === 'active' ? 'Ativo' : 'Suspenso',
      "Data de Registo": u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleString() : '---',
      "Saldo Disponível (Total)": u.wallet?.available || 0,
      "Dispositivos App": u.devices?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vizinhos");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
           <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] flex items-center gap-2"><Users/> Pesquisa de Clientes</h2>
           <div className="flex gap-2">
              <button onClick={() => exportToExcel(users, 'Todos_Os_Vizinhos_VizinhoPlus')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-slate-200 transition-all flex items-center gap-2">
                <Download size={14} /> Exportar Tudo
              </button>
              <button 
                disabled={filteredUsers.length === 0}
                onClick={() => exportToExcel(filteredUsers, 'Vizinhos_Filtrados_VizinhoPlus')} 
                className="bg-[#0a2540] text-[#00d66f] px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:scale-105 transition-all flex items-center gap-2 shadow-md"
              >
                <Download size={14} /> Exportar Filtrados ({filteredUsers.length})
              </button>
           </div>
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
            <div className="space-y-2">
              <select onChange={e=>handleAddFilter(e.target.value, 'distrito')} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
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
              <select onChange={e=>handleAddFilter(e.target.value, 'concelho')} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                <option value="">+ FILTRAR CONCELHO...</option>
                {selectedDistritos.length > 0 ? selectedDistritos.flatMap(d => Object.keys(locations[d] || {})).sort().map(c => <option key={c} value={c}>{c}</option>) : <option disabled>Selecione um Distrito</option>}
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
              <select onChange={e=>handleAddFilter(e.target.value, 'freguesia')} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                <option value="">+ FILTRAR FREGUESIA...</option>
                {selectedConcelhos.length > 0 ? selectedConcelhos.flatMap(c => {
                  for (let d of selectedDistritos) { if (locations[d][c]) return locations[d][c]; }
                  return [];
                }).sort().map(f => <option key={f} value={f}>{f}</option>) : <option disabled>Selecione um Concelho</option>}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u: any) => {
          const deviceCount = u.devices ? u.devices.length : 0;
          return (
            <div key={u.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group transition-all">
                <div className="absolute top-4 right-4 flex gap-2">
                  {deviceCount > 0 ? (
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black border border-green-200 flex items-center gap-1">
                        <BellRing size={12} /> {deviceCount} APP
                    </div>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black">SEM APP</div>
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
                    <button onClick={() => updateStatus(u.id, u.status === 'active' ? 'disabled' : 'active')} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] transition-colors ${u.status === 'active' ? 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500' : 'bg-[#00d66f] text-[#0a2540] shadow-md'}`}>
                      {u.status === 'active' ? 'Suspender' : 'Ativar'}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={isDeletingId === u.id} className="w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-3 rounded-xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2">
                      {isDeletingId === u.id ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Eliminar
                    </button>
                  </div>
                  <button 
                    onClick={() => handleGenerateNewCard(u.id, u.name)} 
                    disabled={isGeneratingCardId === u.id}
                    className="w-full bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 p-3 rounded-xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2 border border-amber-200 hover:border-amber-600"
                  >
                    {isGeneratingCardId === u.id ? <RefreshCw className="animate-spin" size={14} /> : <CreditCard size={14} />} 
                    {isGeneratingCardId === u.id ? 'A Gerar...' : 'Gerar Novo Cartão'}
                  </button>
                </div>
            </div>
          )
        })}
        {filteredUsers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-200">
            <Filter size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black uppercase text-slate-300 text-xs">Nenhum vizinho encontrado com estes filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;