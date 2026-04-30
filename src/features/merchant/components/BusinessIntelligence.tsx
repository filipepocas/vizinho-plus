// src/features/merchant/components/BusinessIntelligence.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Transaction, Feedback } from '../../../types';
import { BarChart3, TrendingUp, Wallet, Star, Clock, AlertCircle, Users, Trophy, Activity } from 'lucide-react';

interface BIProps {
  merchantId: string;
  transactions: Transaction[];
}

interface MonthStat {
  label: string;
  m: number;
  y: number;
  volume: number;
  visits: number;
  daysInMonth: number;
}

const BusinessIntelligence: React.FC<BIProps> = ({ merchantId, transactions }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snap: any) => {
      setFeedbacks(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Feedback)));
      setLoadingFeedbacks(false);
    });

    return () => unsubscribe();
  }, [merchantId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  /**
   * FUNÇÕES DE FUSO HORÁRIO (TIMEZONE) - CORREÇÃO 2
   * Garante que todas as estatísticas são calculadas no fuso horário de Portugal Continental (Europe/Lisbon),
   * ignorando o fuso horário do servidor (UTC) ou do telemóvel do utilizador.
   */
  const parseDate = (createdAt: any): Date => {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    return new Date(createdAt);
  };

  const getLisbonDate = (dateInput?: any): Date => {
    const d = dateInput ? parseDate(dateInput) : new Date();
    
    // Usar toLocaleString com en-US garante um formato previsível: "MM/DD/YYYY, HH:mm:ss"
    const lisbonString = d.toLocaleString('en-US', { 
        timeZone: 'Europe/Lisbon', 
        hour12: false 
    });
    
    const [datePart, timePart] = lisbonString.split(', ');
    const [month, day, year] = datePart.split('/');
    let [hour, minute, second] = timePart.split(':');
    
    // Correção de segurança: em alguns browsers hour12:false pode retornar '24' em vez de '00'
    if (hour === '24') hour = '00';

    // Cria um objeto Date local, mas "injetado" com os valores exatos de Lisboa.
    // Assim, quando fizermos .getHours() ou .getDay(), ele devolve a hora/dia de Portugal.
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  };

  const dayStats = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = days.map((d: string) => ({ day: d, count: 0, volume: 0, hours: Array(24).fill(0) }));
    
    const oneYearAgo = getLisbonDate();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    transactions.forEach((t: Transaction) => {
      const date = getLisbonDate(t.createdAt);
      if (date > oneYearAgo && t.type === 'earn' && t.status !== 'cancelled') {
        const dayIdx = date.getDay();
        const hour = date.getHours();
        counts[dayIdx].count++;
        counts[dayIdx].volume += Number(t.amount || 0); 
        counts[dayIdx].hours[hour]++;
      }
    });

    return counts.map((d: { day: string, count: number, volume: number, hours: number[] }) => ({
      ...d,
      // Formata a hora de ponta com 2 dígitos (ex: 09:00 em vez de 9:00)
      peakHour: d.count > 0 ? `${String(d.hours.indexOf(Math.max(...d.hours))).padStart(2, '0')}:00` : '--:--'
    }));
  }, [transactions]);

  const monthStats = useMemo(() => {
    const months: MonthStat[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = getLisbonDate();
      d.setMonth(d.getMonth() - i);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      months.push({ 
        label: d.toLocaleDateString('pt-PT', { month: 'short' }), 
        m: d.getMonth(), 
        y: d.getFullYear(), 
        volume: 0, visits: 0, daysInMonth: daysInMonth
      });
    }

    transactions.forEach((t: Transaction) => {
      if (t.type === 'earn' && t.status !== 'cancelled') {
        const date = getLisbonDate(t.createdAt);
        const idx = months.findIndex((m: MonthStat) => m.m === date.getMonth() && m.y === date.getFullYear());
        if (idx !== -1) {
          months[idx].volume += Number(t.amount || 0);
          months[idx].visits += 1;
        }
      }
    });
    return months;
  }, [transactions]);
