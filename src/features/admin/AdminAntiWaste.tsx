import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Leaf, Trash2, MapPin, Store, Edit3, Save, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AntiWasteItem } from '../../types';

const AdminAntiWaste: React.FC = () => {
  const [items, setItems] = useState<AntiWasteItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ productInfo: '', conditions: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'anti_waste'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap: any) => setItems(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as AntiWasteItem))));
  }, []);

  const handleDelete = async (id: string) => {
      if(!window.confirm("Apagar esta oferta de desperdício?")) return;
      await deleteDoc(doc(db, 'anti_waste', id));
      toast.success("Apagado com sucesso.");
  };

  const handleEditClick = (item: AntiWasteItem) => {
      setEditingId(item.id!);
      setEditForm({ productInfo: item.productInfo, conditions: item.conditions });
  };

  const handleSaveEdit = async (id: string) => {
      setSaving(true);
      try {
          await updateDoc(doc(db, 'anti_waste', id), {
              productInfo: editForm.productInfo,
              conditions: editForm.conditions
          });
          toast.success("Anúncio atualizado!");
          setEditingId(null);
      } catch (err) {
          toast.error("Erro ao atualizar o anúncio.");
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
           <div className="flex items-center gap-4 mb-8">
              <div className="bg-green-500 p-4 rounded-2xl border-4 border-[#0a2540]"><Leaf size={28} className="text-white" /></div>
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Combate ao Desperdício</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Monitorização e Edição de Anúncios Diários</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((i: any) => {
                  const isExpired = i.endTime.toDate() < new Date();
                  const targetZones = (i as any).targetZones || [];
                  const isEditing = editingId === i.id;

                  return (
                      <div key={i.id} className={`p-6 border-4 rounded-[30px] flex flex-col transition-all ${isExpired ? 'border-red-200 bg-red-50 opacity-70' : isEditing ? 'border-amber-400 bg-amber-50 shadow-[6px_6px_0px_#fbbf24]' : 'border-green-500 bg-white shadow-[6px_6px_0px_#22c55e]'}`}>
                          <div className="flex justify-between items-start mb-4 border-b-2 border-slate-200 pb-4">
                             <div>
                                 <h4 className="font-black uppercase text-[#0a2540] flex items-center gap-2"><Store size={14} className="text-[#00d66f]"/> {i.merchantName}</h4>
                                 <p className="text-[9px] font-bold text-slate-500 mt-1">{i.address}</p>
                             </div>
                             <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${isExpired ? 'bg-red-200 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                 {isExpired ? 'Expirado' : 'A decorrer'}
                             </span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 mb-4 flex-1 flex flex-col">
                             {isEditing ? (
                                <div className="space-y-3">
                                   <div>
                                      <label className="text-[8px] font-black uppercase text-amber-700">Produtos Anunciados</label>
                                      <input type="text" value={editForm.productInfo} onChange={e=>setEditForm({...editForm, productInfo: e.target.value})} className="w-full p-2 border-2 border-amber-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500" />
                                   </div>
                                   <div>
                                      <label className="text-[8px] font-black uppercase text-amber-700">Condições (Descontos)</label>
                                      <input type="text" value={editForm.conditions} onChange={e=>setEditForm({...editForm, conditions: e.target.value})} className="w-full p-2 border-2 border-amber-300 rounded-xl text-xs font-bold outline-none focus:border-amber-500" />
                                   </div>
                                   <div className="flex gap-2 mt-2 pt-2 border-t-2 border-amber-100">
                                      <button onClick={() => setEditingId(null)} className="flex-1 bg-white text-slate-500 border border-slate-200 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-colors"><X size={14} className="inline"/> Cancelar</button>
                                      <button onClick={() => handleSaveEdit(i.id!)} disabled={saving} className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-amber-600 transition-colors"><Save size={14} className="inline"/> Gravar</button>
                                   </div>
                                </div>
                             ) : (
                                <>
                                   <p className="text-sm font-bold text-[#0a2540] leading-tight mb-2">{i.productInfo}</p>
                                   <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 mt-2 inline-block shadow-sm">
                                      <p className="text-[10px] font-black text-green-700 uppercase">🛒 {i.conditions}</p>
                                   </div>
                                   {targetZones.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1">
                                         <p className="text-[8px] font-black uppercase text-slate-400 flex items-center gap-1"><MapPin size={10}/> Visível em:</p>
                                         {targetZones.map((z:string, idx:number) => <span key={idx} className="text-[8px] font-bold text-slate-500 truncate" title={z}>{z}</span>)}
                                      </div>
                                   )}
                                   {!isExpired && (
                                     <button onClick={() => handleEditClick(i)} className="mt-4 text-[9px] font-black uppercase text-blue-500 hover:text-blue-700 flex items-center gap-1"><Edit3 size={12}/> Editar Anúncio</button>
                                   )}
                                </>
                             )}
                          </div>

                          <div className="flex items-center justify-between mt-auto bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                              <div>
                                  <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1 mb-1"><Clock size={10}/> Expira às:</p>
                                  <strong className="text-[#0a2540] text-sm">{i.endTime.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong>
                              </div>
                              <button onClick={() => handleDelete(i.id!)} className="bg-red-100 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors" title="Apagar Anúncio">
                                 <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  )
              })}
              {items.length === 0 && <p className="col-span-full text-center text-slate-400 font-bold p-10 border-4 border-dashed border-slate-200 rounded-[30px] uppercase text-xs">Sem anúncios de desperdício ativos ou recentes.</p>}
           </div>
        </div>
    </div>
  );
};

export default AdminAntiWaste;