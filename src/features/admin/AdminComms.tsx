import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { 
  collection, addDoc, query, onSnapshot, deleteDoc, doc, 
  updateDoc, serverTimestamp, Timestamp, orderBy, getDoc, setDoc, where 
} from 'firebase/firestore';
import { 
  Megaphone, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, 
  Save, Euro, MessageSquare, Send, Users, CheckSquare, X, Search,
  Loader2, FileText, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LeafletCampaign, MarketingRequest, User as UserProfile } from '../../types';

const AdminComms: React.FC = () => {
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  
  const [merchants, setMerchants] = useState<UserProfile[]>([]);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<string[]>([]);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // ESTADOS DO NOVO FOLHETO PARA LOJISTAS
  const [form, setForm] = useState({ title: '', limitDate: '', distDate: '' });
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const [prices, setPrices] = useState({
    banner: '', leaflet_capa_destaque: '', leaflet_capa_normal: '',
    leaflet_contracapa: '', leaflet_interior_full: '', leaflet_interior_1_2: '',
    leaflet_interior_1_4: '', push_cost_per_client: '0.05', push_min_cost: '5.00'
  });
  const [savingPrices, setSavingPrices] = useState(false);

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

    const qMerchants = query(collection(db, 'users'), where('role', '==', 'merchant'));
    const unsubMerchants = onSnapshot(qMerchants, (snap) => {
      setMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    return () => { unsubCam(); unsubReq(); unsubMerchants(); };
  }, []);

  const filteredMerchants = useMemo(() => {
    const q = merchantSearch.toLowerCase().trim();
    return merchants.filter(m => 
      m.name?.toLowerCase().includes(q) ||
      m.shopName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.nif?.includes(q) ||
      m.zipCode?.includes(q)
    );
  }, [merchants, merchantSearch]);

  const toggleMerchant = (id: string) => {
    setSelectedMerchantIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredMerchants.map(m => m.id);
    setSelectedMerchantIds(allIds);
    toast.success(`${allIds.length} LOJISTAS SELECIONADOS`);
  };

  const handleSendAdminMessage = async () => {
    if (selectedMerchantIds.length === 0) return toast.error("SELECIONE PELO MENOS UM LOJISTA.");
    if (!adminMessage.trim()) return toast.error("ESCREVA UMA MENSAGEM.");

    setSendingMsg(true);
    try {
      const promises = selectedMerchantIds.map(merchantId => 
        addDoc(collection(db, 'merchant_messages'), {
          merchantId,
          message: adminMessage,
          read: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      toast.success("MENSAGENS ENVIADAS COM SUCESSO!");
      setAdminMessage('');
      setSelectedMerchantIds([]);
    } catch (e) {
      toast.error("ERRO AO ENVIAR COMUNICADOS.");
    } finally {
      setSendingMsg(false);
    }
  };

  // CUIDA DA CRIAÇÃO DE CAMPANHAS DE FOLHETOS PARA LOJISTAS
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.limitDate || !form.distDate) return;

    setCreatingCampaign(true);
    try {
        await addDoc(collection(db, 'leaflet_campaigns'), {
            title: form.title,
            limitDate: Timestamp.fromDate(new Date(form.limitDate)),
            distributionDate: Timestamp.fromDate(new Date(form.distDate)),
            createdAt: serverTimestamp()
        });
        toast.success("Campanha criada para os Lojistas!");
        setForm({title:'', limitDate:'', distDate:''});
    } catch(err) { 
        toast.error("Erro ao criar Campanha."); 
    } finally {
        setCreatingCampaign(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
        await setDoc(doc(db, 'system', 'marketing_prices'), prices);
        toast.success("Preços atualizados!");
    } catch (err) { toast.error("Erro."); } finally { setSavingPrices(false); }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'marketing_requests', id), { status });
    toast.success("Estado atualizado.");
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#00d66f] p-3 rounded-2xl border-4 border-[#0a2540]">
                <MessageSquare size={24} className="text-[#0a2540]" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540]">Comunicados aos Lojistas</h3>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
               <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filtrar por NIF, Nome, Email ou CP..." 
                      className="w-full p-4 pl-12 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:border-[#00d66f]"
                      value={merchantSearch}
                      onChange={(e) => setMerchantSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto border-4 border-slate-100 rounded-[30px] p-4 bg-slate-50 space-y-2">
                    {filteredMerchants.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-transparent hover:border-[#00d66f] cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          checked={selectedMerchantIds.includes(m.id)}
                          onChange={() => toggleMerchant(m.id)}
                          className="w-5 h-5 accent-[#00d66f]"
                        />
                        <div className="overflow-hidden">
                          <p className="font-black text-[10px] uppercase text-[#0a2540] truncate">{m.shopName || m.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{m.zipCode} | {m.nif}</p>
                        </div>
                      </label>
                    ))}
                    {filteredMerchants.length === 0 && <p className="p-4 text-center text-slate-400 font-bold text-[10px]">NENHUM RESULTADO.</p>}
                  </div>

                  <button onClick={handleSelectAllFiltered} className="w-full py-3 bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-[#0a2540] hover:text-white transition-all">
                    <CheckSquare size={14} /> Selecionar Todos os Filtrados
                  </button>
               </div>

               <div className="flex flex-col gap-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                    <p className="text-[10px] font-black text-blue-800 uppercase">Destinatários: {selectedMerchantIds.length} Lojistas selecionados</p>
                  </div>
                  <textarea 
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder="Escreva o comunicado aqui..."
                    className="flex-grow p-6 bg-slate-50 border-4 border-slate-100 rounded-[30px] outline-none focus:border-[#00d66f] font-bold text-sm min-h-[150px]"
                  />
                  <button 
                    onClick={handleSendAdminMessage}
                    disabled={sendingMsg || selectedMerchantIds.length === 0}
                    className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:translate-y-1 transition-all disabled:opacity-50"
                  >
                    {sendingMsg ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Enviar Comunicado</>}
                  </button>
               </div>
            </div>
        </div>


        {/* NOVO QUADRO: PLANEAMENTO DE FOLHETOS (Para Lojistas aderirem) */}
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6 flex items-center gap-3">
                   <FileText className="text-[#00d66f]" size={24} /> Planeamento Folhetos
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">Crie a base do Folheto para que os lojistas possam comprar espaço nele.</p>
                
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400">Título / Edição</label>
                      <input required type="text" placeholder="Ex: Folheto de Natal 2026" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Data Limite Adesão</label>
                        <input required type="date" value={form.limitDate} onChange={e=>setForm({...form, limitDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400">Data de Lançamento</label>
                        <input required type="date" value={form.distDate} onChange={e=>setForm({...form, distDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs" />
                      </div>
                    </div>
                    <button type="submit" disabled={creatingCampaign} className="w-full mt-4 bg-[#0a2540] text-[#00d66f] p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                       {creatingCampaign ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Abrir Vagas no Folheto</>}
                    </button>
                </form>

                <div className="mt-8 space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 pb-2 mb-4">Campanhas Abertas</h4>
                   {campaigns.map(c => (
                     <div key={c.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <div>
                           <p className="font-black uppercase text-[#0a2540] text-xs">{c.title}</p>
                           <p className="text-[9px] font-bold text-slate-400">Fecho Adesões: {c.limitDate.toDate().toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'leaflet_campaigns', c.id!))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                     </div>
                   ))}
                   {campaigns.length === 0 && <p className="text-xs font-bold text-slate-400 text-center">Nenhuma campanha aberta.</p>}
                </div>
            </div>

            {/* PREÇÁRIO MARKETING */}
            <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6 flex items-center gap-3">
                   <Euro className="text-amber-500" size={24} /> Preçário Tabela Geral
                </h3>
                <form onSubmit={handleSavePrices} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Banner Lojista</label><input type="text" value={prices.banner} onChange={e=>setPrices({...prices, banner: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto Capa (Destaque)</label><input type="text" value={prices.leaflet_capa_destaque} onChange={e=>setPrices({...prices, leaflet_capa_destaque: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto Capa (Normal)</label><input type="text" value={prices.leaflet_capa_normal} onChange={e=>setPrices({...prices, leaflet_capa_normal: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto Contracapa</label><input type="text" value={prices.leaflet_contracapa} onChange={e=>setPrices({...prices, leaflet_contracapa: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto Pág. Inteira</label><input type="text" value={prices.leaflet_interior_full} onChange={e=>setPrices({...prices, leaflet_interior_full: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-400">Folheto Meia Pág.</label><input type="text" value={prices.leaflet_interior_1_2} onChange={e=>setPrices({...prices, leaflet_interior_1_2: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-100 mt-4">
                       <div><label className="text-[10px] font-black uppercase text-slate-400">Notificação Push (Por Cliente)</label><input type="number" step="0.01" value={prices.push_cost_per_client} onChange={e=>setPrices({...prices, push_cost_per_client: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                       <div><label className="text-[10px] font-black uppercase text-slate-400">Custo Fixo Mínimo (Push)</label><input type="number" step="0.01" value={prices.push_min_cost} onChange={e=>setPrices({...prices, push_min_cost: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-xs" /></div>
                    </div>

                    <button type="submit" disabled={savingPrices} className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2 mt-4">
                      {savingPrices ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Gravar Preçário</>}
                    </button>
                </form>
            </div>
        </div>

        {/* PEDIDOS PENDENTES DE PUBLICIDADE E PUSH */}
        <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6">Auditoria de Pedidos</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map(r => (
                    <div key={r.id} className="bg-white border-4 border-[#0a2540] p-6 rounded-[30px] shadow-[8px_8px_0px_#0a2540] flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black uppercase text-[#0a2540] text-lg leading-none">{r.merchantName}</h4>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase mt-2 inline-block ${r.type === 'push_notification' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                  Tipo: {r.type === 'push_notification' ? 'Push App' : r.type}
                                </span>
                            </div>
                            <button onClick={() => deleteDoc(doc(db, 'marketing_requests', r.id!))} className="text-red-400"><Trash2 size={20}/></button>
                        </div>

                        <div className="text-xs font-bold text-slate-500 mb-6 space-y-2 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex-grow">
                            {r.type === 'push_notification' ? (
                                <>
                                    <p><strong className="text-[#0a2540]">Título:</strong> {r.title}</p>
                                    <p><strong className="text-[#0a2540]">Mensagem:</strong> {r.text}</p>
                                    <p><strong className="text-[#0a2540]">Alvo:</strong> {r.targetType === 'all' ? 'Todos' : r.targetType === 'multiple_zip' ? `CPs: ${r.targetValue}` : r.targetType === 'birthDate' ? 'Aniversariantes' : 'Clientes Frequentes'}</p>
                                    <p className="text-[#00d66f] border-t-2 border-slate-200 pt-2 mt-2"><strong className="text-[#0a2540]">Orçamento:</strong> {r.cost}€ (Para {r.targetCount} Clientes)</p>
                                </>
                            ) : (
                                <>
                                    <p><strong className="text-[#0a2540]">Detalhes:</strong> {r.description || r.text}</p>
                                    {r.cost && <p className="text-[#00d66f]"><strong className="text-[#0a2540]">Orçamento:</strong> {r.cost}€ (Alvo: {r.targetCount} Clientes)</p>}
                                </>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {r.status !== 'approved' && <button onClick={() => handleUpdateStatus(r.id!, 'approved')} className="flex-1 bg-[#00d66f] text-[#0a2540] p-3 rounded-xl font-black uppercase text-[10px]">Aprovar</button>}
                            {r.status !== 'rejected' && <button onClick={() => handleUpdateStatus(r.id!, 'rejected')} className="flex-1 bg-red-100 text-red-700 p-3 rounded-xl font-black uppercase text-[10px]">Rejeitar</button>}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <p className="col-span-full text-center text-slate-400 font-bold p-10 border-4 border-dashed rounded-[40px]">Sem pedidos pendentes.</p>}
            </div>
        </div>
    </div>
  );
};

export default AdminComms;