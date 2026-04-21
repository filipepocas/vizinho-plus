import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Tag, Save, Trash2, Loader2, AlertCircle, MapPin, Layers, Euro } from 'lucide-react';
import toast from 'react-hot-toast';
import { PricingRule, LeafletCampaign } from '../../types';
import { useStore } from '../../store/useStore';

const AdminPricing: React.FC = () => {
  const { locations } = useStore();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    tool: 'banner' | 'push' | 'leaflet';
    chargeType: 'per_day' | 'per_client' | 'fixed';
    zoneLevel: 'global' | 'distrito' | 'concelho' | 'freguesia';
    zoneName: string;
    leafletId: string;
    spaceType: string;
    price: string;
    minPrice: string;
  }>({
    tool: 'banner', chargeType: 'per_day', zoneLevel: 'global', zoneName: 'Geral',
    leafletId: 'all', spaceType: 'all', price: '', minPrice: '0'
  });

  const distritos = Object.keys(locations || {}).sort();
  const [selectedDistrito, setSelectedDistrito] = useState('');
  const concelhos = selectedDistrito ? Object.keys(locations[selectedDistrito] || {}).sort() : [];
  const [selectedConcelho, setSelectedConcelho] = useState('');
  const freguesias = selectedDistrito && selectedConcelho ? (locations[selectedDistrito][selectedConcelho] || []).sort() : [];

  useEffect(() => {
    const qRules = query(collection(db, 'pricing_rules'), orderBy('createdAt', 'desc'));
    const unsubRules = onSnapshot(qRules, (snap: any) => setRules(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as PricingRule))));
    
    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap: any) => setCampaigns(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as LeafletCampaign))));

    return () => { unsubRules(); unsubCam(); };
  }, []);

  const handleZoneLevelChange = (level: any) => {
    setForm({...form, zoneLevel: level, zoneName: level === 'global' ? 'Geral' : ''});
    if (level === 'global') { setSelectedDistrito(''); setSelectedConcelho(''); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.price) return toast.error("Preencha o valor do preço.");
    if (form.zoneLevel !== 'global' && !form.zoneName) return toast.error("Selecione o local específico.");

    setSaving(true);
    try {
      // Cria ID determinístico para sobrepor regras exatas (Ex: push_concelho_Lousada)
      const cleanZone = form.zoneName.replace(/[^a-zA-Z0-9]/g, '');
      const ruleId = `rule_${form.tool}_${form.zoneLevel}_${cleanZone}_${form.leafletId}_${form.spaceType}`;

      await setDoc(doc(db, 'pricing_rules', ruleId), {
        tool: form.tool, chargeType: form.chargeType, zoneLevel: form.zoneLevel, zoneName: form.zoneName,
        leafletId: form.leafletId, spaceType: form.spaceType,
        price: Number(form.price), minPrice: Number(form.minPrice),
        createdAt: serverTimestamp()
      });

      toast.success("Regra de Preço Guardada/Atualizada!");
      setForm({...form, price: '', minPrice: '0'});
    } catch (err) { toast.error("Erro ao guardar regra."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover esta regra de preço? O sistema passará a usar a regra mais geral disponível.")) return;
    await deleteDoc(doc(db, 'pricing_rules', id));
    toast.success("Regra eliminada.");
  };

  const formatEuro = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-amber-400 p-4 rounded-2xl border-4 border-[#0a2540]">
            <Euro size={28} className="text-[#0a2540]" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Motor de Preços Marketing</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Defina preços por ferramenta, zona e métrica.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-slate-50 border-4 border-slate-100 rounded-3xl p-8 space-y-6">
           <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={18}/>
              <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                 <strong>Prioridade do Sistema:</strong> Quando um lojista pede publicidade, a App procura primeiro o preço exato da Freguesia dele. Se não existir, procura o do Concelho, depois Distrito, e por fim o preço Global. Guardar uma regra igual sobrepõe a antiga.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2"><Layers size={14}/> 1. Ferramenta</label>
                 <select value={form.tool} onChange={e=>setForm({...form, tool: e.target.value as any, chargeType: e.target.value === 'leaflet' ? 'fixed' : 'per_day'})} className="w-full p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 border-slate-200 focus:border-amber-400">
                    <option value="banner">Banner Digital</option>
                    <option value="push">Notificação Push</option>
                    <option value="leaflet">Folheto Digital/Físico</option>
                 </select>
              </div>

              {form.tool === 'leaflet' ? (
                <>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2">Qual Folheto?</label>
                     <select value={form.leafletId} onChange={e=>setForm({...form, leafletId: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-amber-400">
                        <option value="all">Padrão (Para todos os Folhetos)</option>
                        {campaigns.map(c => <option key={c.id} value={c.id!}>{c.title}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2">Tipo de Espaço</label>
                     <select value={form.spaceType} onChange={e=>setForm({...form, spaceType: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-amber-400">
                        <option value="all">Qualquer Espaço (Regra Geral)</option>
                        <option value="leaflet_capa_destaque">Capa Principal</option>
                        <option value="leaflet_capa_normal">Capa Normal</option>
                        <option value="leaflet_contracapa">Contracapa</option>
                        <option value="leaflet_interior_full">Página Inteira (Interior)</option>
                        <option value="leaflet_interior_1_2">Meia Página</option>
                        <option value="leaflet_interior_1_4">Quarto de Página</option>
                     </select>
                  </div>
                </>
              ) : (
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2">Como é cobrado?</label>
                   <select value={form.chargeType} onChange={e=>setForm({...form, chargeType: e.target.value as any})} className="w-full p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 border-slate-200 focus:border-amber-400">
                      <option value="per_day">Por Dia de Exibição (Ex: 1€/dia)</option>
                      <option value="per_client">Por Cliente Atingido (Ex: 0.05€/cliente)</option>
                      <option value="fixed">Valor Fixo Único (Ex: 50€/envio)</option>
                   </select>
                </div>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t-2 border-slate-200">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2"><MapPin size={14}/> 2. Abrangência da Regra</label>
                 <select value={form.zoneLevel} onChange={e => handleZoneLevelChange(e.target.value)} className="w-full p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 border-slate-200 focus:border-amber-400">
                    <option value="global">GLOBAL (Padrão para todo o país)</option>
                    <option value="distrito">Por Distrito</option>
                    <option value="concelho">Por Concelho</option>
                    <option value="freguesia">Por Freguesia</option>
                 </select>
              </div>

              {form.zoneLevel !== 'global' && (
                 <div className="space-y-2 lg:col-span-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Selecione o Local Específico</label>
                    <div className="flex gap-2">
                       <select value={selectedDistrito} onChange={e=>{setSelectedDistrito(e.target.value); if(form.zoneLevel==='distrito') setForm({...form, zoneName: e.target.value});}} className="flex-1 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200">
                          <option value="">Distrito...</option>{distritos.map(d=><option key={d} value={d}>{d}</option>)}
                       </select>
                       {(form.zoneLevel === 'concelho' || form.zoneLevel === 'freguesia') && (
                         <select disabled={!selectedDistrito} value={selectedConcelho} onChange={e=>{setSelectedConcelho(e.target.value); if(form.zoneLevel==='concelho') setForm({...form, zoneName: e.target.value});}} className="flex-1 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200">
                            <option value="">Concelho...</option>{concelhos.map(c=><option key={c} value={c}>{c}</option>)}
                         </select>
                       )}
                       {form.zoneLevel === 'freguesia' && (
                         <select disabled={!selectedConcelho} value={form.zoneName} onChange={e=>setForm({...form, zoneName: e.target.value})} className="flex-1 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-slate-200">
                            <option value="">Freguesia...</option>{freguesias.map(f=><option key={f} value={f}>{f}</option>)}
                         </select>
                       )}
                    </div>
                 </div>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-200">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2"><Euro size={14}/> 3. Preço Base (€)</label>
                 <input type="number" step="0.001" required value={form.price} onChange={e=>setForm({...form, price: e.target.value})} placeholder="Ex: 0.05 ou 50.00" className="w-full p-4 bg-white border-2 border-amber-300 rounded-2xl font-black text-lg outline-none focus:border-amber-500" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Valor Mínimo Faturável (€) - Opcional</label>
                 <input type="number" step="0.01" value={form.minPrice} onChange={e=>setForm({...form, minPrice: e.target.value})} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-lg outline-none focus:border-amber-400" />
              </div>
           </div>

           <button type="submit" disabled={saving} className="w-full bg-[#0a2540] text-amber-400 p-6 rounded-3xl font-black uppercase text-sm tracking-widest hover:scale-[1.02] transition-transform shadow-xl flex justify-center items-center gap-3 border-b-4 border-black/40 mt-4">
              {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Regra de Preço</>}
           </button>
        </form>

        <div className="mt-12 space-y-4">
           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 pb-2">Regras Ativas no Sistema</h4>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="text-[9px] font-black uppercase text-slate-400">
                     <th className="pb-3">Ferramenta</th>
                     <th className="pb-3">Área de Aplicação</th>
                     <th className="pb-3">Métrica</th>
                     <th className="pb-3 text-right">Preço Base</th>
                     <th className="pb-3 text-right">Mínimo</th>
                     <th className="pb-3 text-center">Ação</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {rules.map(r => (
                     <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                       <td className="py-4 font-black uppercase text-[#0a2540] text-xs">
                          {r.tool === 'banner' ? 'Banner' : r.tool === 'push' ? 'Push FCM' : 'Folheto'}
                          {r.tool === 'leaflet' && <span className="block text-[8px] font-bold text-slate-400 mt-1">{r.leafletId === 'all' ? 'Todas as Edições' : 'Edição Específica'} | {r.spaceType === 'all' || !r.spaceType ? 'Qualquer Espaço' : r.spaceType.replace('leaflet_', '')}</span>}
                       </td>
                       <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${r.zoneLevel === 'global' ? 'bg-slate-800 text-white' : r.zoneLevel === 'concelho' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                             {r.zoneLevel}: {r.zoneName}
                          </span>
                       </td>
                       <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">
                          {r.chargeType === 'per_day' ? 'Por Dia' : r.chargeType === 'per_client' ? 'Por Cliente' : 'Fixo'}
                       </td>
                       <td className="py-4 text-right font-black text-[#00d66f]">{formatEuro(r.price)}</td>
                       <td className="py-4 text-right text-xs font-bold text-slate-400">{r.minPrice > 0 ? formatEuro(r.minPrice) : '--'}</td>
                       <td className="py-4 text-center">
                          <button onClick={() => handleDelete(r.id!)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                       </td>
                     </tr>
                   ))}
                   {rules.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-bold">Sem regras criadas. Todas as ferramentas aparecerão como "Preço sob consulta".</td></tr>}
                </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPricing;