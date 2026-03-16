// src/components/dashboard/FeedbackForm.tsx

import React, { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Send, X, MessageSquare, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

interface FeedbackFormProps {
  transactionId: string;
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  transactionId,
  merchantId,
  merchantName,
  userId,
  userName,
  onClose
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommend, setRecommend] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        transactionId,
        merchantId,
        merchantName,
        userId,
        userName,
        rating,
        comment,
        recommend,
        status: 'new',
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      alert("Erro ao enviar avaliação. Tenta novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#0f172a] shadow-[12px_12px_0px_#00d66f] relative overflow-hidden">
        
        {/* BOTÃO FECHAR BRUTALISTA */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 bg-red-500 text-white p-2 rounded-xl border-4 border-[#0f172a] hover:rotate-90 transition-transform shadow-[4px_4px_0px_#0f172a]"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* HEADER */}
        <div className="bg-[#0f172a] p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#00d66f] p-2 rounded-lg">
              <Star size={20} className="text-[#0f172a]" fill="currentColor" />
            </div>
            <h3 className="font-black uppercase italic tracking-tighter text-2xl">Avaliar Visita</h3>
          </div>
          <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-[0.2em] opacity-90">
            {merchantName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* SISTEMA DE ESTRELAS */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Qual a tua nota?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-12 h-14 rounded-2xl border-4 transition-all flex flex-col items-center justify-center shadow-[4px_4px_0px_#0f172a] active:translate-y-1 active:shadow-none ${
                    rating >= star 
                    ? 'bg-[#00d66f] border-[#0f172a] text-[#0f172a] -rotate-2' 
                    : 'bg-white border-slate-200 text-slate-200 hover:border-[#0f172a]'
                  }`}
                >
                  <Star size={24} fill={rating >= star ? "currentColor" : "none"} strokeWidth={3} />
                  <span className={`text-[8px] font-black mt-1 ${rating >= star ? 'block' : 'hidden'}`}>{star}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RECOMENDAÇÃO VIZINHO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center">
               <AlertCircle size={14} className="text-[#00d66f]" />
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recomendarias a um vizinho?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`p-4 rounded-2xl border-4 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all shadow-[4px_4px_0px_#0f172a] active:translate-y-1 active:shadow-none ${
                  recommend === true ? 'bg-[#00d66f] border-[#0f172a] text-[#0f172a]' : 'bg-white border-slate-100 text-slate-300'
                }`}
              >
                <ThumbsUp size={18} strokeWidth={3} /> Sim
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`p-4 rounded-2xl border-4 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all shadow-[4px_4px_0px_#0f172a] active:translate-y-1 active:shadow-none ${
                  recommend === false ? 'bg-red-500 border-[#0f172a] text-white' : 'bg-white border-slate-100 text-slate-300'
                }`}
              >
                <ThumbsDown size={18} strokeWidth={3} /> Não
              </button>
            </div>
          </div>

          {/* COMENTÁRIO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-2">
              <MessageSquare size={14} /> Mensagem (Opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-4 border-[#0f172a] rounded-[25px] p-5 text-sm font-bold focus:bg-slate-50 outline-none min-h-[120px] resize-none placeholder:text-slate-300 transition-colors shadow-inner"
              placeholder="Como foi a experiência?"
            />
          </div>

          {/* SUBMISSÃO */}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className={`w-full p-6 rounded-[25px] font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 transition-all ${
              isSubmitting || rating === 0
              ? 'bg-slate-100 text-slate-300 border-4 border-slate-200 cursor-not-allowed'
              : 'bg-[#0f172a] text-white border-b-8 border-black hover:bg-black active:border-b-0 active:translate-y-2'
            }`}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Confirmar Avaliação <Send size={20} strokeWidth={3} className="text-[#00d66f]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;