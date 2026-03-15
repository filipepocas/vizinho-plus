import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Star, 
  MessageSquare, 
  User, 
  Store, 
  Calendar, 
  Trash2, 
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Filter
} from 'lucide-react';

interface Feedback {
  id: string;
  transactionId: string;
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  recommend: boolean | null;
  status: 'new' | 'reviewed';
  createdAt: any;
}

const FeedbackList: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new'>('all');

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbacks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsReviewed = async (id: string) => {
    try {
      await updateDoc(doc(db, 'feedbacks', id), { status: 'reviewed' });
    } catch (error) {
      console.error("Erro ao atualizar feedback:", error);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!window.confirm("Eliminar esta avaliação permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'feedbacks', id));
    } catch (error) {
      console.error("Erro ao eliminar feedback:", error);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => filter === 'all' || f.status === 'new');

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">A carregar avaliações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[30px] border-4 border-[#0f172a] shadow-[8px_8px_0px_#0f172a]">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Voz do Cliente</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monitorização de satisfação em tempo real</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all border-2 ${
              filter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('new')}
            className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all border-2 ${
              filter === 'new' ? 'bg-[#00d66f] text-[#0f172a] border-[#0f172a]' : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            Não Lidos
          </button>
        </div>
      </div>

      {/* Grid de Feedbacks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFeedbacks.length > 0 ? filteredFeedbacks.map((f) => (
          <div 
            key={f.id} 
            className={`bg-white rounded-[40px] border-4 p-8 transition-all relative overflow-hidden ${
              f.status === 'new' ? 'border-[#00d66f] shadow-[8px_8px_0px_#00d66f]' : 'border-slate-100 opacity-80'
            }`}
          >
            {f.status === 'new' && (
              <div className="absolute top-0 right-0 bg-[#00d66f] text-[#0f172a] px-4 py-1 font-black text-[8px] uppercase tracking-widest rounded-bl-2xl">
                Novo
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    size={16} 
                    fill={f.rating >= s ? "#0f172a" : "none"} 
                    className={f.rating >= s ? "text-[#0f172a]" : "text-slate-200"}
                  />
                ))}
              </div>
              {f.recommend !== null && (
                <div className={`flex items-center gap-1 font-black text-[9px] uppercase ${f.recommend ? 'text-blue-500' : 'text-red-500'}`}>
                  {f.recommend ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                  {f.recommend ? 'Recomenda' : 'Não Recomenda'}
                </div>
              )}
            </div>

            <p className="text-slate-600 font-bold italic mb-6 leading-relaxed">
              "{f.comment || "Sem comentário adicional."}"
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-[10px] font-black uppercase tracking-tight text-slate-400">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[#0f172a]" />
                <span className="truncate">{f.userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Store size={14} className="text-[#0f172a]" />
                <span className="truncate">{f.merchantName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#0f172a]" />
                <span>{f.createdAt?.toDate().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-6 border-t-2 border-slate-50">
              {f.status === 'new' && (
                <button 
                  onClick={() => markAsReviewed(f.id)}
                  className="flex-1 bg-slate-100 hover:bg-[#00d66f] hover:text-[#0f172a] text-slate-500 p-3 rounded-xl transition-all font-black uppercase text-[9px] flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} /> Marcar como lido
                </button>
              )}
              <button 
                onClick={() => deleteFeedback(f.id)}
                className="w-12 bg-slate-50 hover:bg-red-500 hover:text-white text-slate-300 p-3 rounded-xl transition-all flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 p-20 text-center">
            <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-300 italic">Nenhum feedback encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackList;