// src/features/user/MerchantExplore.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  ArrowLeft, 
  MapPin, 
  Store, 
  Search, 
  Tag, 
  Navigation,
  XCircle,
  ShoppingBag,
  Info,
  ExternalLink
} from 'lucide-react';

interface Merchant {
  id: string;
  name?: string;
  shopName?: string; 
  category?: string;
  zipCode?: string;
  freguesia?: string;
  cashbackPercent?: number;
  address?: string;
  phone?: string;
  status?: string;
}

const MerchantExplore: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchZip, setSearchZip] = useState('');
  const [searchName, setSearchName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        // Busca apenas utilizadores que são lojistas e estão ativos
        const q = query(
          collection(db, 'users'), 
          where('role', '==', 'merchant'),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        const merchantList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Merchant[];
        
        // Filtra para garantir que apenas lojas com nome válido aparecem
        setMerchants(merchantList.filter(m => m.shopName || m.name));
      } catch (error) {
        console.error("Erro ao carregar lojas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  const categories = useMemo(() => {
    const cats = merchants
      .map(m => m.category)
      .filter((cat): cat is string => !!cat && cat.trim() !== '');
    return ['all', ...Array.from(new Set(cats))];
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => {
      const nameToSearch = (m.shopName || m.name || '').toLowerCase();
      const zipToSearch = (m.zipCode || '').toLowerCase();
      const qZip = searchZip.toLowerCase();
      
      // Lógica de CP: Procura correspondência no início (ex: "4700" encontra "4700-123")
      const matchZip = zipToSearch.startsWith(qZip);
      const matchName = nameToSearch.includes(searchName.toLowerCase());
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      
      return matchZip && matchName && matchCat;
    });
  }, [merchants, searchZip, searchName, selectedCategory]);

  const clearFilters = () => {
    setSearchZip('');
    setSearchName('');
    setSelectedCategory('all');
  };

  // CORREÇÃO MOLECULAR: Função de mapas corrigida para o link oficial do Google
  const openInMaps = (address: string, name: string) => {
    if (!address && !name) return;
    // Prioriza o endereço, mas adiciona o nome da loja para maior precisão na busca
    const searchQuery = address ? `${name}, ${address}` : name;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      
      {/* HEADER BRUTALISTA */}
      <header className="bg-[#0f172a] px-6 py-12 text-white rounded-b-[60px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <ShoppingBag size={140} className="rotate-12 text-white" />
        </div>
        
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack} 
              className="bg-[#00d66f] text-[#0f172a] p-4 rounded-2xl shadow-[6px_6px_0px_#ffffff] active:scale-95 active:shadow-none transition-all"
            >
              <ArrowLeft size={28} strokeWidth={4} />
            </button>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Explorar</h1>
              <p className="text-[#00d66f] text-xs font-black uppercase tracking-[0.3em] mt-2">Lojas Vizinhos+</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#00d66f] rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {filteredMerchants.length} Parceiros na zona
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        
        {/* FILTROS */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border-4 border-[#0f172a] mb-12 -mt-20 relative z-20">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nome da Loja</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                <input 
                  type="text" 
                  placeholder="EX: PADARIA MODERNA..." 
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Cód. Postal (4 dígitos)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                  <input 
                    type="text" 
                    maxLength={8}
                    placeholder="EX: 4700..." 
                    value={searchZip}
                    onChange={(e) => setSearchZip(e.target.value)}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-10 py-4 text-xs font-black uppercase outline-none focus:border-[#00d66f] appearance-none cursor-pointer"
                  >
                    <option value="all">TODOS OS SETORES</option>
                    {categories.map(cat => cat !== 'all' && (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {(searchZip || searchName || selectedCategory !== 'all') && (
            <button 
              onClick={clearFilters}
              className="mt-6 w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-500 bg-red-50 py-3 rounded-xl hover:bg-red-100 transition-colors"
            >
              <XCircle size={14} /> Limpar Filtros
            </button>
          )}
        </div>

        {/* LISTA DE LOJAS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="w-16 h-16 border-8 border-slate-200 border-t-[#00d66f] rounded-2xl animate-spin" />
            <p className="font-black text-[#0f172a] uppercase text-xs tracking-[0.4em]">A carregar lojas...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredMerchants.length === 0 ? (
              <div className="bg-white p-20 rounded-[60px] border-4 border-dashed border-slate-200 text-center">
                <Info size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase italic tracking-widest">
                  Nenhuma loja encontrada nesta zona.
                </p>
              </div>
            ) : (
              filteredMerchants.map(m => (
                <div key={m.id} className="bg-white rounded-[50px] shadow-xl border-4 border-slate-100 overflow-hidden group hover:border-[#00d66f] transition-all duration-500">
                  <div className="flex flex-col sm:flex-row">
                    {/* CASHBACK BADGE */}
                    <div className="bg-[#0f172a] p-8 sm:w-48 flex flex-col items-center justify-center gap-2 shrink-0">
                      <div className="bg-[#00d66f] w-full py-4 rounded-3xl shadow-lg transform group-hover:scale-110 transition-transform text-center border-b-4 border-black/20">
                        <p className="text-[10px] font-black text-[#0f172a] uppercase leading-none mb-1">Retorno</p>
                        <p className="text-3xl font-black text-[#0f172a] leading-none italic">{m.cashbackPercent || 0}%</p>
                      </div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2 text-center leading-tight">Cashback<br/>Direto</p>
                    </div>

                    {/* CONTEÚDO */}
                    <div className="p-8 flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                          <span className="inline-block bg-[#00d66f]/10 text-[#00d66f] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                            {m.category || 'Comércio Local'}
                          </span>
                          <h3 className="font-black text-[#0f172a] text-2xl uppercase tracking-tighter leading-none group-hover:text-[#00d66f] transition-colors mb-2">
                            {m.shopName || m.name}
                          </h3>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-slate-300 group-hover:text-[#00d66f] transition-colors">
                          <Store size={24} strokeWidth={3} />
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t-2 border-slate-50 flex flex-col sm:flex-row justify-between items-end gap-4">
                        <div className="flex items-start gap-3 w-full">
                          <MapPin size={18} className="text-[#00d66f] shrink-0" strokeWidth={3} />
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-[#0f172a] uppercase leading-tight">
                              {m.address || 'Consulte a morada na loja'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Navigation size={12} className="text-slate-300" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {m.zipCode} {m.freguesia ? `• ${m.freguesia}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* BOTÃO VER MAPA CORRIGIDO */}
                        <button 
                          onClick={() => openInMaps(m.address || '', m.shopName || m.name || '')}
                          className="bg-[#0f172a] text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase hover:bg-[#00d66f] hover:text-[#0f172a] transition-all shadow-lg active:translate-y-1"
                        >
                          <ExternalLink size={14} /> Ver Mapa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MerchantExplore;