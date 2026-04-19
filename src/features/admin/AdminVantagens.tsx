import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Crown, Image as ImageIcon, Plus, Trash2, MapPin, Globe, Loader2, Tag, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Vantagem } from '../../types';
import { useStore } from '../../store/useStore';

const AdminVantagens: React.FC = () => {
  const { locations } = useStore();
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    partnerName: '', category: '', address: '', websiteUrl: '', description: '', imageBase64: ''
  });

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  useEffect(() => {
    const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setVantagens(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vantagem)));
    });
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > 800) { height = Math.round((height * 800) / width); width = 800; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setFormData(prev => ({ ...prev, imageBase64: canvas.toDataURL('image/jpeg', 0.8) }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageBase64 || !formData.partnerName || !formData.description) return toast.error("Preencha os campos obrigatórios (Nome, Descrição e Imagem).");
    if (targetZones.length === 0) return toast.error("Adicione pelo menos uma Zona Geográfica de destino.");

    setUploading(true);
    try {
      await addDoc(collection(db, 'vantagens'), {
        ...formData,
        targetZones: targetZones,
        isActive: true,
        createdAt: serverTimestamp()
      });

      toast.success("Vantagem VIP publicada com sucesso!");
      setFormData({ partnerName: '', category: '', address: '', websiteUrl: '', description: '', imageBase64: '' });
      setTargetZones([]); setDistrito('');
      
      const fileInput = document.getElementById('vantagemImageInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) { toast.error("Erro ao publicar."); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar este parceiro das vantagens exclusivas?")) return;
    try { await deleteDoc(doc(db, 'vantagens', id)); toast.success("Vantagem removida."); } catch (error) { toast.error("Erro ao eliminar."); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-amber-50 border-4 border-amber-200 p-8 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-6 shadow-md">
          <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-amber-900 mb-2 flex items-center gap-2"><Crown size={24} className="text-amber-500"/> Página Pública VIP</h3>
              <p className="text-sm font-bold text-amber-800">Copia o link abaixo e partilha nas redes sociais para atrair clientes.</p>
          </div>
          <a href={`${window.location.origin}/vantagens`} target="_blank" rel="noreferrer" className="bg-amber-500 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 text-center whitespace-nowrap">
              Aceder à Página <ExternalLink size={18} />
          </a>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Adicionar Novo Parceiro VIP</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div><label className="text-[10px] font-black uppercase text-slate-400">Nome do Parceiro</label><input required type="text" value={formData.partnerName} onChange={e=>setFormData({...formData, partnerName: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]"/></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Categoria (Ex: Saúde, Lazer)</label><div className="relative"><Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input required type="text" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]"/></div></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Morada Exata (Opcional)</label><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="text" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none focus:border-[#0a2540]"/></div></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Website / Link (Opcional)</label><div className="relative"><Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="url" placeholder="https://..." value={formData.websiteUrl} onChange={e=>setFormData({...formData, websiteUrl: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none focus:border-[#0a2540]"/></div></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Texto Explicativo das Vantagens</label><textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="Descreva as vantagens exclusivas para os membros Vizinho+..." className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-[#0a2540] min-h-[100px] resize-none"></textarea></div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[30px] border-4 border-slate-100 mb-6">
           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Filtro de Localização (Quem tem acesso)</h4>
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
             <div className="mt-4 flex flex-wrap gap-2 bg-white p-4 rounded-2xl border-2 border-slate-200">
               {targetZones.map((z, idx) => (
                 <span key={idx} className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 border border-amber-200">
                   {z} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_, i) => i !== idx))}/>
                 </span>
               ))}
             </div>
           )}
        </div>

        <div><label className="text-[10px] font-black uppercase text-slate-400">Fotografia / Logotipo</label><div className="relative"><ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/><input id="vantagemImageInput" required type="file" accept="image/*" onChange={handleFileChange} className="w-full pl-12 p-4 border-4 border-dashed border-slate-200 rounded-3xl font-bold text-xs"/></div></div>

        <button disabled={uploading} className="mt-8 w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1 border-b-4 border-black/50">
          {uploading ? <Loader2 className="animate-spin" /> : <Plus size={24} strokeWidth={3} />} Publicar Vantagem VIP
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vantagens.map(v => {
          const zones = (v as any).targetZones || [];
          return (
            <div key={v.id} className="bg-white border-4 border-slate-100 rounded-[40px] overflow-hidden relative shadow-md flex flex-col hover:border-amber-500 transition-colors">
              <div className="h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img src={v.imageBase64} className="w-full h-full object-cover" alt="Partner" />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                      <p className="font-black text-lg uppercase italic text-[#0a2540] leading-tight">{v.partnerName}</p>
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{v.category}</span>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mb-4 max-h-24 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Zonas de Acesso:</p>
                     {zones.map((z: string, i: number) => <span key={i} className="text-[9px] font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">{z}</span>)}
                     {zones.length === 0 && <span className="text-[9px] text-red-500 font-bold uppercase">Sem zona (Erro)</span>}
                  </div>

                  <p className="text-xs font-bold text-slate-600 mb-6 flex-grow whitespace-pre-wrap">{v.description}</p>
                  
                  <button onClick={() => handleDelete(v.id!)} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 mt-auto border-2 border-transparent hover:border-red-600">
                      <Trash2 size={16} /> Eliminar Parceiro
                  </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AdminVantagens;