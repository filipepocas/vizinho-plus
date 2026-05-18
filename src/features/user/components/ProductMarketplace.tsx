// src/features/user/components/ProductMarketplace.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import { ShoppingBag, Search, MapPin, Grid, Layers, ArrowLeft, SlidersHorizontal, Check } from 'lucide-react';
import BannerCarousel from './BannerCarousel';

interface ProductMarketplaceProps {
  onBack?: () => void;
}

const ProductMarketplace: React.FC<ProductMarketplaceProps> = ({ onBack }) => {
  const { 
    products, 
    isProductsLoading,
    currentUser, 
    locations, 
    taxonomy,
    fetchProducts, 
    addToShoppingList, 
    shoppingList,
    fetchTaxonomy
  } = useStore();

  const isFirstMount = useRef(true);

  const initialFilters = useMemo(() => {
    return {
      distrito: currentUser?.distrito?.trim() || '',
      concelho: currentUser?.concelho ? [currentUser.concelho.trim()] : [],
      freguesia: currentUser?.freguesia ? [currentUser.freguesia.trim()] : [],
      category: '',
      family: '',
      productType: '',
      search: ''
    };
  }, [currentUser]);

  const [filters, setFilters] = useState(initialFilters);
  const [localSearch, setLocalSearch] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [geoMode, setGeoMode] = useState<'all' | 'concelho' | 'freguesia'>('freguesia');

  // Carregar taxonomia no mount
  useEffect(() => {
    fetchTaxonomy();
  }, [fetchTaxonomy]);

  // Efeito principal de carregamento de produtos controlado para evitar loops infinitos
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchProducts(initialFilters);
      return;
    }

    const timer = setTimeout(() => {
      fetchProducts(filters);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters, fetchProducts, initialFilters]);

  // Listas auxiliares baseadas na hierarquia de localizações (Correção do Erro 7015 de Index Signature)
  const distritosDisponiveis = useMemo(() => Object.keys(locations || {}), [locations]);
  
  const concelhosDisponiveis = useMemo(() => {
    if (!filters.distrito || !locations) return [];
    const locData = (locations as any)[filters.distrito];
    if (!locData || !locData.concelhos) return [];
    return Object.keys(locData.concelhos);
  }, [filters.distrito, locations]);

  const freguesiasDisponiveis = useMemo(() => {
    if (!filters.distrito || !filters.concelho || filters.concelho.length !== 1 || !locations) return [];
    const targetConcelho = filters.concelho[0];
    const locData = (locations as any)[filters.distrito];
    const concelhoData = locData?.concelhos?.[targetConcelho];
    return concelhoData ? concelhoData.freguesias : [];
  }, [filters.distrito, filters.concelho, locations]);

  // Listas auxiliares da taxonomia de produtos (Correção dos Erros 18047 de 'taxonomy' possivelmente 'null')
  const categoriesDisponiveis = useMemo(() => {
    if (!taxonomy || !taxonomy.categories) return [];
    return Object.keys(taxonomy.categories);
  }, [taxonomy]);

  const familiesDisponiveis = useMemo(() => {
    if (!taxonomy || !taxonomy.categories || !filters.category) return [];
    const cats = taxonomy.categories as any;
    if (!cats[filters.category]) return [];
    return Object.keys(cats[filters.category].families || {});
  }, [filters.category, taxonomy]);

  const typesDisponiveis = useMemo(() => {
    if (!taxonomy || !taxonomy.categories || !filters.category || !filters.family) return [];
    const cats = taxonomy.categories as any;
    if (!cats[filters.category]?.families?.[filters.family]) return [];
    return cats[filters.category].families[filters.family] || [];
  }, [filters.category, filters.family, taxonomy]);

  // Handlers Geográficos Dinâmicos
  const handleGeoModeChange = (mode: 'all' | 'concelho' | 'freguesia') => {
    setGeoMode(mode);
    if (!currentUser) return;

    if (mode === 'all') {
      setFilters(prev => ({ ...prev, distrito: '', concelho: [], freguesia: [] }));
    } else if (mode === 'concelho') {
      setFilters(prev => ({
        ...prev,
        distrito: currentUser.distrito?.trim() || '',
        concelho: currentUser.concelho ? [currentUser.concelho.trim()] : [],
        freguesia: []
      }));
    } else if (mode === 'freguesia') {
      setFilters(prev => ({
        ...prev,
        distrito: currentUser.distrito?.trim() || '',
        concelho: currentUser.concelho ? [currentUser.concelho.trim()] : [],
        freguesia: currentUser.freguesia ? [currentUser.freguesia.trim()] : []
      }));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: localSearch }));
  };

  const clearAllFilters = () => {
    setFilters({
      distrito: '',
      concelho: [],
      freguesia: [],
      category: '',
      family: '',
      productType: '',
      search: ''
    });
    setLocalSearch('');
    setGeoMode('all');
  };

  // Filtragem local final com tipagem segura
  const filteredProducts = useMemo(() => {
    if (!filters.search.trim()) return products;
    const term = filters.search.toLowerCase().trim();
    return products.filter((p: any) => 
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.merchantName || '').toLowerCase().includes(term)
    );
  }, [products, filters.search]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-24 font-sans antialiased">
      {/* HEADER BRUTALISTA */}
      <header className="bg-white border-b-4 border-[#0f172a] sticky top-0 z-40 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="p-2 border-2 border-[#0f172a] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:translate-y-0.5"
                >
                  <ArrowLeft className="w-5 h-5 text-[#0f172a]" />
                </button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-[#0f172a]">
                  Marketplace Local
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Montra de Produtos e Campanhas
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowFiltersModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-4 border-[#0f172a] bg-[#00d66f] text-[#0f172a] font-black uppercase italic tracking-tighter rounded-xl hover:bg-emerald-400 transition-all shadow-[4px_4px_0px_0px_#0f172a] active:translate-y-1 active:shadow-none"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros Avançados</span>
            </button>
          </div>

          {/* MOTOR DE BUSCA & SELETOR DE RAIO */}
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="O que procura hoje? (ex: pão, pizza, oficina...)"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-3 border-[#0f172a] rounded-xl font-bold text-sm focus:bg-white focus:ring-0 outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#0f172a] text-white border-3 border-[#0f172a] font-black uppercase italic tracking-wider rounded-xl hover:bg-slate-800 transition-all active:translate-y-0.5"
              >
                Procurar
              </button>
            </form>

            {/* SELETOR DE ATALHO GEOGRÁFICO */}
            <div className="flex items-center bg-slate-100 p-1 border-3 border-[#0f172a] rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => handleGeoModeChange('freguesia')}
                className={`px-4 py-2 rounded-lg font-extrabold text-xs uppercase tracking-tight transition-all ${geoMode === 'freguesia' ? 'bg-[#0f172a] text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Minha Freguesia
              </button>
              <button
                onClick={() => handleGeoModeChange('concelho')}
                className={`px-4 py-2 rounded-lg font-extrabold text-xs uppercase tracking-tight transition-all ${geoMode === 'concelho' ? 'bg-[#0f172a] text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Meu Concelho
              </button>
              <button
                onClick={() => handleGeoModeChange('all')}
                className={`px-4 py-2 rounded-lg font-extrabold text-xs uppercase tracking-tight transition-all ${geoMode === 'all' ? 'bg-[#0f172a] text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                Ver Todo o País
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* APRESENTAÇÃO DE DESTAQUES / BANNERS */}
        <div className="mb-8">
          <BannerCarousel />
        </div>

        {/* FEED DE PRODUTOS */}
        {isProductsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black uppercase italic text-sm tracking-wider text-slate-500 animate-pulse">
              A atualizar montra de produtos locais...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white border-4 border-dashed border-slate-200 rounded-2xl p-8 max-w-md mx-auto">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-black uppercase text-lg text-[#0f172a] tracking-tight">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Tente alargar o seu raio de pesquisa geográfica ou limpar os filtros ativos.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-6 px-5 py-2.5 bg-slate-100 border-2 border-[#0f172a] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all active:translate-y-0.5"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product: any) => {
              const inList = shoppingList.some(item => item.id === product.id);
              return (
                <div 
                  key={product.id}
                  className="bg-white border-4 border-[#0f172a] rounded-2xl overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all hover:-translate-y-0.5"
                >
                  {/* IMAGEM E PREÇO */}
                  <div className="relative aspect-square bg-slate-50 border-b-4 border-[#0f172a] overflow-hidden group">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-12 h-12" />
                      </div>
                    )}
                    
                    {/* PREÇO BRUTALISTA */}
                    <div className="absolute bottom-3 left-3 bg-[#0f172a] text-white px-3 py-1.5 rounded-lg font-black text-sm tracking-tight border border-white/20 shadow-md">
                      {Number(product.price).toFixed(2)}€
                    </div>

                    {/* BADGE DE UNIDADE */}
                    {product.unit && (
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider">
                        / {product.unit}
                      </div>
                    )}
                  </div>

                  {/* INFO DO PRODUTO */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{product.merchantName || 'Comércio Local'}</span>
                      </div>
                      
                      <h3 className="font-black text-sm sm:text-base text-[#0f172a] mt-0.5 uppercase tracking-tight line-clamp-1">
                        {product.name}
                      </h3>
                      
                      {product.description && (
                        <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2 leading-snug">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* BOTÃO ADICIONAR À LISTA */}
                    <button
                      onClick={() => addToShoppingList(product)}
                      disabled={inList}
                      className={`w-full py-2.5 px-3 border-3 border-[#0f172a] rounded-xl font-black uppercase italic tracking-tighter text-xs flex items-center justify-center gap-2 transition-all ${
                        inList 
                          ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed' 
                          : 'bg-[#00d66f] text-[#0f172a] hover:bg-emerald-400 shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none'
                      }`}
                    >
                      {inList ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Na minha Lista</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Adicionar à Lista</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL DE FILTROS AVANÇADOS BRUTALISTA */}
      {showFiltersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border-4 border-[#0f172a] rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_0px_#0f172a]">
            {/* MODAL HEADER */}
            <div className="p-5 border-b-4 border-[#0f172a] bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#0f172a]" />
                <h2 className="text-lg font-black uppercase italic tracking-tight text-[#0f172a]">
                  Filtros Disponíveis
                </h2>
              </div>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="px-3 py-1 bg-slate-200 border-2 border-[#0f172a] font-bold text-xs uppercase rounded-lg hover:bg-slate-300"
              >
                Fechar
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* FILTROS GEOGRÁFICOS */}
              <div className="space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Localização Geográfica
                </h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* DISTRITO */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Distrito</label>
                    <select
                      value={filters.distrito}
                      onChange={(e) => setFilters(prev => ({ ...prev, distrito: e.target.value, concelho: [], freguesia: [] }))}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none"
                    >
                      <option value="">Todos os Distritos</option>
                      {distritosDisponiveis.map((d: string) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* CONCELHO */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Concelho</label>
                    <select
                      value={filters.concelho[0] || ''}
                      disabled={!filters.distrito}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters(prev => ({ ...prev, concelho: val ? [val] : [], freguesia: [] }));
                      }}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none disabled:opacity-50"
                    >
                      <option value="">Todos os Concelhos</option>
                      {concelhosDisponiveis.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* FREGUESIA */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Freguesia</label>
                    <select
                      value={filters.freguesia[0] || ''}
                      disabled={filters.concelho.length !== 1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters(prev => ({ ...prev, freguesia: val ? [val] : [] }));
                      }}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none disabled:opacity-50"
                    >
                      <option value="">Todas as Freguesias</option>
                      {freguesiasDisponiveis.map((f: string) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* FILTROS DE TAXONOMIA */}
              <div className="space-y-3 pt-4 border-t-2 border-dashed border-slate-200">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Grid className="w-3.5 h-3.5" /> Categorias e Setores
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* CATEGORIA */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Categoria Geral</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, family: '', productType: '' }))}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none"
                    >
                      <option value="">Todas as Categorias</option>
                      {categoriesDisponiveis.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* FAMÍLIA */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Família / Subcategoria</label>
                    <select
                      value={filters.family}
                      disabled={!filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, family: e.target.value, productType: '' }))}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none disabled:opacity-50"
                    >
                      <option value="">Todas as Famílias</option>
                      {familiesDisponiveis.map((f: string) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* TIPO DE PRODUTO */}
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 text-slate-700">Tipo Específico de Produto</label>
                    <select
                      value={filters.productType}
                      disabled={!filters.family}
                      onChange={(e) => setFilters(prev => ({ ...prev, productType: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border-2 border-[#0f172a] rounded-xl font-bold text-xs focus:ring-0 outline-none disabled:opacity-50"
                    >
                      <option value="">Todos os Tipos</option>
                      {typesDisponiveis.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-50 border-t-4 border-[#0f172a] flex items-center justify-between gap-3">
              <button
                onClick={clearAllFilters}
                className="px-4 py-3 bg-white border-2 border-slate-400 font-bold text-xs uppercase tracking-tight rounded-xl hover:bg-slate-100 transition-colors"
              >
                Limpar Tudo
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 py-3 bg-[#00d66f] text-[#0f172a] border-3 border-[#0f172a] font-black uppercase italic text-xs tracking-wider rounded-xl text-center shadow-[2px_2px_0px_0px_#0f172a] hover:bg-emerald-400 transition-all active:translate-y-0.5 active:shadow-none"
              >
                Aplicar Filtros Selecionados
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductMarketplace;