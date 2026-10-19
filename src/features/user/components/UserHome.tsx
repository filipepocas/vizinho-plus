import React, { useMemo, useState } from 'react';
import { Store, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Transaction, User as UserProfile } from '../../../types';
import { summarizeStoreWallets } from '../../../utils/wallets';
import { getRecentStoreMovements } from '../../../utils/clientBalance';

interface UserHomeProps {
  currentUser: UserProfile;
  stats: any;
  merchantBalances: any;
  transactions?: Transaction[];
  vantagensUrl: string;
  hideHeader?: boolean;
  allMerchants?: UserProfile[];
}

const UserHome: React.FC<UserHomeProps> = ({ currentUser, merchantBalances, transactions = [], allMerchants = [] }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  const [showDetails, setShowDetails] = useState(true);

  const summary = useMemo(
    () => summarizeStoreWallets(merchantBalances),
    [merchantBalances]
  );

  const recentMovementsByStore = useMemo(() => {
    const map: Record<string, ReturnType<typeof getRecentStoreMovements>> = {};
    summary.entries.forEach((entry) => {
      map[entry.id] = getRecentStoreMovements(transactions, currentUser.id, entry.id, 5);
    });
    return map;
  }, [currentUser.id, summary.entries, transactions]);

  const parseMovementDate = (movementId: string) => {
    const baseId = movementId.replace(/-earn$/, '');
    const tx = transactions.find((t) => t.id === baseId);
    if (!tx?.createdAt) return '';
    const d = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date((tx.createdAt?.seconds || 0) * 1000);
    return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[20px] flex gap-3 items-start animate-in fade-in">
        <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1">Regra de Utilização</h5>
          <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
            O desconto de saldo nunca poderá ser superior a 50% do valor total da nova compra, nem superior ao cashback líquido disponível nessa loja em específico.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[30px] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cashback Total Disponível</p>
            <p className="text-2xl font-black text-[#00d66f] italic">{formatCurrency(summary.total)}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Soma do saldo líquido em todas as lojas</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#0a2540] hover:bg-slate-200 transition-colors"
          >
            {showDetails ? <>Ocultar <ChevronUp size={14} /></> : <>Ver por loja <ChevronDown size={14} /></>}
          </button>
        </div>
      </div>

      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Saldos por Loja</h4>
      {summary.entries.length > 0 ? (
        <>
          {showDetails && summary.entries.map((m) => {
            const storeMovements = recentMovementsByStore[m.id] || [];
            return (
              <div key={m.id} className="bg-white p-5 rounded-[30px] border-2 border-slate-50 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl text-[#0a2540]">
                      <Store size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{m.name}</p>
                      <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">{formatCurrency(m.available)} disponível nesta loja</p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const merchant = allMerchants.find(s => s.id === m.id);
                  const hasExcluded = (merchant?.excludedCashbackItems && merchant.excludedCashbackItems.length > 0) || merchant?.excludedCashbackNotes;
                  if (!hasExcluded) return null;
                  return (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[9px] font-bold leading-tight">
                        <span className="font-black uppercase tracking-wider text-amber-800">Artigos Excluídos de Cashback nesta loja: </span>
                        <span>
                          {[
                            ...(merchant?.excludedCashbackItems || []),
                            ...(merchant?.excludedCashbackNotes ? [merchant.excludedCashbackNotes] : [])
                          ].join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Últimos 5 movimentos</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{storeMovements.length} registos</span>
                  </div>

                  {storeMovements.length > 0 ? (
                    storeMovements.map((movement) => {
                      const dateStr = parseMovementDate(movement.id);
                      return (
                        <div key={movement.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${movement.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                              {movement.type === 'earn' ? 'Emitido' : 'Descontado'}
                            </span>
                            {dateStr && (
                              <span className="text-[8px] font-bold text-slate-400">
                                {dateStr}
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] font-black ${movement.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                            {movement.type === 'earn' ? '+' : '-'}{formatCurrency(movement.amount)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-slate-50 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                      Sem movimentos recentes nesta loja
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="bg-slate-50 p-8 rounded-[30px] text-center text-slate-400 text-[10px] font-black uppercase">
          Ainda não tens saldos em nenhuma loja.
        </div>
      )}
    </div>
  );
};

export default UserHome;