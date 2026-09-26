import React, { useMemo, useState } from 'react';
import { Store, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { User as UserProfile } from '../../../types';
import { summarizeStoreWallets } from '../../../utils/wallets';

interface UserHomeProps {
  currentUser: UserProfile;
  stats: any;
  merchantBalances: any;
  vantagensUrl: string;
  hideHeader?: boolean;
}

const UserHome: React.FC<UserHomeProps> = ({ currentUser, merchantBalances }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  const [showDetails, setShowDetails] = useState(false);

  const summary = useMemo(
    () => summarizeStoreWallets(merchantBalances && Object.keys(merchantBalances).length > 0 ? merchantBalances : currentUser?.storeWallets),
    [merchantBalances, currentUser?.storeWallets]
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[20px] flex gap-3 items-start animate-in fade-in">
        <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1">Regra de Utilização</h5>
          <p className="text-[10px] font-bold text-blue-600 leading-relaxed">O desconto a aplicar nunca poderá ser superior a 50% do valor total da nova compra, mesmo que o seu saldo seja maior.</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[30px] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo disponível</p>
            <p className="text-2xl font-black text-[#00d66f] italic">{formatCurrency(summary.total)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#0a2540]"
          >
            {showDetails ? <>Ocultar <ChevronUp size={14} /></> : <>Ver por loja <ChevronDown size={14} /></>}
          </button>
        </div>
      </div>

      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Saldos Acumulados</h4>
      {summary.entries.length > 0 ? (
        <>
          {showDetails && summary.entries.map((m) => (
            <div key={m.id} className="bg-white p-5 rounded-[30px] border-2 border-slate-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl text-[#0a2540]">
                  <Store size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0a2540] uppercase tracking-tighter">{m.name}</p>
                  <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">{formatCurrency(m.available)} disponível</p>
                </div>
              </div>
            </div>
          ))}
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