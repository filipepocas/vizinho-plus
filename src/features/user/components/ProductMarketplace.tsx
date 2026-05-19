// src/features/user/components/ProductMarketplace.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ShoppingCart, ChevronDown, Loader2, Package, X, MapPin, Tag, Store, Clock } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import ShoppingListModal from './ShoppingListModal';
import { isOpenNow } from '../../../utils/timeUtils';

const ProductMarketplace: React.FC = () => {
  const products = useStore(state => state.products);
  const fetchProducts = useStore(state => state.fetchProducts);
  const hasMoreProducts = useStore(state => state.hasMoreProducts);
  const isLoading = useStore(state => state.isLoading);
  const locations = useStore(state => state.locations);
  const taxonomy = useStore(state => state.taxonomy);
  const addToShoppingList = useStore(state => state.addToShoppingList);
  const shoppingList = useStore(state => state.shoppingList);
  const currentUser = useStore(state => state.currentUser);
  const currentUserIdRef = useRef<string | null>(null);
  
  const [filters, setFilters] = useState<{
    distrito: string;
    concelho: string[];
    freguesia: string[];
    category: string;
    family: string;
    productType: string;
    searchQuery: string;
  }>({
    distrito: '',
    concelho: [],
    freguesia: [],
    category: '',
    family: '',
    productType: '',
    searchQuery: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const userId = currentUser?.id || null;
    if (!userId || currentUserIdRef.current === userId) return;
    currentUserIdRef.current = userId;

    const initialFilters = {
      distrito: currentUser?.distrito?.trim() || '',
      concelho: currentUser?.concelho ? [currentUser.concelho.trim()] : [],
      freguesia: currentUser?.freguesia ? [currentUser.freguesia.trim()] : [],
      category: '',
      family: '',
      productType: '',
      searchQuery: ''
    };

    setFilters(initialFilters);

    const storeFetch = useStore.getState().fetchProducts;
    if (initialFilters.distrito) {
      storeFetch(initialFilters);
    } else {
      storeFetch({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const defaultFilters = React.useMemo(() => ({
    distrito: currentUser?.distrito?.trim() || '',
    concelho: currentUser?.concelho ? [currentUser.concelho.trim()] : [],
    freguesia: currentUser?.freguesia ? [currentUser.freguesia.trim()] : [],
    category: '',
    family: '',
    productType: '',
    searchQuery: ''
  }), [currentUser?.distrito, currentUser?.concelho, currentUser?.freguesia]);

  const isDefaultFilters = JSON.stringify(filters) === JSON.stringify(defaultFilters);

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleApplyFilters = () => {
    fetchProducts({
      distrito: filters.distrito.trim(),
      concelho: filters.concelho.map((value) => value.trim()),
      freguesia: filters.freguesia.map((value) => value.trim()),
      category: filters.category.trim(),
      family: filters.family.trim(),
      productType: filters.productType.trim(),
      searchQuery: filters.searchQuery.trim()
    });
    setShowFilters(false);
  };

  const loadMore = () => {
    if (!isLoading && hasMoreProducts) {
      fetchProducts(filters, true);
    }
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const distritos = Object.keys(locations).sort();
  const availableConcelhos = filters.distrito ? Object.keys(locations[filters.distrito] || {}).sort() : [];
  
  const availableFreguesias = (filters.distrito && filters.concelho.length > 0)
    ? filters.concelho.flatMap((c: string) => locations[filters.distrito][c] || []).sort()
    : [];

  const categories = taxonomy ? Object.keys(taxonomy.categories).sort() : [];
  const families = (taxonomy && filters.category) ? Object.keys(taxonomy.categories[filters.category].families).sort() : [];
  const types = (taxonomy && filters.category && filters.family) ? taxonomy.categories[filters.category].families[filters.family].sort() : [];

  const handleAddConcelho = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value.trim();
    if (!val || filters.concelho.includes(val)) return;
    setFilters({ ...filters, concelho: [...filters.concelho, val] });
  };

  const handleRemoveConcelho = (val: string) => {
    const remainingConcelhos = filters.concelho.filter(c => c !== val);
    setFilters({ 
      ...filters, 
      concelho: remainingConcelhos,
      freguesia: []
    });
  };

  const handleAddFreguesia = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value.trim();
    if (!val || filters.freguesia.includes(val)) return;
    setFilters({ ...filters, freguesia: [...filters.freguesia, val] });
  };

  const handleRemoveFreguesia = (val: string) => {
    setFilters({ ...filters, freguesia: filters.freguesia.filter(f => f !== val) });
  };

  // Filtragem local por texto
  const filteredProducts = products.filter((p: Product) => {
    if (!filters.searchQuery) return true;
    const q = filters.searchQuery.toLowerCase().trim();
    return (
      (p.description || '').toLowerCase().includes(q) ||
      (p.shopName || '').toLowerCase().includes(q) ||
      (p.productType || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* BARRA DE PESQUISA E FILTROS BRUTALISTA DO DASHBOARD */}
      <div className="bg-white p-4 sm:p-6 rounded-[25px] sm:rounded-[35px] border-2 sm:border-4 border-[#0a2540] shadow-[4px_4px_0px_#0a2540] sm:shadow-[8px_8px_0px_#0a2540] sticky top-24 z-40">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="O que procuras hoje?..." 
              value={filters.searchQuery}
              onChange={e => setFilters({...filters, searchQuery: e.target.value})}
              className="w-full pl-12 p-3 sm:p-4 bg-slate-50 border-2 sm:border-3 border-[#0a2540] rounded-[20px] font-bold text-xs sm:text-sm outline-none focus:bg-white focus:border-[#00d66f] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-4 rounded-[20px] border-2 sm:border-3 border-[#0a2540] transition-all font-black uppercase text-[10px] tracking-wider ${showFilters ? 'bg-[#00d66f] text-[#0a2540]' : 'bg-[#0a2540] text-white hover:bg-slate-800'}`}
            >
              <Filter size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            <button 
              onClick={() => setShowCart(true)} 
              className="flex-1 sm:flex-none relative flex items-center justify-center bg-amber-500 text-white p-3 sm:p-4 rounded-[20px] border-2 sm:border-3 border-[#0a2540] shadow-sm hover:scale-105 transition-transform"
            >
              <ShoppingCart size={18} />
              {shoppingList.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {shoppingList.length}
                  </span>
              )}
            </button>
          </div>
        </div>

        {/* EXPANSÃO DOS FILTROS */}
        {showFilters && (
          <div className="mt-4 p-4 sm:p-6 bg-slate-50 rounded-[20px] border-2 sm:border-3 border-[#0a2540] space-y-6 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-[#0a2540] ml-2 flex items-center gap-1"><MapPin size={10}/> Localização (Múltipla)</p>
                
                <select 
                    value={filters.distrito} 
                    onChange={e=>setFilters({...filters, distrito: e.target.value, concelho:[], freguesia:[]})} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f]"
                >
                  <option value="">Escolha o Distrito</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                
                <select 
                    disabled={!filters.distrito} 
                    value="" 
                    onChange={handleAddConcelho} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                >
                  <option value="">+ Adicionar Concelho</option>
                  {availableConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="flex flex-wrap gap-1">
                    {filters.concelho.map(c => (
                        <span key={c} className="bg-[#0a2540] text-[#00d66f] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2">
                            {c} <X size={12} className="cursor-pointer text-white hover:text-red-500" onClick={() => handleRemoveConcelho(c)}/>
                        </span>
                    ))}
                </div>

                <select 
                    disabled={filters.concelho.length === 0} 
                    value="" 
                    onChange={handleAddFreguesia} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                >
                  <option value="">+ Adicionar Freguesia</option>
                  {availableFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <div className="flex flex-wrap gap-1">
                    {filters.freguesia.map(f => (
                        <span key={f} className="bg-slate-200 text-[#0a2540] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 border-2 border-[#0a2540]">
                            {f} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveFreguesia(f)}/>
                        </span>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-[#0a2540] ml-2 flex items-center gap-1"><Tag size={10}/> Categoria e Tipo</p>
                
                <select 
                    value={filters.category} 
                    onChange={e=>setFilters({...filters, category: e.target.value, family:'', productType:''})} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f]"
                >
                  <option value="">Todas as Categorias</option>
                  {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>

                <select 
                    disabled={!filters.category} 
                    value={filters.family} 
                    onChange={e=>setFilters({...filters, family: e.target.value, productType:''})} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                >
                  <option value="">Família de Produto...</option>
                  {families.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <select 
                    disabled={!filters.family} 
                    value={filters.productType} 
                    onChange={e=>setFilters({...filters, productType: e.target.value})} 
                    className="w-full p-3 sm:p-4 rounded-[15px] border-2 border-[#0a2540] font-bold text-[10px] sm:text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                >
                  <option value="">Tipo de Artigo...</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mt-4">
              <button 
                  onClick={handleApplyFilters} 
                  className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-[15px] border-2 sm:border-3 border-[#0a2540] font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_#0a2540] hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                  Aplicar Filtros e Pesquisar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={isDefaultFilters}
                className="w-full md:w-auto bg-white text-[#0a2540] p-4 rounded-[15px] border-2 sm:border-3 border-slate-300 font-black uppercase text-[10px] tracking-widest hover:border-[#0a2540] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ESTADO DE CARREGAMENTO */}
      {isLoading && (
        <div className="py-20 text-center">
          <Loader2 size={48} className="mx-auto text-[#00d66f] animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase text-slate-400">A carregar produtos...</p>
        </div>
      )}

      {/* ESTADO VAZIO (sem produtos na coleção) */}
      {!isLoading && products.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
           <Package size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-[10px] font-black uppercase text-slate-400">Nenhum produto disponível de momento.</p>
        </div>
      )}

      {/* ESTADO VAZIO FILTROS */}
      {!isLoading && products.length > 0 && filteredProducts.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-200">
           <Search size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="text-[10px] font-black uppercase text-slate-400">Nenhum produto encontrado para estes filtros.</p>
        </div>
      )}

      {/* GRELHA DE PRODUTOS RESPONSIVA & BRUTALISTA */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p: Product) => (
            <div key={p.id} className="bg-white rounded-[25px] sm:rounded-[35px] border-2 sm:border-4 border-[#0a2540] overflow-hidden flex flex-col shadow-[4px_4px_0px_#0a2540] sm:shadow-[8px_8px_0px_#0a2540] group hover:translate-y-[-2px] transition-all">
               
               {/* IMAGEM SEM PREÇO - Aspect Ratio Dinâmico */}
               <div className="aspect-square relative overflow-hidden bg-slate-50 border-b-2 sm:border-b-4 border-[#0a2540]">
                  <img src={p.imageUrl} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" alt={p.description} />
                  
                  {p.hasPromo && (
                     <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-md border-2 border-[#0a2540]">
                        Promoção
                     </div>
                  )}
                  <div className="absolute top-3 left-3 bg-[#0a2540] text-[#00d66f] px-3 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-md border-2 border-[#0a2540]">
                     {p.productType}
                  </div>
               </div>
               
               {/* DESCRIÇÃO E LOJA BEM DEFINIDAS */}
               <div className="p-5 sm:p-6 flex flex-col flex-1 gap-4">
                  <h4 className="font-black text-[#0a2540] uppercase text-sm sm:text-base leading-tight line-clamp-2">
                     {p.description}
                  </h4>
                  
                  {/* SEPARAÇÃO EXPLÍCITA DA LOJA E LOCAL */}
                  <div className="border-t-2 border-dashed border-slate-200 pt-3">
                     <div className="flex items-start gap-2 mb-1">
                        <Store size={14} className="text-[#0a2540] shrink-0 mt-0.5"/>
                        <span className="font-bold text-[#0a2540] text-xs uppercase">{p.shopName}</span>
                     </div>
                     <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/>
                        <span className="font-bold text-slate-500 text-[10px] uppercase">{p.freguesia || p.concelho}</span>
                     </div>
                  </div>
                  
                  {/* BASE COM PREÇO E BOTÃO - Fundo Sólido */}
                  <div className="mt-auto border-t-2 border-[#0a2540] pt-4 flex flex-col gap-3">
                     <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Preço Atual</span>
                          <span className={`font-black text-2xl sm:text-3xl italic tracking-tighter ${p.hasPromo ? 'text-red-500' : 'text-[#0a2540]'}`}>
                            {formatPrice(p.hasPromo ? p.promoPrice! : p.price)}
                          </span>
                       </div>
                       {p.hasPromo && (
                          <div className="flex flex-col text-right">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Antes</span>
                            <span className="text-xs text-slate-400 line-through font-bold">
                              {formatPrice(p.price)}
                            </span>
                          </div>
                       )}
                     </div>
                     
                     <button 
                       onClick={() => addToShoppingList(p)} 
                       className="w-full bg-[#00d66f] text-[#0a2540] p-3 sm:p-4 rounded-[15px] border-2 sm:border-3 border-[#0a2540] hover:bg-[#0a2540] hover:text-[#00d66f] transition-all shadow-[2px_2px_0px_#0a2540] active:translate-y-1 active:shadow-none flex justify-center items-center gap-2 mt-2"
                     >
                       <ShoppingCart size={18} strokeWidth={3}/>
                       <span className="font-black uppercase text-[10px] tracking-widest">Adicionar ao Carrinho</span>
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* CARREGAR MAIS RESPONSIVO */}
      {hasMoreProducts && filteredProducts.length > 0 && (
        <button 
          onClick={loadMore} 
          disabled={isLoading}
          className="w-full p-6 bg-white border-4 border-dashed border-slate-200 rounded-[25px] sm:rounded-[35px] text-[#0a2540] font-black uppercase text-[10px] tracking-widest hover:border-[#00d66f] transition-all flex justify-center items-center gap-3"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <ChevronDown />} Carregar mais produtos
        </button>
      )}

      {showCart && <ShoppingListModal onClose={() => setShowCart(false)} />}
    </div>
  );
};

export default ProductMarketplace;