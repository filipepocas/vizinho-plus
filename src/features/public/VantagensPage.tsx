import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Crown, MapPin, Globe, Star, Search } from 'lucide-react';
import { Vantagem } from '../../types';

const VantagensPage: React.FC = () => {
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  useEffect(() => {
    const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVantagens(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vantagem)));
    });
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(vantagens.map(v => v.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [vantagens]);

  const filtered = useMemo(() => {
    return vantagens.filter(v => {
      const matchZip = !searchZip || (v.zipCode || '').startsWith(searchZip);
      const matchCat = selectedCategory === 'all' || v.category === selectedCategory;
      return matchZip && matchCat;
    });
  }, [vantagens, searchZip, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#00d66f] selection:text-[#0a2540] pb-24">
      
      {/* NAVEGAÇÃO */}
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
          <p className="text-slate-500 font-bold max-w-2xl mx-auto">
            Benefícios, descontos e ofertas especiais reservadas apenas para membros da comunidade Vizinho+. Apresente o seu Cartão Digital na loja para usufruir.
          </p>
        </div>

        {/* FILTROS */}
        <div className="bg-white p-6 md:p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] mb-12 flex flex-col md:flex-row gap-4 relative z-20">
            <div className="flex-1 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                <input 
                    type="text" maxLength={4} placeholder="FILTRAR POR CÓDIGO POSTAL (4 DÍGITOS)" 
                    value={searchZip} onChange={e=>setSearchZip(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-14 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500 transition-all"
                />
            </div>
            <select 
                value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}
                className="md:w-1/3 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-amber-500 transition-all appearance-none"
            >
                <option value="all">TODAS AS CATEGORIAS</option>
                {categories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
            </select>
        </div>

        {/* GRID DE PARCEIROS VIP */}
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
            
            {filtered.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-200">
                    <Crown size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs text-slate-400">Nenhum parceiro VIP encontrado nesta pesquisa.</p>
                </div>
            )}
        </div>

      </main>
    </div>
  );
};

export default VantagensPage;