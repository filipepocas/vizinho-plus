import React, { useMemo } from 'react';
import { Store, AlertTriangle } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface UserHomeProps {
  currentUser: UserProfile;
  stats: any;
  merchantBalances: any;
  vantagensUrl: string;
  hideHeader?: boolean;
}

const UserHome: React.FC<UserHomeProps> = ({ currentUser }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const balances = useMemo(() => {
    if (!currentUser?.storeWallets) return [];
    return Object.entries(currentUser.storeWallets)
      .map(([id, data]: [string, any]) => ({
        id,
        name: data.merchantName || 'Loja Parceira',
        available: data.available || 0
      }))
      .filter(b => b.available > 0);
  }, [currentUser?.storeWallets]);

  return (
    <div className="space-y-4">
      {/* NOVO AVISO SOBRE A REGRA DOS 50% */}
      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-[20px] flex gap-3 items-start animate-in fade-in">
        <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-1">Regra de Utilização</h5>
          <p className="text-[10px] font-bold text-blue-600 leading-relaxed">O desconto a aplicar nunca poderá ser superior a 50% do valor total da nova compra, mesmo que o seu saldo seja maior.</p>
        </div>
      </div>

      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Saldos Acumulados</h4>
      {balances.length > 0 ? balances.map((m) => (
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
      )) : (
        <div className="bg-slate-50 p-8 rounded-[30px] text-center text-slate-400 text-[10px] font-black uppercase">
          Ainda não tens saldos em nenhuma loja.
        </div>
      )}
    </div>
  );
};

export default UserHome;