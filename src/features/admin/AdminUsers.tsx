import React, { useState } from 'react';
import { collection, query, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User as UserProfile } from '../../types/index';
import { Search, Users, Wallet, CheckCircle2, XCircle, ShieldAlert, Mail, Hash, Locate, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { deleteUserWithHistory, isLoading: isDeleting } = useStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length < 3) {
      toast.error("DIGITA PELO MENOS 3 CARACTERES");
      return;
    }

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        where('nif', '>=', searchQuery),
        where('nif', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );

      // Tenta pesquisa por NIF, se não der, tenta por Cód. Postal
      let snap = await getDocs(q);
      
      if (snap.empty) {
        const qZip = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            where('zipCode', '==', searchQuery),
            limit(10)
        );
        snap = await getDocs(qZip);
      }

      const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setFoundUsers(results);
      if (results.length === 0) toast.error("NENHUM VIZINHO ENCONTRADO.");
    } catch (error) {
      toast.error("ERRO NA PESQUISA.");
    } finally {
      setIsSearching(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'users', id), { status });
    setFoundUsers(prev => prev.map(u => u.id === id ? { ...u, status: status as any } : u));
    toast.success("ESTADO ATUALIZADO.");
  };

  return (
    <div className="space-y-8">
      {/* BARRA DE PESQUISA NO SERVIDOR */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="PESQUISAR VIZINHO POR NIF OU CÓDIGO POSTAL..." 
            className="w-full p-6 pl-14 bg-white border-2 border-[#0a2540] rounded-3xl outline-none shadow-[4px_4px_0px_0px_#0a2540] font-black text-xs uppercase"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" disabled={isSearching} className="bg-[#0a2540] text-white px-8 rounded-3xl font-black uppercase text-[10px] hover:bg-black transition-all">
          {isSearching ? <RefreshCw className="animate-spin" /> : 'PESQUISAR'}
        </button>
      </form>

      {/* GRELHA DE RESULTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {foundUsers.map((u) => (
          <div key={u.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase italic tracking-tighter text-[#0a2540] leading-none">{u.name}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{u.nif}</span>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              <div className="flex items-center gap-3 text-slate-400">
                <Mail size={14} className="text-[#00d66f]" />
                <span className="text-xs font-bold truncate">{u.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Locate size={14} className="text-[#00d66f]" />
                <span className="text-xs font-bold uppercase">{u.zipCode}</span>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {u.status === 'active' ? (
                <button onClick={() => updateStatus(u.id, 'disabled')} className="w-full bg-slate-100 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px]">Suspender Conta</button>
              ) : (
                <button onClick={() => updateStatus(u.id, 'active')} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] shadow-md">Ativar Conta</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;