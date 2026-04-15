import React, { useState, useEffect } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, getDoc, doc, getDocs } from 'firebase/firestore';
import { Megaphone, Image as ImageIcon, FileText, Send, Loader2, AlertCircle, Bell, Filter } from 'lucide-react';
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
  
  const [prices, setPrices] = useState<any>({});

  // ESTADOS DO BANNER RENOVADO
  const [bannerForm, setBannerForm] = useState({ 
    text: '', startDate: '', endDate: '', imageBase64: '', 
    targetType: 'all', targetValue: '' 
  });
  const [bannerSimulation, setBannerSimulation] = useState<{ count: number, cost: number, days: number } | null>(null);
  const [simulatingBanner, setSimulatingBanner] = useState(false);

  const [leafletForm, setLeafletForm] = useState({ campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: '' });

  const formatEuro = (val: any) => {
    if (!val || isNaN(val)) return null;
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));
  };

  useEffect(() => {
    const fetchPrices = async () => {
      const docSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (docSnap.exists()) setPrices(docSnap.data());
    };
    fetchPrices();

    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => {
        const now = new Date();
        const valid = snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign))
                               .filter(c => c.limitDate.toDate() > now);
        setCampaigns(valid);
    });

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

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setBannerForm(prev => ({...prev, imageBase64: ev.target?.result as string})) };
    reader.readAsDataURL(file);
  };

  const handleLeafletImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setLeafletForm(prev => ({...prev, imageBase64: ev.target?.result as string})) };
    reader.readAsDataURL(file);
  };

  const getPriceText = (key: string) => {
      const p = formatEuro(prices[key]);
      return p ? `(${p})` : '(Preço sob consulta)';
  };

  // CÁLCULO E SIMULAÇÃO DO BANNER
  const handleSimulateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.startDate || !bannerForm.endDate || !bannerForm.imageBase64) {
        toast.error("Preencha as datas e insira a imagem do Banner.");
        return;
    }

    const start = new Date(bannerForm.startDate);
    const end = new Date(bannerForm.endDate);
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 48);

    if (start < minDate) {
        toast.error("A data de início tem de ter pelo menos 48h de antecedência.");
        return;
    }
    if (end <= start) {
        toast.error("A data de fim tem de ser posterior à data de início.");
        return;
    }

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

    setSimulatingBanner(true);
    try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(query(usersRef, where('role', '==', 'client'), where('status', '==', 'active')));
        let clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const targetType = bannerForm.targetType;
        const targetVal = bannerForm.targetValue;

        if (targetType === 'cp4' || targetType === 'cp7') {
            const zips = targetVal.split(',').map(z => z.trim());
            clients = clients.filter(c => zips.some(z => (c.zipCode || '').startsWith(z)));
        } else if (targetType === 'birthDate') {
            const currentMonth = new Date().getMonth() + 1;
            clients = clients.filter(c => {
                if (!c.birthDate) return false;
                const month = parseInt(c.birthDate.split('-')[1]);
                return month === currentMonth;
            });
        } else if (targetType === 'specific_clients') {
            const identifiers = targetVal.split(',').map(i => i.trim());
            clients = clients.filter(c => identifiers.includes(c.nif) || identifiers.includes(c.customerNumber));
        } else if (targetType === 'top_20_volume' || targetType === 'top_20_visits') {
            // Ir buscar as transações da loja para ordenar os melhores clientes
            const txSnap = await getDocs(query(collection(db, 'transactions'), where('merchantId', '==', merchantId)));
            const txs = txSnap.docs.map(d => d.data()).filter(t => t.type === 'earn' && t.status !== 'cancelled');
            
            const stats: Record<string, {vol: number, vis: number}> = {};
            txs.forEach(t => {
                if(!stats[t.clientId]) stats[t.clientId] = {vol: 0, vis: 0};
                stats[t.clientId].vol += Number(t.amount);
                stats[t.clientId].vis += 1;
            });

            let sortedIds = Object.keys(stats);
            if (targetType === 'top_20_volume') {
                sortedIds.sort((a, b) => stats[b].vol - stats[a].vol);
            } else {
                sortedIds.sort((a, b) => stats[b].vis - stats[a].vis);
            }
            
            const top20Ids = sortedIds.slice(0, 20);
            clients = clients.filter(c => top20Ids.includes(c.id));
        }

        const count = clients.length;
        const perClientDay = Number(prices.banner_cost_per_client) || 0.02;
        const minCost = Number(prices.banner_min_cost) || 10;

        let totalCost = count * perClientDay * days;
        if (totalCost < minCost && count > 0) totalCost = minCost;
        if (count === 0) totalCost = 0;

        setBannerSimulation({ count, cost: totalCost, days });

    } catch(err) {
        toast.error("Erro ao simular alcance.");
    } finally {
        setSimulatingBanner(false);
    }
  };

  const submitBannerRequest = async () => {
    if (!bannerSimulation) return;
    setLoading(true);
    try {
        await addDoc(collection(db, 'marketing_requests'), {
            merchantId, merchantName, type: 'banner', status: 'pending',
            text: bannerForm.text, 
            imageUrl: bannerForm.imageBase64, 
            requestedDate: `Início: ${bannerForm.startDate} | Fim: ${bannerForm.endDate} (${bannerSimulation.days} dias)`, 
            targetType: bannerForm.targetType,
            targetValue: bannerForm.targetValue,
            targetCount: bannerSimulation.count,
            cost: bannerSimulation.cost,
            createdAt: serverTimestamp()
        });
        toast.success("Pedido de Banner enviado com sucesso!");
        setBannerSimulation(null);
        setBannerForm({text:'', startDate:'', endDate:'', imageBase64:'', targetType: 'all', targetValue: ''});
        
        const fileInput = document.getElementById('bannerImageInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        setActiveTab('history');
    } catch(err) { 
        toast.error("Erro ao enviar pedido."); 
    } finally { 
        setLoading(false); 
    }
  };

  const submitLeaflet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leafletForm.campaignId) { toast.error("Selecione um folheto previsto."); return; }
    if (!leafletForm.imageBase64) { toast.error("Por favor, adicione a imagem do produto."); return; }

    const camp = campaigns.find(c => c.id === leafletForm.campaignId);

    setLoading(true);
    try {
        await addDoc(collection(db, 'marketing_requests'), {
            merchantId, merchantName, type: 'leaflet', status: 'pending',
            leafletCampaignId: leafletForm.campaignId, 
            leafletCampaignTitle: camp?.title,
            spaceType: leafletForm.spaceType, 
            description: leafletForm.description,
            sellPrice: leafletForm.sellPrice, 
            unit: leafletForm.unit,
            promoPrice: leafletForm.promoPrice, 
            promoType: leafletForm.promoType,
            imageUrl: leafletForm.imageBase64,
            createdAt: serverTimestamp()
        });
        toast.success("Pedido de espaço no Folheto enviado com sucesso!");
        setLeafletForm({campaignId: '', spaceType: 'leaflet_capa_normal', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: ''});
        
        const fileInput = document.getElementById('leafletImageInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        setActiveTab('history');
    } catch(err) { 
        toast.error("Erro ao enviar pedido."); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] animate-in fade-in">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Pedir Publicidade</h3>
        
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
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
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
              <form onSubmit={handleSimulateBanner} className="space-y-6">
                  <div className="bg-[#f0f7ff] p-6 rounded-[32px] border-2 border-blue-100 mb-6">
                      <p className="text-[#0a2540] text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                          <AlertCircle size={16} className="text-blue-500"/> Guia de Design Profissional
                      </p>
                      <ul className="space-y-2 text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                          <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"/> Resolução Ideal: <span className="text-[#0a2540]">1920 x 1080 px</span> (16:9)</li>
                          <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"/> Conteúdo Seguro: <span className="text-[#0a2540]">Manter no CENTRO</span></li>
                          <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full"/> Formato: Máximo 200KB (.jpg / .webp)</li>
                      </ul>
                  </div>
                  
                  <div><label className="text-[10px] font-black uppercase text-slate-400">Texto Opcional</label><input type="text" value={bannerForm.text} onChange={e=>setBannerForm({...bannerForm, text: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400">Data de Início</label>
                          <input required type="date" value={bannerForm.startDate} onChange={e=>setBannerForm({...bannerForm, startDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/>
                      </div>
                      <div>
                          <label className="text-[10px] font-black uppercase text-slate-400">Data de Fim</label>
                          <input required type="date" value={bannerForm.endDate} onChange={e=>setBannerForm({...bannerForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]"/>
                      </div>
                  </div>

                  {/* NOVOS CAMPOS DE SEGMENTAÇÃO DO BANNER */}
                  <div className="space-y-4 pt-4 border-t-2 border-slate-100">
                    <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest">Segmentação / Público Alvo</label>
                    <select required value={bannerForm.targetType} onChange={e=>setBannerForm({...bannerForm, targetType: e.target.value, targetValue: ''})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                        <option value="all">Todos os Clientes da Plataforma</option>
                        <option value="cp4">Por Código Postal (Ex: 4000)</option>
                        <option value="cp7">Por Código Postal Completo (Ex: 4000-123)</option>
                        <option value="birthDate">Aniversariantes do Mês</option>
                        <option value="top_20_volume">Meus Clientes: Top 20 (Maior Volume)</option>
                        <option value="top_20_visits">Meus Clientes: Top 20 (Mais Visitas)</option>
                        <option value="specific_clients">Clientes Específicos (Por NIF / Cartão)</option>
                    </select>

                    {(bannerForm.targetType === 'cp4' || bannerForm.targetType === 'cp7' || bannerForm.targetType === 'specific_clients') && (
                      <div className="animate-in slide-in-from-top-2">
                        <label className="text-[9px] font-bold uppercase text-slate-400 mb-1 block">
                          {bannerForm.targetType === 'cp4' ? 'Insira CP4 (Separe por vírgula. Ex: 4000, 4400)' : 
                           bannerForm.targetType === 'cp7' ? 'Insira CP7 (Separe por vírgula. Ex: 4000-123, 4400-001)' :
                           'Insira NIFs ou Cartões (Separe por vírgula)'}
                        </label>
                        <input required type="text" value={bannerForm.targetValue} onChange={e=>setBannerForm({...bannerForm, targetValue: e.target.value})} className="w-full p-4 bg-blue-50 border-4 border-blue-100 rounded-2xl font-black text-xs outline-none focus:border-[#00d66f]" />
                      </div>
                    )}
                  </div>

                  <div><label className="text-[10px] font-black uppercase text-slate-400">Imagem do Banner (16:9)</label><input id="bannerImageInput" required type="file" accept="image/*" onChange={handleBannerImageChange} className="w-full p-4 border-4 border-dashed border-slate-200 rounded-2xl font-bold text-xs"/></div>
                  
                  <button type="submit" disabled={simulatingBanner} className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-black">
                      {simulatingBanner ? <Loader2 className="animate-spin" /> : <Filter size={20}/>} Simular Alcance e Custo
                  </button>
              </form>

              {/* RESULTADO DA SIMULAÇÃO DO BANNER */}
              <div>
                {bannerSimulation && (
                  <div className="bg-[#00d66f] p-8 md:p-10 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540] flex flex-col justify-center text-center animate-in zoom-in sticky top-10">
                      <h4 className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest mb-6 opacity-60">Orçamento do Banner</h4>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/20 p-6 rounded-3xl border-2 border-[#0a2540]/10">
                            <span className="text-[9px] font-black uppercase block mb-1">Público Alvo</span>
                            <span className="text-3xl font-black italic">{bannerSimulation.count}</span>
                        </div>
                        <div className="bg-white/20 p-6 rounded-3xl border-2 border-[#0a2540]/10">
                            <span className="text-[9px] font-black uppercase block mb-1">Duração</span>
                            <span className="text-3xl font-black italic">{bannerSimulation.days} <span className="text-sm">dias</span></span>
                        </div>
                      </div>

                      <div className="bg-white/40 p-4 rounded-2xl border-2 border-[#0a2540]/10 mb-8">
                        <span className="text-[9px] font-black uppercase block mb-1 text-[#0a2540]">Investimento Total</span>
                        <span className="text-4xl font-black italic text-[#0a2540]">{formatEuro(bannerSimulation.cost)}</span>
                      </div>

                      <div className="space-y-3">
                        <button onClick={submitBannerRequest} disabled={loading} className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex justify-center items-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : 'Avançar com Pedido'}
                        </button>
                        <button onClick={() => setBannerSimulation(null)} disabled={loading} className="w-full bg-white/20 text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/40">Anular / Corrigir</button>
                      </div>
                      <p className="mt-6 text-[8px] font-black uppercase text-[#0a2540]/60 italic">* Valor sujeito a aprovação manual da administração.</p>
                  </div>
                )}
              </div>
            </div>
        )}

        {activeTab === 'leaflet' && (
            <form onSubmit={submitLeaflet} className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Selecione o Folheto</label>
                    <select required value={leafletForm.campaignId} onChange={e=>setLeafletForm({...leafletForm, campaignId: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-[#00d66f]">
                        <option value="">(Escolha um Folheto Futuro)</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.title} (Fecha a: {c.limitDate.toDate().toLocaleDateString()})</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Espaço Pretendido</label>
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
                
                <div><label className="text-[10px] font-black uppercase text-slate-400">Imagem do Produto</label><input id="leafletImageInput" required type="file" accept="image/*" onChange={handleLeafletImageChange} className="w-full p-4 border-4 border-dashed border-slate-200 rounded-2xl font-bold text-xs"/></div>
                
                <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-[#0a2540]">
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20}/>} Enviar Pedido
                </button>
            </form>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in">
                {myRequests.map(r => (
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
                                {r.type === 'banner' ? (
                                    <>
                                        <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase">Datas:</span> <span className="text-[#0a2540]">{r.requestedDate}</span></p>
                                        {r.text && <p className="flex justify-between"><span className="text-slate-400 uppercase">Texto:</span> <span className="text-[#0a2540]">{r.text}</span></p>}
                                        <p className="flex justify-between border-b border-slate-50 pb-2">
                                          <span className="text-slate-400 uppercase">Alvo:</span> 
                                          <span className="text-[#0a2540]">
                                            {r.targetType === 'all' ? 'Todos' : r.targetType === 'cp4' || r.targetType === 'cp7' ? `CPs: ${r.targetValue}` : r.targetType === 'birthDate' ? 'Aniversariantes' : r.targetType === 'specific_clients' ? `NIFs/Cartões: ${r.targetValue}` : 'Top 20'}
                                          </span>
                                        </p>
                                        <p className="flex justify-between"><span className="text-slate-400 uppercase">Custo / Alcance:</span> <span className="text-blue-500">{formatEuro(r.cost)} ({r.targetCount} Clientes)</span></p>
                                    </>
                                ) : r.type === 'push_notification' ? (
                                    <>
                                        <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase">Título:</span> <span className="text-[#0a2540]">{r.title}</span></p>
                                        <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase">Mensagem:</span> <span className="text-[#0a2540]">{r.text}</span></p>
                                        <p className="flex justify-between border-b border-slate-50 pb-2">
                                          <span className="text-slate-400 uppercase">Alvo:</span> 
                                          <span className="text-[#0a2540]">
                                            {r.targetType === 'all' ? 'Todos' : r.targetType === 'multiple_zip' ? `CP: ${r.targetValue}` : r.targetType === 'birthDate' ? 'Aniversariantes' : 'Meus Clientes'}
                                          </span>
                                        </p>
                                        <p className="flex justify-between"><span className="text-slate-400 uppercase">Custo / Alcance:</span> <span className="text-blue-500">{formatEuro(r.cost)} ({r.targetCount} Clientes)</span></p>
                                    </>
                                ) : (
                                    <>
                                        <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase">Produto:</span> <span className="text-[#0a2540]">{r.description}</span></p>
                                        <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase">Espaço:</span> <span className="text-[#0a2540]">{r.spaceType?.replace(/_/g, ' ')}</span></p>
                                        <p className="flex justify-between"><span className="text-slate-400 uppercase">Preço Venda:</span> <span className="text-[#0a2540]">{r.sellPrice} / {r.unit}</span></p>
                                        {r.promoPrice && <p className="flex justify-between"><span className="text-slate-400 uppercase">Promoção:</span> <span className="text-blue-500">{r.promoPrice} ({r.promoType})</span></p>}
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {r.imageUrl ? (
                            <div className="w-full md:w-32 h-32 shrink-0 bg-white rounded-2xl border-4 border-slate-100 overflow-hidden flex items-center justify-center p-2 shadow-sm">
                                <img src={r.imageUrl} className="w-full h-full object-contain" alt="Preview da Campanha" />
                            </div>
                        ) : (
                            <div className="w-full md:w-32 h-32 shrink-0 bg-white rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                {r.type === 'push_notification' ? <Bell size={24} /> : <ImageIcon size={24} />}
                                <span className="text-[8px] font-black uppercase mt-2">{r.type === 'push_notification' ? 'Push FCM' : 'S/ Imagem'}</span>
                            </div>
                        )}
                    </div>
                ))}
                {myRequests.length === 0 && <p className="text-center text-slate-400 font-black uppercase text-xs p-10 border-4 border-dashed border-slate-200 rounded-[30px]">Sem pedidos efetuados.</p>}
            </div>
        )}
    </div>
  );
};

export default MerchantMarketing;