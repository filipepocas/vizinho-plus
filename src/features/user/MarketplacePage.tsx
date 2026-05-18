import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ProductMarketplace from './components/ProductMarketplace';

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 rounded-3xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-[#0a2540] shadow-sm transition hover:border-[#00d66f] hover:text-[#00d66f]"
        >
          <ChevronLeft size={18} /> Voltar ao Dashboard
        </button>

        <div className="mt-8 bg-white p-6 rounded-[40px] border-4 border-[#0a2540] shadow-xl">
          <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-[#0a2540] mb-4">Produtos Locais</h1>
          <p className="text-sm font-bold text-slate-500 mb-6">Aqui estão os produtos publicados pelos comerciantes locais. Adicione ao seu carrinho ou filtre por categoria e localização.</p>
          <ProductMarketplace />
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
