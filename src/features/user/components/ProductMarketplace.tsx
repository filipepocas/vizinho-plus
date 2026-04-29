// src/features/user/components/ProductMarketplace.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  ChevronDown, 
  Loader2, 
  Package, 
  X, 
  MapPin, 
  Tag, 
  CheckCircle2,
  Store
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import ShoppingListModal from './ShoppingListModal';

const ProductMarketplace: React.FC = () => {
  const { 
    products, 
    fetchProducts, 
    isFetchingProducts, 
    locations, 
    taxonomy, 
    fetchTaxonomy,
    addToShoppingList, 
    shoppingList, 
    currentUser 
  } = useStore();
  
  // ESTADO DE FILTROS GEOGRÁFICOS E TAXONOMIA
  const [filters, setFilters] = useState<{
    distrito: string;
    concelho: string[];
    freguesia: string[];
    category: string[];
    family: string[];
    productType: string[];
  }>({
    distrito: '',
    concelho: [],
    freguesia: [],
    category: [],
    family: [],
    productType: []
  });
  
  const [searchTerm, setSearchTerm] = useState(''); // NOVO: Pesquisa por texto real
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  /**
   * 1. CARREGAMENTO INICIAL
   * Sincroniza a taxonomia e define o Concelho do utilizador como ponto de partida.
   */
  useEffect(() => {
    if (!taxonomy) fetchTaxonomy();
    
    if (currentUser && isFirstLoad) {
      const initialFilters = {
        distrito: currentUser.distrito || '',
        concelho: currentUser.concelho ? [currentUser.concelho] : [],
        freguesia: [], 
        category: [],
        family: [],
        productType: []
      };
      setFilters(initialFilters);
      fetchProducts(initialFilters);
      setIsFirstLoad(false);
    }
  }, [currentUser, taxonomy, fetchTaxonomy, fetchProducts, isFirstLoad]);

  /**
   * 2. FILTRAGEM POR TEXTO (EM MEMÓRIA)
   * Filtra os produtos carregados com base no que o utilizador escreve.
   */
  const filteredBySearch = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => 
      p.description.toLowerCase().includes(term) || 
      p.shopName.toLowerCase().includes(term) ||
      p.productType.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const displayedProducts = useMemo(() => 
    filteredBySearch.slice(0, visibleCount), 
    [filteredBySearch, visibleCount]
  );

  const handleApplyFilters = () => {
    setVisibleCount(20);
    fetchProducts(filters);
    setShowFilters(false);
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  // LÓGICA DE CASCATA (Geografia)
  const distritos = Object.keys(locations || {}).sort();
  const availableConcelhos = filters.distrito ? Object.keys(locations[filters.distrito] || {}).sort() : [];
  const availableFreguesias = (filters.distrito && filters.concelho.length > 0)
    ? filters.concelho.flatMap((c: string) => locations[filters.distrito][c] || []).sort()
    : [];

  // LÓGICA DE CASCATA (Taxonomia)
  const availableCategories = taxonomy ? Object.keys(taxonomy.categories).sort() : [];
  const availableFamilies = (taxonomy && filters.category.length > 0) 
    ? filters.category.flatMap(c => Object.keys(taxonomy.categories[c]?.families || {})).sort() 
    : [];
  const availableTypes = (taxonomy && filters.category.length > 0 && filters.family.length > 0) 
    ? filters.family.flatMap(f => {
        for (let c of filters.category) {
          if (taxonomy.categories[c]?.families[f]) return taxonomy.categories[c].families[f];
        }
        return [];
      }).sort() 
    : [];

  const handleAddArrayFilter = (e: React.ChangeEvent<HTMLSelectElement>, field: keyof typeof filters) => {
    const val = e.target.value;
    if (!val || (filters[field] as string[]).includes(val)) return;
    
    setFilters(prev => {
      const newState = { ...prev, [field]: [...(prev[field] as string[]), val] };
      if (field === 'concelho') newState.freguesia = [];
      if (field === 'category') { newState.family = []; newState.productType = []; }
      if (field === 'family') newState.productType = [];
      return newState;
    });
    e.target.value = ""; 
  };

  const handleRemoveArrayFilter = (val: string, field: keyof typeof filters) => {
    setFilters(prev => {
      const newState = { ...prev, [field]: (prev[field] as string[]).filter(item => item !== val) };
      if (field === 'concelho') newState.freguesia = [];
      if (field === 'category') { newState.family = []; newState.productType = []; }
      if (field === 'family') newState.productType = [];
      return newState;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* BARRA DE PESQUISA FIXA */}
      <div className="bg-white p-4 rounded-[30px] border-4 border-[#0a2540] shadow-lg sticky top-24 z-40">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="O que procuras hoje?..." 
              className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                <X size={16} />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${showFilters ? 'bg-[#00d66f] text-[#0a2540]' : 'bg-[#0a2540] text-white'}`}
          >
            <Filter size={20} />
            <span className="hidden md:inline font-black uppercase text-[10px]">Filtros</span>
          </button>
          <button onClick={() => setShowCart(true)} className="relative bg-amber-500 text-white p-4 rounded-2xl shadow-md hover:scale-105 transition-transform">
            <ShoppingCart size={20} />
            {shoppingList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {shoppingList.length}
                </span>
            )}
          </button>
        </div>

        {/* PAINEL DE FILTROS */}
        {showFilters && (
          <div className="mt-4 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-6 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-[#0a2540] flex items-center gap-2">
                    <MapPin size={14} className="text-[#00d66f]"/> Localização
                </p>
                
                <select 
                    value={filters.distrito} 
                    onChange={e=>setFilters({...filters, distrito: e.target.value, concelho:[], freguesia:[]})} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] shadow-sm"
                >
                  <option value="">Escolha o Distrito</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                
                <select 
                    disabled={!filters.distrito} 
                    value="" 
                    onChange={e => handleAddArrayFilter(e, 'concelho')} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50 shadow-sm"
                >
                  <option value="">+ Adicionar Concelho</option>
                  {availableConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="flex flex-wrap gap-2">
                    {filters.concelho.map(c => (
                        <span key={c} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-blue-200">
                            {c} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveArrayFilter(c, 'concelho')}/>
                        </span>
                    ))}
                </div>

                <select 
                    disabled={filters.concelho.length === 0} 
                    value="" 
                    onChange={e => handleAddArrayFilter(e, 'freguesia')} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50 shadow-sm"
                >
                  <option value="">+ Adicionar Freguesia</option>
                  {availableFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <div className="flex flex-wrap gap-2">
                    {filters.freguesia.map(f => (
                        <span key={f} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-green-200">
                            {f} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveArrayFilter(f, 'freguesia')}/>
                        </span>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-[#0a2540] flex items-center gap-2">
                    <Tag size={14} className="text-[#00d66f]"/> Categorias
                </p>
                
                <select 
                    value="" 
                    onChange={e => handleAddArrayFilter(e, 'category')} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] shadow-sm"
                >
                  <option value="">+ Adicionar Categoria</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                    {filters.category.map(c => (
                        <span key={c} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-purple-200">
                            {c} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveArrayFilter(c, 'category')}/>
                        </span>
                    ))}
                </div>

                <select 
                    disabled={filters.category.length === 0} 
                    value="" 
                    onChange={e => handleAddArrayFilter(e, 'family')} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50 shadow-sm"
                >
                  <option value="">+ Adicionar Família</option>
                  {availableFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                    {filters.family.map(f => (
                        <span key={f} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-indigo-200">
                            {f} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveArrayFilter(f, 'family')}/>
                        </span>
                    ))}
                </div>

                <select 
                    disabled={filters.family.length === 0} 
                    value="" 
                    onChange={e => handleAddArrayFilter(e, 'productType')} 
                    className="w-full p-3 rounded-xl border-2 border-white font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50 shadow-sm"
                >
                  <option value="">+ Adicionar Tipo</option>
                  {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                    {filters.productType.map(t => (
                        <span key={t} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border border-amber-200">
                            {t} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveArrayFilter(t, 'productType')}/>
                        </span>
                    ))}
                </div>
              </div>
            </div>

            <button 
                onClick={handleApplyFilters} 
                className="w-full bg-[#0a2540] text-[#00d66f] p-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-black transition-all border-b-4 border-black/40"
            >
                Aplicar Filtros e Atualizar Lista
            </button>
          </div>
        )}
      </div>

      {/* ESTADO DE CARREGAMENTO LOCAL */}
      {isFetchingProducts ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
            <Loader2 size={48} className="animate-spin text-[#00d66f]" />
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">A procurar as melhores ofertas...</p>
        </div>
      ) : (
        <>
          {/* GRELHA DE PRODUTOS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedProducts.map((p: Product) => {
              const isInCart = shoppingList.some(item => item.id === p.id);
              return (
                <div key={p.id} className="bg-white rounded-[30px] border-2 border-slate-100 overflow-hidden flex flex-col shadow-sm group hover:border-[#00d66f] transition-all relative">
                   <div className="aspect-square relative overflow-hidden bg-slate-50">
                      <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.description} />
                      {p.hasPromo && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full font-black text-[7px] uppercase shadow-lg border border-white z-10">
                            Oferta
                        </div>
                      )}
                      {isInCart && (
                        <div className="absolute inset-0 bg-[#00d66f]/20 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <div className="bg-white p-2 rounded-full shadow-lg border-2 border-[#0a2540]">
                                <CheckCircle2 size={24} className="text-[#00d66f]" />
                            </div>
                        </div>
                      )}
                   </div>
                   <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <Store size={10} className="text-[#00d66f]" />
                        <p className="text-[7px] font-black uppercase text-slate-400 truncate">{p.shopName} • {p.freguesia}</p>
                      </div>
                      <h4 className="font-black text-[#0a2540] uppercase text-[11px] leading-tight mb-3 line-clamp-2 h-8">{p.description}</h4>
                      
                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className={`font-black text-sm italic ${p.hasPromo ? 'text-red-500' : 'text-[#0a2540]'}`}>
                              {formatPrice(p.hasPromo ? p.promoPrice! : p.price)}
                            </span>
                            {p.hasPromo && <span className="text-[8px] text-slate-300 line-through">{formatPrice(p.price)}</span>}
                         </div>
                         <button 
                            onClick={() => addToShoppingList(p)} 
                            disabled={isInCart}
                            className={`p-2.5 rounded-xl transition-all shadow-sm ${isInCart ? 'bg-slate-100 text-slate-300' : 'bg-[#00d66f] text-[#0a2540] hover:bg-[#0a2540] hover:text-[#00d66f]'}`}
                         >
                           <ShoppingCart size={16} strokeWidth={3}/>
                         </button>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>

          {/* PAGINAÇÃO */}
          {filteredBySearch.length > visibleCount && (
            <button 
                onClick={() => setVisibleCount(prev => prev + 20)} 
                className="w-full p-6 bg-white border-4 border-dashed border-slate-200 rounded-[35px] text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-[#00d66f] hover:text-[#00d66f] transition-all flex justify-center items-center gap-3"
            >
              <ChevronDown /> Carregar mais produtos
            </button>
          )}

          {/* ESTADO VAZIO */}
          {filteredBySearch.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
               <Package size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Sem produtos encontrados</p>
               <p className="text-[9px] font-bold text-slate-300 uppercase">Tente alargar a pesquisa ou mudar os filtros.</p>
               <button 
                onClick={() => { setShowFilters(true); setSearchTerm(''); }}
                className="mt-6 text-[10px] font-black uppercase text-[#0a2540] underline"
               >
                 Limpar Pesquisa e Abrir Filtros
               </button>
            </div>
          )}
        </>
      )}

      {/* MODAL DA LISTA DE COMPRAS */}
      {showCart && <ShoppingListModal onClose={() => setShowCart(false)} />}
    </div>
  );
};

export default ProductMarketplace;