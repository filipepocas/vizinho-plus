import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { Receipt, Search, Calendar, Download, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { MarketingRequest } from '../../types';

const AdminBilling: React.FC = () => {
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Carrega APENAS os pedidos que foram APROVADOS no menu de Comunicações
    const q = query(collection(db, 'marketing_requests'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MarketingRequest)));
    });
    return () => unsub();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const q = search.toLowerCase().trim();
      const name = (r.isExternal ? r.companyName : r.merchantName) || '';
      const matchSearch = name.toLowerCase().includes(q) || (r.nif || '').includes(q);

      const rDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
      const matchStart = !startDate || rDate >= new Date(startDate);
      const matchEnd = !endDate || rDate <= new Date(endDate + 'T23:59:59');

      return matchSearch && matchStart && matchEnd;
    });
  }, [requests, search, startDate, endDate]);

  const updateField = async (id: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'marketing_requests', id), { [field]: value });
      toast.success("Atualizado com sucesso!");
    } catch (e) {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleToggleDate = async (id: string, boolField: string, dateField: string, currentValue: boolean) => {
    try {
      const newValue = !currentValue;
      const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await updateDoc(doc(db, 'marketing_requests', id), { 
        [boolField]: newValue,
        [dateField]: newValue ? todayStr : ''
      });
      toast.success("Estado alterado!");
    } catch (e) {
      toast.error("Erro ao alterar estado.");
    }
  };

  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val) || 0);

  const exportToExcel = () => {
    const data = filteredRequests.map(r => ({
      "Data do Pedido": r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '---',
      "Tipo Cliente": r.isExternal ? 'Externo' : 'Lojista',
      "Solicitante": r.isExternal ? r.companyName : r.merchantName,
      "NIF": r.nif || '---',
      "Serviço": r.type === 'push_notification' ? 'Push App' : r.type === 'banner' ? 'Banner' : 'Folheto',
      "Orçamento Base": r.cost || 0,
      "Preço Final Cobrado": r.finalPrice ?? r.cost ?? 0,
      "Serviço Realizado": r.serviceCompleted ? 'Sim' : 'Não',
      "Cobrança Enviada": r.billingSent ? `Sim (${r.billingSentDate})` : 'Não',
      "Pagamento Recebido": r.paymentReceived ? `Sim (${r.paymentReceivedDate})` : 'Não'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobranças_Marketing");
    XLSX.writeFile(wb, `Cobrancas_Marketing_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#00d66f] p-4 rounded-2xl border-4 border-[#0a2540]">
              <Receipt size={28} className="text-[#0a2540]" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Gestão de Cobranças</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Faturação de Serviços de Marketing Aprovados</p>
            </div>
          </div>

          <button onClick={exportToExcel} className="bg-[#0a2540] text-[#00d66f] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-lg hover:scale-105 transition-transform">
            <Download size={18} /> Exportar Excel
          </button>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 bg-slate-50 p-6 rounded-[30px] border-2 border-slate-100">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Nome, Empresa ou NIF..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#0a2540] font-bold text-xs uppercase" />
           </div>
           <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-slate-200">
              <Calendar className="text-slate-400 ml-2" size={18} />
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent outline-none font-bold text-xs w-full text-slate-600" />
           </div>
           <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-slate-200">
              <span className="text-xs font-black text-slate-300 ml-4">ATÉ</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent outline-none font-bold text-xs w-full text-slate-600" />
           </div>
        </div>

        {/* TABELA DE COBRANÇAS */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="border-b-4 border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="pb-4 pl-4">Data / Serviço</th>
                <th className="pb-4">Solicitante</th>
                <th className="pb-4 text-center">Preço Base</th>
                <th className="pb-4 text-center">Preço Final (€)</th>
                <th className="pb-4 text-center">Realizado</th>
                <th className="pb-4 text-center">Cobrança</th>
                <th className="pb-4 text-center">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {filteredRequests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-6 pl-4">
                    <p className="text-xs font-black text-[#0a2540] uppercase">{r.type === 'push_notification' ? 'Push App' : r.type === 'banner' ? 'Banner' : 'Folheto'}</p>
                    <p className="text-[9px] font-bold text-slate-400">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '---'}</p>
                  </td>
                  
                  <td className="py-6">
                    <p className="text-xs font-black text-[#0a2540] uppercase leading-tight truncate max-w-[200px]">{r.isExternal ? r.companyName : r.merchantName}</p>
                    <p className="text-[9px] font-bold text-[#00d66f] uppercase">{r.isExternal ? 'Externo' : 'Lojista'} | NIF: {r.nif || '---'}</p>
                  </td>

                  <td className="py-6 text-center">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black">{formatEuro(r.cost)}</span>
                  </td>

                  {/* PREÇO FINAL (EDITÁVEL) */}
                  <td className="py-6 text-center">
                    <input 
                      type="number" step="0.01" 
                      defaultValue={r.finalPrice ?? r.cost ?? 0}
                      onBlur={(e) => updateField(r.id!, 'finalPrice', Number(e.target.value))}
                      className="w-24 text-center p-2 border-2 border-slate-200 rounded-xl font-black text-[#0a2540] outline-none focus:border-[#00d66f] bg-white transition-colors"
                    />
                  </td>

                  {/* CHECK: SERVIÇO REALIZADO */}
                  <td className="py-6 text-center">
                    <button onClick={() => updateField(r.id!, 'serviceCompleted', !r.serviceCompleted)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 mx-auto border-2 ${r.serviceCompleted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                      {r.serviceCompleted ? <CheckCircle size={14}/> : <Clock size={14}/>}
                      {r.serviceCompleted ? 'Concluído' : 'Pendente'}
                    </button>
                  </td>

                  {/* CHECK: COBRANÇA ENVIADA */}
                  <td className="py-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => handleToggleDate(r.id!, 'billingSent', 'billingSentDate', r.billingSent || false)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${r.billingSent ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {r.billingSent ? 'Enviada' : 'Não Enviada'}
                      </button>
                      {r.billingSent && <span className="text-[8px] font-bold text-slate-400">{r.billingSentDate}</span>}
                    </div>
                  </td>

                  {/* CHECK: PAGAMENTO RECEBIDO */}
                  <td className="py-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => handleToggleDate(r.id!, 'paymentReceived', 'paymentReceivedDate', r.paymentReceived || false)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${r.paymentReceived ? 'bg-[#00d66f]/20 text-[#00d66f] border-[#00d66f]/30' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {r.paymentReceived ? 'Pago' : 'Por Pagar'}
                      </button>
                      {r.paymentReceived && <span className="text-[8px] font-bold text-slate-400">{r.paymentReceivedDate}</span>}
                    </div>
                  </td>

                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">Nenhuma cobrança encontrada para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBilling;