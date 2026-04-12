// src/features/dashboard/components/UserExplore.tsx

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Navigation, Percent } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface UserExploreProps {
  allMerchants: UserProfile[];
}

const UserExplore: React.FC<UserExploreProps> = ({ allMerchants }) => {
  const [searchName, setSearchName] = useState('');
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categorias únicas para o filtro
  const categories = useMemo(() => {
    const cats = allMerchants.map(m => m.category).filter(Boolean);
    return ['all', ...Array.from(new Set(cats))];
  }, [allMerchants]);

  // Lógica de filtragem robusta
  const filtered = useMemo(() => {
    return allMerchants.filter(m => {
      const nameToSearch = (m.shopName || m.name || '').toLowerCase();
      const locationToSearch = (m.freguesia || '').toLowerCase();
      const searchTerm = searchName.toLowerCase();
      
      const matchName = nameToSearch.includes(searchTerm) || locationToSearch.includes(searchTerm);
      const matchZip = (m.zipCode || '').startsWith(searchZip);
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      
      return matchName && matchZip && matchCat;
    });
  }, [allMerchants, searchName, searchZip, selectedCategory]);

  // CORREÇÃO DO LINK DO GOOGLE MAPS
  const openInMaps = (m: UserProfile) => {
    const storeName = m.shopName || m.name || '';
    const address = m.address || '';
    const city = m.freguesia || m.city || '';
    
    // Criamos uma query limpa para o Maps
    const fullAddress = `${storeName}, ${address}, ${city}`.trim();
    const encodedQuery = encodeURIComponent(fullAddress);
    
    // URL universal do Google Maps
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[35px] border-4 border-[#0a2540] space-y-4 shadow-[8px_8px_0px_#0a2540]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            placeholder="NOME DA LOJA OU LOCALIDADE..." 
            value={searchName} 
            onChange={e => setSearchName(e.target.value)} 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-xs font-black uppercase outline-none focus:border-[#00d66f] transition-all" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <input 
            placeholder="CP (4 DÍGITOS)" 
            maxLength={4}
            value={searchZip} 
            onChange={e => setSearchZip(e.target.value.replace(/\D/g, ''))} 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-[#00d66f] transition-all" 
          />
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)} 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] appearance-none"
          >
            <option value="all">TODAS CATEGORIAS</option>
            {categories.map(c => (
              <option key={c as string} value={c as string}>
                {(c as string)?.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((m) => (
            <div key={m.id} className="bg-white rounded-[35px] border-4 border-[#0a2540] overflow-hidden shadow-[6px_6px_0px_#0a2540] flex flex-col sm:flex-row sm:items-center p-6 justify-between gap-4 group hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-[#0a2540] p-4 rounded-2xl text-[#00d66f] group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <div>
                  <span className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest">{m.category || 'Comércio'}</span>
                  <h4 className="text-lg font-black text-[#0a2540] uppercase tracking-tighter leading-none mb-1">
                    {m.shopName || m.name}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {m.address ? `${m.address} • ` : ''}{m.freguesia || 'Localidade não definida'}
                  </p>
                  
                  {/* CASHBACK TAG */}
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-[#00d66f]">
                    <Percent size={10} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{m.cashbackPercent || 0}% Cashback</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => openInMaps(m)}
                className="bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-4 rounded-2xl shadow-[4px_4px_0px_#0a2540] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0a2540] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                title="Abrir no Google Maps"
              >
                <Navigation size={20} fill="currentColor" />
                <span className="sm:hidden font-black uppercase text-[10px]">Ver Localização</span>
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-[35px] border-4 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma loja encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserExplore;