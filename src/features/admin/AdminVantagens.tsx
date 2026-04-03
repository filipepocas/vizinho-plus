import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Crown, Image as ImageIcon, Plus, Trash2, MapPin, Globe, Loader2, Tag, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Vantagem } from '../../types';

const AdminVantagens: React.FC = () => {
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    partnerName: '',
    category: '',
    address: '',
    zipCode: '',
    websiteUrl: '',
    description: '',
    imageBase64: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setVantagens(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vantagem)));
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Comprime a imagem para poupar espaço
        if (width > 800) {
          height = Math.round((height * 800) / width);
          width = 800;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, imageBase64: compressedBase64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageBase64 || !formData.partnerName || !formData.description) {
      toast.error("Preencha os campos obrigatórios (Nome, Descrição e Imagem).");
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, 'vantagens'), {
        ...formData,
        createdAt: serverTimestamp()
      });

      toast.success("Vantagem publicada com sucesso!");
      setFormData({ partnerName: '', category: '', address: '', zipCode: '', websiteUrl: '', description: '', imageBase64: '' });
      
      const fileInput = document.getElementById('vantagemImageInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      toast.error("Erro ao publicar. Tenta novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar este parceiro das vantagens exclusivas?")) return;
    try {
      await deleteDoc(doc(db, 'vantagens', id));
      toast.success("Vantagem removida.");
    } catch (error) {
      toast.error("Erro ao eliminar.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* LINK PARTILHÁVEL */}
      <div className="bg-amber-50 border-4 border-amber-200 p-8 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-amber-900 mb-2 flex items-center gap-2">
                  <Crown size={24} className="text-amber-500"/> Página Pública VIP
              </h3>
              <p className="text-sm font-bold text-amber-800">Copia o link abaixo e partilha nas redes sociais para atrair clientes.</p>
          </div>
          <a href={`${window.location.origin}/vantagens`} target="_blank" rel="noreferrer" className="bg-amber-500 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 text-center">
              Aceder à Página <ExternalLink size={18} />
          </a>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Adicionar Novo Parceiro VIP</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="text-[10px] font-black uppercase text-slate-400">Nome do Parceiro</label><input required type="text" value={formData.partnerName} onChange={e=>setFormData({...formData, partnerName: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]"/></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Categoria da Oferta (Ex: Saúde, Lazer)</label><div className="relative"><Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input required type="text" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]"/></div></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Morada (Opcional)</label><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="text" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none focus:border-[#0a2540]"/></div></div>
            <div><label className="text-[10px] font-black uppercase text-slate-400">Cód. Postal (4 Primeiros Dígitos)</label><input type="text" maxLength={4} placeholder="Ex: 4000" value={formData.zipCode} onChange={e=>setFormData({...formData, zipCode: e.target.value.replace(/\D/g, '')})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]"/></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Website / Link (Opcional)</label><div className="relative"><Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="url" placeholder="https://..." value={formData.websiteUrl} onChange={e=>setFormData({...formData, websiteUrl: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none focus:border-[#0a2540]"/></div></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Texto Explicativo das Vantagens</label><textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="Descreva as vantagens exclusivas para os membros Vizinho+..." className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-[#0a2540] min-h-[100px] resize-none"></textarea></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Fotografia / Logotipo</label><div className="relative"><ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/><input id="vantagemImageInput" required type="file" accept="image/*" onChange={handleFileChange} className="w-full pl-12 p-4 border-4 border-dashed border-slate-200 rounded-3xl font-bold text-xs"/></div></div>
        </div>

        <button disabled={uploading} className="mt-8 w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1">
          {uploading ? <Loader2 className="animate-spin" /> : <Plus size={24} strokeWidth={3} />} Publicar Vantagem
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vantagens.map(v => (
          <div key={v.id} className="bg-white border-4 border-slate-100 rounded-[40px] overflow-hidden relative shadow-md flex flex-col hover:border-[#00d66f] transition-colors">
            <div className="h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                <img src={v.imageBase64} className="w-full h-full object-cover" alt="Partner" />
            </div>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-black text-lg uppercase italic text-[#0a2540] leading-tight">{v.partnerName}</p>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{v.category}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4"><MapPin size={10} className="inline mr-1"/> {v.zipCode ? `CP: ${v.zipCode}` : 'Global'}</p>
                <p className="text-xs font-bold text-slate-600 mb-6 flex-grow whitespace-pre-wrap">{v.description}</p>
                
                <button onClick={() => handleDelete(v.id!)} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 mt-auto">
                    <Trash2 size={16} /> Eliminar
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminVantagens;