import React, { useState, useMemo } from 'react';
import { Search, MapPin, ExternalLink, Navigation } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface UserExploreProps {
  allMerchants: UserProfile[];
}

const UserExplore: React.FC<UserExploreProps> = ({ allMerchants }) => {
  const [searchName, setSearchName] = useState('');
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => ['all', ...Array.from(new Set(allMerchants.map(m => m.category).filter(Boolean)))], [allMerchants]);

  const filtered = useMemo(() => {
    return allMerchants.filter(m => {
      const matchName = (m.shopName || m.name || '').toLowerCase().includes(searchName.toLowerCase()) || 
                        (m.freguesia || '').toLowerCase().includes(searchName.toLowerCase());
      const matchZip = (m.zipCode || '').startsWith(searchZip);
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchName && matchZip && matchCat;
    });
  }, [allMerchants, searchName, searchZip, selectedCategory]);

  const openInMaps = (m: UserProfile) => {
    const query = encodeURIComponent(`${m.shopName || m.name}, ${m.address || ''}, ${m.freguesia || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[35px] border-2 border-slate-100 space-y-4 shadow-sm">
        <input 
          placeholder="NOME DA LOJA OU LOCALIDADE..." 
          value={searchName} 
          onChange={e => setSearchName(e.target.value)} 
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-[#00d66f]" 
        />
        <div className="grid grid-cols-2 gap-3">
          <input 
            placeholder="CP (4 DÍGITOS)" 
            maxLength={4}
            value={searchZip} 
            onChange={e => setSearchZip(e.target.value.replace(/\D/g, ''))} 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-[#00d66f]" 
          />
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)} 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none"
          >
            <option value="all">TODAS CATEGORIAS</option>
            {categories.map(c => <option key={c} value={c as string}>{(c as string)?.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="space-y-4">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-[35px] border-2 border-slate-50 overflow-hidden shadow-sm flex items-center p-6 justify-between group hover:border-[#00d66f] transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-[#0a2540] group-hover:bg-[#00d66f] group-hover:text-white transition-colors">
                <MapPin size={24} />
              </div>
              <div>
                <span className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest">{m.category || 'Comércio'}</span>
                <h4 className="text-lg font-black text-[#0a2540] uppercase tracking-tighter leading-none">{m.shopName || m.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{m.freguesia} • {m.zipCode}</p>
              </div>
            </div>
            <button 
              onClick={() => openInMaps(m)}
              className="bg-[#0a2540] text-white p-4 rounded-2xl shadow-lg hover:scale-110 transition-all flex items-center gap-2"
            >
              <Navigation size={20} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserExplore;