import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { Megaphone, Image as ImageIcon, FileText, Send, Loader2, Bell, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign, MarketingRequest, PricingRule } from '../../../types';
import { useStore } from '../../../store/useStore';

interface Props {
  merchantId: string;
  merchantName: string;
  initialTab?: 'banner' | 'push' | 'leaflet';
}

const MerchantMarketing: React.FC<Props> = ({ merchantId, merchantName, initialTab = 'banner' }) => {
  const { locations } = useStore();
  const [activeTab, setActiveTab] = useState<'banner' | 'push' | 'leaflet' | 'history'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [myRequests, setMyRequests] = useState<MarketingRequest[]>([]);
  
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);

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

  const [bannerForm, setBannerForm] = useState({ text: '', startDate: '', endDate: '', imageBase64: '', targetType: 'all' });
  const [bannerSimulation, setBannerSimulation] = useState<{ count: number, cost: number, days: number } | null>(null);
  
  const [pushForm, setPushForm] = useState({ title: '', text: '', targetType: 'all', scheduledDate: '', scheduledTime: '10:00' });
  const [pushSimulation, setPushSimulation] = useState<{ count: number, cost: number, scheduledFor: Date } | null>(null);

  const [leafletForm, setLeafletForm] = useState({ campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: '' });
  const [leafletSimulation, setLeafletSimulation] = useState<{ cost: number } | null>(null);

  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));
  const availableHours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  useEffect(() => {
    const fetchPrices = async () => {
      const q = query(collection(db, 'pricing_rules'));
      const snap = await getDocs(q);
      setPricingRules(snap.docs.map((d: any) => d.data() as PricingRule));
    };
    fetchPrices();

    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap: any) => {
        const now = new Date();
        setCampaigns(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as LeafletCampaign)).filter((c: any) => c.limitDate.toDate() > now));
    });

    const qReq = query(collection(db, 'marketing_requests'), where('merchantId', '==', merchantId));
    const unsubReq = onSnapshot(qReq, (snap: any) => {
        setMyRequests(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as MarketingRequest)).sort((a: any, b: any) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0)));
    });

    return () => { unsubCam(); unsubReq(); };
  }, [merchantId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'leaflet') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
      if(type === 'banner') setBannerForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
      else setLeafletForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const calculatePrice = (tool: 'banner' | 'push' | 'leaflet', count: number, days: number = 1) => {
    let applicableRules = pricingRules.filter((r: PricingRule) => r.tool === tool);
    
    if (tool === 'leaflet') {
       const specificLeaflet = applicableRules.filter((r: PricingRule) => r.leafletId === leafletForm.campaignId && r.spaceType === leafletForm.spaceType);
       if (specificLeaflet.length > 0) applicableRules = specificLeaflet;
       else applicableRules = applicableRules.filter((r: PricingRule) => r.leafletId === 'all' && (r.spaceType === 'all' || r.spaceType === leafletForm.spaceType));
    }

    if (targetZones.length > 0) {
      const zoneRule = applicableRules.find((r: PricingRule) => targetZones.some((z: string) => z.includes(r.zoneName) && z.toLowerCase().includes(r.zoneLevel)));
      if (zoneRule) applicableRules = [zoneRule];
    } else {
      applicableRules = applicableRules.filter((r: PricingRule) => r.zoneLevel === 'global');
    }

    if (applicableRules.length === 0) return { cost: 0, foundRule: false };

    const rule = applicableRules[0]; 
    let totalCost = 0;

    if (rule.chargeType === 'per_day') totalCost = rule.price * days;
    else if (rule.chargeType === 'per_client') totalCost = rule.price * count;
    else if (rule.chargeType === 'fixed') totalCost = rule.price;

    if (totalCost < rule.minPrice && (count > 0 || rule.chargeType === 'fixed')) totalCost = rule.minPrice;
    if (count === 0 && rule.chargeType !== 'fixed') totalCost = 0;

    return { cost: totalCost, foundRule: true };
  };

  const simulateMarketing = async (type: 'banner' | 'push') => {
    let days = 1;
    let scheduledDateTime = new Date();

    if (type === 'banner') {
      if (!bannerForm.startDate || !bannerForm.endDate || !bannerForm.imageBase64) return toast.error("Preencha datas e insira a imagem.");
      const start = new Date(bannerForm.startDate);
      const end = new Date(bannerForm.endDate);
      
      if (end < start) return toast.error("A data de fim não pode ser anterior à data de início.");

      const minDate = new Date();
      minDate.setHours(minDate.getHours() + 24);
      if (start < minDate) return toast.error("Os pedidos devem ser feitos com pelo menos 24 horas de antecedência.");
      
      days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    } else {
      if (!pushForm.title || !pushForm.text || !pushForm.scheduledDate) return toast.error("Preencha Título, Texto e Data.");
      scheduledDateTime = new Date(`${pushForm.scheduledDate}T${pushForm.scheduledTime}`);
      if ((scheduledDateTime.getTime() - new Date().getTime()) / 3600000 < 2) return toast.error("Mínimo 2 horas de antecedência.");
    }

    const targetType = type === 'banner' ? bannerForm.targetType : pushForm.targetType;
    if (targetType === 'zonas' && targetZones.length === 0) return toast.error("Defina pelo menos uma Zona.");

    setLoading(true);
    try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active')));
        let clients = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));

        if (targetType === 'zonas') {
            clients = clients.filter((c: any) => targetZones.some((z: string) => z.includes(`Freguesia: ${c.freguesia}`) || z.includes(`Concelho: ${c.concelho}`) || z.includes(`Distrito: ${c.distrito}`)));
        } else if (targetType === 'birthDate') {
            const cm = new Date().getMonth() + 1;
            clients = clients.filter((c: any) => c.birthDate && parseInt(c.birthDate.split('-')[1]) === cm);
        } else if (targetType === 'top_20_volume' || targetType === 'top_20_visits') {
            const txSnap = await getDocs(query(collection(db, 'transactions'), where('merchantId', '==', merchantId)));
            const txs = txSnap.docs.map((d: any) => d.data()).filter((t: any) => t.type === 'earn' && t.status !== 'cancelled');
            const stats: Record<string, {vol: number, vis: number}> = {};
            txs.forEach((t: any) => {
                if(!stats[t.clientId]) stats[t.clientId] = {vol: 0, vis: 0};
                stats[t.clientId].vol += Number(t.amount);
                stats[t.clientId].vis += 1;
            });
            let sortedIds = Object.keys(stats).sort((a: string, b: string) => targetType === 'top_20_volume' ? stats[b].vol - stats[a].vol : stats[b].vis - stats[a].vis);
            clients = clients.filter((c: any) => sortedIds.slice(0, 20).includes(c.id));
        }

        const count = clients.length;
        
        const pricing = calculatePrice(type, count, days);
        if (!pricing.foundRule) {
           toast.error("O Administrador ainda não definiu um preço para esta zona/ferramenta. Orçamento a zeros.", { duration: 5000 });
        }

        if (type === 'banner') setBannerSimulation({ count, cost: pricing.cost, days });
        else setPushSimulation({ count, cost: pricing.cost, scheduledFor: scheduledDateTime });

    } catch(err) { toast.error("Erro na simulação."); } finally { setLoading(false); }
  };

  const simulateLeafletCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leafletForm.campaignId || !leafletForm.imageBase64) return toast.error("Selecione o folheto e insira a imagem.");
    
    const pricing = calculatePrice('leaflet', 0, 1);
    if (!pricing.foundRule) toast.error("Sem preço tabelado para este espaço.", { duration: 4000 });
    
    setLeafletSimulation({ cost: pricing.cost });
  };

  const submitMarketing = async (type: 'banner' | 'push' | 'leaflet') => {
    setLoading(true);
    try {
        const baseData = { merchantId, merchantName, status: 'pending', createdAt: serverTimestamp() };
        
        if (type === 'banner' && bannerSimulation) {
            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'banner', text: bannerForm.text, imageUrl: bannerForm.imageBase64, 
                requestedDate: `Início: ${bannerForm.startDate} | Fim: ${bannerForm.endDate} (${bannerSimulation.days} dias)`, 
                targetType: bannerForm.targetType, targetZones: targetZones,
                targetCount: bannerSimulation.count, cost: bannerSimulation.cost
            });
            setBannerSimulation(null); setBannerForm({text:'', startDate:'', endDate:'', imageBase64:'', targetType: 'all'});
            setTargetZones([]);
        } else if (type === 'push' && pushSimulation) {
            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'push_notification', title: pushForm.title, text: pushForm.text,
                targetType: pushForm.targetType, targetZones: targetZones,
                scheduledFor: pushSimulation.scheduledFor, targetCount: pushSimulation.count, cost: pushSimulation.cost
            });
            setPushSimulation(null); setPushForm({ title: '', text: '', targetType: 'all', scheduledDate: '', scheduledTime: '10:00' });
            setTargetZones([]);
        } else if (type === 'leaflet' && leafletSimulation) {
            const camp = campaigns.find((c: any) => c.id === leafletForm.campaignId);
            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'leaflet',
                leafletCampaignId: leafletForm.campaignId, leafletCampaignTitle: camp?.title,
                spaceType: leafletForm.spaceType, description: leafletForm.description,
                sellPrice: leafletForm.sellPrice, unit: leafletForm.unit,
                promoPrice: leafletForm.promoPrice, promoType: leafletForm.promoType,
                imageUrl: leafletForm.imageBase64, cost: leafletSimulation.cost
            });
            setLeafletSimulation(null); setLeafletForm({campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: ''});
            const fileInput = document.getElementById('leafletImageInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }
        
        toast.success("Pedido enviado com sucesso!");
        setActiveTab('history');
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] animate-in fade-in">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Pedir Publicidade (Visibilidade Extra)</h3>
        
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setActiveTab('banner')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}><ImageIcon size={16} className="inline mr-2"/> Banner na App</button>
            <button onClick={() => setActiveTab('push')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'push' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}><Bell size={16} className="inline mr-2"/> Notificação Push</button>
            <button onClick={() => setActiveTab('leaflet')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'leaflet' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}><FileText size={16} className="inline mr-2"/> Folheto Físico/Digital</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border-4 ${activeTab === 'history' ? 'bg-[#0a2540] text-white border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}><Megaphone size={16} className="inline mr-2"/> Histórico de Pedidos</button>
        </div>

        {/* ===================== BANNER ===================== */}
        {activeTab === 'banner' && (
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
              <form onSubmit={(e) => { e.preventDefault(); simulateMarketing('banner'); }} className="space-y-6">
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Texto Opcional</label><input type="text" value={bannerForm.text} onChange={e=>setBannerForm({...bannerForm, text: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Início (Min 24h)</label><input required type="date" value={bannerForm.startDate} onChange={e=>setBannerForm({...bannerForm, startDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Fim</label><input required type="date" value={bannerForm.endDate} onChange={e=>setBannerForm({...bannerForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                  </div>

                  <div className="space-y-4 pt-4 border-t-2 border-slate-100">
                    <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest">Público Alvo (Quem vai ver o Banner)</label>
                    <select required value={bannerForm.targetType} onChange={e=>{setBannerForm({...bannerForm, targetType: e.target.value}); setTargetZones([]); setDistrito('');}} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                        <option value="all">Todos os Clientes na App</option>
                        <option value="zonas">Restringir por Zonas (Distrito, Concelho ou Freguesia)</option>
                        <option value="birthDate">Aniversariantes do Mês</option>
                        <option value="top_20_volume">Meus Clientes: Top 20 (Maior Volume)</option>
                        <option value="top_20_visits">Meus Clientes: Top 20 (Mais Visitas)</option>
                    </select>

                    {bannerForm.targetType === 'zonas' && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                        <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200">
                          <option value="">Distrito</option>
                          {distritos.map((d: string) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                          <option value="">Todo o Distrito (Ou selecione Concelho)</option>
                          {concelhos.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                          <option value="">Todo o Concelho (Ou selecione Freguesia)</option>
                          {freguesias.map((f: string) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] disabled:opacity-50 hover:bg-blue-600">Adicionar Zona</button>
                        
                        {targetZones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {targetZones.map((z: string, idx: number) => (
                              <span key={idx} className="bg-white text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-sm border border-blue-200">
                                {z} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_: any, i: number) => i !== idx))}/>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center border-4 border-dashed border-slate-200">
                      <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-[#0a2540] mb-1">Imagem do Anúncio (Banner)</p>
                          <p className="text-[9px] font-bold text-slate-500 mb-3 leading-tight">Para a melhor qualidade possível na App, a imagem deve ser retangular/larga (Proporção 16:9, idêntica a um ecrã de TV/Computador). Se tiver texto, coloque-o no centro da imagem.</p>
                          <input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="w-full text-xs font-bold" />
                      </div>
                      {bannerForm.imageBase64 && (
                        <div className="w-24 h-16 shrink-0 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-sm">
                          <img src={bannerForm.imageBase64} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                  </div>
                  
                  <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase text-sm flex justify-center items-center gap-2 border-b-4 border-black">
                     {loading ? <Loader2 className="animate-spin"/> : <Filter size={20}/>} {bannerSimulation ? 'Recalcular Orçamento' : 'Simular Alcance e Custo'}
                  </button>
              </form>

              {bannerSimulation && (
                <div className="bg-[#00d66f] p-6 md:p-8 rounded-3xl text-center shadow-lg sticky top-8 h-fit animate-in slide-in-from-right">
                   <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2">Orçamento Calculado</p>
                   <p className="text-4xl font-black italic text-[#0a2540] mb-2">{formatEuro(bannerSimulation.cost)}</p>
                   <p className="text-[10px] font-bold text-[#0a2540] mb-6">Alcance: {bannerSimulation.count} clientes na App durante {bannerSimulation.days} dias.</p>
                   
                   <p className="text-[9px] font-bold text-teal-900 mb-4 bg-teal-100 p-2 rounded-lg">Se alterar algo no formulário, clique em Recalcular. Se estiver pronto, clique abaixo.</p>
                   
                   <div className="flex gap-2">
                      <button type="button" onClick={() => submitMarketing('banner')} className="w-full py-4 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[11px] shadow-lg border-b-4 border-black/40 hover:scale-105 transition-transform">Confirmar Pedido</button>
                   </div>
                </div>
              )}
            </div>
        )}

        {/* ===================== PUSH ===================== */}
        {activeTab === 'push' && (
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
              <form onSubmit={(e) => { e.preventDefault(); simulateMarketing('push'); }} className="space-y-6">
                  <input type="text" placeholder="Título Curto (Ex: Saldos 50%)" required value={pushForm.title} onChange={e=>setPushForm({...pushForm, title: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-[#00d66f]" />
                  <textarea rows={4} placeholder="Mensagem Direta (Max 100 char)..." required value={pushForm.text} onChange={e=>setPushForm({...pushForm, text: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f] resize-none" maxLength={100} />
                  
                  <div className="space-y-4 pt-4 border-t-2 border-slate-100">
                    <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest">Público Alvo (Destinatários do Push)</label>
                    <select required value={pushForm.targetType} onChange={e=>{setPushForm({...pushForm, targetType: e.target.value}); setTargetZones([]); setDistrito('');}} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                        <option value="all">Todos os Clientes na App</option>
                        <option value="zonas">Restringir por Zonas (Distrito, Concelho ou Freguesia)</option>
                        <option value="birthDate">Aniversariantes do Mês</option>
                        <option value="top_20_volume">Meus Clientes: Top 20 (Maior Volume)</option>
                        <option value="top_20_visits">Meus Clientes: Top 20 (Mais Visitas)</option>
                    </select>

                    {pushForm.targetType === 'zonas' && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                        <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200">
                          <option value="">Distrito</option>
                          {distritos.map((d: string) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                          <option value="">Todo o Distrito (Ou selecione Concelho)</option>
                          {concelhos.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                          <option value="">Todo o Concelho (Ou selecione Freguesia)</option>
                          {freguesias.map((f: string) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] disabled:opacity-50 hover:bg-blue-600">Adicionar Zona</button>
                        
                        {targetZones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {targetZones.map((z: string, idx: number) => (
                              <span key={idx} className="bg-white text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-sm border border-blue-200">
                                {z} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_: any, i: number) => i !== idx))}/>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Data Envio</label><input type="date" required value={pushForm.scheduledDate} onChange={e=>setPushForm({...pushForm, scheduledDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none focus:border-[#00d66f]" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Hora Exata</label><select required value={pushForm.scheduledTime} onChange={e=>setPushForm({...pushForm, scheduledTime: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">{availableHours.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase text-sm flex justify-center items-center gap-2 border-b-4 border-black">
                     {loading ? <Loader2 className="animate-spin"/> : <Filter size={20}/>} {pushSimulation ? 'Recalcular Custo' : 'Simular Alcance e Custo'}
                  </button>
              </form>

              {pushSimulation && (
                <div className="bg-[#00d66f] p-6 md:p-8 rounded-3xl text-center shadow-lg sticky top-8 h-fit animate-in slide-in-from-right">
                   <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2">Orçamento da Mensagem</p>
                   <p className="text-4xl font-black italic text-[#0a2540] mb-2">{formatEuro(pushSimulation.cost)}</p>
                   <p className="text-[10px] font-bold text-[#0a2540] mb-6">Alcance Imediato: {pushSimulation.count} ecrãs de clientes.</p>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => submitMarketing('push')} className="w-full py-4 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[11px] shadow-lg border-b-4 border-black/40 hover:scale-105 transition-transform">Confirmar Pedido</button>
                   </div>
                </div>
              )}
            </div>
        )}

        {/* ===================== FOLHETO ===================== */}
        {activeTab === 'leaflet' && (
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
              <form onSubmit={simulateLeafletCost} className="space-y-6 max-w-2xl mx-auto w-full">
                  <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl mb-4">
                      <p className="text-[10px] font-black uppercase text-amber-800">Nota de Exclusividade:</p>
                      <p className="text-xs font-bold text-amber-900 mt-1">Só tem acesso aos folhetos distribuídos no seu Concelho ou num concelho vizinho.</p>
                  </div>
                  <select required value={leafletForm.campaignId} onChange={e=>setLeafletForm({...leafletForm, campaignId: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-[#00d66f]">
                      <option value="">(Escolha um Folheto Futuro)</option>
                      {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.title} (Fecha a: {c.limitDate.toDate().toLocaleDateString()})</option>)}
                  </select>
                  <select required value={leafletForm.spaceType} onChange={e=>setLeafletForm({...leafletForm, spaceType: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]">
                      <option value="leaflet_capa_destaque">Capa Principal - Destaque (Consulte Preço)</option>
                      <option value="leaflet_capa_normal">Capa - Tamanho Normal (Consulte Preço)</option>
                      <option value="leaflet_contracapa">Contracapa - Parte Traseira (Consulte Preço)</option>
                      <option value="leaflet_interior_full">Interior - Página Inteira (Consulte Preço)</option>
                      <option value="leaflet_interior_1_2">Interior - Meia Página (Consulte Preço)</option>
                      <option value="leaflet_interior_1_4">Interior - Quarto de Página (Consulte Preço)</option>
                  </select>
                  <input required type="text" placeholder="Descrição do Produto" value={leafletForm.description} onChange={e=>setLeafletForm({...leafletForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/>
                  <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="Preço (Ex: 10€)" value={leafletForm.sellPrice} onChange={e=>setLeafletForm({...leafletForm, sellPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/>
                      <input required type="text" placeholder="Unidade (Ex: Kg, Uni)" value={leafletForm.unit} onChange={e=>setLeafletForm({...leafletForm, unit: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/>
                  </div>
                  
                  <div className="bg-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center border-4 border-dashed border-slate-200">
                      <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-[#0a2540] mb-1">Imagem do Produto</p>
                          <p className="text-[9px] font-bold text-slate-500 mb-3 leading-tight">Para a melhor apresentação gráfica no folheto, utilize uma fotografia centrada do seu produto com fundo branco ou transparente.</p>
                          <input id="leafletImageInput" required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'leaflet')} className="w-full text-xs font-bold" />
                      </div>
                      {leafletForm.imageBase64 && (
                        <div className="w-20 h-20 shrink-0 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-sm">
                          <img src={leafletForm.imageBase64} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                  </div>
                  
                  <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-[#0a2540]">
                      {loading ? <Loader2 className="animate-spin" /> : <><Filter size={20}/> {leafletSimulation ? 'Recalcular Preço do Espaço' : 'Ver Preço do Espaço'}</>}
                  </button>
              </form>

              {leafletSimulation && (
                <div className="bg-[#00d66f] p-6 md:p-8 rounded-3xl text-center shadow-lg sticky top-8 h-fit animate-in slide-in-from-right">
                   <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2">Orçamento Fixo (Folheto)</p>
                   <p className="text-4xl font-black italic text-[#0a2540] mb-6">{formatEuro(leafletSimulation.cost)}</p>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => submitMarketing('leaflet')} className="w-full py-4 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[11px] shadow-lg border-b-4 border-black/40 hover:scale-105 transition-transform">Avançar com Pedido</button>
                   </div>
                </div>
              )}
            </div>
        )}

        {/* ===================== HISTORY ===================== */}
        {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in">
                {myRequests.map((r: any) => {
                  const zones = (r as any).targetZones || [];
                  return (
                    <div key={r.id} className="p-6 border-4 border-slate-100 rounded-[30px] flex flex-col md:flex-row justify-between items-start gap-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="font-black uppercase text-[#0a2540] text-lg leading-none">
                                        {r.type === 'banner' ? 'Banner na App' : r.type === 'push_notification' ? 'Notificação Push (App)' : `Folheto: ${r.leafletCampaignTitle}`}
                                    </p>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-2">Enviado a: {r.createdAt?.toDate().toLocaleDateString()}</p>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                                </span>
                            </div>
                            
                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-500 space-y-2">
                                {r.type !== 'leaflet' && (
                                  <>
                                    <p className="flex flex-col border-b border-slate-50 pb-2">
                                      <span className="text-slate-400 uppercase mb-1">Destinatários ({r.targetType}):</span> 
                                      <span className="text-[#0a2540] break-words">
                                        {r.targetType === 'zonas' ? zones.join(' | ') : r.targetType === 'all' ? 'Todos' : r.targetType}
                                      </span>
                                    </p>
                                    <p className="flex justify-between"><span className="text-slate-400 uppercase">Custo:</span> <span className="text-blue-500">{formatEuro(r.cost)} ({r.targetCount} Clientes)</span></p>
                                  </>
                                )}
                                {r.type === 'leaflet' && <p className="flex justify-between"><span className="text-slate-400 uppercase">Produto:</span> <span className="text-[#0a2540]">{r.description}</span></p>}
                            </div>
                        </div>
                        {r.imageUrl ? (
                            <div className="w-full md:w-32 h-32 shrink-0 bg-white rounded-2xl border-4 border-slate-100 flex items-center justify-center p-2"><img src={r.imageUrl} className="w-full h-full object-contain" alt="Preview" /></div>
                        ) : (
                            <div className="w-full md:w-32 h-32 shrink-0 bg-white rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300"><Bell size={24} /><span className="text-[8px] font-black uppercase mt-2">Sem Imagem</span></div>
                        )}
                    </div>
                )})}
                {myRequests.length === 0 && <p className="text-center text-slate-400 font-black uppercase text-xs p-10 border-4 border-dashed border-slate-200 rounded-[30px]">Sem pedidos efetuados.</p>}
            </div>
        )}
    </div>
  );
};

export default MerchantMarketing;