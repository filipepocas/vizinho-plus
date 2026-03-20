import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Store, Crown, Cpu } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface UserHomeProps {
  currentUser: UserProfile;
  stats: { available: number; pending: number };
  merchantBalances: Array<{ merchantId: string; name: string; available: number; pending: number; total: number }>;
  vantagensUrl: string;
}

const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

const UserHome: React.FC<UserHomeProps> = ({ currentUser, stats, merchantBalances, vantagensUrl }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CARTÃO VIRTUAL */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[35px] p-8 shadow-2xl border border-white/10 relative overflow-hidden aspect-[1.586/1] flex flex-col justify-between text-white">
        <div className="flex justify-between items-start">
          <div className="bg-[#00d66f] px-3 py-1 rounded-lg text-[#0f172a] text-[8px] font-black uppercase tracking-widest italic">V+ Member</div>
          <Cpu size={30} className="text-white/20" />
        </div>
        <div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
          <h3 className="text-5xl font-black italic tracking-tighter text-[#00d66f]">{formatCurrency(stats.available)}</h3>
        </div>
        <div className="flex justify-between items-end border-t border-white/5 pt-4">
          <span className="text-xs font-mono tracking-widest opacity-80">{currentUser?.nif}</span>
          <img src={logoPath} className="h-6 grayscale brightness-200 opacity-30" alt="" />
        </div>
      </div>

      {/* QR CODE CARD */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0f172a] shadow-[10px_10px_0px_#00d66f] flex flex-col items-center gap-6">
        <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
          <QRCodeSVG value={currentUser?.nif || ""} size={140} />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#0f172a] uppercase tracking-widest mb-1">Identificação Rápida</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Mostra este código para ganhar ou usar saldo</p>
        </div>
      </div>

      {/* BOTÃO VANTAGENS */}
      {vantagensUrl && (
        <button onClick={() => window.open(vantagensUrl)} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 p-6 rounded-[30px] flex items-center justify-center gap-4 shadow-xl border-b-8 border-amber-800 hover:scale-[1.02] transition-all">
          <Crown size={28} className="text-amber-900" />
          <span className="text-lg font-black uppercase italic tracking-tighter text-amber-900">Vantagens VIP+</span>
        </button>
      )}

      {/* LISTA DE SALDOS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Saldos por Estabelecimento</h4>
        {merchantBalances.length > 0 ? merchantBalances.map((m, i) => (
          <div key={i} className="bg-white p-5 rounded-[30px] border-4 border-slate-100 flex items-center justify-between group hover:border-[#00d66f] transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:text-[#00d66f] transition-colors"><Store size={20} /></div>
              <div>
                <p className="text-sm font-black text-[#0f172a] uppercase tracking-tighter">{m.name}</p>
                <p className="text-[10px] font-bold text-[#00d66f] uppercase">{formatCurrency(m.available)} disponível</p>
              </div>
            </div>
            {m.pending > 0 && (
              <div className="text-right">
                <p className="text-[8px] font-black text-amber-500 uppercase">A Processar</p>
                <p className="text-xs font-black text-amber-600">+{formatCurrency(m.pending)}</p>
              </div>
            )}
          </div>
        )) : (
          <div className="bg-white p-12 rounded-[40px] border-4 border-dashed border-slate-100 text-center text-slate-300 uppercase font-black text-[10px]">Sem saldos acumulados.</div>
        )}
      </div>
    </div>
  );
};

export default UserHome;