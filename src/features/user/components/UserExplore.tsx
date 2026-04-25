// src/features/user/components/UserExplore.tsx

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Navigation, Percent, X, AlertTriangle, Clock } from 'lucide-react';
import { User as UserProfile } from '../../../types';
import toast from 'react-hot-toast';
import { isOpenNow } from '../../../utils/timeUtils';

interface UserExploreProps {
  allMerchants: UserProfile[];
}

const UserExplore: React.FC<UserExploreProps> = ({ allMerchants }) => {
  const [searchName, setSearchName] = useState('');
  
  const [selectedConcelhos, setSelectedConcelhos] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const availableCats = useMemo(() => Array.from(new Set(allMerchants.map(m => m.category).filter(Boolean))), [allMerchants]);
  const availableConcelhos = useMemo(() => Array.from(new Set(allMerchants.map(m => m.concelho).filter(Boolean))), [allMerchants]);

  const handleAddConcelho = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (selectedConcelhos.includes(val)) return;
    if (selectedConcelhos.length >= 2) {
      toast.error("Só pode filtrar no máximo por 2 concelhos em simultâneo.");
      return;
    }
    setSelectedConcelhos([...selectedConcelhos, val]);
  };

  const handleAddCat = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || selectedCats.includes(val)) return;
    setSelectedCats([...selectedCats, val]);
  };

  const filtered = useMemo(() => {
    return allMerchants.filter(m => {
      const nameMatch = searchName === '' || (m.shopName || m.name || '').toLowerCase().includes(searchName.toLowerCase().trim());
      const concelhoMatch = selectedConcelhos.length === 0 || selectedConcelhos.includes(m.concelho || '');
      const catMatch = selectedCats.length === 0 || selectedCats.includes(m.category || '');
      
      return nameMatch && concelhoMatch && catMatch;
    });
  }, [allMerchants, searchName, selectedConcelhos, selectedCats]);

  const openInMaps = (m: UserProfile) => {
    const exactAddress = m.address ? `${m.address}, ` : '';
    const searchQuery = `${m.shopName || m.name}, ${exactAddress}${m.freguesia || m.concelho || ''}, Portugal`.trim();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-white p-6 rounded-[35px] border-4 border-[#0a2540] space-y-4 shadow-[8px_8px_0px_#0a2540]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            placeholder="PESQUISAR NOME DA LOJA..." 
            value={searchName} onChange={e => setSearchName(e.target.value)} 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-xs font-black uppercase outline-none focus:border-[#00d66f] transition-all" 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <select value="" onChange={handleAddConcelho} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] appearance-none">
              <option value="">FILTRAR CONCELHOS (Máx 2)</option>
              {availableConcelhos.map(c => <option key={c as string} value={c as string}>{c}</option>)}
            </select>
            {selectedConcelhos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedConcelhos.map(c => (
                  <span key={c} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-blue-200">
                    {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => setSelectedConcelhos(selectedConcelhos.filter(x => x !== c))}/>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <select value="" onChange={handleAddCat} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[10px] font-black uppercase outline-none focus:border-[#00d66f] appearance-none">
              <option value="">FILTRAR CATEGORIAS (Múltiplas)</option>
              {availableCats.map(c => <option key={c as string} value={c as string}>{c}</option>)}
            </select>
            {selectedCats.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCats.map(c => (
                  <span key={c} className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-amber-200">
                    {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => setSelectedCats(selectedCats.filter(x => x !== c))}/>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESULTADOS */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((m) => {
            const isStoreOpen = isOpenNow(m.businessHours);

            return (
              <div key={m.id} className={`rounded-[35px] border-4 overflow-hidden flex flex-col sm:flex-row sm:items-center p-6 justify-between gap-4 transition-all ${m.isLeaving ? 'bg-slate-50 border-slate-300 opacity-90' : 'bg-white border-[#0a2540] shadow-[6px_6px_0px_#0a2540] group hover:bg-slate-50'}`}>
                
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl transition-transform ${m.isLeaving ? 'bg-slate-200 text-slate-500' : 'bg-[#0a2540] text-[#00d66f] group-hover:scale-110'}`}>
                    <MapPin size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${m.isLeaving ? 'text-slate-400' : 'text-[#00d66f]'}`}>{m.category || 'Comércio'}</span>
                      
                      {/* NOVO: Indicador de Aberto/Fechado */}
                      {!m.isLeaving && (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border ${isStoreOpen ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                          <Clock size={10} /> {isStoreOpen ? 'Aberto Agora' : 'Fechado'}
                        </span>
                      )}
                    </div>
                    
                    <h4 className={`text-lg font-black uppercase tracking-tighter leading-none mb-1 ${m.isLeaving ? 'text-slate-500 line-through decoration-slate-300' : 'text-[#0a2540]'}`}>{m.shopName || m.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{m.address ? `${m.address} • ` : ''}{m.freguesia || m.concelho || 'Sem Localidade'}</p>
                    
                    {m.isLeaving ? (
                      <div className="inline-flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800">
                        <AlertTriangle size={12} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Loja sai a {new Date(m.leavingDate!).toLocaleDateString()}. Desconte o seu saldo!</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-[#00d66f]">
                        <Percent size={10} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{m.cashbackPercent || 0}% Cashback</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button onClick={() => openInMaps(m)} className={`border-2 p-4 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto ${m.isLeaving ? 'bg-white border-slate-300 text-slate-500' : 'bg-[#00d66f] text-[#0a2540] border-[#0a2540] hover:shadow-[6px_6px_0px_#0a2540]'}`} title="Abrir no Maps">
                  <Navigation size={20} fill="currentColor" />
                  <span className="font-black uppercase text-[10px]">Ver Mapa</span>
                </button>
              </div>
            );
          })
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