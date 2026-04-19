import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { FileText, Plus, Trash2, Calendar, Clock, Loader2, AlertCircle, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Leaflet } from '../../types';
import { useStore } from '../../store/useStore';

const AdminLeaflets: React.FC = () => {
  const { locations } = useStore();
  const [leaflets, setLeaflets] = useState<Leaflet[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', startDate: '', endDate: '', leafletUrl: '' });
  
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'leaflets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setLeaflets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Leaflet)));
    });
  }, []);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  const handleAddZone = () => {
    let target = '';
    if (freguesia) target = `Freguesia: ${freguesia} (${concelho})`;
    else if (concelho) target = `Concelho: ${concelho} (${distrito})`;
    else if (distrito) target = `Distrito: ${distrito}`;

    if (target && !targetZones.includes(target)) {
      setTargetZones([...targetZones, target]);
      setConcelho(''); setFreguesia('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leafletUrl || !formData.startDate || !formData.endDate) return;
    if (targetZones.length === 0) return toast.error("Selecione pelo menos uma Zona de Destino.");
    
    setUploading(true);
    try {
      await addDoc(collection(db, 'leaflets'), {
        title: formData.title || 'Folheto de Oportunidades',
        leafletUrl: formData.leafletUrl,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: true,
        targetZones: targetZones, // Salva o array de zonas
        createdAt: serverTimestamp()
      });
      toast.success("Folheto Agendado com sucesso!");
      setFormData({ title: '', startDate: '', endDate: '', leafletUrl: '' });
      setTargetZones([]);
      setDistrito('');
    } catch (error) { toast.error("Erro ao agendar."); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar permanentemente este folheto?")) return;
    await deleteDoc(doc(db, 'leaflets', id));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540] shadow-md"><FileText size={24} strokeWidth={3} /></div>
          <h3 className="text-2xl font-black uppercase italic text-[#0a2540]">Lançamento de Folhetos</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <input type="text" placeholder="TÍTULO DO FOLHETO" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs uppercase font-black outline-none focus:border-[#0a2540]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <input type="url" placeholder="LINK (HTTPS://...)" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black outline-none focus:border-[#0a2540]" value={formData.leafletUrl} onChange={e => setFormData({...formData, leafletUrl: e.target.value})} />
          <div className="relative"><label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black uppercase text-[#0a2540]">Início</label><input type="datetime-local" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black outline-none focus:border-[#0a2540]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
          <div className="relative"><label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black uppercase text-[#0a2540]">Fim / Ocultar</label><input type="datetime-local" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black outline-none focus:border-[#0a2540]" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} /></div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[30px] border-4 border-slate-100">
           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Público Alvo (Quem vai ver o Folheto)</h4>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f]">
                 <option value="">Distrito</option>
                 {distritos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                 <option value="">Todo o Distrito (Ou selecione Concelho)</option>
                 {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                 <option value="">Todo o Concelho (Ou selecione Freguesia)</option>
                 {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-[10px] disabled:opacity-50 hover:bg-black transition-colors">Adicionar Zona</button>
           </div>
           
           {targetZones.length > 0 && (
             <div className="mt-6 flex flex-wrap gap-2 bg-white p-4 rounded-2xl border-2 border-slate-200">
               {targetZones.map((z, idx) => (
                 <span key={idx} className="bg-[#00d66f]/20 text-[#0a2540] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-[#00d66f]/30">
                   {z} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_, i) => i !== idx))}/>
                 </span>
               ))}
             </div>
           )}
        </div>

        <button disabled={uploading} className="mt-8 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm flex justify-center gap-4 shadow-xl hover:bg-black transition-colors border-b-4 border-black/40">
          {uploading ? <Loader2 className="animate-spin" /> : <><Plus size={24} strokeWidth={3} /> Agendar Publicação</>}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {leaflets.map(leaflet => {
          const start = leaflet.startDate && typeof leaflet.startDate.toDate === 'function' ? leaflet.startDate.toDate() : new Date();
          const end = leaflet.endDate && typeof leaflet.endDate.toDate === 'function' ? leaflet.endDate.toDate() : new Date();
          const isLive = new Date() >= start && new Date() <= end;
          const zones = (leaflet as any).targetZones || [];
          
          return (
            <div key={leaflet.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] shadow-[8px_8px_0px_#0a2540] p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540]"><FileText size={32} /></div>
                <div className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border-2 ${isLive ? 'bg-green-500 text-white border-green-600' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>{isLive ? '● Live' : 'Agendado'}</div>
              </div>
              <p className="font-black text-sm uppercase italic text-[#0a2540] mb-3 truncate">{leaflet.title}</p>
              
              <div className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mb-4 space-y-1">
                <p className="text-[#0a2540] mb-2">Período de Exibição:</p>
                <p>Início: {start.toLocaleString()}</p>
                <p>Fim: {end.toLocaleString()}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 mb-6 flex-grow">
                 <p className="text-[9px] font-black text-blue-800 uppercase mb-2">Zonas Alvo ({zones.length})</p>
                 <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {zones.map((z: string, i: number) => (
                      <span key={i} className="text-[8px] font-bold text-blue-700 bg-white px-2 py-1 rounded border border-blue-100 truncate" title={z}>{z}</span>
                    ))}
                    {zones.length === 0 && <span className="text-[8px] text-red-500 font-bold uppercase">Visível a Ninguém (Erro)</span>}
                 </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <a href={leaflet.leafletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-[10px] flex justify-center items-center gap-2 hover:bg-black transition-colors"><ExternalLink size={14} /> Abrir</a>
                <button onClick={() => handleDelete(leaflet.id!)} className="px-5 bg-red-50 text-red-500 rounded-2xl flex justify-center items-center hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AdminLeaflets;