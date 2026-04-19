import React from 'react';
import { ArrowUpRight, ArrowDownLeft, MessageSquare, CheckCircle, Store } from 'lucide-react';
import { Transaction } from '../../../types';

interface UserHistoryProps {
  transactions: Transaction[];
  evaluatedIds: string[];
  onSelectTxForFeedback: (tx: Transaction) => void;
}

const UserHistory: React.FC<UserHistoryProps> = ({ transactions, evaluatedIds, onSelectTxForFeedback }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const pendingEvaluations = transactions.filter(t => t.type === 'earn' && !evaluatedIds.includes(t.id));

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* SECÇÃO EXCLUSIVA DE AVALIAÇÕES PENDENTES */}
      {pendingEvaluations.length > 0 && (
        <div className="bg-amber-50 border-4 border-amber-200 rounded-[35px] p-6 shadow-md">
            <h3 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageSquare size={16} /> Lojas por Avaliar ({pendingEvaluations.length})
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingEvaluations.map((t) => (
                    <div key={`eval-${t.id}`} className="bg-white p-4 rounded-2xl border-2 border-amber-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><Store size={18}/></div>
                            <div>
                                <p className="text-xs font-black text-[#0a2540] uppercase truncate max-w-[150px]">{t.merchantName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'Recente'}</p>
                            </div>
                        </div>
                        <button onClick={() => onSelectTxForFeedback(t)} className="bg-[#0a2540] text-[#00d66f] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-md">
                            Dar Nota
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* HISTÓRICO GLOBAL */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Histórico Completo</h3>
        
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
                
                {t.type === 'earn' && (
                    evaluatedIds.includes(t.id) && (
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase text-[#00d66f]">
                            <CheckCircle size={10} /> Avaliado
                        </div>
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
    </div>
  );
};

export default UserHistory;