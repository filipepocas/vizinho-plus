import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User as UserProfile } from '../../types/index';
import { Search, Users, Mail, Locate, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allClients, setAllClients] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // RESOLUÇÃO PROBLEMA 3: Carrega a lista automaticamente ao abrir a página
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'client'), limit(300));
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        setAllClients(results);
      } catch (error) {
        toast.error("Erro ao carregar vizinhos.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Pesquisa local inteligente e instantânea
  const filteredUsers = allClients.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
        (u.name?.toLowerCase() || '').includes(q) ||
        (u.nif?.toLowerCase() || '').includes(q) ||
        (u.zipCode?.toLowerCase() || '').includes(q) ||
        (u.email?.toLowerCase() || '').includes(q)
    );
  });

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'users', id), { status });
    setAllClients(prev => prev.map(u => u.id === id ? { ...u, status: status as any } : u));
    toast.success("ESTADO ATUALIZADO.");
  };

  return (
    <div className="space-y-8">
      {/* BARRA DE PESQUISA INTELIGENTE */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="PESQUISAR POR NOME, NIF OU CÓDIGO POSTAL..." 
          className="w-full p-6 pl-14 bg-white border-4 border-[#0a2540] rounded-3xl outline-none shadow-[8px_8px_0px_0px_#0a2540] font-black text-xs uppercase transition-all focus:border-[#00d66f]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
         <div className="flex justify-center p-12">
             <RefreshCw className="animate-spin text-[#0a2540]" size={32} />
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length > 0 ? filteredUsers.map((u) => (
            <div key={u.id} className="bg-white border-2 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] flex flex-col relative group hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] transition-colors">
                  <Users size={24} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-black text-lg uppercase italic tracking-tighter text-[#0a2540] leading-none truncate">{u.name}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{u.nif}</span>
                </div>
              </div>

              <div className="space-y-2 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail size={14} className="text-[#00d66f]" />
                  <span className="text-[10px] font-bold truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Locate size={14} className="text-[#00d66f]" />
                  <span className="text-[10px] font-bold uppercase">{u.zipCode || 'Sem C.Postal'}</span>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2">
                {u.status === 'active' ? (
                  <button onClick={() => updateStatus(u.id, 'disabled')} className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px] transition-colors">Suspender Conta</button>
                ) : (
                  <button onClick={() => updateStatus(u.id, 'active')} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] shadow-md border-b-4 border-[#0a2540]/20 hover:bg-[#00c265]">Ativar Conta</button>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center p-12 bg-white rounded-[40px] border-4 border-dashed border-slate-200">
                <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Nenhum vizinho encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;