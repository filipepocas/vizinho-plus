import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';

interface Merchant {
  id: string;
  name: string;
  category: string;
  postalCode: string;
  freguesia: string;
  cashbackPercent: number;
  address?: string;
}

const MerchantExplore: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchZip, setSearchZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'merchant'));
        const querySnapshot = await getDocs(q);
        const merchantList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Merchant[];
        setMerchants(merchantList);
      } catch (error) {
        console.error("Erro ao carregar lojas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  // Categorias únicas para o filtro - CORREÇÃO APLICADA AQUI
  const categories = ['all', ...Array.from(new Set(merchants.map(m => m.category).filter(Boolean)))];

  const filteredMerchants = merchants.filter(m => {
    const matchZip = m.postalCode?.includes(searchZip);
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchZip && matchCat;
  });

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-10">
      {/* HEADER DE NAVEGAÇÃO */}
      <header className="p-6 bg-white border-b border-slate-100 flex items-center gap-4">
        <button onClick={onBack} className="text-[#0a2540] font-black text-xl">←</button>
        <h2 className="text-sm font-black text-[#0a2540] uppercase tracking-widest">Lojas Aderentes</h2>
      </header>

      <main className="max-w-md mx-auto p-6">
        {/* ZONA DE FILTROS */}
        <div className="flex flex-col gap-3 mb-8">
          <input 
            type="text" 
            placeholder="Filtrar por Código Postal..." 
            value={searchZip}
            onChange={(e) => setSearchZip(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-[#00d66f] transition-all"
          />
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold uppercase outline-none focus:border-[#00d66f] appearance-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(cat => cat !== 'all' && (
              <option key={cat as string} value={cat as string}>{cat as string}</option>
            ))}
          </select>
        </div>

        {/* LISTAGEM DE LOJAS */}
        {loading ? (
          <p className="text-center font-bold text-slate-400 animate-pulse uppercase text-[10px]">A procurar vizinhos...</p>
        ) : (
          <div className="space-y-4">
            {filteredMerchants.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 font-bold text-xs uppercase italic">Nenhuma loja encontrada nesta zona.</p>
              </div>
            ) : (
              filteredMerchants.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 group hover:border-[#00d66f] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-green-50 transition-colors">
                      🏪
                    </div>
                    <div className="bg-[#00d66f] text-[#0a2540] px-4 py-2 rounded-xl text-center">
                      <p className="text-[8px] font-black uppercase leading-none mb-1">Cashback</p>
                      <p className="text-lg font-black leading-none">{m.cashbackPercent || 0}%</p>
                    </div>
                  </div>
                  
                  <h3 className="font-black text-[#0a2540] text-lg uppercase tracking-tight">{m.name}</h3>
                  <p className="text-[10px] font-bold text-[#00d66f] uppercase mb-3">{m.category || 'Comércio Local'}</p>
                  
                  <div className="pt-4 border-t border-slate-50 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">📍 {m.address || 'Morada não disponível'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.postalCode} - {m.freguesia}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MerchantExplore;