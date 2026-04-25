// src/features/user/components/ProductMarketplace.tsx

import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, ChevronDown, Loader2, Package, X } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import ShoppingListModal from './ShoppingListModal';

const ProductMarketplace: React.FC = () => {
  const { products, fetchProducts, hasMoreProducts, isLoading, locations, taxonomy, addToShoppingList } = useStore();
  
  const [filters, setFilters] = useState({
    distrito: '', concelho: '', freguesia: '',
    category: '', family: '', productType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchProducts(filters);
  }, []);

  const loadMore = () => {
    if (!isLoading && hasMoreProducts) {
      fetchProducts(filters, true);
    }
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const distritos = Object.keys(locations).sort();
  const concelhos = filters.distrito ? Object.keys(locations[filters.distrito] || {}).sort() : [];
  const freguesias = filters.distrito && filters.concelho ? (locations[filters.distrito][filters.concelho] || []).sort() : [];

  const categories = taxonomy ? Object.keys(taxonomy.categories).sort() : [];
  const families = (taxonomy && filters.category) ? Object.keys(taxonomy.categories[filters.category].families).sort() : [];
  const types = (taxonomy && filters.category && filters.family) ? taxonomy.categories[filters.category].families[filters.family].sort() : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-4 rounded-[30px] border-4 border-[#0a2540] shadow-lg sticky top-24 z-40">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              placeholder="O que procuras hoje?..." 
              className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl transition-all ${showFilters ? 'bg-[#00d66f] text-[#0a2540]' : 'bg-[#0a2540] text-white'}`}
          >
            <Filter size={20} />
          </button>
          <button onClick={() => setShowCart(true)} className="bg-amber-500 text-white p-4 rounded-2xl">
            <ShoppingCart size={20} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-4 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-400 ml-2">Localização</p>
                <select value={filters.distrito} onChange={e=>setFilters({...filters, distrito: e.target.value, concelho:'', freguesia:''})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px]">
                  <option value="">Distrito</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select disabled={!filters.distrito} value={filters.concelho} onChange={e=>setFilters({...filters, concelho: e.target.value, freguesia:''})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px] disabled:opacity-50">
                  <option value="">Concelho</option>
                  {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select disabled={!filters.concelho} value={filters.freguesia} onChange={e=>setFilters({...filters, freguesia: e.target.value})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px] disabled:opacity-50">
                  <option value="">Freguesia</option>
                  {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-400 ml-2">Categoria</p>
                <select value={filters.category} onChange={e=>setFilters({...filters, category: e.target.value, family:'', productType:''})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px]">
                  <option value="">Categoria</option>
                  {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <select disabled={!filters.category} value={filters.family} onChange={e=>setFilters({...filters, family: e.target.value, productType:''})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px] disabled:opacity-50">
                  <option value="">Família</option>
                  {families.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select disabled={!filters.family} value={filters.productType} onChange={e=>setFilters({...filters, productType: e.target.value})} className="w-full p-3 rounded-xl border-2 border-white font-bold text-[10px] disabled:opacity-50">
                  <option value="">Tipo</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => fetchProducts(filters)} className="w-full bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Aplicar Filtros</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p: Product) => (
          <div key={p.id} className="bg-white rounded-[30px] border-2 border-slate-100 overflow-hidden flex flex-col shadow-sm group hover:border-[#00d66f] transition-all">
             <div className="aspect-square relative overflow-hidden bg-slate-50">
                <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                {p.hasPromo && <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full font-black text-[7px] uppercase shadow-lg border border-white">Oferta</div>}
             </div>
             <div className="p-4 flex flex-col flex-1">
                <p className="text-[7px] font-black uppercase text-slate-400 mb-1 truncate">{p.shopName} • {p.freguesia}</p>
                <h4 className="font-black text-[#0a2540] uppercase text-[11px] leading-tight mb-3 line-clamp-2 h-8">{p.description}</h4>
                <div className="mt-auto flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className={`font-black text-sm italic ${p.hasPromo ? 'text-red-500' : 'text-[#0a2540]'}`}>
                        {formatPrice(p.hasPromo ? p.promoPrice! : p.price)}
                      </span>
                   </div>
                   <button onClick={() => addToShoppingList(p)} className="bg-[#00d66f] text-[#0a2540] p-2.5 rounded-xl hover:bg-[#0a2540] hover:text-[#00d66f] transition-all shadow-sm">
                     <ShoppingCart size={16} strokeWidth={3}/>
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {hasMoreProducts && (
        <button onClick={loadMore} disabled={isLoading} className="w-full p-6 bg-white border-4 border-dashed border-slate-200 rounded-[35px] text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-[#00d66f] transition-all flex justify-center items-center gap-3">
          {isLoading ? <Loader2 className="animate-spin" /> : <ChevronDown />} Carregar mais produtos
        </button>
      )}

      {showCart && <ShoppingListModal onClose={() => setShowCart(false)} />}
    </div>
  );
};

export default ProductMarketplace;