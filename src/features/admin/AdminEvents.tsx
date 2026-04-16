import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { CalendarPlus, CheckCircle, Trash2, MapPin, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppEvent } from '../../types';

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setEvents(snap.docs.map(d => ({id: d.id, ...d.data()} as AppEvent))));
  }, []);

  const handleApprove = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const cpInput = form.elements.namedItem('targetZips') as HTMLInputElement;
    const zips = cpInput.value.split(',').map(z => z.trim()).filter(Boolean);

    setLoadingId(eventId);
    try {
        await updateDoc(doc(db, 'events', eventId), {
            status: 'approved',
            targetZips: zips
        });
        toast.success("Evento Aprovado e Publicado!");
    } catch(err) { toast.error("Erro ao aprovar."); } finally { setLoadingId(null); }
  };

  const handleDelete = async (id: string) => {
      if(!window.confirm("Apagar definitivamente este evento?")) return;
      await deleteDoc(doc(db, 'events', id));
      toast.success("Apagado.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
           <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-500 p-4 rounded-2xl border-4 border-[#0a2540]"><CalendarPlus size={28} className="text-white" /></div>
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Eventos Comunitários</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Validação e Distribuição de Cartazes</p>
              </div>
           </div>

           <div className="grid gap-6">
              {events.map(ev => (
                  <div key={ev.id} className={`p-6 border-4 rounded-[30px] flex flex-col md:flex-row gap-6 ${ev.status === 'pending' ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-slate-200 bg-white'}`}>
                      <div className="w-full md:w-48 shrink-0 bg-white rounded-2xl border-4 border-slate-100 overflow-hidden flex items-center justify-center p-2 relative">
                         {ev.status === 'pending' && <span className="absolute top-2 left-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded">AGUARDA APROVAÇÃO</span>}
                         <img src={ev.imageUrl} alt="Cartaz" className="w-full h-full object-contain" />
                      </div>
                      
                      <div className="flex-1 space-y-4">
                          <div>
                              <h4 className="font-black text-xl uppercase text-[#0a2540]">{ev.title}</h4>
                              <p className="text-sm font-bold text-slate-500">{ev.entityName} | {ev.eventType}</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 text-xs font-medium text-slate-600 space-y-2">
                              <p><strong>Descrição:</strong> {ev.description}</p>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-50 mt-2">
                                  <p><strong>Data:</strong> {ev.startDate.toDate().toLocaleDateString()} a {ev.endDate.toDate().toLocaleDateString()}</p>
                                  <p><strong>Hora:</strong> {ev.startTime}</p>
                                  <p><strong>Local:</strong> {ev.location}</p>
                                  <p><strong>Bilhete:</strong> {ev.ticketPrice}</p>
                              </div>
                              <div className="pt-2 border-t-2 border-slate-50 mt-2 text-[10px] text-slate-400">
                                  <strong>Contactos:</strong> {ev.contactName} | {ev.phone} | {ev.email}
                              </div>
                          </div>
                      </div>

                      <div className="w-full md:w-64 shrink-0 flex flex-col justify-between border-t-2 md:border-t-0 md:border-l-2 border-slate-200 pt-4 md:pt-0 md:pl-6">
                          {ev.status === 'pending' ? (
                              <form onSubmit={(e) => handleApprove(e, ev.id!)} className="space-y-4">
                                  <div className="bg-blue-100 p-3 rounded-xl border-2 border-blue-200">
                                     <label className="text-[9px] font-black uppercase text-blue-800 flex items-center gap-1 mb-2"><MapPin size={12}/> Onde mostrar o cartaz?</label>
                                     <input name="targetZips" required type="text" placeholder="CPs (Ex: 4000, 4400)" className="w-full p-2 rounded-lg text-xs font-bold outline-none border border-blue-300" />
                                  </div>
                                  <button type="submit" disabled={loadingId === ev.id} className="w-full bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] flex justify-center gap-2 hover:bg-blue-600 transition-colors">
                                     {loadingId === ev.id ? <Loader2 className="animate-spin" size={16}/> : <><CheckCircle size={16}/> Aprovar Público</>}
                                  </button>
                                  <button type="button" onClick={() => handleDelete(ev.id!)} className="w-full bg-white text-red-500 border-2 border-red-100 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-50 transition-colors">
                                     Recusar e Apagar
                                  </button>
                              </form>
                          ) : (
                              <div className="space-y-4 h-full flex flex-col">
                                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                                     <p className="text-[10px] font-black uppercase text-green-700 mb-1">Aprovado e Online</p>
                                     <p className="text-xs font-bold text-green-800">Alvo: {ev.targetZips?.join(', ')}</p>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-100 mt-auto">
                                     <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Info size={12}/> Será apagado em: {ev.endDate.toDate().toLocaleDateString()}</p>
                                  </div>
                                  <button onClick={() => handleDelete(ev.id!)} className="w-full bg-red-50 text-red-500 border-2 border-red-100 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                                     <Trash2 size={16}/> Remover Agora
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              {events.length === 0 && <p className="text-center text-slate-400 font-bold p-10 border-4 border-dashed border-slate-200 rounded-[30px]">Sem eventos registados.</p>}
           </div>
        </div>
    </div>
  );
};

export default AdminEvents;