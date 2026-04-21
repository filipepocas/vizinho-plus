import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Users, CheckSquare, MessageSquare, Send, MapPin, Phone, Mail, Image as ImageIcon, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MarketingRequest, User as UserProfile } from '../../types';
import { useStore } from '../../store/useStore';

const AdminComms: React.FC = () => {
  const { locations } = useStore();
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [merchants, setMerchants] = useState<UserProfile[]>([]);

  // PONTO 11: COMUNICADOS (Caixa de Entrada / Envelope)
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [msgForm, setMsgForm] = useState({ title: '', message: '', targetType: 'all' });
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  useEffect(() => {
    const qReq = query(collection(db, 'marketing_requests'), orderBy('createdAt', 'desc'));
    const unsubReq = onSnapshot(qReq, (snap) => {
        setRequests(snap.docs.map(d => ({id: d.id, ...d.data()} as MarketingRequest)).filter(r => r.status !== 'approved'));
    });

    const unsubMerchants = onSnapshot(collection(db, 'users'), (snap) => {
        setMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    // Lê histórico de Mensagens de Admin (Caixa de Entrada)
    const qMsg = query(collection(db, 'merchant_messages'), orderBy('createdAt', 'desc'));
    const unsubMsg = onSnapshot(qMsg, (snap) => setAdminMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubReq(); unsubMerchants(); unsubMsg(); };
  }, []);

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

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgForm.title || !msgForm.message) return toast.error("Preencha título e mensagem.");
    if (msgForm.targetType === 'zonas' && targetZones.length === 0) return toast.error("Selecione pelo menos uma Zona.");
    
    setSendingMsg(true);
    try {
      let targetsToSave = targetZones;
      if (msgForm.targetType === 'all') targetsToSave = ['Todos'];
      else if (msgForm.targetType === 'clients') targetsToSave = ['Apenas Clientes'];
      else if (msgForm.targetType === 'merchants') targetsToSave = ['Apenas Lojistas'];

      // PONTO 11: Em vez de criar um doc por pessoa (o que bloqueia o Firebase se houver 5.000 pessoas),
      // Criamos UM único documento Global. A App do utilizador vai ler este documento e filtrar se lhe pertence.
      await addDoc(collection(db, 'merchant_messages'), {
        title: msgForm.title,
        message: msgForm.message,
        targetType: msgForm.targetType,
        targetZones: targetsToSave,
        from: 'admin',
        createdAt: serverTimestamp(),
        readers: [] // Array para guardar quem já leu
      });
      
      toast.success("Comunicado enviado para a Caixa de Entrada dos utilizadores!");
      setMsgForm({ title: '', message: '', targetType: 'all' });
      setTargetZones([]); setDistrito('');
    } catch(err) { toast.error("Erro ao enviar comunicado."); } finally { setSendingMsg(false); }
  };

  const handleDeleteMessage = async (id: string) => {
    if(!window.confirm("Apagar este comunicado global? Desaparecerá da caixa de entrada de todos os utilizadores.")) return;
    await deleteDoc(doc(db, 'merchant_messages', id));
    toast.success("Mensagem apagada do sistema.");
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'marketing_requests', id), { status });
    if (status === 'approved') toast.success("Aprovado! Movido para o Menu de Cobranças.");
    else toast.success("Pedido Rejeitado.");
  };

  const getMerchantDetails = (merchantId: string) => merchants.find(m => m.id === merchantId);
  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* PONTO 11: COMUNICADOS DA PLATAFORMA (ENVELOPE) */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
           <div className="flex items-center gap-4 mb-8 border-b-2 border-slate-100 pb-6">
              <div className="bg-indigo-500 p-4 rounded-2xl border-4 border-[#0a2540]"><Mail size={28} className="text-white" /></div>
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Comunicados Oficiais</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Envie mensagens para a Caixa de Entrada (Envelope) na App.</p>
              </div>
           </div>

           <div className="grid lg:grid-cols-2 gap-10">
              <form onSubmit={handleSendAdminMessage} className="space-y-4">
                 <input required type="text" placeholder="Título da Mensagem" value={msgForm.title} onChange={e=>setMsgForm({...msgForm, title: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" />
                 <textarea required rows={4} placeholder="Escreva o comunicado aqui..." value={msgForm.message} onChange={e=>setMsgForm({...msgForm, message: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 resize-none" />
                 
                 <div className="bg-indigo-50 p-6 rounded-3xl border-4 border-indigo-100">
                    <label className="text-[10px] font-black uppercase text-indigo-900 tracking-widest mb-3 block">Quem recebe este comunicado?</label>
                    <select value={msgForm.targetType} onChange={e=>setMsgForm({...msgForm, targetType: e.target.value})} className="w-full p-4 bg-white border-2 border-indigo-200 rounded-xl font-black text-xs uppercase outline-none focus:border-indigo-500 mb-4">
                       <option value="all">TODOS OS UTILIZADORES (Lojistas e Clientes)</option>
                       <option value="merchants">Apenas Lojistas (Todos)</option>
                       <option value="clients">Apenas Clientes Vizinhos (Todos)</option>
                       <option value="zonas">Filtro Geográfico (Zonas Específicas)</option>
                    </select>

                    {msgForm.targetType === 'zonas' && (
                       <div className="space-y-3 animate-in slide-in-from-top-2">
                         <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-indigo-200">
                           <option value="">Distrito</option>
                           {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                         <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-indigo-200 disabled:opacity-50">
                           <option value="">Todo o Distrito (Ou selecione Concelho)</option>
                           {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-indigo-200 disabled:opacity-50">
                           <option value="">Todo o Concelho (Ou selecione Freguesia)</option>
                           {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                         </select>
                         <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-indigo-500 text-white p-3 rounded-xl font-black uppercase text-[10px] hover:bg-indigo-600 disabled:opacity-50">Adicionar Zona</button>
                         {targetZones.length > 0 && (
                           <div className="flex flex-wrap gap-1 mt-2 p-2 bg-white rounded-lg border border-indigo-100">
                             {targetZones.map((z, idx) => (
                               <span key={idx} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1">{z} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_, i) => i !== idx))}/></span>
                             ))}
                           </div>
                         )}
                       </div>
                    )}
                 </div>

                 <button type="submit" disabled={sendingMsg} className="w-full bg-[#0a2540] text-indigo-400 p-6 rounded-3xl font-black uppercase flex justify-center gap-3 shadow-xl hover:scale-[1.02] border-b-4 border-black/40">
                   {sendingMsg ? <Loader2 className="animate-spin" /> : <><Send size={20}/> Enviar Comunicado</>}
                 </button>
              </form>

              <div className="bg-slate-50 border-4 border-slate-100 rounded-3xl p-6 flex flex-col h-[500px]">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 border-b-2 border-slate-200 pb-2">Histórico de Enviados</h4>
                 <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {adminMessages.map(m => (
                       <div key={m.id} className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm relative group">
                          <button onClick={() => handleDeleteMessage(m.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                          <p className="font-black text-sm uppercase text-[#0a2540] pr-8">{m.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 mb-2">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'Recente'}</p>
                          <p className="text-xs font-bold text-slate-600 line-clamp-2">{m.message}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                             <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-[8px] font-black uppercase">Alvo: {m.targetType}</span>
                             {(m.targetZones || []).slice(0,2).map((z:string, i:number) => <span key={i} className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[8px] font-black uppercase truncate max-w-[100px]">{z}</span>)}
                          </div>
                       </div>
                    ))}
                    {adminMessages.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-10">Sem comunicados enviados.</p>}
                 </div>
              </div>
           </div>
        </div>

        {/* APROVAÇÃO MARKETING (Já existia na Fase 3.2, mantemos intacto) */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2 flex items-center gap-3">
              <CheckSquare className="text-[#00d66f]" size={28}/> Aprovação de Campanhas Publicitárias
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 tracking-widest border-b-2 border-slate-100 pb-4">
              NOTA: Ao aprovar um pedido, ele é movido para o menu "Cobranças".
            </p>
            <div className="grid grid-cols-1 gap-8">
                {requests.map(r => {
                    const merch = r.isExternal ? null : getMerchantDetails(r.merchantId || '');
                    const targetZones = (r as any).targetZones || [];

                    return (
                      <div key={r.id} className={`bg-white border-4 p-8 rounded-[40px] flex flex-col md:flex-row gap-8 items-start transition-all ${r.status === 'rejected' ? 'border-red-200 opacity-70 bg-red-50' : r.isExternal ? 'border-purple-600 shadow-[8px_8px_0px_#9333ea] hover:shadow-none hover:translate-y-1' : 'border-blue-400 shadow-[8px_8px_0px_#60a5fa] hover:shadow-none hover:translate-y-1'}`}>
                          
                          <div className="md:w-1/3 w-full shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-slate-100 pb-6 md:pb-0 md:pr-6">
                              <div className="flex items-center gap-2 mb-3">
                                {r.isExternal && <span className="bg-purple-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">EXTERNO</span>}
                                {r.status === 'rejected' && <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">REJEITADO</span>}
                                <h4 className="font-black uppercase text-[#0a2540] text-xl leading-none truncate">{r.isExternal ? r.companyName : r.merchantName}</h4>
                              </div>
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-block border-2 ${r.type === 'push_notification' ? 'bg-blue-50 text-blue-700 border-blue-200' : r.type === 'banner' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                Pedido: {r.type === 'push_notification' ? 'Notificação Push' : r.type === 'banner' ? 'Banner na App' : 'Folheto Digital'}
                              </span>
                              
                              <div className="mt-6 space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-3"><Users size={14} className={r.isExternal ? 'text-purple-500' : 'text-blue-400'}/> <span className="truncate">{r.isExternal ? r.contactName : (merch?.responsibleName || '---')}</span></p>
                                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-3"><MapPin size={14} className={r.isExternal ? 'text-purple-500' : 'text-blue-400'}/> NIF: {r.isExternal ? r.nif : (merch?.nif || '---')} {merch?.zipCode ? `| CP: ${merch.zipCode}` : ''}</p>
                                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-3"><Phone size={14} className={r.isExternal ? 'text-purple-500' : 'text-blue-400'}/> {r.isExternal ? r.phone : (merch?.phone || '---')}</p>
                                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-3"><Mail size={14} className={r.isExternal ? 'text-purple-500' : 'text-blue-400'}/> <span className="truncate">{r.isExternal ? r.email : (merch?.email || '---')}</span></p>
                              </div>
                          </div>

                          <div className="flex-1 w-full flex flex-col h-full">
                              <div className="text-xs font-bold text-slate-500 space-y-3 bg-white p-6 rounded-3xl border-2 border-slate-100 mb-6 shadow-sm flex-grow">
                                  {r.type === 'push_notification' ? (
                                      <>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Título:</strong> <span className="text-right text-[#0a2540] italic">{r.title}</span></p>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest shrink-0">Mensagem:</strong> <span className="text-right break-words ml-4">{r.text}</span></p>
                                          <p className="flex justify-between border-b border-slate-50 pb-2">
                                            <strong className="text-[#0a2540] uppercase text-[10px] tracking-widest shrink-0">Destino:</strong> 
                                            <div className="text-right flex flex-col gap-1 items-end">
                                              <span className="bg-slate-100 px-2 py-1 rounded text-[9px] uppercase font-black">{r.targetType === 'zonas' ? 'Por Zonas Geográficas' : r.targetType === 'all' ? 'Todos os Clientes' : r.targetType === 'birthDate' ? 'Aniversariantes' : 'Meus Clientes'}</span>
                                              {targetZones.map((z:string, i:number) => <span key={i} className="text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">{z}</span>)}
                                            </div>
                                          </p>
                                          <p className="text-[#00d66f] border-t-2 border-slate-200 pt-3 mt-3 flex justify-between items-center bg-slate-50 p-3 rounded-xl"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Orçamento Validado:</strong> <span className="text-lg font-black">{formatEuro(r.cost)}</span></p>
                                      </>
                                  ) : r.type === 'banner' ? (
                                      <>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Período:</strong> <span className="text-right">{r.requestedDate}</span></p>
                                          {r.text && <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest shrink-0">Texto:</strong> <span className="text-right">{r.text}</span></p>}
                                          <p className="flex justify-between border-b border-slate-50 pb-2">
                                            <strong className="text-[#0a2540] uppercase text-[10px] tracking-widest shrink-0">Destino:</strong> 
                                            <div className="text-right flex flex-col gap-1 items-end">
                                              <span className="bg-slate-100 px-2 py-1 rounded text-[9px] uppercase font-black">{r.targetType === 'zonas' ? 'Por Zonas Geográficas' : r.targetType === 'all' ? 'Todos os Clientes' : r.targetType === 'birthDate' ? 'Aniversariantes' : r.targetType === 'specific_clients' ? 'NIFs Específicos' : 'Top Clientes'}</span>
                                              {targetZones.map((z:string, i:number) => <span key={i} className="text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">{z}</span>)}
                                              {r.targetValue && <span className="text-[9px] text-slate-400 font-mono">{r.targetValue}</span>}
                                            </div>
                                          </p>
                                          <p className="text-[#00d66f] border-t-2 border-slate-200 pt-3 mt-3 flex justify-between items-center bg-slate-50 p-3 rounded-xl"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Orçamento Validado:</strong> <span className="text-lg font-black flex items-center gap-2">{r.isExternal && <span className="bg-purple-100 text-purple-700 text-[8px] px-2 py-1 rounded uppercase tracking-widest">Agravamento Externo</span>}{formatEuro(r.cost)}</span></p>
                                      </>
                                  ) : (
                                      <>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Campanha Alvo:</strong> <span className="text-right text-[#0a2540] font-black italic">{r.leafletCampaignTitle}</span></p>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Espaço Pretendido:</strong> <span className="text-right text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase text-[9px] font-black">{r.spaceType?.replace(/_/g, ' ')}</span></p>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Produto a Anunciar:</strong> <span className="text-right text-[#0a2540]">{r.description}</span></p>
                                          <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Preço Base:</strong> <span className="text-right font-black">{r.sellPrice} / {r.unit}</span></p>
                                          {r.promoPrice && <p className="flex justify-between border-b border-slate-50 pb-2"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Desconto / Promo:</strong> <span className="text-right font-black text-red-500">{r.promoPrice} ({r.promoType})</span></p>}
                                          {r.cost && <p className="text-[#00d66f] border-t-2 border-slate-200 pt-3 mt-3 flex justify-between items-center bg-slate-50 p-3 rounded-xl"><strong className="text-[#0a2540] uppercase text-[10px] tracking-widest">Custo Fixo do Espaço:</strong> <span className="text-lg font-black flex items-center gap-2">{r.isExternal && <span className="bg-purple-100 text-purple-700 text-[8px] px-2 py-1 rounded uppercase tracking-widest">Agravamento Externo</span>}{formatEuro(r.cost)}</span></p>}
                                      </>
                                  )}
                              </div>

                              <div className="flex flex-wrap md:flex-nowrap gap-3 items-center justify-between mt-auto">
                                  <div className="flex gap-3 w-full md:w-auto">
                                    {r.status !== 'approved' && <button onClick={() => handleUpdateStatus(r.id!, 'approved')} className="flex-1 bg-[#0a2540] text-[#00d66f] px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition-all">Aprovar Envio / Campanha</button>}
                                    {r.status !== 'rejected' && <button onClick={() => handleUpdateStatus(r.id!, 'rejected')} className="px-6 bg-red-50 text-red-600 border-2 border-red-200 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Recusar</button>}
                                  </div>
                                  <button onClick={() => {
                                      if(window.confirm("Apagar definitivamente este pedido da base de dados? É irreversível.")) deleteDoc(doc(db, 'marketing_requests', r.id!))
                                  }} className="bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-colors p-4 rounded-2xl" title="Apagar definitivamente do sistema"><Trash2 size={20}/></button>
                              </div>
                          </div>
                          
                          {r.imageUrl ? (
                            <div className="w-full md:w-48 h-48 shrink-0 bg-slate-50 rounded-[30px] border-4 border-slate-200 overflow-hidden flex items-center justify-center p-3 shadow-inner"><img src={r.imageUrl} className="w-full h-full object-contain" alt="Design Associado" /></div>
                          ) : (
                            <div className="w-full md:w-48 h-48 shrink-0 bg-slate-50 rounded-[30px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300"><Bell size={32} className="mb-2"/><span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem / Push</span></div>
                          )}
                      </div>
                    )
                })}
                {requests.length === 0 && (
                  <div className="text-center p-20 bg-white rounded-[40px] border-4 border-dashed border-slate-200"><Search size={48} className="mx-auto text-slate-300 mb-4" /><p className="font-black text-[11px] uppercase tracking-widest text-slate-400">Nenhum pedido de marketing pendente para análise.</p></div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AdminComms;