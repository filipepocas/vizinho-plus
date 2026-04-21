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

  const filteredTransactions = transactions.filter((t: any) => {
    if (!hasActiveFilter) return false;

    const c = clients.find((cl: any) => cl.id === t.clientId);
    const m = merchants.find((me: any) => me.id === t.merchantId);

    const q = searchQuery.toLowerCase();
    const matchText = q === '' || (t.merchantName || '').toLowerCase().includes(q) || (t.documentNumber || '').toLowerCase().includes(q) || (t.clientName || '').toLowerCase().includes(q);
    
    const matchNif = searchNif === '' || t.clientNif === searchNif || c?.nif === searchNif || m?.nif === searchNif;
    const matchCard = searchCard === '' || t.clientCardNumber === searchCard || c?.customerNumber === searchCard;

    const matchDistrito = searchDistrito === '' || c?.distrito === searchDistrito || m?.distrito === searchDistrito;
    const matchConcelho = searchConcelho === '' || c?.concelho === searchConcelho || m?.concelho === searchConcelho;
    const matchFreguesia = searchFreguesia === '' || c?.freguesia === searchFreguesia || m?.freguesia === searchFreguesia;

    const txDate = parseDate(t.createdAt);
    const matchStart = !startDate || txDate >= new Date(startDate);
    const matchEnd = !endDate || txDate <= new Date(endDate + 'T23:59:59');

    return matchText && matchStart && matchEnd && matchNif && matchCard && matchDistrito && matchConcelho && matchFreguesia;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map((t: any) => {
      const c = clients.find((cl: any) => cl.id === t.clientId);
      const m = merchants.find((me: any) => me.id === t.merchantId);
      return {
        Data: parseDate(t.createdAt).toLocaleString(),
        "Comerciante": t.merchantName || '---',
        "NIF Loja": m?.nif || '---',
        "Cliente": t.clientName || '---',
        "NIF Cliente": t.clientNif || c?.nif || '---',
        "Fatura": t.amount,
        "Cashback": t.cashbackAmount,
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
                <input type="text" placeholder="LOJA OU DOC..." className="w-full p-4 pl-14 bg-white border-2 border-slate-200 rounded-2xl outline-none font-black text-xs uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
             <input type="text" placeholder="NIF" maxLength={9} value={searchNif} onChange={e=>setSearchNif(e.target.value.replace(/\D/g, ''))} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none font-black text-xs uppercase" />
             <input type="text" placeholder="Nº CARTÃO" maxLength={9} value={searchCard} onChange={e=>setSearchCard(e.target.value.replace(/\D/g, ''))} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none font-black text-xs uppercase" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={searchDistrito} onChange={e=>{setSearchDistrito(e.target.value); setSearchConcelho('');}} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none">
                <option value="">DISTRITO...</option>
                {distritos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select disabled={!searchDistrito} value={searchConcelho} onChange={e=>setSearchConcelho(e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none disabled:opacity-50">
                <option value="">CONCELHO...</option>
                {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl p-1 px-4">
                <Calendar size={16} className="text-slate-300"/>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-[10px] font-black w-full" />
                <span className="text-slate-200">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-[10px] font-black w-full" />
              </div>
          </div>

          <button onClick={exportToExcel} disabled={!hasActiveFilter || filteredTransactions.length === 0} className="w-full bg-[#00d66f] text-[#0a2540] py-4 rounded-2xl font-black text-xs uppercase shadow-[4px_4px_0px_#0a2540] border-2 border-[#0a2540] disabled:opacity-50">
              <Download size={16} className="inline mr-2" strokeWidth={3} /> Descarregar Excel
          </button>
      </div>

      {!hasActiveFilter ? (
        <div className="text-center p-20 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px]">
           <Search size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-xs">Utilize os filtros acima para listar movimentos.</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center p-20 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px]">
           <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="font-black uppercase tracking-widest text-slate-400 text-xs">Nenhum movimento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-xl overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-[#0a2540] text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-6">Data</th>
                  <th className="p-6">Parceiro / Cliente</th>
                  <th className="p-6 text-center">Docs</th>
                  <th className="p-6 text-right">Fatura</th>
                  <th className="p-6 text-right">Cashback</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-slate-100">
                {filteredTransactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors text-xs">
                    <td className="p-6 font-bold text-slate-500">{parseDate(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-6 font-black uppercase text-[#0a2540]">
                      {t.merchantName}
                      <span className="block text-[9px] text-slate-400 font-bold lowercase italic">{t.clientName}</span>
                    </td>
                    <td className="p-6 text-center font-mono font-bold text-slate-400">{t.clientCardNumber || t.clientNif || '---'}</td>
                    <td className="p-6 text-right font-black text-slate-500">{t.amount.toFixed(2)} €</td>
                    <td className={`p-6 text-right font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
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