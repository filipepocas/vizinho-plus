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
  name: string;
  category: string;
  postalCode: string;
  freguesia: string;
  cashbackPercent: number;
  address?: string;
  phone?: string;
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
        const q = query(collection(db, 'users'), where('role', '==', 'merchant'));
        const querySnapshot = await getDocs(q);
        const merchantList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Merchant[];
        setMerchants(merchantList);
      } catch (error) {
        console.error("Erro ao carregar lojas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  const categories = useMemo(() => {
    const cats = merchants.map(m => m.category).filter(Boolean);
    return ['all', ...Array.from(new Set(cats))];
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => {
      const matchZip = (m.postalCode || '').toLowerCase().includes(searchZip.toLowerCase());
      const matchName = (m.name || '').toLowerCase().includes(searchName.toLowerCase());
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchZip && matchName && matchCat;
    });
  }, [merchants, searchZip, searchName, selectedCategory]);

  const clearFilters = () => {
    setSearchZip('');
    setSearchName('');
    setSelectedCategory('all');
  };

  const openInMaps = (address: string, name: string) => {
    const mapQuery = encodeURIComponent(`${name}, ${address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${mapQuery}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      
      {/* HEADER BRUTALISTA V2 */}
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
              <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Vizinhos+</h1>
              <p className="text-[#00d66f] text-xs font-black uppercase tracking-[0.3em] mt-2">Rede de Comércio Local</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#00d66f] rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {merchants.length} Lojas Aderentes
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        
        {/* FILTROS COM DESIGN DE ALTO IMPACTO */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border-4 border-[#0f172a] mb-12 -mt-20 relative z-20">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">O que procuras?</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                <input 
                  type="text" 
                  placeholder="NOME DA LOJA..." 
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Localização</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                  <input 
                    type="text" 
                    placeholder="CÓD. POSTAL..." 
                    value={searchZip}
                    onChange={(e) => setSearchZip(e.target.value)}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Atividade</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a]" size={20} strokeWidth={3} />
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-xs font-black uppercase outline-none focus:border-[#00d66f] appearance-none cursor-pointer"
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
              <XCircle size={14} /> Limpar Pesquisa
            </button>
          )}
        </div>

        {/* FEED DE LOJAS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="w-16 h-16 border-8 border-slate-200 border-t-[#00d66f] rounded-2xl animate-spin" />
            <p className="font-black text-[#0f172a] uppercase text-xs tracking-[0.4em] animate-pulse">Sincronizando Vizinhos...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredMerchants.length === 0 ? (
              <div className="bg-white p-20 rounded-[60px] border-4 border-dashed border-slate-200 text-center">
                <Info size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase italic tracking-widest">
                  Nenhum parceiro encontrado.
                </p>
              </div>
            ) : (
              filteredMerchants.map(m => (
                <div key={m.id} className="bg-white rounded-[50px] shadow-xl border-4 border-slate-100 overflow-hidden group hover:border-[#00d66f] transition-all duration-500">
                  <div className="flex flex-col sm:flex-row">
                    {/* INFO LATERAL / MOBILE TOP */}
                    <div className="bg-[#0f172a] p-8 sm:w-48 flex flex-col items-center justify-center gap-2 shrink-0">
                      <div className="bg-[#00d66f] w-full py-4 rounded-3xl shadow-lg shadow-[#00d66f]/20 transform group-hover:scale-110 transition-transform text-center border-b-4 border-black/20">
                        <p className="text-[10px] font-black text-[#0f172a] uppercase leading-none mb-1">Retorno</p>
                        <p className="text-3xl font-black text-[#0f172a] leading-none italic">{m.cashbackPercent || 0}%</p>
                      </div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2 text-center leading-tight">Cashback<br/>Garantido</p>
                    </div>

                    {/* CONTEÚDO PRINCIPAL */}
                    <div className="p-8 flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                          <span className="inline-block bg-[#00d66f]/10 text-[#00d66f] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                            {m.category || 'Comércio Local'}
                          </span>
                          <h3 className="font-black text-[#0f172a] text-2xl uppercase tracking-tighter leading-none group-hover:text-[#00d66f] transition-colors mb-2">
                            {m.name}
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
                              {m.address || 'Consulte na Loja'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Navigation size={12} className="text-slate-300" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {m.postalCode} • {m.freguesia}
                              </p>
                            </div>
                          </div>
                        </div>

                        {m.address && (
                          <button 
                            onClick={() => openInMaps(m.address!, m.name)}
                            className="bg-[#0f172a] text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase hover:bg-black transition-all shadow-lg active:translate-y-1"
                          >
                            <ExternalLink size={14} /> Ver Mapa
                          </button>
                        )}
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