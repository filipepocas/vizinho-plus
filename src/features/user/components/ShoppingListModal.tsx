// src/features/user/components/ShoppingListModal.tsx

import React from 'react';
import { 
  X, 
  Trash2, 
  Map, 
  Store, 
  ShoppingBag, 
  Navigation, 
  ChevronRight 
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

const ShoppingListModal: React.FC<Props> = ({ onClose }) => {
  const { 
    shoppingList, 
    removeFromShoppingList, 
    clearShoppingList 
  } = useStore();

  // LÓGICA: Agrupar produtos por Loja (merchantId) para visualização e Itinerário
  const shops = shoppingList.reduce((acc: any, product: Product) => {
    if (!acc[product.merchantId]) {
      acc[product.merchantId] = {
        name: product.shopName,
        freguesia: product.freguesia,
        coords: product.coords,
        items: []
      };
    }
    acc[product.merchantId].items.push(product);
    return acc;
  }, {});

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  // MOTOR DE ITINERÁRIO: Gera rota multi-paragem no Google Maps
  const generateItinerary = () => {
    // Filtra apenas lojas que têm coordenadas GPS válidas
    const validShops = Object.values(shops).filter((s: any) => s.coords && s.coords.lat && s.coords.lng);
    
    if (validShops.length === 0) {
      toast.error("As lojas selecionadas não têm coordenadas GPS configuradas.");
      // Fallback: Pesquisa genérica pelos nomes das lojas no Maps
      const names = Object.values(shops).map((s: any) => s.name).join(' / ');
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(names)}`, '_blank');
      return;
    }

    // Construção da URL do Google Maps (Multi-stop)
    // Origin: Localização atual do utilizador (detectada pelo GPS do telemóvel)
    // Destination: A última loja da lista (ponto final)
    // Waypoints: Todas as outras lojas intermédias separadas por "|"
    const origin = "My+Location";
    const destinations = validShops.map((s: any) => `${s.coords.lat},${s.coords.lng}`);
    const finalDestination = destinations.pop();
    const waypoints = destinations.join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${finalDestination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-xl max-h-[85vh] flex flex-col border-4 border-[#00d66f] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {/* HEADER DO MODAL */}
        <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center shrink-0 border-b-4 border-[#00d66f]">
          <div className="flex items-center gap-3">
            <div className="bg-[#00d66f] p-2 rounded-xl text-[#0a2540]">
              <ShoppingBag size={20} strokeWidth={3} />
            </div>
            <h3 className="font-black uppercase italic tracking-tighter text-xl">Minha Lista de Compras</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* LISTAGEM AGRUPADA POR LOJA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {Object.keys(shops).length > 0 ? (
            Object.entries(shops).map(([id, shop]: [string, any]) => (
              <div key={id} className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-[#00d66f]" />
                    <h4 className="font-black uppercase text-xs text-[#0a2540]">{shop.name}</h4>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {shop.freguesia}
                    </span>
                  </div>
                  {shop.coords && (
                    <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1">
                      <Navigation size={10} /> Localização OK
                    </span>
                  )}
                </div>
                
                <div className="grid gap-3">
                  {shop.items.map((p: Product) => (
                    <div key={p.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border-2 border-white shadow-sm group hover:border-slate-200 transition-all">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shrink-0">
                        <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black uppercase text-[10px] text-[#0a2540] leading-tight line-clamp-1">
                          {p.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-[11px] font-black ${p.hasPromo ? 'text-red-500' : 'text-[#00d66f]'}`}>
                            {formatCurrency(p.hasPromo ? p.promoPrice! : p.price)}
                          </p>
                          {p.hasPromo && (
                            <p className="text-[9px] text-slate-300 line-through font-bold">
                              {formatCurrency(p.price)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromShoppingList(p.id!)} 
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Remover da lista"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="bg-slate-50 p-8 rounded-full">
                  <ShoppingBag size={48} className="text-slate-200" />
               </div>
               <div>
                  <p className="font-black uppercase text-sm text-slate-400">A sua lista está vazia</p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Adicione produtos no Marketplace para planear a sua rota</p>
               </div>
               <button 
                onClick={onClose}
                className="mt-4 text-[10px] font-black uppercase text-[#00d66f] hover:underline"
               >
                 Ir para o Marketplace
               </button>
            </div>
          )}
        </div>

        {/* RODAPÉ COM AÇÕES GLOBAIS */}
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100 shrink-0 grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              if(window.confirm("Limpar todos os itens da lista?")) clearShoppingList();
            }} 
            className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 bg-white border-2 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
          >
            Limpar Tudo
          </button>
          
          <button 
            disabled={shoppingList.length === 0}
            onClick={generateItinerary} 
            className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-[#0a2540] text-[#00d66f] shadow-lg flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all border-b-4 border-black/20"
          >
            <Map size={18} strokeWidth={3} /> Iniciar Itinerário
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListModal;