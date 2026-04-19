import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { CalendarPlus, CheckCircle, Trash2, MapPin, Loader2, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppEvent } from '../../types';
import { useStore } from '../../store/useStore';

const AdminEvents: React.FC = () => {
  const { locations } = useStore();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Estados para seleção de zonas (Aprovação)
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [editingZones, setEditingZones] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const evs = snap.docs.map(d => ({id: d.id, ...d.data()} as AppEvent));
      setEvents(evs);
      
      const initialZones: Record<string, string[]> = {};
      evs.forEach(ev => {
        if (ev.status === 'pending' && !editingZones[ev.id!]) {
          initialZones[ev.id!] = (ev as any).targetZones || [];
        }
      });
      if(Object.keys(initialZones).length > 0) setEditingZones(prev => ({...prev, ...initialZones}));
    });
  }, []);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  const handleAddZone = (eventId: string) => {
    let target = '';
    if (freguesia) target = `Freguesia: ${freguesia} (${concelho})`;
    else if (concelho) target = `Concelho: ${concelho} (${distrito})`;
    else if (distrito) target = `Distrito: ${distrito}`;

    if (target) {
      const current = editingZones[eventId] || [];
      if (!current.includes(target)) {
        setEditingZones({...editingZones, [eventId]: [...current, target]});
        setConcelho(''); setFreguesia('');
      }
    }
  };

  const handleRemoveZone = (eventId: string, zoneToRemove: string) => {
    const current = editingZones[eventId] || [];
    setEditingZones({...editingZones, [eventId]: current.filter(z => z !== zoneToRemove)});
  };

  const handleApprove = async (eventId: string) => {
    const finalZones = editingZones[eventId] || [];
    if(finalZones.length === 0) return toast.error("Tem de definir pelo menos uma zona de destino.");

    setLoadingId(eventId);
    try {
        await updateDoc(doc(db, 'events', eventId), {
            status: 'approved',
            targetZones: finalZones
        });
        toast.success("Evento Aprovado e Publicado com sucesso!");
    } catch(err) { toast.error("Erro ao aprovar evento."); } finally { setLoadingId(null); }
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
              {events.map(ev => {
                  const currentZones = editingZones[ev.id!] || [];
                  const imageUrl = ev.imageUrl || (ev as any).imageBase64; // Correção da Imagem

                  return (
                    <div key={ev.id} className={`p-6 border-4 rounded-[30px] flex flex-col md:flex-row gap-6 ${ev.status === 'pending' ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-slate-200 bg-white'}`}>
                        <div className="w-full md:w-48 shrink-0 bg-white rounded-2xl border-4 border-slate-100 overflow-hidden flex items-center justify-center p-2 relative">
                          {ev.status === 'pending' && <span className="absolute top-2 left-2 bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded">AGUARDA APROVAÇÃO</span>}
                          {imageUrl ? (
                            <img src={imageUrl} alt="Cartaz" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-black text-slate-300">Sem Imagem</span>
                          )}
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

                        <div className="w-full md:w-80 shrink-0 flex flex-col justify-between border-t-2 md:border-t-0 md:border-l-2 border-slate-200 pt-4 md:pt-0 md:pl-6">
                            {ev.status === 'pending' ? (
                                <div className="space-y-4">
                                    <div className="bg-blue-100 p-4 rounded-2xl border-2 border-blue-200">
                                      <label className="text-[9px] font-black uppercase text-blue-800 flex items-center gap-1 mb-3"><MapPin size={12}/> Onde mostrar o cartaz?</label>
                                      
                                      <div className="space-y-2 mb-3">
                                        <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-2 rounded-lg text-[10px] font-bold outline-none border border-blue-300">
                                          <option value="">Distrito</option>
                                          {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-2 rounded-lg text-[10px] font-bold outline-none border border-blue-300 disabled:opacity-50">
                                          <option value="">Todo o Distrito (Ou escolha um Concelho)</option>
                                          {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-2 rounded-lg text-[10px] font-bold outline-none border border-blue-300 disabled:opacity-50">
                                          <option value="">Todo o Concelho (Ou escolha uma Freguesia)</option>
                                          {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                        <button type="button" onClick={() => handleAddZone(ev.id!)} disabled={!distrito} className="w-full bg-blue-500 text-white p-2 rounded-lg font-black uppercase text-[9px] disabled:opacity-50 hover:bg-blue-600 transition-colors">Adicionar Destino</button>
                                      </div>

                                      {currentZones.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {currentZones.map((z, idx) => (
                                            <span key={idx} className="bg-white text-blue-700 px-2 py-1 rounded-md text-[8px] font-black uppercase flex items-center gap-1 shadow-sm">
                                              {z} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveZone(ev.id!, z)}/>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[9px] text-red-500 font-bold mt-2">Nenhuma zona definida.</p>
                                      )}
                                    </div>
                                    <button onClick={() => handleApprove(ev.id!)} disabled={loadingId === ev.id} className="w-full bg-blue-500 text-white p-4 rounded-xl font-black uppercase text-[10px] flex justify-center gap-2 hover:bg-blue-600 transition-colors shadow-md">
                                      {loadingId === ev.id ? <Loader2 className="animate-spin" size={16}/> : <><CheckCircle size={16}/> Aprovar Público</>}
                                    </button>
                                    <button type="button" onClick={() => handleDelete(ev.id!)} className="w-full bg-white text-red-500 border-2 border-red-100 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-red-50 transition-colors">
                                      Recusar e Apagar
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                                      <p className="text-[10px] font-black uppercase text-green-700 mb-2">Aprovado e Online</p>
                                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {((ev as any).targetZones || []).map((z: string, i: number) => (
                                          <span key={i} className="text-[9px] font-bold text-green-800 bg-white px-2 py-1 rounded border border-green-100">{z}</span>
                                        ))}
                                      </div>
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
                  )
              })}
              {events.length === 0 && <p className="text-center text-slate-400 font-bold p-10 border-4 border-dashed border-slate-200 rounded-[30px] uppercase text-xs">Sem eventos registados.</p>}
           </div>
        </div>
    </div>
  );
};

export default AdminEvents;