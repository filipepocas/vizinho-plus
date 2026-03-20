import React from 'react';
import { ArrowUpRight, ArrowDownLeft, MessageSquare, CheckCircle } from 'lucide-react';
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
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Últimos Movimentos</h3>
      
      {transactions.length > 0 ? transactions.map((t) => (
        <div key={t.id} className="bg-white p-5 rounded-[30px] border-2 border-slate-50 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${t.type === 'earn' ? 'bg-green-50 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
              {t.type === 'earn' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div>
              <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter leading-none mb-1">{t.merchantName}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'Recentemente'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className={`text-sm font-black italic ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
              {t.type === 'earn' ? '+' : '-'}{formatCurrency(t.cashbackAmount)}
            </p>
            
            {/* LOGICA DE AVALIAÇÃO */}
            {t.type === 'earn' && (
                evaluatedIds.includes(t.id) ? (
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase text-[#00d66f]">
                        <CheckCircle size={10} /> Avaliado
                    </div>
                ) : (
                    <button 
                        onClick={() => onSelectTxForFeedback(t)} 
                        className="bg-[#0a2540] text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest hover:bg-[#00d66f] hover:text-[#0a2540] transition-all flex items-center gap-1"
                    >
                        <MessageSquare size={10} /> Avaliar
                    </button>
                )
            )}
          </div>
        </div>
      )) : (
        <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
           <p className="text-[10px] font-black text-slate-300 uppercase italic">Ainda não tens movimentos.</p>
        </div>
      )}
    </div>
  );
};

export default UserHistory;