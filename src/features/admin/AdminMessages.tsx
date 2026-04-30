// src/features/admin/AdminMessages.tsx

import React, { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Send, Loader2, MessageSquare, X, Filter, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const AdminMessages: React.FC = () => {
  const { locations } = useStore();
  const [messageText, setMessageText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'distrito' | 'concelho' | 'freguesia' | 'nif'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [isSending, setIsSending] = useState(false);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return toast.error("Escreva uma mensagem.");
    if (filterType !== 'all' && !filterValue && !distrito) {
      return toast.error("Selecione um filtro ou deixe como 'Todos'.");
    }

    setIsSending(true);
    try {
      let targetFilter: any = {};
      if (filterType === 'distrito') targetFilter = { distrito: distrito };
      else if (filterType === 'concelho') targetFilter = { concelho: filterType === 'concelho' ? concelho : '' };
      else if (filterType === 'freguesia') targetFilter = { freguesia: freguesia };
      else if (filterType === 'nif') targetFilter = { targetNif: filterValue.trim() };

      // A função de envio fica para o backend (ou podemos fazer diretamente aqui se tivermos lista, mas vamos delegar à cloud function genérica)
      // No entanto, para simplificar, enviamos uma única mensagem com os filtros, e o Motor de Disparo tratará de distribuir.
      // Na verdade, vamos gravar uma mensagem do admin com os parâmetros de destino.
      await addDoc(collection(db, 'merchant_messages'), {
        message: messageText.trim(),
        targetType: filterType,
        targetValue: filterType === 'nif' ? filterValue : (distrito || concelho || freguesia || 'all'),
        targetDistrito: distrito || null,
        targetConcelho: concelho || null,
        targetFreguesia: freguesia || null,
        from: 'admin',
        broadcast: true, // indica que é um comunicado
        createdAt: serverTimestamp()
      });

      toast.success("Mensagem enviada com sucesso!");
      setMessageText('');
      setFilterType('all');
      setDistrito('');
      setConcelho('');
      setFreguesia('');
      setFilterValue('');
    } catch (err: any) {
      toast.error("Erro ao enviar comunicado.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-500 p-4 rounded-2xl border-4 border-[#0a2540]">
            <MessageSquare size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Comunicados aos Lojistas</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Envie avisos, promoções ou informações importantes</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Mensagem</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Escreva o comunicado..."
              rows={6}
              className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-3xl font-bold text-sm outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
              <Filter size={14} /> Destinatários
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as any);
                    setDistrito('');
                    setConcelho('');
                    setFreguesia('');
                    setFilterValue('');
                  }}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500"
                >
                  <option value="all">Todos os lojistas</option>
                  <option value="distrito">Por Distrito</option>
                  <option value="concelho">Por Concelho</option>
                  <option value="freguesia">Por Freguesia</option>
                  <option value="nif">Por NIF específico</option>
                </select>
              </div>

              {filterType === 'nif' ? (
                <div>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="NIF do lojista"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filterType === 'distrito' || filterType === 'concelho' || filterType === 'freguesia' ? (
                    <>
                      <select
                        value={distrito}
                        onChange={(e) => { setDistrito(e.target.value); setConcelho(''); setFreguesia(''); }}
                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="">Todos os Distritos</option>
                        {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {(filterType === 'concelho' || filterType === 'freguesia') && (
                        <select
                          disabled={!distrito}
                          value={concelho}
                          onChange={(e) => { setConcelho(e.target.value); setFreguesia(''); }}
                          className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option value="">Todos os Concelhos</option>
                          {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      {filterType === 'freguesia' && (
                        <select
                          disabled={!concelho}
                          value={freguesia}
                          onChange={(e) => setFreguesia(e.target.value)}
                          className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option value="">Todas as Freguesias</option>
                          {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase text-sm hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl border-b-4 border-black/40 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Enviar Comunicado</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminMessages;