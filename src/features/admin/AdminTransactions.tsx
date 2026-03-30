import React, { useState } from 'react';
import { Transaction, User as UserProfile } from '../../types';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminTransactionsProps {
  transactions: Transaction[];
  users: UserProfile[]; // Mantido por compatibilidade
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Parseador de Data Seguro
  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date(0);
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    return new Date(createdAt);
  };

  // RESOLUÇÃO 6: Filtro com Datas Adicionadas
  const filteredTransactions = transactions.filter(t => {
    // Filtro Texto
    const q = searchQuery.toLowerCase();
    const matchText = (t.clientNif || '').includes(q) || 
                      (t.merchantName || '').toLowerCase().includes(q) || 
                      (t.documentNumber || '').toLowerCase().includes(q);
    
    // Filtro Datas
    const txDate = parseDate(t.createdAt);
    
    let matchStartDate = true;
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStartDate = txDate >= start;
    }

    let matchEndDate = true;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchEndDate = txDate <= end;
    }

    return matchText && matchStartDate && matchEndDate;
  });

  // Exportar Excel
  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      Data: parseDate(t.createdAt).toLocaleDateString() + ' ' + parseDate(t.createdAt).toLocaleTimeString(),
      Lojista: t.merchantName || '---',
      "NIF Cliente": t.clientNif || '---',
      Documento: t.documentNumber || '---',
      Tipo: t.type === 'earn' ? 'Atribuição' : 'Desconto',
      "Valor Fatura (€)": t.amount,
      "Cashback (€)": t.cashbackAmount,
      Estado: t.status === 'available' ? 'Maturado' : (t.status === 'pending' ? 'Pendente' : 'Cancelado')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, `Transacoes_Vizinho+_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA DE PESQUISA, DATAS E EXPORTAÇÃO */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="PROCURAR LOJA, NIF OU DOC..." 
            className="w-full p-5 pl-14 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black text-xs uppercase"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 bg-slate-50 border-4 border-slate-100 rounded-3xl p-1 items-center px-4">
            <Calendar className="text-slate-400" size={18} />
            <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent outline-none text-xs font-bold text-slate-600 uppercase"
            />
            <span className="text-slate-300 font-bold">-</span>
            <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent outline-none text-xs font-bold text-slate-600 uppercase"
            />
        </div>

        <button 
            onClick={exportToExcel}
            className="bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-[4px_4px_0px_#0a2540] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]"
        >
            <Download size={20} strokeWidth={3} /> Excel
        </button>
      </div>

      <div className="hidden md:block bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0a2540] text-white">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Registo</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Parceiro</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest">Cliente NIF</th>
              <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest">Fatura</th>
              <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
              <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest">Cashback</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-xs font-bold text-slate-500">{parseDate(t.createdAt).toLocaleDateString()}</td>
                <td className="p-6 font-black uppercase italic text-sm text-[#0a2540]">{t.merchantName}</td>
                <td className="p-6 font-mono text-xs font-bold">{t.clientNif}</td>
                <td className="p-6 text-right text-slate-400 font-black">{formatCurrency(t.amount)}</td>
                <td className="p-6 text-center">
                  <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      t.status === 'available' ? 'bg-green-100 text-green-700 border border-green-200' : 
                      (t.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200')
                  }`}>
                    {t.status === 'available' ? 'Maturado' : (t.status === 'pending' ? 'Pendente' : 'Cancelado')}
                  </span>
                </td>
                <td className={`p-6 text-right font-black text-sm ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredTransactions.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{parseDate(t.createdAt).toLocaleDateString()}</p>
                <h4 className="font-black uppercase italic text-[#0a2540] text-lg">{t.merchantName}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                    t.status === 'available' ? 'bg-green-100 text-green-600' : 
                    (t.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600')
                }`}>
                {t.status === 'available' ? 'Maturado' : (t.status === 'pending' ? 'Pendente' : 'Cancelado')}
              </span>
            </div>
            <div className="flex justify-between items-end border-t-2 border-slate-100 pt-4">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vizinho NIF</p>
                <p className="font-mono text-sm font-bold text-[#0a2540]">{t.clientNif}</p>
              </div>
              <p className={`text-2xl font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTransactions;