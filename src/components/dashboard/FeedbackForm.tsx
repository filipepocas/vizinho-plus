import React, { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Send, X, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/90 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#0f172a] overflow-hidden shadow-[0_20px_0px_#00d66f]">
        
        {/* Header */}
        <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black uppercase italic tracking-tighter text-xl">Avaliar Experiência</h3>
            <p className="text-[#00d66f] text-[10px] font-black uppercase tracking-widest">{merchantName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Estrelas Brutalistas */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A tua nota de 1 a 5</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-12 h-12 rounded-xl border-4 transition-all flex items-center justify-center ${
                    rating >= star 
                    ? 'bg-[#00d66f] border-[#0f172a] text-[#0f172a] rotate-3' 
                    : 'bg-white border-slate-100 text-slate-200'
                  }`}
                >
                  <Star size={24} fill={rating >= star ? "currentColor" : "none"} strokeWidth={3} />
                </button>
              ))}
            </div>
          </div>

          {/* Recomendação */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Recomendarias a um vizinho?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`p-4 rounded-2xl border-4 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${
                  recommend === true ? 'bg-blue-500 border-[#0f172a] text-white' : 'border-slate-100 text-slate-400'
                }`}
              >
                <ThumbsUp size={18} /> Sim
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`p-4 rounded-2xl border-4 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${
                  recommend === false ? 'bg-red-500 border-[#0f172a] text-white' : 'border-slate-100 text-slate-400'
                }`}
              >
                <ThumbsDown size={18} /> Não
              </button>
            </div>
          </div>

          {/* Comentário */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> Comentário (Opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-4 border-[#0f172a] rounded-2xl p-4 text-sm font-bold focus:bg-slate-50 outline-none min-h-[100px] resize-none"
              placeholder="Conta-nos como correu..."
            />
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className={`w-full p-6 rounded-[25px] font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 transition-all ${
              isSubmitting || rating === 0
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'bg-[#00d66f] text-[#0f172a] border-b-8 border-[#00a857] hover:translate-y-1 hover:border-b-4'
            }`}
          >
            {isSubmitting ? 'A enviar...' : (
              <>
                Enviar Avaliação <Send size={20} strokeWidth={3} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;