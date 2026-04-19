import React, { useState } from 'react';
import { Transaction, User as UserProfile } from '../../types';
import { Search, Download, Calendar, Hash, IdCard, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../../store/useStore';

interface AdminTransactionsProps {
  transactions: Transaction[];
  clients: UserProfile[];
  merchants: UserProfile[];
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions, clients, merchants }) => {
  const { locations } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchNif, setSearchNif] = useState('');
  const [searchCard, setSearchCard] = useState('');
  const [searchDistrito, setSearchDistrito] = useState('');
  const [searchConcelho, setSearchConcelho] = useState('');
  const [searchFreguesia, setSearchFreguesia] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = searchDistrito ? Object.keys(locations[searchDistrito] || {}).sort() : [];
  const freguesias = searchDistrito && searchConcelho ? (locations[searchDistrito][searchConcelho] || []).sort() : [];

  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    return new Date(createdAt.seconds * 1000);
  };

  const hasActiveFilter = searchQuery !== '' || searchNif !== '' || searchCard !== '' || searchDistrito !== '' || searchConcelho !== '' || searchFreguesia !== '' || startDate !== '' || endDate !== '';

  const filteredTransactions = transactions.filter(t => {
    if (!hasActiveFilter) return false;

    const c = clients.find(cl => cl.id === t.clientId);
    const m = merchants.find(me => me.id === t.merchantId);

    const q = searchQuery.toLowerCase();
    const matchText = q === '' || (t.merchantName || '').toLowerCase().includes(q) || (t.documentNumber || '').toLowerCase().includes(q) || (t.clientName || '').toLowerCase().includes(q);
    
    // NIF pode pertencer ao cliente ou ao lojista
    const matchNif = searchNif === '' || t.clientNif === searchNif || c?.nif === searchNif || m?.nif === searchNif;
    // Cartão pertence ao cliente
    const matchCard = searchCard === '' || t.clientCardNumber === searchCard || c?.customerNumber === searchCard;

    // Localização: Válida se a Loja OU o Cliente pertencerem à zona escolhida
    const matchDistrito = searchDistrito === '' || c?.distrito === searchDistrito || m?.distrito === searchDistrito;
    const matchConcelho = searchConcelho === '' || c?.concelho === searchConcelho || m?.concelho === searchConcelho;
    const matchFreguesia = searchFreguesia === '' || c?.freguesia === searchFreguesia || m?.freguesia === searchFreguesia;

    const txDate = parseDate(t.createdAt);
    const matchStart = !startDate || txDate >= new Date(startDate);
    const matchEnd = !endDate || txDate <= new Date(endDate + 'T23:59:59');

    return matchText && matchStart && matchEnd && matchNif && matchCard && matchDistrito && matchConcelho && matchFreguesia;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map(t => {
      const c = clients.find(cl => cl.id === t.clientId);
      const m = merchants.find(me => me.id === t.merchantId);
      return {
        Data: parseDate(t.createdAt).toLocaleString(),
        "Nome do Comerciante": t.merchantName || m?.shopName || m?.name || '---',
        "NIF do Comerciante": m?.nif || '---',
        "Zona Loja": m ? `${m.concelho} > ${m.freguesia}` : '---',
        "Nome do Cliente": t.clientName || c?.name || '---',
        "Nº Cartão Cliente": t.clientCardNumber || c?.customerNumber || '---',
        "NIF do Cliente": t.clientNif || c?.nif || '---',
        "Zona Cliente": c ? `${c.concelho} > ${c.freguesia}` : '---',
        "Fatura Original": t.amount,
        "Valor Movimentado (Cashback)": t.cashbackAmount,
        Tipo: t.type === 'earn' ? 'Atribuição' : 'Desconto',
        Status: t.status === 'cancelled' ? 'Anulado' : 'Aprovado'
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, "Auditoria_VizinhoPlus.xlsx");
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full animate-in fade-in pb-10">
      
      <div className="bg-slate-50 p-6 rounded-[30px] border-4 border-slate-100 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" placeholder="LOJA, NOME, DOC..." className="w-full p-4 pl-14 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-[#0a2540] font-black text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
             <div className="relative">
                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" placeholder="NIF (LOJA OU CLIENTE)" maxLength={9} value={searchNif} onChange={e=>setSearchNif(e.target.value.replace(/\D/g, ''))} className="w-full p-4 pl-14 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-[#0a2540] font-black text-xs uppercase" />
             </div>
             <div className="relative">
                <IdCard className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" placeholder="Nº CARTÃO CLIENTE" maxLength={9} value={searchCard} onChange={e=>setSearchCard(e.target.value.replace(/\D/g, ''))} className="w-full p-4 pl-14 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-[#0a2540] font-black text-xs uppercase" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={searchDistrito} onChange={e=>{setSearchDistrito(e.target.value); setSearchConcelho(''); setSearchFreguesia('');}} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#0a2540]">
                <option value="">FILTRO: DISTRITO...</option>
                {distritos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select disabled={!searchDistrito} value={searchConcelho} onChange={e=>{setSearchConcelho(e.target.value); setSearchFreguesia('');}} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#0a2540] disabled:opacity-50">
                <option value="">FILTRO: CONCELHO...</option>
                {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select disabled={!searchConcelho} value={searchFreguesia} onChange={e=>setSearchFreguesia(e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#0a2540] disabled:opacity-50">
                <option value="">FILTRO: FREGUESIA...</option>
                {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 flex items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl p-2 px-4 w-full">
                <Calendar className="text-slate-400 shrink-0" size={18} />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase w-full" />
                <span className="text-slate-300 font-bold">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase w-full" />
             </div>
             <button onClick={exportToExcel} disabled={!hasActiveFilter || filteredTransactions.length === 0} className="w-full md:w-auto bg-[#00d66f] text-[#0a2540] px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_#0a2540] transition-all flex items-center justify-center gap-3 border-4 border-[#0a2540] disabled:opacity-50 disabled:shadow-none">
                 <Download size={18} strokeWidth={3} /> Excel
             </button>
          </div>
      </div>

      {!hasActiveFilter ? (
        <div className="text-center p-20 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px]">
           <Search size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-sm">Utilize os filtros acima para listar movimentos.</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center p-20 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px]">
           <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-sm">Nenhum movimento encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-xl overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-[#0a2540] text-white">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Registo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em]">Parceiro / Cliente</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Docs</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Fatura</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-right">Movimento</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">{parseDate(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-6">
                      <p className="font-black uppercase italic text-xs md:text-sm text-[#0a2540] truncate max-w-[200px]">{t.merchantName}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[200px]">{t.clientName || 'Cliente Desconhecido'}</p>
                    </td>
                    <td className="p-6 text-center">
                      <p className="font-mono text-[10px] md:text-xs font-bold text-slate-500">{t.clientCardNumber || t.clientNif || 'S/ Doc'}</p>
                      <p className="text-[9px] font-black uppercase text-[#00d66f] mt-1">{t.documentNumber}</p>
                    </td>
                    <td className="p-6 text-right text-slate-500 font-black text-sm md:text-lg whitespace-nowrap">{t.amount.toFixed(2)} €</td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border-2 whitespace-nowrap ${t.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {t.status === 'cancelled' ? 'Anulado' : 'Aprovado'}
                      </span>
                    </td>
                    <td className={`p-6 text-right font-black text-lg md:text-xl whitespace-nowrap ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;