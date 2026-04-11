// src/features/admin/AdminComms.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp, orderBy, getDoc, setDoc, where } from 'firebase/firestore';
import { Megaphone, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Save, Euro, Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign, MarketingRequest, User as UserProfile } from '../../types';

const AdminComms: React.FC = () => {
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [form, setForm] = useState({ title: '', limitDate: '', distDate: '' });

  const [prices, setPrices] = useState({
    banner: '',
    leaflet_capa_destaque: '',
    leaflet_capa_normal: '',
    leaflet_contracapa: '',
    leaflet_interior_full: '',
    leaflet_interior_1_2: '',
    leaflet_interior_1_4: '',
    push_cost_per_client: '0.05', // Ex: 0.05 cêntimos
    push_min_cost: '5.00' // Ex: 5 euros mínimos
  });
  const [savingPrices, setSavingPrices] = useState(false);

  // Estados para Envio de Mensagens a Comerciantes
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('createdAt', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => setCampaigns(snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign))));

    const qReq = query(collection(db, 'marketing_requests'), orderBy('createdAt', 'desc'));
    const unsubReq = onSnapshot(qReq, (snap) => setRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as MarketingRequest))));

    const fetchPrices = async () => {
      const docSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (docSnap.exists()) setPrices(docSnap.data() as any);
    };
    fetchPrices();

    // Fetch Merchants
    const qMerch = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerch = onSnapshot(qMerch, (snap) => setMerchants(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile))));

    return () => { unsubCam(); unsubReq(); unsubMerch(); };
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.limitDate || !form.distDate) {
        toast.error("Por favor, preenche ambas as datas.");
        return;
    }
    try {
        await addDoc(collection(db, 'leaflet_campaigns'), {
            title: form.title,
            limitDate: Timestamp.fromDate(new Date(form.limitDate)),
            distributionDate: Timestamp.fromDate(new Date(form.distDate)),
            createdAt: serverTimestamp()
        });
        toast.success("Campanha criada com sucesso!");
        setForm({title:'', limitDate:'', distDate:''});
    } catch(err: any) { 
        toast.error(`Erro ao criar: ${err.message || 'Verifica as permissões.'}`); 
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
      try { await updateDoc(doc(db, 'marketing_requests', id), { status }); toast.success("Estado atualizado."); } 
      catch(err) { toast.error("Erro."); }
  };

  const handleDeleteRequest = async (id: string) => {
      if(!window.confirm("Eliminar este pedido permanentemente? (Liberta espaço)")) return;
      await deleteDoc(doc(db, 'marketing_requests', id));
  };

  const handleSavePrices = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingPrices(true);
      try {
          await setDoc(doc(db, 'system', 'marketing_prices'), prices);
          toast.success("Preços e Limites atualizados com sucesso!");
      } catch (err) { toast.error("Erro ao atualizar."); } 
      finally { setSavingPrices(false); }
  };

  // Funções para Envio de Mensagem aos Comerciantes
  const filteredMerchants = merchants.filter(m => {
      if (!merchantSearch) return true;
      const q = merchantSearch.toLowerCase().trim();
      return m.name?.toLowerCase().includes(q) || 
             m.shopName?.toLowerCase().includes(q) || 
             m.nif?.includes(q) || 
             m.email?.toLowerCase().includes(q) || 
             m.zipCode?.includes(q);
  });

  const toggleMerchantSelection = (id: string) => {
      if (selectedMerchants.includes(id)) setSelectedMerchants(selectedMerchants.filter(mid => mid !== id));
      else setSelectedMerchants([...selectedMerchants, id]);
  };

  const handleSendAdminMessage = async () => {
      if (selectedMerchants.length === 0) return toast.error("Seleciona pelo menos um comerciante.");
      if (!adminMessage.trim()) return toast.error("Escreve uma mensagem.");

      setSendingMsg(true);
      try {
          // Cria uma mensagem na base de dados para cada comerciante selecionado
          const promises = selectedMerchants.map(merchantId => 
              addDoc(collection(db, 'merchant_messages'), {
                  merchantId,
                  message: adminMessage,
                  read: false,
                  createdAt: serverTimestamp()
              })
          );
          await Promise.all(promises);
          toast.success("Mensagem enviada com sucesso aos painéis dos lojistas!");
          setAdminMessage('');
          setSelectedMerchants([]);
      } catch (e) {
          toast.error("Erro ao enviar mensagem.");
      } finally {
          setSendingMsg(false);
      }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
        
        {/* PREÇÁRIO */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2"><Euro className="inline mr-3 text-amber-500"/> Definir Preços (Visível Lojistas)</h3>
            <p className="text-xs font-bold text-slate-400 mb-6">Define os valores cobrados por cada ação de marketing.</p>
            
            <form onSubmit={handleSavePrices} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 mb-6">
                    <div><label className="text-[10px] font-black uppercase text-blue-800">Custo por Cliente Atingido (Push)</label><input type="number" step="0.01" value={prices.push_cost_per_client} onChange={e=>setPrices({...prices, push_cost_per_client: e.target.value})} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" placeholder="Ex: 0.05" required/></div>
                    <div><label className="text-[10px] font-black uppercase text-blue-800">Valor Mínimo do Serviço (Push)</label><input type="number" step="0.01" value={prices.push_min_cost} onChange={e=>setPrices({...prices, push_min_cost: e.target.value})} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" placeholder="Ex: 5.00" required/></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Banner Rotativo</label><input type="text" value={prices.banner} onChange={e=>setPrices({...prices, banner: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto: Capa (Destaque)</label><input type="text" value={prices.leaflet_capa_destaque} onChange={e=>setPrices({...prices, leaflet_capa_destaque: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto: Capa (Normal)</label><input type="text" value={prices.leaflet_capa_normal} onChange={e=>setPrices({...prices, leaflet_capa_normal: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto: Contracapa</label><input type="text" value={prices.leaflet_contracapa} onChange={e=>setPrices({...prices, leaflet_contracapa: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Interior: Pág Inteira</label><input type="text" value={prices.leaflet_interior_full} onChange={e=>setPrices({...prices, leaflet_interior_full: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Interior: 1/2 Página</label><input type="text" value={prices.leaflet_interior_1_2} onChange={e=>setPrices({...prices, leaflet_interior_1_2: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400">Interior: 1/4 Página</label><input type="text" value={prices.leaflet_interior_1_4} onChange={e=>setPrices({...prices, leaflet_interior_1_4: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]"/></div>
                    
                    <div className="md:col-span-2 flex items-end">
                        <button type="submit" disabled={savingPrices} className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2"><Save size={16}/> Guardar Preçário</button>
                    </div>
                </div>
            </form>
        </div>

        {/* COMUNICAÇÃO PARA LOJISTAS */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2"><MessageSquare className="inline mr-3 text-[#00d66f]"/> Enviar Mensagem a Lojistas</h3>
            <p className="text-xs font-bold text-slate-400 mb-6">A mensagem aparecerá diretamente no painel interno dos comerciantes selecionados.</p>
            
            <div className="space-y-4">
               <input type="text" placeholder="Procurar lojista por Nome, NIF, Email ou CP (Ex: 4000 ou 4000-123)" value={merchantSearch} onChange={e=>setMerchantSearch(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-[#00d66f]" />
               
               <div className="max-h-48 overflow-y-auto bg-slate-50 border-2 border-slate-100 rounded-2xl p-2 space-y-1">
                   {filteredMerchants.length === 0 && <p className="p-4 text-xs font-bold text-slate-400 text-center uppercase">Nenhum lojista encontrado.</p>}
                   {filteredMerchants.map(m => (
                       <label key={m.id} className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200">
                           <input type="checkbox" checked={selectedMerchants.includes(m.id)} onChange={() => toggleMerchantSelection(m.id)} className="w-4 h-4 accent-[#00d66f]" />
                           <div>
                              <p className="text-[11px] font-black uppercase text-[#0a2540]">{m.shopName || m.name}</p>
                              <p className="text-[9px] font-bold text-slate-400">{m.email} | NIF: {m.nif} | CP: {m.zipCode}</p>
                           </div>
                       </label>
                   ))}
               </div>
               
               <div className="flex justify-between items-center px-2">
                   <span className="text-[10px] font-black text-[#00d66f] uppercase">{selectedMerchants.length} Selecionados</span>
                   <button onClick={() => setSelectedMerchants(filteredMerchants.map(m => m.id))} className="text-[10px] font-black text-slate-500 uppercase hover:text-[#0a2540]">Selecionar Todos (Filtrados)</button>
               </div>

               <textarea rows={4} placeholder="Escreve aqui o comunicado..." value={adminMessage} onChange={e=>setAdminMessage(e.target.value)} className="w-full p-4 bg-white border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f] resize-none" />

               <button onClick={handleSendAdminMessage} disabled={sendingMsg} className="w-full bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.01] transition-all flex items-center justify-center gap-2 border-b-4 border-black/20">
                  <Send size={18} /> Enviar Comunicado
               </button>
            </div>
        </div>

        {/* O RESTO MANTÉM-SE IGUAL (Folhetos e Pedidos) */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6"><Megaphone className="inline mr-3 text-amber-500"/> Previsão de Folhetos</h3>
            <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400">Nome da Edição</label><input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#0a2540]"/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Limite Inscrição</label><input required type="date" value={form.limitDate} onChange={e=>setForm({...form, limitDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#0a2540]"/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">Distribuição</label><input required type="date" value={form.distDate} onChange={e=>setForm({...form, distDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#0a2540]"/></div>
                <button type="submit" className="w-full md:col-span-4 bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-2"><Plus size={20}/> Criar Nova Edição</button>
            </form>

            <div className="mt-6 flex flex-wrap gap-4">
                {campaigns.map(c => (
                    <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                        <p className="font-black uppercase text-[#0a2540] text-sm">{c.title}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Limite: {c.limitDate.toDate().toLocaleDateString()}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Distribuição: {c.distributionDate.toDate().toLocaleDateString()}</p>
                        <button onClick={() => deleteDoc(doc(db, 'leaflet_campaigns', c.id!))} className="mt-2 text-red-500 text-[10px] font-black uppercase">Apagar Folheto</button>
                    </div>
                ))}
            </div>
        </div>

        <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6">Pedidos das Lojas Pendentes</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map(r => (
                    <div key={r.id} className="bg-white border-4 border-[#0a2540] p-6 rounded-[30px] shadow-[8px_8px_0px_#0a2540] relative">
                        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
                            <div>
                                <h4 className="font-black uppercase text-[#0a2540] text-lg leading-none">{r.merchantName}</h4>
                                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase mt-2 inline-block ${r.type === 'banner' ? 'bg-blue-100 text-blue-700' : r.type === 'push_notification' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    Pedido de {r.type.replace('_', ' ')}
                                </span>
                            </div>
                            <button onClick={() => handleDeleteRequest(r.id!)} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="flex-1 space-y-2 text-xs font-bold text-slate-600">
                                {r.type === 'push_notification' ? (
                                    <>
                                        <p><b>Público:</b> {r.targetCriteria === 'all' ? 'Todos' : r.targetCriteria === 'cp' ? `Código Postal (${r.targetValue})` : r.targetCriteria === 'top' ? 'Top Clientes da Loja' : 'Aniversariantes do Mês'}</p>
                                        <p><b>Alcance:</b> {r.targetCount} Clientes</p>
                                        <p><b>Orçamento:</b> {r.cost} €</p>
                                        <p><b>Texto:</b> "{r.text}"</p>
                                    </>
                                ) : r.type === 'banner' ? (
                                    <>
                                        <p><b>Datas:</b> {r.requestedDate}</p>
                                        <p><b>Texto:</b> {r.text}</p>
                                    </>
                                ) : (
                                    <>
                                        <p><b>Folheto:</b> {r.leafletCampaignTitle}</p>
                                        <p><b>Espaço:</b> {r.spaceType?.replace(/_/g, ' ')}</p>
                                        <p><b>Produto:</b> {r.description}</p>
                                        <p><b>Preços:</b> {r.sellPrice} / {r.unit} {r.promoPrice && `(Promo: ${r.promoPrice} - ${r.promoType})`}</p>
                                    </>
                                )}
                            </div>
                            
                            {r.imageUrl && (
                                <div className="w-full md:w-24 h-24 shrink-0 rounded-2xl border-4 border-slate-100 overflow-hidden">
                                    <img src={r.imageUrl} className="w-full h-full object-cover" alt="Preview"/>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 border-t-2 border-slate-100 pt-4">
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