import React, { useState, useEffect } from 'react';
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
  ShoppingBag
} from 'lucide-react';

interface Merchant {
  id: string;
  name: string;
  category: string;
  postalCode: string;
  freguesia: string;
  cashbackPercent: number;
  address?: string;
}

const MerchantExplore: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchZip, setSearchZip] = useState('');
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

  const categories = ['all', ...Array.from(new Set(merchants.map(m => m.category).filter(Boolean)))];

  const filteredMerchants = merchants.filter(m => {
    const matchZip = (m.postalCode || '').includes(searchZip);
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchZip && matchCat;
  });

  const clearFilters = () => {
    setSearchZip('');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      
      {/* HEADER BRUTALISTA */}
      <header className="bg-[#0a2540] px-6 py-10 text-white rounded-b-[48px] shadow-2xl mb-10 border-b-4 border-[#00d66f] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <ShoppingBag size={120} className="rotate-12" />
        </div>
        
        <div className="max-w-5xl mx-auto flex items-center gap-6 relative z-10">
          <button 
            onClick={onBack} 
            className="bg-white text-[#0a2540] p-3 rounded-2xl shadow-[4px_4px_0px_#00d66f] active:scale-90 transition-all"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Explorar Lojas</h1>
            <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Os teus vizinhos aderentes</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6">
        
        {/* ZONA DE FILTROS IMPOSTA */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 mb-12 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={3} />
            <input 
              type="text" 
              placeholder="CÓDIGO POSTAL (EX: 4400)..." 
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] focus:bg-white transition-all placeholder:text-slate-300"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={3} />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-xs font-black uppercase outline-none focus:border-[#00d66f] appearance-none cursor-pointer"
              >
                <option value="all">TODAS AS CATEGORIAS</option>
                {categories.map(cat => cat !== 'all' && (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {(searchZip || selectedCategory !== 'all') && (
              <button 
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 p-4 rounded-2xl transition-colors"
              >
                <XCircle size={16} /> Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* LISTAGEM DE LOJAS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#0a2540] border-t-[#00d66f] rounded-full animate-spin"></div>
            <p className="font-black text-[#0a2540] uppercase text-[10px] tracking-[0.3em]">A localizar vizinhos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMerchants.length === 0 ? (
              <div className="bg-white p-16 rounded-[48px] border-4 border-dashed border-slate-100 text-center">
                <p className="text-slate-300 font-black text-xs uppercase italic tracking-widest">Ainda não temos vizinhos nesta zona.</p>
              </div>
            ) : (
              filteredMerchants.map(m => (
                <div key={m.id} className="bg-white p-8 rounded-[48px] shadow-lg border-2 border-slate-50 group hover:border-[#00d66f] hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#0a2540] p-4 rounded-2xl shadow-[4px_4px_0px_#00d66f] text-[#00d66f] group-hover:rotate-[-6deg] transition-transform">
                      <Store size={28} strokeWidth={3} />
                    </div>
                    <div className="bg-[#00d66f] px-5 py-3 rounded-2xl shadow-lg shadow-[#00d66f]/20 transform group-hover:scale-110 transition-transform">
                      <p className="text-[9px] font-black text-[#0a2540] uppercase leading-none mb-1 text-center">Cashback</p>
                      <p className="text-2xl font-black text-[#0a2540] leading-none tracking-tighter italic">{m.cashbackPercent || 0}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="font-black text-[#0a2540] text-xl uppercase tracking-tighter leading-tight">{m.name}</h3>
                    <span className="inline-block bg-[#00d66f]/10 text-[#00d66f] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {m.category || 'Comércio Local'}
                    </span>
                  </div>
                  
                  <div className="pt-6 border-t-2 border-slate-50 space-y-3">
                    <div className="flex items-start gap-3 text-slate-400">
                      <MapPin size={14} className="mt-0.5 text-slate-300" />
                      <p className="text-[11px] font-bold uppercase leading-tight">{m.address || 'Morada Sob Consulta'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <Navigation size={14} className="text-[#0a2540]" />
                      <p className="text-[11px] font-black text-[#0a2540] uppercase tracking-[0.1em]">{m.postalCode} {m.freguesia}</p>
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