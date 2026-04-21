import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { FileText, Plus, Trash2, Loader2, ExternalLink, X, Image as ImageIcon, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign } from '../../types';
import { useStore } from '../../store/useStore';

const AdminLeaflets: React.FC = () => {
  const { locations } = useStore();
  const [leaflets, setLeaflets] = useState<LeafletCampaign[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', startDate: '', endDate: '', limitDate: '', leafletUrl: '', imageBase64: '' });
  
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'leaflet_campaigns'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap: any) => {
      setLeaflets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as LeafletCampaign)));
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
        setFormData(prev => ({...prev, imageBase64: ev.target?.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.limitDate) return toast.error("O título e a data limite de adesão são obrigatórios.");
    
    setUploading(true);
    try {
      await addDoc(collection(db, 'leaflet_campaigns'), {
        title: formData.title,
        leafletUrl: formData.leafletUrl || '',
        imageUrl: formData.imageBase64 || '', 
        startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        limitDate: Timestamp.fromDate(new Date(formData.limitDate)),
        targetZones: targetZones,
        isActive: true,
        createdAt: serverTimestamp()
      });
      toast.success("Folheto/Vaga criada com sucesso!");
      setFormData({ title: '', startDate: '', endDate: '', limitDate: '', leafletUrl: '', imageBase64: '' });
      setTargetZones([]); setDistrito('');
      const fileInput = document.getElementById('leafletCoverInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) { toast.error("Erro ao agendar."); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Atenção! Ao eliminar este folheto, os pedidos de lojistas associados a ele ficarão sem referência. Deseja mesmo eliminar?")) return;
    await deleteDoc(doc(db, 'leaflet_campaigns', id));
    toast.success("Folheto eliminado!");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-400 p-4 rounded-2xl border-4 border-[#0a2540] text-[#0a2540]"><FileText size={28} strokeWidth={3} /></div>
          <div>
            <h3 className="text-2xl font-black uppercase italic text-[#0a2540] leading-none">Gestão de Folhetos</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Abertura de Vagas e Planeamento de Edições</p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="bg-slate-50 border-4 border-slate-100 p-8 rounded-3xl space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-[#0a2540] ml-2 tracking-widest">1. Nome da Edição</label>
                    <input type="text" placeholder="Ex: Folheto Regresso às Aulas (Set/2026)" required className="w-full p-4 bg-white border-2 border-emerald-200 rounded-2xl text-xs uppercase font-black outline-none focus:border-emerald-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-[#0a2540] ml-2 tracking-widest">2. Limite de Adesões (Até quando o lojista pode pedir)</label>
                    <input type="date" required className="w-full p-4 bg-white border-2 border-emerald-200 rounded-2xl text-xs uppercase font-black outline-none focus:border-emerald-500" value={formData.limitDate} onChange={e => setFormData({...formData, limitDate: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-200">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Data de Início do Folheto (Opcional nesta fase)</label>
                    <input type="date" className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Data de Fim (Opcional)</label>
                    <input type="date" className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-200 space-y-4">
                <label className="text-[10px] font-black uppercase text-[#0a2540] ml-2 tracking-widest flex items-center gap-2"><MapPin size={14}/> 3. Zonas Alvo (Para quem fica visível?)</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-emerald-100 focus:border-emerald-500">
                     <option value="">Todos (Ou escolha Distrito)</option>
                     {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-emerald-100 focus:border-emerald-500 disabled:opacity-50">
                     <option value="">Todo o Distrito (Ou selecione Concelho)</option>
                     {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-emerald-100 focus:border-emerald-500 disabled:opacity-50">
                     <option value="">Todo o Concelho (Ou selecione Freguesia)</option>
                     {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-[#0a2540] text-emerald-400 p-4 rounded-2xl font-black uppercase text-[10px] disabled:opacity-50 hover:bg-black transition-colors">Adicionar Zona</button>
               </div>
               
               {targetZones.length > 0 && (
                 <div className="flex flex-wrap gap-2 bg-white p-4 rounded-2xl border-2 border-emerald-100">
                   {targetZones.map((z, idx) => (
                     <span key={idx} className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-emerald-300">
                       {z} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_, i) => i !== idx))}/>
                     </span>
                   ))}
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-200 items-center">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Link do PDF/Folheto Final (Opcional na Abertura)</label>
                    <input type="url" placeholder="HTTPS://..." className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500" value={formData.leafletUrl} onChange={e => setFormData({...formData, leafletUrl: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Imagem de Capa (Opcional)</label>
                    <input id="leafletCoverInput" type="file" accept="image/*" onChange={handleImageChange} className="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs" />
                </div>
            </div>

            <button disabled={uploading} className="mt-8 w-full bg-emerald-500 text-white p-6 rounded-3xl font-black uppercase text-sm flex justify-center items-center gap-4 shadow-xl hover:bg-emerald-600 transition-colors border-b-4 border-emerald-700">
              {uploading ? <Loader2 className="animate-spin" /> : <><Plus size={24} strokeWidth={3} /> Abrir Vagas no Folheto</>}
            </button>
        </form>

      </div>

      {/* LISTAGEM DE FOLHETOS / VAGAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {leaflets.map(leaflet => {
          const limit = leaflet.limitDate && typeof leaflet.limitDate.toDate === 'function' ? leaflet.limitDate.toDate() : new Date();
          const start = leaflet.startDate && typeof leaflet.startDate.toDate === 'function' ? leaflet.startDate.toDate() : null;
          const end = leaflet.endDate && typeof leaflet.endDate.toDate === 'function' ? leaflet.endDate.toDate() : null;
          
          const isClosed = new Date() > limit;
          const zones = (leaflet as any).targetZones || [];
          
          return (
            <div key={leaflet.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] shadow-[8px_8px_0px_#0a2540] p-6 flex flex-col group hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-100 p-4 rounded-2xl text-[#0a2540]"><FileText size={32} /></div>
                <div className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border-2 shadow-sm ${isClosed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse'}`}>
                    {isClosed ? 'Vagas Fechadas' : 'Vagas Abertas'}
                </div>
              </div>
              <p className="font-black text-lg uppercase italic text-[#0a2540] mb-3 truncate">{leaflet.title}</p>
              
              <div className="text-[10px] font-black text-[#0a2540] uppercase bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 mb-4 space-y-1">
                <p className="flex justify-between"><span className="text-emerald-700">Adesões até:</span> <span>{limit.toLocaleDateString()}</span></p>
                {start && end && <p className="flex justify-between mt-2 pt-2 border-t border-emerald-200"><span className="text-emerald-700">Duração:</span> <span>{start.toLocaleDateString()} - {end.toLocaleDateString()}</span></p>}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mb-6 flex-grow">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Visível nas Zonas:</p>
                 <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {zones.map((z: string, i: number) => (
                      <span key={i} className="text-[8px] font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 truncate" title={z}>{z}</span>
                    ))}
                    {zones.length === 0 && <span className="text-[8px] font-bold text-[#0a2540] uppercase">Todas as Zonas (Global)</span>}
                 </div>
              </div>

              <div className="flex gap-3 mt-auto">
                {leaflet.leafletUrl ? (
                    <a href={leaflet.leafletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-4 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-[10px] flex justify-center items-center gap-2 hover:bg-black transition-colors"><ExternalLink size={14} /> Ver Final</a>
                ) : (
                    <span className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[9px] flex justify-center items-center text-center leading-none">PDF Indisponível</span>
                )}
                <button onClick={() => handleDelete(leaflet.id!)} className="px-5 bg-red-50 text-red-500 rounded-2xl flex justify-center items-center hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
        {leaflets.length === 0 && (
           <div className="col-span-full py-12 bg-white rounded-[40px] border-4 border-dashed border-slate-200 text-center">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sem edições de folhetos no sistema.</p>
           </div>
        )}
      </div>
    </div>
  );
};
export default AdminLeaflets;