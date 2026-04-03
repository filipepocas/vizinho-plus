import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDoc, doc } from 'firebase/firestore';
import { Megaphone, Image as ImageIcon, FileText, Send, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign, MarketingRequest } from '../../../types';

interface Props {
  merchantId: string;
  merchantName: string;
}

const MerchantMarketing: React.FC<Props> = ({ merchantId, merchantName }) => {
  const [activeTab, setActiveTab] = useState<'banner' | 'leaflet' | 'history'>('banner');
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [myRequests, setMyRequests] = useState<MarketingRequest[]>([]);
  
  // Tabela de Preços do Admin
  const [prices, setPrices] = useState<any>({});

  const [bannerForm, setBannerForm] = useState({ text: '', date: '', imageBase64: '' });
  const [leafletForm, setLeafletForm] = useState({ campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '' });

  useEffect(() => {
    // Carrega preços
    const fetchPrices = async () => {
      const docSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (docSnap.exists()) setPrices(docSnap.data());
    };
    fetchPrices();

    // Campanhas ativas
    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => {
        const now = new Date();
        const valid = snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign))
                               .filter(c => c.limitDate.toDate() > now);
        setCampaigns(valid);
    });

    // Meus Pedidos
    const qReq = query(collection(db, 'marketing_requests'), where('merchantId', '==', merchantId));
    const unsubReq = onSnapshot(qReq, (snap) => {
        setMyRequests(
          snap.docs
            .map(d => ({id: d.id, ...d.data()} as MarketingRequest))
            .sort((a, b) => {
              const timeA = a.createdAt?.toDate().getTime() || 0;
              const timeB = b.createdAt?.toDate().getTime() || 0;
              return timeB - timeA;
            })
        );
    });

    return () => { unsubCam(); unsubReq(); };
  }, [merchantId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setBannerForm(prev => ({...prev, imageBase64: ev.target?.result as string})) };
    reader.readAsDataURL(file);
  };

  const getPriceText = (key: string) => {
      return prices[key] ? `(${prices[key]})` : '(Preço sob consulta)';
  };

  const submitBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqDate = new Date(bannerForm.date);
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 48);

    if (reqDate < minDate) {
        toast.error("O pedido de banner tem de ser feito com 48h de antecedência.");
        return;
    }

    setLoading(true);
    try {
        await addDoc(collection(db, 'marketing_requests'), {
            merchantId, merchantName, type: 'banner', status: 'pending',
            text: bannerForm.text, imageUrl: bannerForm.imageBase64, requestedDate: bannerForm.date,
            createdAt: serverTimestamp()
        });
        toast.success("Pedido de Banner enviado com sucesso!");
        setBannerForm({text:'', date:'', imageBase64:''});
        setActiveTab('history');
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  const submitLeaflet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leafletForm.campaignId) { toast.error("Selecione um folheto previsto."); return; }

    const camp = campaigns.find(c => c.id === leafletForm.campaignId);

    setLoading(true);
    try {
        await addDoc(collection(db, 'marketing_requests'), {
            merchantId, merchantName, type: 'leaflet', status: 'pending',
            leafletCampaignId: leafletForm.campaignId, leafletCampaignTitle: camp?.title,
            spaceType: leafletForm.spaceType, description: leafletForm.description,
            sellPrice: leafletForm.sellPrice, unit: leafletForm.unit,
            promoPrice: leafletForm.promoPrice, promoType: leafletForm.promoType,
            createdAt: serverTimestamp()
        });
        toast.success("Pedido de espaço no Folheto enviado com sucesso!");
        setLeafletForm({campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: ''});
        setActiveTab('history');
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] animate-in fade-in">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Pedir Publicidade</h3>
        
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('banner')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}>
               <ImageIcon size={16} className="inline mr-2"/> Pedir Banner
            </button>
            <button onClick={() => setActiveTab('leaflet')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'leaflet' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}>
               <FileText size={16} className="inline mr-2"/> Entrar no Folheto
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'history' ? 'bg-[#0a2540] text-white border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}>
               <Megaphone size={16} className="inline mr-2"/> Meus Pedidos
            </button>
        </div>

        {activeTab === 'banner' && (
            <form onSubmit={submitBanner} className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 mb-6">
                    <p className="text-blue-800 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Banners rotativos na App {getPriceText('banner')}</p>
                    <p className="text-[10px] mt-2 text-blue-600 font-bold">Os banners devem ter preferencialmente 1000px(largura) x 500px(altura) e pedidos com 48h de antecedência.</p>
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Texto Opcional</label><input type="text" value={bannerForm.text} onChange={e=>setBannerForm({...bannerForm, text: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Data de Início Pretendida</label><input required type="date" value={bannerForm.date} onChange={e=>setBannerForm({...bannerForm, date: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Imagem do Banner</label><input required type="file" accept="image/*" onChange={handleImageChange} className="w-full p-4 border-4 border-dashed border-slate-200 rounded-2xl font-bold text-xs"/></div>
                <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-[#0a2540]">
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20}/>} Enviar Pedido
                </button>
            </form>
        )}

        {activeTab === 'leaflet' && (
            <form onSubmit={submitLeaflet} className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Selecione o Folheto</label>
                    <select required value={leafletForm.campaignId} onChange={e=>setLeafletForm({...leafletForm, campaignId: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-[#00d66f]">
                        <option value="">(Escolha um Folheto Futuro)</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.title} (Fecha a: {c.limitDate.toDate().toLocaleDateString()})</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Espaço Pretendido (Selecione o tamanho/local)</label>
                    <select required value={leafletForm.spaceType} onChange={e=>setLeafletForm({...leafletForm, spaceType: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]">
                        <option value="leaflet_capa_destaque">Capa Principal - Destaque {getPriceText('leaflet_capa_destaque')}</option>
                        <option value="leaflet_capa_normal">Capa - Tamanho Normal {getPriceText('leaflet_capa_normal')}</option>
                        <option value="leaflet_contracapa">Contracapa - Parte Traseira {getPriceText('leaflet_contracapa')}</option>
                        <option value="leaflet_interior_full">Interior - Página Inteira {getPriceText('leaflet_interior_full')}</option>
                        <option value="leaflet_interior_1_2">Interior - 1/2 (Meia Página) {getPriceText('leaflet_interior_1_2')}</option>
                        <option value="leaflet_interior_1_4">Interior - 1/4 (Quarto de Página) {getPriceText('leaflet_interior_1_4')}</option>
                    </select>
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Descrição do Produto</label><input required type="text" value={leafletForm.description} onChange={e=>setLeafletForm({...leafletForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Preço de Venda (€)</label><input required type="text" value={leafletForm.sellPrice} onChange={e=>setLeafletForm({...leafletForm, sellPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Unidade (ex: kg, uni)</label><input required type="text" value={leafletForm.unit} onChange={e=>setLeafletForm({...leafletForm, unit: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Preço Promocional (€ - Opcional)</label><input type="text" value={leafletForm.promoPrice} onChange={e=>setLeafletForm({...leafletForm, promoPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Tipo Campanha (Ex: L3P2)</label><input type="text" value={leafletForm.promoType} onChange={e=>setLeafletForm({...leafletForm, promoType: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-[#0a2540]">
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20}/>} Enviar Pedido
                </button>
            </form>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4">
                {myRequests.map(r => (
                    <div key={r.id} className="p-6 border-4 border-slate-100 rounded-3xl flex justify-between items-center">
                        <div>
                            <p className="font-black uppercase text-[#0a2540] text-sm">{r.type === 'banner' ? 'Pedido Banner' : `Folheto: ${r.leafletCampaignTitle}`}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{r.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                        </span>
                    </div>
                ))}
                {myRequests.length === 0 && <p className="text-center text-slate-400 font-black uppercase text-xs p-10 border-4 border-dashed border-slate-200 rounded-3xl">Sem pedidos efetuados.</p>}
            </div>
        )}
    </div>
  );
};

export default MerchantMarketing;