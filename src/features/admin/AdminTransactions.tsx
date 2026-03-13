import React, { useState } from 'react';
import { Transaction } from '../../types';
import { 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  FileText,
  Calendar,
  Store,
  User
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminTransactionsProps {
  transactions: Transaction[];
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      'Data': t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : '---',
      'Loja': t.merchantName || '---',
      'Vizinho (NIF)': t.clientNif || '---',
      'Volume': formatCurrency(t.amount || 0),
      'Cashback': formatCurrency(t.cashbackAmount || 0),
      'Status': t.status === 'available' ? 'Disponível' : 'Pendente'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Global");
    XLSX.writeFile(wb, `VizinhoPlus_Transacoes_Total.xlsx`);
  };

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.clientId?.toLowerCase().includes(q) || 
      t.clientNif?.toLowerCase().includes(q) ||
      t.merchantName?.toLowerCase().includes(q) || 
      t.documentNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* BARRA DE FERRAMENTAS BRUTALISTA */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="PROCURAR POR NIF, LOJA OU DOCUMENTO..." 
            className="w-full p-6 pl-14 bg-white border-2 border-[#0a2540] rounded-3xl outline-none shadow-[4px_4px_0px_0px_#0a2540] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-black text-xs uppercase tracking-wider"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={exportToExcel} 
          className="bg-[#0a2540] text-white px-10 py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_#00d66f] active:scale-95"
        >
          <Download size={18} strokeWidth={3} /> Exportar Report
        </button>
      </div>

      {/* TABELA DE TRANSAÇÕES */}
      <div className="bg-white rounded-[40px] border-2 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-[#0a2540]">
                <th className="p-8 text-[10px] font-black text-[#0a2540] uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Calendar size={14}/> Registo</div>
                </th>
                <th className="p-8 text-[10px] font-black text-[#0a2540] uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Store size={14}/> Parceiro</div>
                </th>
                <th className="p-8 text-[10px] font-black text-[#0a2540] uppercase tracking-widest">
                  <div className="flex items-center gap-2"><User size={14}/> Vizinho</div>
                </th>
                <th className="p-8 text-right text-[10px] font-black text-[#0a2540] uppercase tracking-widest">Volume</th>
                <th className="p-8 text-center text-[10px] font-black text-[#0a2540] uppercase tracking-widest">Status</th>
                <th className="p-8 text-right text-[10px] font-black text-[#0a2540] uppercase tracking-widest">Cashback</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#00d66f]/5 transition-colors group">
                    <td className="p-8">
                      <p className="text-xs font-black text-[#0a2540]">
                        {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '---'}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                        {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </p>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="font-black uppercase text-sm italic tracking-tighter text-[#0a2540]">{t.merchantName}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1">
                          <FileText size={10}/> {t.documentNumber || 'S/ Doc'}
                        </span>
                      </div>
                    </td>
                    <td className="p-8 font-mono text-[#0a2540] font-black text-[11px] bg-slate-50/50 group-hover:bg-transparent">
                      {t.clientNif || t.clientId?.substring(0, 9)}
                    </td>
                    <td className="p-8 text-right font-black text-slate-400 text-sm">
                      {formatCurrency(t.amount || 0)}
                    </td>
                    <td className="p-8 text-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                        t.status === 'available' 
                          ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' 
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {t.status === 'available' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                        {t.status === 'available' ? 'Maturado' : 'Pendente'}
                      </span>
                    </td>
                    <td className={`p-8 text-right font-black text-xl italic tracking-tighter ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Search size={48} />
                      <p className="font-black uppercase tracking-widest text-xs">Nenhuma transação encontrada</p>
                    </div>
                  </td>
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