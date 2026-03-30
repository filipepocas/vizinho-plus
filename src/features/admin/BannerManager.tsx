import React, { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Image as ImageIcon, Plus, Trash2, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    file: null as File | null
  });

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.startDate || !formData.endDate) {
      toast.error("Preencha todos os campos e escolha uma imagem.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${formData.file.name}`);
      await uploadBytes(storageRef, formData.file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'banners'), {
        title: formData.title || 'Sem título',
        imageUrl: url,
        storagePath: storageRef.fullPath,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: true,
        createdAt: serverTimestamp()
      });

      toast.success("Banner agendado com sucesso!");
      setFormData({ title: '', startDate: '', endDate: '', file: null });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar banner.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!window.confirm("Eliminar este banner permanentemente?")) return;
    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }
      await deleteDoc(doc(db, 'banners', id));
      toast.success("Banner removido.");
    } catch (error) {
      toast.error("Erro ao eliminar.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540] shadow-md">
            <ImageIcon size={24} strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540]">Marketing & Banners</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Título do Banner</label>
              <input 
                type="text" placeholder="EX: PROMOÇÃO DE PÁSCOA" 
                className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Imagem (Recomendado: 1200x400px)</label>
              <input 
                type="file" accept="image/*" 
                className="w-full p-4 border-4 border-dashed border-slate-200 rounded-3xl font-bold text-[10px]"
                onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})}
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    <Calendar size={14} /> Data de Início
                  </label>
                  <input 
                    type="datetime-local" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]"
                    value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
               </div>
               <div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                    <Clock size={14} /> Data de Fim
                  </label>
                  <input 
                    type="datetime-local" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]"
                    value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
               </div>
            </div>
          </div>
        </div>

        <button 
          disabled={uploading}
          className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1"
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Plus size={24} strokeWidth={3} />} Agendar Publicação
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {banners.length > 0 ? banners.map(banner => {
          const now = new Date();
          const isLive = now >= banner.startDate.toDate() && now <= banner.endDate.toDate();
          
          return (
            <div key={banner.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] overflow-hidden relative group shadow-[8px_8px_0px_#0a2540]">
              <div className="h-44 relative">
                <img src={banner.imageUrl} className="w-full h-full object-cover" alt="" />
                <div className={`absolute top-4 left-4 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border-2 shadow-lg ${isLive ? 'bg-green-500 text-white border-white' : 'bg-slate-200 text-slate-500 border-white'}`}>
                  {isLive ? '● Live' : 'Agendado'}
                </div>
              </div>
              <div className="p-6">
                <p className="font-black text-xs uppercase italic text-[#0a2540] mb-3">{banner.title}</p>
                <div className="space-y-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <p>Início: {banner.startDate.toDate().toLocaleString()}</p>
                  <p>Fim: {banner.endDate.toDate().toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleDelete(banner.id, banner.storagePath)}
                  className="mt-6 w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[9px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Eliminar Banner
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-300">
             <AlertCircle size={48} className="mx-auto mb-4" />
             <p className="font-black uppercase tracking-widest text-xs">Nenhum banner agendado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerManager;