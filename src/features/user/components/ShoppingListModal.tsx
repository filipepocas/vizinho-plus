// src/features/user/components/ShoppingListModal.tsx

import React from 'react';
import { 
  X, 
  Trash2, 
  Map, 
  Store, 
  ShoppingBag, 
  Navigation
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

/**
 * Interface para garantir tipagem estrita no agrupamento de lojas
 * e no algoritmo de otimização de rota.
 */
interface GroupedShop {
  name: string;
  freguesia: string;
  coords?: { lat: number; lng: number };
  items: Product[];
}

const ShoppingListModal: React.FC<Props> = ({ onClose }) => {
  const { 
    shoppingList, 
    removeFromShoppingList, 
    clearShoppingList 
  } = useStore();

  // LÓGICA: Agrupar os produtos da lista por Loja (merchantId)
  const shops = shoppingList.reduce<Record<string, GroupedShop>>((acc, product) => {
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

  /**
   * MOTOR DE ITINERÁRIO OTIMIZADO
   * Utiliza o algoritmo "Nearest Neighbor" para ordenar as lojas a partir da posição atual do utilizador.
   */
  const generateItinerary = () => {
    // 1. Filtrar apenas lojas que têm coordenadas GPS e garantir tipagem para o TS
    const validShops = Object.values(shops).filter((s): s is GroupedShop & { coords: { lat: number; lng: number } } => 
      !!(s.coords && s.coords.lat && s.coords.lng)
    );
    
    if (validShops.length === 0) {
      toast.error("As lojas selecionadas não têm coordenadas GPS configuradas.");
      const names = Object.values(shops).map(s => s.name).join(' / ');
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(names)}`, '_blank');
      return;
    }

    // Função auxiliar para construir a URL final do Google Maps
    const buildUrl = (sortedShops: (GroupedShop & { coords: { lat: number; lng: number } })[]) => {
      const origin = "My+Location";
      const destinations = sortedShops.map(s => `${s.coords.lat},${s.coords.lng}`);
      const finalDestination = destinations.pop();
      const waypoints = destinations.join('|');
      
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${finalDestination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
      window.open(url, '_blank');
    };

    // 2. Tentar obter localização GPS em tempo real para otimização
    if ("geolocation" in navigator) {
      toast.loading("A otimizar rota por GPS...", { id: 'route' });
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          let currentLat = userLat;
          let currentLng = userLng;
          let unvisited = [...validShops];
          let sorted: (GroupedShop & { coords: { lat: number; lng: number } })[] = [];

          // Algoritmo: Encontrar sempre a loja mais próxima do ponto atual
          while (unvisited.length > 0) {
            let nearestIdx = 0;
            let minDistance = Infinity;
            
            for (let i = 0; i < unvisited.length; i++) {
              // Cálculo de distância Euclidiana (suficiente para distâncias urbanas curtas)
              const dist = Math.hypot(unvisited[i].coords.lat - currentLat, unvisited[i].coords.lng - currentLng);
              if (dist < minDistance) {
                minDistance = dist;
                nearestIdx = i;
              }
            }
            
            const nearest = unvisited.splice(nearestIdx, 1)[0];
            sorted.push(nearest);
            currentLat = nearest.coords.lat;
            currentLng = nearest.coords.lng;
          }
          
          toast.success("Rota otimizada com sucesso!", { id: 'route' });
          buildUrl(sorted);
        },
        () => {
          // Fallback caso o utilizador negue o GPS ou falhe
          toast.error("Não foi possível obter o GPS. A usar ordem da lista.", { id: 'route' });
          buildUrl(validShops);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // Fallback para navegadores sem Geolocation API
      buildUrl(validShops);
    }
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

        {/* LISTAGEM DE PRODUTOS AGRUPADOS POR LOJA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {Object.keys(shops).length > 0 ? (
            Object.entries(shops).map(([id, shop]) => (
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

        {/* RODAPÉ COM ACÇÕES GLOBAIS */}
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