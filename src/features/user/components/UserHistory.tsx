import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Transaction } from '../../../types';

interface UserHistoryProps {
  transactions: Transaction[];
  evaluatedIds: string[];
  onSelectTxForFeedback: (tx: Transaction) => void;
}

const UserHistory: React.FC<UserHistoryProps> = ({ transactions, evaluatedIds, onSelectTxForFeedback }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-black text-[#0f172a] uppercase italic tracking-tighter ml-2">Movimentos</h3>
      
      {transactions.length > 0 ? transactions.map((t) => (
        <div key={t.id} className="bg-white p-5 rounded-[30px] border-4 border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
              {t.type === 'earn' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div>
              <p className="text-sm font-black text-[#0f172a] uppercase tracking-tighter">{t.merchantName}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'Agora'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className={`text-sm font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
              {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
            </p>
            {t.type === 'earn' && !evaluatedIds.includes(t.id) && (
              <button 
                onClick={() => onSelectTxForFeedback(t)} 
                className="bg-slate-100 px-3 py-1 rounded-full text-[8px] font-black uppercase text-slate-500 hover:bg-[#00d66f] hover:text-[#0f172a] transition-all"
              >
                Avaliar
              </button>
            )}
          </div>
        </div>
      )) : (
        <div className="p-20 text-center text-slate-300 uppercase font-black text-[10px]">Sem atividade registada.</div>
      )}
    </div>
  );
};

export default UserHistory;