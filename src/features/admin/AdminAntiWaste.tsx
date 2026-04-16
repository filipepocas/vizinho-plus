import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Leaf, Trash2, MapPin, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { AntiWasteItem } from '../../types';

const AdminAntiWaste: React.FC = () => {
  const [items, setItems] = useState<AntiWasteItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'anti_waste'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({id: d.id, ...d.data()} as AntiWasteItem))));
  }, []);

  const handleDelete = async (id: string) => {
      if(!window.confirm("Apagar esta oferta de desperdício?")) return;
      await deleteDoc(doc(db, 'anti_waste', id));
      toast.success("Apagado.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
           <div className="flex items-center gap-4 mb-8">
              <div className="bg-green-500 p-4 rounded-2xl border-4 border-[#0a2540]"><Leaf size={28} className="text-white" /></div>
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Combate ao Desperdício</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Monitorização de Anúncios Diários</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(i => {
                  const isExpired = i.endTime.toDate() < new Date();
                  return (
                      <div key={i.id} className={`p-6 border-4 rounded-[30px] flex flex-col ${isExpired ? 'border-red-200 bg-slate-50 opacity-70' : 'border-green-500 bg-white shadow-[6px_6px_0px_#22c55e]'}`}>
                          <div className="flex justify-between items-start mb-4 border-b-2 border-slate-100 pb-4">
                             <div>
                                 <h4 className="font-black uppercase text-[#0a2540] flex items-center gap-2"><Store size={14} className="text-[#00d66f]"/> {i.merchantName}</h4>
                                 <p className="text-[9px] font-bold text-slate-400 mt-1">{i.address}</p>
                             </div>
                             <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${isExpired ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-700'}`}>
                                 {isExpired ? 'Expirado' : 'A decorrer'}
                             </span>
                          </div>

                          <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100 mb-4 flex-1">
                             <p className="text-sm font-bold text-green-900 leading-tight">{i.productInfo}</p>
                             <div className="bg-white px-3 py-1.5 rounded-lg border border-green-200 mt-3 inline-block">
                                <p className="text-[10px] font-black text-green-700 uppercase">{i.conditions}</p>
                             </div>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                              <div>
                                  <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1 mb-1"><MapPin size={10}/> CP: {i.targetZip}</p>
                                  <p className="text-[9px] font-bold text-slate-500">Expira às: <strong className="text-[#0a2540]">{i.endTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong></p>
                              </div>
                              <button onClick={() => handleDelete(i.id!)} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                                 <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  )
              })}
              {items.length === 0 && <p className="col-span-full text-center text-slate-400 font-bold p-10 border-4 border-dashed border-slate-200 rounded-[30px]">Sem anúncios de desperdício.</p>}
           </div>
        </div>
    </div>
  );
};

export default AdminAntiWaste;