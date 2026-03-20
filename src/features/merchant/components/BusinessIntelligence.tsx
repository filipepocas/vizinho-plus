import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Transaction } from '../../../types';
import { BarChart3, TrendingUp, Wallet, Star, Clock } from 'lucide-react';

interface BIProps {
  merchantId: string;
  transactions: Transaction[];
}

// 1. DEFINIR O MOLDE PARA OS DADOS MENSAIS (Resolve os erros de 'any')
interface MonthStat {
  label: string;
  m: number;
  y: number;
  volume: number;
}

const BusinessIntelligence: React.FC<BIProps> = ({ merchantId, transactions }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [merchantId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  // COLUNA 1: Transações por Dia da Semana (12 meses)
  const dayStats = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = days.map(d => ({ day: d, count: 0, hours: Array(24).fill(0) }));
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    transactions.forEach(t => {
      const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
      if (date > oneYearAgo && t.type === 'earn') {
        const dayIdx = date.getDay();
        const hour = date.getHours();
        counts[dayIdx].count++;
        counts[dayIdx].hours[hour]++;
      }
    });

    return counts.map(d => ({
      ...d,
      peakHour: `${d.hours.indexOf(Math.max(...d.hours))}:00`
    }));
  }, [transactions]);

  // COLUNA 2: Volume de Vendas (6 meses) - CORRIGIDO COM TIPAGEM FORTE
  const monthStats = useMemo(() => {
    const months: MonthStat[] = []; // Definido como array de MonthStat
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ 
        label: d.toLocaleDateString('pt-PT', { month: 'short' }), 
        m: d.getMonth(), 
        y: d.getFullYear(), 
        volume: 0 
      });
    }

    transactions.forEach(t => {
      if (t.type === 'earn' && t.status !== 'cancelled') {
        const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
        const idx = months.findIndex(m => m.m === date.getMonth() && m.y === date.getFullYear());
        if (idx !== -1) {
          months[idx].volume += Number(t.amount || 0);
        }
      }
    });
    return months;
  }, [transactions]);

  // COLUNA 3: Cashback
  const cashbackStats = useMemo(() => {
    let emitted = 0, used = 0, pending = 0, available = 0;
    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (t.type === 'earn') {
        emitted += t.cashbackAmount;
        if (t.status === 'pending') pending += t.cashbackAmount;
        if (t.status === 'available') available += t.cashbackAmount;
      } else if (t.type === 'redeem') {
        used += t.amount;
        available -= t.amount;
      }
    });
    return { emitted, used, pending, available: Math.max(0, available) };
  }, [transactions]);

  // COLUNA 4: Avaliações
  const feedbackStats = useMemo(() => {
    if (feedbacks.length === 0) return { avg: "0.0", count: 0, promoters: 0 };
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const promoters = feedbacks.filter(f => f.rating >= 4).length;
    return {
      avg: (sum / feedbacks.length).toFixed(1),
      count: feedbacks.length,
      promoters: ((promoters / feedbacks.length) * 100).toFixed(0)
    };
  }, [feedbacks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
      
      {/* C1: DIAS DA SEMANA */}
      <div className="bg-white p-6 rounded-[35px] border-2 border-slate-100 shadow-sm flex flex-col">
        <h3 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">
          <BarChart3 size={16} /> Fluxo Semanal
        </h3>
        <div className="flex items-end justify-between h-32 gap-1 mb-6">
          {dayStats.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-[#00d66f] rounded-t-lg transition-all duration-1000" style={{ height: `${(d.count / Math.max(...dayStats.map(x => x.count), 1)) * 100}%`, minHeight: '4px' }} />
              <span className="text-[8px] font-black uppercase text-slate-300">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-4">
          {dayStats.map((d, i) => (
            <div key={i} className="flex justify-between text-[9px] font-bold uppercase">
              <span className="text-slate-400">{d.day}</span>
              <span className="text-[#0a2540] flex items-center gap-1"><Clock size={10} className="text-[#00d66f]"/> Pico: {d.peakHour}</span>
            </div>
          ))}
        </div>
      </div>

      {/* C2: VENDAS 6 MESES */}
      <div className="bg-white p-6 rounded-[35px] border-2 border-slate-100 shadow-sm">
        <h3 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">
          <TrendingUp size={16} /> Volume Mensal
        </h3>
        <div className="space-y-5">
          {monthStats.map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>{m.label}</span>
                <span>{formatCurrency(m.volume)}</span>
              </div>
              <div className="h-2 bg-slate-50 rounded-full border overflow-hidden">
                <div className="h-full bg-[#0a2540] transition-all duration-1000" style={{ width: `${(m.volume / Math.max(...monthStats.map(x => x.volume), 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* C3: CASHBACK */}
      <div className="bg-[#0a2540] p-6 rounded-[35px] text-white shadow-xl flex flex-col">
        <h3 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest text-[#00d66f] mb-8">
          <Wallet size={16} /> Gestão de Saldo
        </h3>
        <div className="space-y-8 flex-grow">
          <div>
            <p className="text-[8px] font-black uppercase text-white/30 mb-1">Emitido vs Utilizado</p>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black text-[#00d66f] italic">{formatCurrency(cashbackStats.emitted)}</span>
              <span className="text-sm font-bold text-red-400">-{formatCurrency(cashbackStats.used)}</span>
            </div>
          </div>
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-white/40">Pendente (48h)</span>
              <span className="text-xs font-bold text-amber-400">{formatCurrency(cashbackStats.pending)}</span>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="block text-[8px] font-black uppercase text-[#00d66f] mb-1">Disponível p/ Vizinhos</span>
              <span className="text-xl font-black italic">{formatCurrency(cashbackStats.available)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* C4: REPUTAÇÃO */}
      <div className="bg-white p-6 rounded-[35px] border-2 border-slate-100 shadow-sm flex flex-col">
        <h3 className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">
          <Star size={16} className="text-amber-400" /> Satisfação
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50 p-4 rounded-3xl text-center border">
            <p className="text-2xl font-black text-[#0a2540]">{feedbackStats.avg}</p>
            <p className="text-[7px] font-black uppercase text-slate-400">Estrelas ({feedbackStats.count})</p>
          </div>
          <div className="bg-[#00d66f]/10 p-4 rounded-3xl text-center border border-[#00d66f]/20">
            <p className="text-2xl font-black text-[#00d66f]">{feedbackStats.promoters}%</p>
            <p className="text-[7px] font-black uppercase text-slate-400">Promotores</p>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 max-h-[180px]">
          <p className="text-[8px] font-black uppercase text-slate-300 sticky top-0 bg-white pb-2">Últimos Comentários</p>
          {feedbacks.slice(0, 20).map((f, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-2xl border-l-4 border-[#00d66f]">
              <div className="flex gap-0.5 mb-1">
                {[...Array(5)].map((_, si) => <Star key={si} size={6} fill={si < f.rating ? "#0a2540" : "none"} className={si < f.rating ? "text-[#0a2540]" : "text-slate-200"} />)}
              </div>
              <p className="text-[9px] font-bold text-slate-500 italic leading-tight">"{f.comment || 'Sem comentário.'}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessIntelligence;