import React, { useState } from 'react';
import { Transaction, User as UserProfile } from '../../types';
import { Search, Download, Clock, CheckCircle2, FileText, Calendar, Store, User, Hash } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminTransactionsProps {
  transactions: Transaction[];
  users: UserProfile[];
}

const AdminTransactions: React.FC<AdminTransactionsProps> = ({ transactions, users }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.clientNif?.includes(q) || t.merchantName?.toLowerCase().includes(q) || t.documentNumber?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="PROCURAR..." 
            className="w-full p-5 pl-14 bg-white border-2 border-[#0a2540] rounded-3xl outline-none shadow-[4px_4px_0px_0px_#0a2540] font-black text-xs uppercase"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* VERSÃO DESKTOP: TABELA */}
      <div className="hidden md:block bg-white rounded-[40px] border-2 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b-2 border-[#0a2540]">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase">Registo</th>
              <th className="p-6 text-[10px] font-black uppercase">Parceiro</th>
              <th className="p-6 text-[10px] font-black uppercase">Vizinho</th>
              <th className="p-6 text-right text-[10px] font-black uppercase">Valor</th>
              <th className="p-6 text-center text-[10px] font-black uppercase">Status</th>
              <th className="p-6 text-right text-[10px] font-black uppercase">Cashback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 text-xs font-bold">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '---'}</td>
                <td className="p-6 font-black uppercase italic text-sm">{t.merchantName}</td>
                <td className="p-6 font-mono text-xs">{t.clientNif}</td>
                <td className="p-6 text-right text-slate-400 font-black">{formatCurrency(t.amount)}</td>
                <td className="p-6 text-center">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${t.status === 'available' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {t.status === 'available' ? 'Maturado' : 'Pendente'}
                  </span>
                </td>
                <td className={`p-6 text-right font-black ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VERSÃO MOBILE: CARDS */}
      <div className="md:hidden space-y-4">
        {filteredTransactions.map((t) => (
          <div key={t.id} className="bg-white p-6 rounded-[30px] border-2 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[8px] font-black text-slate-300 uppercase">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '---'}</p>
                <h4 className="font-black uppercase italic text-[#0a2540]">{t.merchantName}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${t.status === 'available' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {t.status === 'available' ? 'Maturado' : 'Pendente'}
              </span>
            </div>
            <div className="flex justify-between items-end border-t pt-4">
              <div>
                <p className="text-[8px] font-black text-slate-300 uppercase">Vizinho NIF</p>
                <p className="font-mono text-sm font-bold">{t.clientNif}</p>
              </div>
              <p className={`text-xl font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
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