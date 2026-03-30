import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Transaction, Feedback } from '../../../types';
import { BarChart3, TrendingUp, Wallet, Star, Clock, AlertCircle } from 'lucide-react';

interface BIProps {
  merchantId: string;
  transactions: Transaction[];
}

interface MonthStat {
  label: string;
  m: number;
  y: number;
  volume: number;
}

const BusinessIntelligence: React.FC<BIProps> = ({ merchantId, transactions }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  // PROTEÇÃO DE DADOS: Limitado a 50 para não estourar os limites gratuitos do Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc'),
      limit(50) // Máximo de 50 leituras por sessão
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback)));
      setLoadingFeedbacks(false);
    });

    return () => unsubscribe();
  }, [merchantId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  // ESTATÍSTICA: FLUXO SEMANAL (Horas de Ponta)
  const dayStats = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = days.map(d => ({ day: d, count: 0, hours: Array(24).fill(0) }));
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    transactions.forEach(t => {
      const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
      if (date > oneYearAgo && t.type === 'earn' && t.status !== 'cancelled') {
        const dayIdx = date.getDay();
        const hour = date.getHours();
        counts[dayIdx].count++;
        counts[dayIdx].hours[hour]++;
      }
    });

    return counts.map(d => ({
      ...d,
      peakHour: d.count > 0 ? `${d.hours.indexOf(Math.max(...d.hours))}:00` : '--:--'
    }));
  }, [transactions]);

  // ESTATÍSTICA: VOLUME DE FATURAÇÃO MENSAL (Últimos 6 meses)
  const monthStats = useMemo(() => {
    const months: MonthStat[] = [];
    
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

  // ESTATÍSTICA: SAÚDE DO CASHBACK DA LOJA
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

  // ESTATÍSTICA: AVALIAÇÕES DE CLIENTES
  const feedbackStats = useMemo(() => {
    if (feedbacks.length === 0) return { avg: "0.0", count: 0, promoters: 0 };
    
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const promotersCount = feedbacks.filter(f => f.rating >= 4).length;
    
    return {
      avg: (sum / feedbacks.length).toFixed(1),
      count: feedbacks.length,
      promoters: ((promotersCount / feedbacks.length) * 100).toFixed(0)
    };
  }, [feedbacks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
      
      {/* CARD 1: FLUXO DE CLIENTES */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#00d66f] flex flex-col relative overflow-hidden">
        <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-8">
          <div className="bg-slate-100 p-2 rounded-xl"><BarChart3 size={16} /></div> Fluxo Semanal
        </h3>
        
        <div className="flex items-end justify-between h-32 gap-2 mb-8 mt-auto">
          {dayStats.map((d, i) => {
            const maxCount = Math.max(...dayStats.map(x => x.count), 1);
            const height = `${(d.count / maxCount) * 100}%`;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-[#0a2540] rounded-t-xl transition-all duration-1000 group-hover:bg-[#00d66f] relative" 
                  style={{ height: height, minHeight: '4px' }}
                >
                    {d.count > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-1 rounded-md">
                            {d.count}
                        </div>
                    )}
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400">{d.day}</span>
              </div>
            );
          })}
        </div>
        
        <div className="space-y-3 pt-6 border-t-2 border-slate-100">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mb-2">Horas de Ponta (12M)</p>
          <div className="grid grid-cols-2 gap-2">
              {dayStats.filter(d => d.count > 0).slice(0, 4).map((d, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[9px] font-bold uppercase border border-slate-100">
                  <span className="text-slate-500">{d.day}</span>
                  <span className="text-[#0a2540] flex items-center gap-1">
                    <Clock size={10} className="text-[#00d66f]"/> {d.peakHour}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* CARD 2: FATURAÇÃO MENSAL */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] flex flex-col">
        <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-8">
          <div className="bg-slate-100 p-2 rounded-xl"><TrendingUp size={16} /></div> Volume Mensal
        </h3>
        <div className="space-y-6 mt-auto">
          {monthStats.map((m, i) => {
              const maxVol = Math.max(...monthStats.map(x => x.volume), 1);
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">{m.label}</span>
                    <span className="text-[#0a2540] italic">{formatCurrency(m.volume)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-[#00d66f] transition-all duration-1000 rounded-full" 
                        style={{ width: `${(m.volume / maxVol) * 100}%` }} 
                    />
                  </div>
                </div>
              );
          })}
        </div>
      </div>

      {/* CARD 3: ECONOMIA DA LOJA (CASHBACK) */}
      <div className="bg-[#0a2540] p-8 rounded-[40px] text-white shadow-2xl flex flex-col relative overflow-hidden border-4 border-[#0a2540]">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Wallet size={120} />
        </div>
        
        <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#00d66f] mb-8 relative z-10">
          <div className="bg-[#00d66f]/20 p-2 rounded-xl"><Wallet size={16} /></div> Gestão de Saldo
        </h3>
        
        <div className="space-y-8 flex-grow relative z-10 mt-auto">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
            <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-2">Responsabilidade Total (Aos Vizinhos)</p>
            <span className="text-3xl font-black text-[#00d66f] italic tracking-tighter block">{formatCurrency(cashbackStats.available)}</span>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex justify-between items-end">
              <div>
                  <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Total Emitido</p>
                  <span className="text-lg font-black text-white italic">{formatCurrency(cashbackStats.emitted)}</span>
              </div>
              <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Já Descontado</p>
                  <span className="text-sm font-bold text-red-400">-{formatCurrency(cashbackStats.used)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
              <span className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest">A Maturar</span>
              <span className="text-sm font-black text-amber-500">{formatCurrency(cashbackStats.pending)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: SATISFAÇÃO DE CLIENTES */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] flex flex-col h-[480px]">
        <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-6 shrink-0">
          <div className="bg-amber-100 p-2 rounded-xl"><Star size={16} className="text-amber-500 fill-amber-500" /></div> Satisfação
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
          <div className="bg-slate-50 p-4 rounded-3xl text-center border-2 border-slate-100 shadow-inner">
            <p className="text-3xl font-black text-[#0a2540] italic tracking-tighter">{feedbackStats.avg}</p>
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mt-1">Global ({feedbackStats.count})</p>
          </div>
          <div className="bg-green-50 p-4 rounded-3xl text-center border-2 border-green-200 shadow-inner">
            <p className="text-3xl font-black text-[#00d66f] italic tracking-tighter">{feedbackStats.promoters}%</p>
            <p className="text-[7px] font-black uppercase text-green-700 tracking-widest mt-1">Promotores</p>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest sticky top-0 bg-white pb-2 z-10 pt-1">
            Últimos Comentários (Max. 50)
          </p>
          
          {loadingFeedbacks ? (
              <div className="flex justify-center p-6"><div className="w-6 h-6 border-2 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div></div>
          ) : feedbacks.length > 0 ? (
              feedbacks.map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border-l-4 border-[#00d66f] group hover:bg-slate-100 transition-colors">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, si) => (
                        <Star key={si} size={10} fill={si < f.rating ? "#0a2540" : "none"} className={si < f.rating ? "text-[#0a2540]" : "text-slate-300"} />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed">
                    "{f.comment || 'Sem comentário adicional.'}"
                  </p>
                </div>
              ))
          ) : (
              <div className="text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <AlertCircle size={20} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sem Avaliações</p>
              </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BusinessIntelligence;