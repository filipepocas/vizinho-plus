import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { FileText, Plus, Trash2, Calendar, Clock, Loader2, AlertCircle, Link as LinkIcon, ExternalLink, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Leaflet } from '../../types';

const AdminLeaflets: React.FC = () => {
  const [leaflets, setLeaflets] = useState<Leaflet[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', startDate: '', endDate: '', leafletUrl: '', targetZips: '' });

  useEffect(() => {
    const q = query(collection(db, 'leaflets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setLeaflets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Leaflet)));
    });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leafletUrl || !formData.startDate || !formData.endDate) return;
    setUploading(true);
    try {
      const zipArray = formData.targetZips ? formData.targetZips.split(',').map(z => z.trim()).filter(z => z.length === 4) : [];
      await addDoc(collection(db, 'leaflets'), {
        title: formData.title || 'Folheto de Oportunidades',
        leafletUrl: formData.leafletUrl,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: true,
        targetZipCodes: zipArray,
        createdAt: serverTimestamp()
      });
      toast.success("Agendado!");
      setFormData({ title: '', startDate: '', endDate: '', leafletUrl: '', targetZips: '' });
    } catch (error) { toast.error("Erro."); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar permanentemente?")) return;
    await deleteDoc(doc(db, 'leaflets', id));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <form onSubmit={handleUpload} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540] shadow-md"><FileText size={24} strokeWidth={3} /></div>
          <h3 className="text-2xl font-black uppercase italic text-[#0a2540]">Oportunidades</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input type="text" placeholder="TÍTULO" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs uppercase font-black" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <input type="url" placeholder="LINK HTTPS://..." required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black" value={formData.leafletUrl} onChange={e => setFormData({...formData, leafletUrl: e.target.value})} />
          <input type="datetime-local" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          <input type="datetime-local" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs font-black" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
          <input type="text" placeholder="CÓDIGOS POSTAIS (EX: 4000, 4400)" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-xs uppercase font-black md:col-span-2" value={formData.targetZips} onChange={e => setFormData({...formData, targetZips: e.target.value})} />
        </div>
        <button disabled={uploading} className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm flex justify-center gap-4 shadow-xl">
          {uploading ? <Loader2 className="animate-spin" /> : <><Plus size={24} strokeWidth={3} /> Agendar Publicação</>}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {leaflets.map(leaflet => {
          // X4 - Fallback do Timestamp
          const start = leaflet.startDate && typeof leaflet.startDate.toDate === 'function' ? leaflet.startDate.toDate() : new Date();
          const end = leaflet.endDate && typeof leaflet.endDate.toDate === 'function' ? leaflet.endDate.toDate() : new Date();
          const isLive = new Date() >= start && new Date() <= end;
          
          return (
            <div key={leaflet.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] shadow-[8px_8px_0px_#0a2540] p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-100 p-4 rounded-2xl text-red-500"><FileText size={32} /></div>
                <div className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border-2 ${isLive ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{isLive ? '● Live' : 'Agendado'}</div>
              </div>
              <p className="font-black text-sm uppercase italic text-[#0a2540] mb-3 truncate">{leaflet.title}</p>
              <div className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 p-4 rounded-2xl border-2 mb-2">
                <p>Início: {start.toLocaleString()}</p>
                <p>Fim: {end.toLocaleString()}</p>
              </div>
              <div className="flex gap-3 mt-6">
                <a href={leaflet.leafletUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-[9px] flex justify-center gap-2"><ExternalLink size={14} /> Link</a>
                <button onClick={() => handleDelete(leaflet.id!)} className="px-4 bg-red-50 text-red-500 rounded-2xl flex justify-center items-center"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AdminLeaflets;