import React, { useState } from 'react';
import { Transaction, User as UserProfile } from '../../types';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminTransactionsProps {
  transactions: Transaction[];
  clients: UserProfile[];
  merchants: UserProfile[];
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions, clients, merchants }) => {
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
    const matchText = (t.clientNif || '').includes(q) || (t.merchantName || '').toLowerCase().includes(q) || (t.documentNumber || '').toLowerCase().includes(q) || (t.clientName || '').toLowerCase().includes(q);
    const txDate = parseDate(t.createdAt);
    let matchStart = !startDate || txDate >= new Date(startDate);
    let matchEnd = !endDate || txDate <= new Date(endDate + 'T23:59:59');
    return matchText && matchStart && matchEnd;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map(t => {
      // Procurar dados originais nos arrays passados, caso a transação seja antiga e não tenha gravado no momento
      const c = clients.find(cl => cl.id === t.clientId);
      const m = merchants.find(me => me.id === t.merchantId);

      return {
        Data: parseDate(t.createdAt).toLocaleString(),
        "Nome do Comerciante": t.merchantName || m?.shopName || m?.name || '---',
        "NIF do Comerciante": m?.nif || '---',
        "Nome do Cliente": t.clientName || c?.name || '---',
        "Email do Cliente": c?.email || '---',
        "Nº Cartão Cliente": t.clientCardNumber || c?.customerNumber || '---',
        "NIF do Cliente": t.clientNif || c?.nif || '---',
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
    <div className="space-y-6 md:space-y-10 w-full">
      
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 xl:gap-6">
        <div className="relative w-full">
          <Search className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 md:w-6 md:h-6" size={20} />
          <input 
            type="text" 
            placeholder="PROCURAR LOJA, NOME CLIENTE, NIF OU DOC..." 
            className="w-full p-4 md:p-6 pl-12 md:pl-16 bg-slate-50 border-4 border-slate-100 rounded-[20px] md:rounded-[30px] outline-none focus:border-[#0a2540] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-inner" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 xl:gap-6 w-full xl:w-auto">
            <div className="flex-1 flex items-center gap-2 md:gap-3 bg-slate-50 border-4 border-slate-100 rounded-[20px] md:rounded-[30px] p-2 px-4 md:px-6 h-[60px] md:h-[76px] justify-between">
                <Calendar className="text-slate-400 shrink-0" size={18} />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none text-[9px] md:text-xs font-black text-slate-600 uppercase w-full" />
                <span className="text-slate-300 font-bold">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none text-[9px] md:text-xs font-black text-slate-600 uppercase w-full" />
            </div>

            <button onClick={exportToExcel} className="w-full sm:w-auto bg-[#00d66f] text-[#0a2540] px-6 md:px-10 h-[60px] md:h-[76px] rounded-[20px] md:rounded-[30px] font-black text-[10px] md:text-sm uppercase tracking-widest shadow-[4px_4px_0px_#0a2540] hover:scale-[1.02] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 md:gap-3 border-4 border-[#0a2540] shrink-0">
                <Download size={18} className="md:w-6 md:h-6" strokeWidth={3} /> Excel
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[25px] md:rounded-[40px] border-4 border-[#0a2540] shadow-lg md:shadow-xl overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-[#0a2540] text-white">
              <tr>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Registo</th>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em]">Parceiro / Cliente</th>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-center">Docs</th>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-right">Fatura</th>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-center">Status</th>
                <th className="p-5 md:p-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-right">Movimento</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5 md:p-8 text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">{parseDate(t.createdAt).toLocaleDateString()}</td>
                  <td className="p-5 md:p-8">
                     <p className="font-black uppercase italic text-xs md:text-sm text-[#0a2540] truncate max-w-[200px]">{t.merchantName}</p>
                     <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[200px]">{t.clientName || 'Cliente Desconhecido'}</p>
                  </td>
                  <td className="p-5 md:p-8 text-center">
                     <p className="font-mono text-[10px] md:text-xs font-bold text-slate-500">{t.clientCardNumber || t.clientNif || 'S/ Doc'}</p>
                     <p className="text-[9px] font-black uppercase text-[#00d66f] mt-1">{t.documentNumber}</p>
                  </td>
                  <td className="p-5 md:p-8 text-right text-slate-500 font-black text-sm md:text-lg whitespace-nowrap">{t.amount.toFixed(2)} €</td>
                  <td className="p-5 md:p-8 text-center">
                    <span className={`px-3 md:px-5 py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border-2 whitespace-nowrap ${
                        t.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-100 text-green-700 border-green-200'
                    }`}>
                      {t.status === 'cancelled' ? 'Anulado' : 'Aprovado'}
                    </span>
                  </td>
                  <td className={`p-5 md:p-8 text-right font-black text-lg md:text-xl whitespace-nowrap ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)} €
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400 font-black text-[10px] uppercase tracking-widest">Nenhuma transação encontrada.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;