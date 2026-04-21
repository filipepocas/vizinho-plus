import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Crown, MapPin, Globe, Star, Search, X } from 'lucide-react';
import { Vantagem } from '../../types';
import toast from 'react-hot-toast';

const VantagensPage: React.FC = () => {
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  const [searchName, setSearchName] = useState('');
  const [selectedConcelhos, setSelectedConcelhos] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
    // Correção: Adicionado (snap: any)
    const unsubscribe = onSnapshot(q, (snap: any) => {
      // Correção: Adicionado (d: any)
      setVantagens(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Vantagem)));
    });
    return () => unsubscribe();
  }, []);

  const availableCats = useMemo(() => Array.from(new Set(vantagens.map(v => v.category).filter(Boolean))), [vantagens]);
  const availableConcelhos = useMemo(() => {
    const allZones = vantagens.flatMap((v:any) => v.targetZones || []);
    const concelhosList = allZones.map(z => {
      if(z.includes('Concelho:')) return z.split('Concelho:')[1].split('(')[0].trim();
      return null;
    }).filter(Boolean);
    return Array.from(new Set(concelhosList));
  }, [vantagens]);

  const handleAddConcelho = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || selectedConcelhos.includes(val)) return;
    if (selectedConcelhos.length >= 2) return toast.error("Máximo de 2 concelhos permitidos.");
    setSelectedConcelhos([...selectedConcelhos, val]);
  };

  const handleAddCat = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || selectedCats.includes(val)) return;
    setSelectedCats([...selectedCats, val]);
  };

  const filtered = useMemo(() => {
    return vantagens.filter((v:any) => {
      const matchName = searchName === '' || v.partnerName.toLowerCase().includes(searchName.toLowerCase());
      const matchCat = selectedCats.length === 0 || selectedCats.includes(v.category || '');
      
      const zones = v.targetZones || [];
      const matchConcelho = selectedConcelhos.length === 0 || selectedConcelhos.some(sc => zones.some((z:string) => z.includes(sc)));

      return matchName && matchCat && matchConcelho;
    });
  }, [vantagens, searchName, selectedCats, selectedConcelhos]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#00d66f] selection:text-[#0a2540] pb-24">
      <nav className="bg-[#0a2540] py-6 px-8 rounded-b-[40px] shadow-2xl border-b-8 border-amber-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <img src={logoPath} alt="Vizinho+" className="h-12 w-auto object-contain" />
            <div className="flex items-center gap-3 bg-amber-500/20 px-6 py-3 rounded-full border border-amber-500/30">
                <Crown className="text-amber-400" size={20} />
                <span className="text-amber-400 font-black uppercase text-xs tracking-widest">Acesso VIP</span>
            </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl md:text-5xl font-black text-[#0a2540] leading-tight tracking-tighter uppercase italic mb-4">
            Vantagens <span className="text-amber-500">Exclusivas</span>
          </h1>
          <p className="text-slate-500 font-bold max-w-2xl mx-auto">Benefícios e descontos reservados apenas para membros da comunidade Vizinho+. Apresente o seu Cartão na loja para usufruir.</p>
        </div>

        <div className="bg-white p-6 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] mb-12 space-y-4 relative z-20">
            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                <input 
                    placeholder="PESQUISAR PARCEIRO VIP..." value={searchName} onChange={e=>setSearchName(e.target.value)}
                    className="w-full pl-14 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500 transition-all"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <select value="" onChange={handleAddConcelho} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-amber-500 appearance-none">
                  <option value="">FILTRAR CONCELHOS (Máx 2)</option>
                  {availableConcelhos.map((c:any) => <option key={c} value={c}>{c}</option>)}
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
                <select value="" onChange={handleAddCat} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-amber-500 appearance-none">
                  <option value="">FILTRAR CATEGORIAS (Múltiplas)</option>
                  {availableCats.map((c:any) => <option key={c} value={c}>{c}</option>)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(v => (
                <div key={v.id} className="bg-white rounded-[40px] overflow-hidden border-4 border-slate-100 shadow-xl flex flex-col hover:border-amber-500 hover:-translate-y-2 transition-all duration-300 group">
                    <div className="h-56 relative bg-slate-100 overflow-hidden">
                        <img src={v.imageBase64} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={v.partnerName} />
                        <div className="absolute top-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-1 border-2 border-white">
                            <Star size={12} fill="currentColor" /> {v.category}
                        </div>
                    </div>
                    <div className="p-8 flex flex-col flex-grow">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 leading-none">{v.partnerName}</h3>
                        <div className="space-y-3 mb-6">
                            {(v.address || v.zipCode) && (
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-start gap-2">
                                    <MapPin size={14} className="text-amber-500 shrink-0" /> {v.address} {v.zipCode && `(${v.zipCode})`}
                                </p>
                            )}
                            {v.websiteUrl && (
                                <a href={v.websiteUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 w-fit">
                                    <Globe size={14} /> Visitar Website
                                </a>
                            )}
                        </div>
                        <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100 mt-auto">
                            <p className="text-xs font-bold text-amber-900 leading-relaxed whitespace-pre-wrap">{v.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
};

export default VantagensPage;