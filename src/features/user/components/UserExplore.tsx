import React, { useState, useMemo } from 'react';
import { Search, MapPin, ExternalLink } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface UserExploreProps {
  allMerchants: UserProfile[];
}

const UserExplore: React.FC<UserExploreProps> = ({ allMerchants }) => {
  const [searchName, setSearchName] = useState('');
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => ['all', ...Array.from(new Set(allMerchants.map(m => m.category).filter(Boolean)))], [allMerchants]);

  const filteredMerchants = useMemo(() => {
    return allMerchants.filter(m => {
      const matchName = (m.shopName || m.name || '').toLowerCase().includes(searchName.toLowerCase());
      const matchZip = (m.zipCode || '').startsWith(searchZip);
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchName && matchZip && matchCat;
    });
  }, [allMerchants, searchName, searchZip, selectedCategory]);

  const openInMaps = (addr: string, name: string) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${addr}`)}`, '_blank');

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[35px] border-4 border-[#0f172a] shadow-[6px_6px_0px_#00d66f] space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input placeholder="NOME DA LOJA..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-[10px] font-black uppercase outline-none focus:border-[#00d66f]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="CP (EX: 4700)" value={searchZip} onChange={e => setSearchZip(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-[#00d66f]" />
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none appearance-none">
            {categories.map(c => <option key={c} value={c as string}>{c === 'all' ? 'TODOS SETORES' : (c as string)?.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* LISTA DE LOJAS */}
      {filteredMerchants.map((m) => (
        <div key={m.id} className="bg-white rounded-[40px] border-4 border-slate-100 overflow-hidden group hover:border-[#00d66f] transition-all">
          <div className="flex">
            <div className="bg-[#0f172a] p-6 w-28 flex flex-col items-center justify-center text-center shrink-0">
              <p className="text-[#00d66f] text-2xl font-black italic">{m.cashbackPercent || 0}%</p>
              <p className="text-[7px] text-white/50 font-black uppercase leading-tight">Cashback<br/>Direto</p>
            </div>
            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest">{m.category || 'Comércio'}</span>
                <h4 className="text-lg font-black text-[#0f172a] uppercase tracking-tighter leading-none">{m.shopName || m.name}</h4>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin size={12} className="text-[#00d66f]" />
                  <span className="text-[9px] font-bold uppercase truncate max-w-[120px]">{m.freguesia || m.zipCode}</span>
                </div>
                <button onClick={() => openInMaps(m.address || '', m.shopName || m.name || '')} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-[#0f172a] hover:text-white transition-all">
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserExplore;