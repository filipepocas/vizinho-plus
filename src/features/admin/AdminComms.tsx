import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Trash2, Users, CheckSquare, Search, FileText, MapPin, Phone, Mail, Image as ImageIcon, Bell, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { MarketingRequest, User as UserProfile } from '../../types';

const AdminComms: React.FC = () => {
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [merchants, setMerchants] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Carrega APENAS os pedidos pendentes ou rejeitados (Os aprovados vão para cobranças)
    const qReq = query(collection(db, 'marketing_requests'), orderBy('createdAt', 'desc'));
    const unsubReq = onSnapshot(qReq, (snap: any) => {
        const allReqs = snap.docs.map((d: any) => ({id: d.id, ...d.data()} as MarketingRequest));
        setRequests(allReqs.filter((r: any) => r.status !== 'approved'));
    });

    const unsubMerchants = onSnapshot(collection(db, 'users'), (snap: any) => {
        setMerchants(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    return () => { unsubReq(); unsubMerchants(); };
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'marketing_requests', id), { status });
    if (status === 'approved') {
        toast.success("Aprovado! Movido para o Menu de Cobranças.");
    } else {
        toast.success("Pedido Rejeitado.");
    }
  };

  const getMerchantDetails = (merchantId: string) => merchants.find(m => m.id === merchantId);
  const formatEuro = (val: any) => {
    if (!val || isNaN(val)) return null;
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* PONTO 13: Tabela de Preços e Planeamento Removidos. Este ecrã foca-se agora apenas na Análise de Pedidos */}
        
        <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2 flex items-center gap-3">
              <CheckSquare className="text-[#00d66f]" size={28}/> Aprovação de Campanhas Publicitárias
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 tracking-widest border-b-2 border-slate-100 pb-4">
              NOTA: Ao aprovar um pedido, ele é movido para o menu "Cobranças" no separador Gestão.
            </p>
            
            <div className="grid grid-cols-1 gap-8">
                {requests.map((r: any) => {
                    const merch = r.isExternal ? null : getMerchantDetails(r.merchantId || '');
                    const targetZones = (r as any).targetZones || []; // ARRAY COM AS ZONAS

                    return (
                      <div key={r.id} className={`bg-white border-4 p-8 rounded-[40px] flex flex-col md:flex-row gap-8 items-start transition-all ${r.status === 'rejected' ? 'border-red-200 opacity-70 bg-red-50' : r.isExternal ? 'border-purple-600 shadow-[8px_8px_0px_#9333ea] hover:shadow-none hover:translate-y-1' : 'border-blue-400 shadow-[8px_8px_0px_#60a5fa] hover:shadow-none hover:translate-y-1'}`}>
                          
                          {/* Coluna Esquerda: Dados do Solicitante */}
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

                          {/* Coluna Central: Detalhes Técnicos do Pedido */}
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
                          
                          {/* Coluna Direita: Imagem */}
                          {r.imageUrl ? (
                            <div className="w-full md:w-48 h-48 shrink-0 bg-slate-50 rounded-[30px] border-4 border-slate-200 overflow-hidden flex items-center justify-center p-3 shadow-inner">
                                <img src={r.imageUrl} className="w-full h-full object-contain" alt="Design Associado" />
                            </div>
                          ) : (
                            <div className="w-full md:w-48 h-48 shrink-0 bg-slate-50 rounded-[30px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                                {r.type === 'push_notification' ? <Bell size={32} className="mb-2"/> : <ImageIcon size={32} className="mb-2"/>}
                                <span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem / Push</span>
                            </div>
                          )}
                      </div>
                    )
                })}
                {requests.length === 0 && (
                  <div className="text-center p-20 bg-white rounded-[40px] border-4 border-dashed border-slate-200">
                     <Search size={48} className="mx-auto text-slate-300 mb-4" />
                     <p className="font-black text-[11px] uppercase tracking-widest text-slate-400">Nenhum pedido de marketing pendente para análise.</p>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AdminComms;