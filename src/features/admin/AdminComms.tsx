import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { Megaphone, Plus, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign, MarketingRequest } from '../../types';

const AdminComms: React.FC = () => {
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [form, setForm] = useState({ title: '', limitDate: '', distDate: '' });

  useEffect(() => {
    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('createdAt', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => setCampaigns(snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign))));

    const qReq = query(collection(db, 'marketing_requests'), orderBy('createdAt', 'desc'));
    const unsubReq = onSnapshot(qReq, (snap) => setRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as MarketingRequest))));

    return () => { unsubCam(); unsubReq(); };
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, 'leaflet_campaigns'), {
            title: form.title,
            limitDate: Timestamp.fromDate(new Date(form.limitDate)),
            distributionDate: Timestamp.fromDate(new Date(form.distDate)),
            createdAt: serverTimestamp()
        });
        toast.success("Campanha criada!");
        setForm({title:'', limitDate:'', distDate:''});
    } catch(err) { toast.error("Erro ao criar."); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
      try {
          await updateDoc(doc(db, 'marketing_requests', id), { status });
          toast.success("Estado atualizado.");
      } catch(err) { toast.error("Erro."); }
  };

  const handleDeleteRequest = async (id: string) => {
      if(!window.confirm("Eliminar este pedido permanentemente? (Liberta espaço)")) return;
      await deleteDoc(doc(db, 'marketing_requests', id));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
        
        {/* CRIAR FOLHETO */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6"><Megaphone className="inline mr-3 text-[#00d66f]"/> 1. Previsão de Folhetos</h3>
            <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Nome da Edição</label><input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Limite de Inscrição</label><input required type="date" value={form.limitDate} onChange={e=>setForm({...form, limitDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                <button type="submit" className="w-full bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-[#0a2540]"><Plus size={16}/> Adicionar</button>
            </form>

            <div className="mt-6 flex flex-wrap gap-4">
                {campaigns.map(c => (
                    <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                        <p className="font-black uppercase text-[#0a2540] text-sm">{c.title}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Limite: {c.limitDate.toDate().toLocaleDateString()}</p>
                        <button onClick={() => deleteDoc(doc(db, 'leaflet_campaigns', c.id!))} className="mt-2 text-red-500 text-[10px] font-black uppercase">Apagar Folheto</button>
                    </div>
                ))}
            </div>
        </div>

        {/* PEDIDOS DAS LOJAS */}
        <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6">2. Pedidos das Lojas Pendentes</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map(r => (
                    <div key={r.id} className="bg-white border-4 border-[#0a2540] p-6 rounded-[30px] shadow-[8px_8px_0px_#0a2540] relative">
                        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
                            <div>
                                <h4 className="font-black uppercase text-[#0a2540] text-lg leading-none">{r.merchantName}</h4>
                                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase mt-2 inline-block ${r.type === 'banner' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>Pedido de {r.type}</span>
                            </div>
                            <button onClick={() => handleDeleteRequest(r.id!)} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                        </div>
                        
                        <div className="space-y-2 mb-6 text-xs font-bold text-slate-600">
                            {r.type === 'banner' ? (
                                <>
                                    <p><b>Data:</b> {r.requestedDate}</p>
                                    <p><b>Texto:</b> {r.text}</p>
                                    {r.imageUrl && <img src={r.imageUrl} className="h-20 object-contain mt-2 border-2 rounded-lg" alt="Banner"/>}
                                </>
                            ) : (
                                <>
                                    <p><b>Folheto:</b> {r.leafletCampaignTitle}</p>
                                    <p><b>Espaço:</b> {r.spaceType}</p>
                                    <p><b>Produto:</b> {r.description}</p>
                                    <p><b>Preços:</b> {r.sellPrice} / {r.unit} (Promo: {r.promoPrice || 'N/A'} - {r.promoType || 'N/A'})</p>
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {r.status !== 'approved' && <button onClick={() => handleUpdateStatus(r.id!, 'approved')} className="flex-1 bg-[#00d66f] text-[#0a2540] p-3 rounded-xl font-black uppercase text-[10px]"><CheckCircle2 className="inline mr-1" size={14}/> Aprovar</button>}
                            {r.status !== 'rejected' && <button onClick={() => handleUpdateStatus(r.id!, 'rejected')} className="flex-1 bg-red-100 text-red-700 p-3 rounded-xl font-black uppercase text-[10px]"><XCircle className="inline mr-1" size={14}/> Rejeitar</button>}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <div className="col-span-full p-10 text-center text-slate-400 font-black text-xs uppercase bg-slate-50 border-4 border-dashed border-slate-200 rounded-[30px]"><AlertCircle className="mx-auto mb-2" size={32}/>Nenhum pedido de marketing.</div>}
            </div>
        </div>
    </div>
  );
};

export default AdminComms;