const performanceStats = useMemo(() => {
    const sixMonthsAgo = getLisbonDate();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const currentMonthStart = getLisbonDate();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    let vol6m = 0, visits6m = 0;
    let vol1m = 0, visits1m = 0;

    transactions.forEach((t: Transaction) => {
      if (t.type === 'earn' && t.status !== 'cancelled') {
        const d = getLisbonDate(t.createdAt);
        if (d >= sixMonthsAgo) {
          vol6m += Number(t.amount || 0);
          visits6m++;
        }
        if (d >= currentMonthStart) {
          vol1m += Number(t.amount || 0);
          visits1m++;
        }
      }
    });

    const elapsedDaysCurrentMonth = Math.max(1, getLisbonDate().getDate());
    const elapsedDays6Months = 180;

    return {
      ticket6m: visits6m > 0 ? vol6m / visits6m : 0,
      daily6m: visits6m / elapsedDays6Months,
      ticket1m: visits1m > 0 ? vol1m / visits1m : 0,
      daily1m: visits1m / elapsedDaysCurrentMonth,
    };
  }, [transactions]);

  const topClients = useMemo(() => {
    const sixMonthsAgo = getLisbonDate();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const clientMap: Record<string, { name: string, card: string, birth: string, volume: number, visits: number }> = {};

    transactions.forEach((t: Transaction) => {
      const date = getLisbonDate(t.createdAt);
      if (date >= sixMonthsAgo && t.type === 'earn' && t.status !== 'cancelled') {
        if (!clientMap[t.clientId]) {
          clientMap[t.clientId] = {
            name: t.clientName || 'Desconhecido',
            card: t.clientCardNumber || t.clientNif || '---',
            birth: t.clientBirthDate || 'N/D',
            volume: 0, visits: 0
          };
        }
        clientMap[t.clientId].volume += Number(t.amount);
        clientMap[t.clientId].visits += 1;
      }
    });

    const allClientsArr = Object.values(clientMap);
    return {
      byVolume: [...allClientsArr].sort((a: any, b: any) => b.volume - a.volume).slice(0, 20),
      byVisits: [...allClientsArr].sort((a: any, b: any) => b.visits - a.visits).slice(0, 20)
    };
  }, [transactions]);

  const cashbackStats = useMemo(() => {
    let emitted = 0, used = 0, available = 0;
    transactions.forEach((t: Transaction) => {
      if (t.status === 'cancelled') return;
      if (t.type === 'earn') { emitted += t.cashbackAmount; available += t.cashbackAmount; } 
      else if (t.type === 'redeem') { used += t.amount; available -= t.amount; }
    });
    return { emitted, used, available: Math.max(0, available) };
  }, [transactions]);

  const feedbackStats = useMemo(() => {
    if (feedbacks.length === 0) return { avg: "0.0", count: 0, promoters: 0 };
    const sum = feedbacks.reduce((acc: number, f: Feedback) => acc + f.rating, 0);
    const promotersCount = feedbacks.filter((f: Feedback) => f.rating >= 4).length;
    return { avg: (sum / feedbacks.length).toFixed(1), count: feedbacks.length, promoters: ((promotersCount / feedbacks.length) * 100).toFixed(0) };
  }, [feedbacks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

        <div className="bg-[#0a2540] p-8 rounded-[40px] border-4 border-[#00d66f] shadow-[8px_8px_0px_#00d66f] text-white">
           <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#00d66f] mb-6">
              <div className="bg-[#00d66f]/20 p-2 rounded-xl"><Activity size={16} /></div> Saúde do Negócio: Últimos 6 Meses vs Mês Atual
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 p-6 rounded-3xl border-2 border-white/10">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Ticket Médio (Valor por Cliente)</p>
                 <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black italic">{formatCurrency(performanceStats.ticket1m)}</p>
                      <p className="text-[9px] font-bold text-[#00d66f] uppercase">Mês Atual</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-300">{formatCurrency(performanceStats.ticket6m)}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Média 6 Meses</p>
                    </div>
                 </div>
              </div>
              <div className="bg-white/10 p-6 rounded-3xl border-2 border-white/10">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Frequência (Transações por Dia)</p>
                 <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black italic">{performanceStats.daily1m.toFixed(1)} <span className="text-sm font-bold text-slate-400">/dia</span></p>
                      <p className="text-[9px] font-bold text-[#00d66f] uppercase">Mês Atual</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-300">{performanceStats.daily6m.toFixed(1)} <span className="text-xs font-bold text-slate-400">/dia</span></p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Média 6 Meses</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] flex flex-col relative overflow-hidden">
            <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-8">
              <div className="bg-slate-100 p-2 rounded-xl"><BarChart3 size={16} /></div> Volume Semanal
            </h3>
            <div className="flex items-end justify-between h-32 gap-2 mb-8 mt-auto">
              {dayStats.map((d: any, i: number) => {
                const maxVol = Math.max(...dayStats.map((x: any) => x.volume)) || 1; 
                const heightPercentage = (d.volume / maxVol) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-full bg-[#0a2540] rounded-t-xl transition-all duration-1000 group-hover:bg-[#00d66f] relative" style={{ height: `${heightPercentage}%`, minHeight: d.volume > 0 ? '8px' : '2px' }}>
                        {d.volume > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-1 rounded-md whitespace-nowrap z-20">{formatCurrency(d.volume)}</div>}
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-400">{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 pt-6 border-t-2 border-slate-100">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mb-2">Horas de Ponta (12M)</p>
              <div className="grid grid-cols-2 gap-2">
                  {dayStats.filter((d: any) => d.count > 0).slice(0, 4).map((d: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[9px] font-bold uppercase border border-slate-100">
                      <span className="text-slate-500">{d.day}</span>
                      <span className="text-[#0a2540] flex items-center gap-1"><Clock size={10} className="text-[#00d66f]"/> {d.peakHour}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] flex flex-col">
            <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-8">
              <div className="bg-slate-100 p-2 rounded-xl"><TrendingUp size={16} /></div> Volume Mensal
            </h3>
            <div className="space-y-5 mt-auto">
              {monthStats.map((m: MonthStat, i: number) => {
                  const maxVol = Math.max(...monthStats.map((x: MonthStat) => x.volume)) || 1;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">{m.label}</span>
                        <span className="text-[#0a2540] italic">{formatCurrency(m.volume)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-[#00d66f] transition-all duration-1000 rounded-full" style={{ width: `${(m.volume / maxVol) * 100}%` }} />
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>

          <div className="bg-[#0a2540] p-8 rounded-[40px] text-white shadow-2xl flex flex-col relative overflow-hidden border-4 border-[#0a2540]">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Wallet size={120} /></div>
            <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#00d66f] mb-8 relative z-10">
              <div className="bg-[#00d66f]/20 p-2 rounded-xl"><Wallet size={16} /></div> Gestão de Saldo
            </h3>
            <div className="space-y-8 flex-grow relative z-10 mt-auto">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-2">Responsabilidade Total</p>
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
              </div>
            </div>
          </div>

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
              <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest sticky top-0 bg-white pb-2 z-10 pt-1">Últimos Comentários</p>
              {loadingFeedbacks ? (
                  <div className="flex justify-center p-6"><div className="w-6 h-6 border-2 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div></div>
              ) : feedbacks.length > 0 ? (
                  feedbacks.map((f: Feedback, i: number) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border-l-4 border-[#00d66f] group hover:bg-slate-100 transition-colors">
                      <div className="flex gap-0.5 mb-2">
                        {[...Array(5)].map((_, si) => (
                            <Star key={si} size={10} fill={si < f.rating ? "#0a2540" : "none"} className={si < f.rating ? "text-[#0a2540]" : "text-slate-300"} />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed">"{f.comment || 'Sem comentário adicional.'}"</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#00d66f]">
              <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-6">
                <div className="bg-[#00d66f]/20 p-2 rounded-xl"><Trophy size={16} className="text-[#00d66f]" /></div> Top 20 Clientes (Últimos 6 Meses)
              </h3>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b-2 border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                          <th className="pb-3">Cliente</th>
                          <th className="pb-3 text-center">Nascimento</th>
                          <th className="pb-3 text-right">Volume</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {topClients.byVolume.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                             <td className="py-4">
                                <p className="font-black text-xs uppercase text-[#0a2540]">{c.name}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">{c.card}</p>
                             </td>
                             <td className="py-4 text-center text-[10px] font-bold text-slate-500">{c.birth}</td>
                             <td className="py-4 text-right font-black text-[#00d66f]">{formatCurrency(c.volume)}</td>
                          </tr>
                       ))}
                       {topClients.byVolume.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-xs text-slate-400">Nenhum dado nos últimos 6 meses.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540]">
              <h3 className="flex items-center gap-3 font-black uppercase text-[10px] tracking-widest text-[#0a2540] mb-6">
                <div className="bg-blue-50 p-2 rounded-xl"><Users size={16} className="text-blue-500" /></div> Clientes + Frequentes (Últimos 6 Meses)
              </h3>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b-2 border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                          <th className="pb-3">Cliente</th>
                          <th className="pb-3 text-center">Nascimento</th>
                          <th className="pb-3 text-right">Visitas</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {topClients.byVisits.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                             <td className="py-4">
                                <p className="font-black text-xs uppercase text-[#0a2540]">{c.name}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">{c.card}</p>
                             </td>
                             <td className="py-4 text-center text-[10px] font-bold text-slate-500">{c.birth}</td>
                             <td className="py-4 text-right font-black text-blue-500">{c.visits}x</td>
                          </tr>
                       ))}
                       {topClients.byVisits.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-xs text-slate-400">Nenhum dado nos últimos 6 meses.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
    </div>
  );
};

export default BusinessIntelligence;