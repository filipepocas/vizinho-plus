// src/features/user/components/ShoppingListModal.tsx

import React from 'react';
import { X, Trash2, Map, Store, ShoppingBag } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Product } from '../../../types';

const ShoppingListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { shoppingList, removeFromShoppingList, clearShoppingList } = useStore();

  const shops = shoppingList.reduce((acc: any, product: Product) => {
    if (!acc[product.merchantId]) {
      acc[product.merchantId] = { name: product.shopName, freguesia: product.freguesia, coords: product.coords, items: [] };
    }
    acc[product.merchantId].items.push(product);
    return acc;
  }, {});

  const generateItinerary = () => {
    const validShops = Object.values(shops).filter((s: any) => s.coords);
    if (validShops.length === 0) {
      const names = Object.values(shops).map((s: any) => s.name).join(' / ');
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(names)}`, '_blank');
      return;
    }
    const origin = "My+Location";
    const destinations = validShops.map((s: any) => `${s.coords.lat},${s.coords.lng}`);
    const destination = destinations.pop();
    const waypoints = destinations.join('|');
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-xl max-h-[85vh] flex flex-col border-4 border-[#00d66f] shadow-2xl overflow-hidden animate-in zoom-in">
        <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3"><div className="bg-[#00d66f] p-2 rounded-xl text-[#0a2540]"><ShoppingBag size={20} /></div><h3 className="font-black uppercase italic tracking-tighter text-xl">Minha Lista</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {Object.keys(shops).length > 0 ? Object.entries(shops).map(([id, shop]: [string, any]) => (
            <div key={id} className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2"><Store size={16} className="text-[#00d66f]" /><h4 className="font-black uppercase text-xs text-[#0a2540]">{shop.name}</h4></div>
              <div className="grid gap-3">{shop.items.map((p: Product) => (
                  <div key={p.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border-2 border-white shadow-sm">
                    <img src={p.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div className="flex-1"><p className="font-black uppercase text-[10px] text-[#0a2540]">{p.description}</p><p className="text-[10px] font-bold text-[#00d66f]">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(p.hasPromo ? p.promoPrice! : p.price)}</p></div>
                    <button onClick={() => removeFromShoppingList(p.id!)} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
              ))}</div>
            </div>
          )) : <div className="py-20 text-center"><p className="text-[10px] font-black uppercase text-slate-300">Lista vazia.</p></div>}
        </div>
        <div className="p-6 bg-slate-50 border-t-2 border-slate-100 shrink-0 grid grid-cols-2 gap-4">
          <button onClick={clearShoppingList} className="py-4 rounded-2xl font-black uppercase text-[10px] text-slate-400 bg-white border-2 border-slate-100 hover:bg-red-50 hover:text-red-500">Limpar</button>
          <button disabled={shoppingList.length === 0} onClick={generateItinerary} className="py-4 rounded-2xl font-black uppercase text-[10px] bg-[#0a2540] text-[#00d66f] shadow-lg flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50"><Map size={18} /> Itinerário</button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListModal;