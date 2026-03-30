import React, { useState } from 'react';
import { Transaction, User as UserProfile } from '../../types';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminTransactionsProps {
  transactions: Transaction[];
  users: UserProfile[];
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    return new Date(createdAt.seconds * 1000);
  };

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchText = (t.clientNif || '').includes(q) || (t.merchantName || '').toLowerCase().includes(q) || (t.documentNumber || '').toLowerCase().includes(q);
    const txDate = parseDate(t.createdAt);
    let matchStart = !startDate || txDate >= new Date(startDate);
    let matchEnd = !endDate || txDate <= new Date(endDate + 'T23:59:59');
    return matchText && matchStart && matchEnd;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map(t => ({
      Data: parseDate(t.createdAt).toLocaleString(),
      Parceiro: t.merchantName,
      NIF: t.clientNif,
      Valor: t.amount,
      Cashback: t.cashbackAmount,
      Status: t.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações");
    XLSX.writeFile(wb, "Auditoria_VizinhoPlus.xlsx");
  };

  return (
    <div className="space-y-10">
      {/* BARRA DE FILTROS IGUAL À IMAGEM */}
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
          <input 
            type="text" 
            placeholder="PROCURAR LOJA, NIF OU DOC..." 
            className="w-full p-6 pl-16 bg-slate-50 border-4 border-slate-100 rounded-[30px] outline-none focus:border-[#0a2540] font-black text-xs uppercase tracking-widest shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 border-4 border-slate-100 rounded-[30px] p-2 px-6 h-[76px]">
            <Calendar className="text-slate-400" size={20} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase" />
            <span className="text-slate-300 font-bold">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase" />
        </div>

        <button 
            onClick={exportToExcel}
            className="bg-[#00d66f] text-[#0a2540] px-10 h-[76px] rounded-[30px] font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_#0a2540] hover:scale-[1.02] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 border-4 border-[#0a2540]"
        >
            <Download size={24} strokeWidth={3} /> Excel
        </button>
      </div>

      {/* TABELA BRUTALISTA */}
      <div className="bg-white rounded-[40px] border-4 border-[#0a2540] overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-[#0a2540] text-white">
            <tr>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em]">Registo</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em]">Parceiro</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-center">Cliente NIF</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-right">Fatura</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-center">Status</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-right">Cashback</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-100">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-8 text-xs font-bold text-slate-500">{parseDate(t.createdAt).toLocaleDateString()}</td>
                <td className="p-8 font-black uppercase italic text-sm text-[#0a2540]">{t.merchantName}</td>
                <td className="p-8 font-mono text-xs font-bold text-center text-slate-400">{t.clientNif || '---'}</td>
                <td className="p-8 text-right text-slate-500 font-black text-lg">{t.amount.toFixed(2)} €</td>
                <td className="p-8 text-center">
                  <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                      t.status === 'available' ? 'bg-green-100 text-green-700 border-green-200' : 
                      t.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
                  }`}>
                    {t.status === 'available' ? 'Maturado' : t.status === 'pending' ? 'Pendente' : 'Cancelado'}
                  </span>
                </td>
                <td className={`p-8 text-right font-black text-xl ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTransactions;