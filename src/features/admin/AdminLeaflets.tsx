import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { FileText, Plus, Trash2, Calendar, Clock, Loader2, AlertCircle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Leaflet } from '../../types';

const AdminLeaflets: React.FC = () => {
  const [leaflets, setLeaflets] = useState<Leaflet[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    leafletUrl: '' 
  });

  useEffect(() => {
    const q = query(collection(db, 'leaflets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setLeaflets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Leaflet)));
    });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leafletUrl || !formData.startDate || !formData.endDate) {
      toast.error("Preencha todos os campos e insira um link válido.");
      return;
    }

    setUploading(true);
    try {
      const startD = new Date(formData.startDate);
      const endD = new Date(formData.endDate);

      await addDoc(collection(db, 'leaflets'), {
        title: formData.title || 'Folheto de Oportunidades',
        leafletUrl: formData.leafletUrl,
        startDate: Timestamp.fromDate(startD),
        endDate: Timestamp.fromDate(endD),
        isActive: true,
        createdAt: serverTimestamp()
      });

      toast.success("Folheto/Link agendado com sucesso!");
      setFormData({ title: '', startDate: '', endDate: '', leafletUrl: '' });

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao agendar folheto. Tenta novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar este folheto permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'leaflets', id));
      toast.success("Folheto removido.");
    } catch (error) {
      toast.error("Erro ao eliminar.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540] shadow-md">
            <FileText size={24} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Grandes Oportunidades</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Ligar Folhetos / Oportunidades Externas</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Título do Folheto / Ação</label>
              <input type="text" placeholder="EX: FOLHETO MENSAL DE DESCONTOS" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Link do Folheto (Canva, Drive, Site, etc)</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="url" placeholder="https://..." className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]" value={formData.leafletUrl} onChange={e => setFormData({...formData, leafletUrl: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-2"><Calendar size={14} /> Data de Início</label>
                  <input required type="datetime-local" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
               </div>
               <div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-2"><Clock size={14} /> Data de Fim</label>
                  <input required type="datetime-local" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs outline-none focus:border-[#0a2540]" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
               </div>
            </div>
          </div>
        </div>

        <button disabled={uploading} className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1">
          {uploading ? <Loader2 className="animate-spin" /> : <Plus size={24} strokeWidth={3} />} Agendar Publicação
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {leaflets.length > 0 ? leaflets.map(leaflet => {
          const now = new Date();
          const isLive = now >= leaflet.startDate.toDate() && now <= leaflet.endDate.toDate();
          
          return (
            <div key={leaflet.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] overflow-hidden relative group shadow-[8px_8px_0px_#0a2540] p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-100 p-4 rounded-2xl text-red-500">
                    <FileText size={32} />
                </div>
                <div className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border-2 shadow-sm ${isLive ? 'bg-green-500 text-white border-white' : 'bg-slate-200 text-slate-500 border-white'}`}>
                  {isLive ? '● Live' : 'Agendado'}
                </div>
              </div>
              
              <p className="font-black text-sm uppercase italic text-[#0a2540] mb-3 truncate" title={leaflet.title}>{leaflet.title}</p>
              
              <div className="space-y-1 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                <p>Início: {leaflet.startDate.toDate().toLocaleString()}</p>
                <p>Fim: {leaflet.endDate.toDate().toLocaleString()}</p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <a href={leaflet.leafletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-[9px] hover:bg-black transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={14} /> Abrir Link
                </a>
                <button onClick={() => handleDelete(leaflet.id!)} className="px-4 py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[9px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-300">
             <AlertCircle size={48} className="mx-auto mb-4" />
             <p className="font-black uppercase tracking-widest text-xs">Nenhum folheto agendado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaflets;