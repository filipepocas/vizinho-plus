import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Store
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  merchantName: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
  cashbackAmount?: number;
}

const UserHistory: React.FC = () => {
  const { user } = useStore() as any;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, 'transactions'),
          where('clientId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const txList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(txList);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user?.uid]);

  if (loading) return <div className="p-10 text-center font-black uppercase text-[10px] text-slate-400">A carregar...</div>;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-[#0f172a] font-black uppercase italic italic tracking-tighter text-xl">Atividade</h2>
      {transactions.length === 0 ? (
        <p className="text-slate-400 text-[10px] font-bold uppercase">Sem movimentos.</p>
      ) : (
        transactions.map((tx) => (
          <div key={tx.id} className="bg-white border-2 border-slate-100 p-4 rounded-3xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${tx.type === 'earn' ? 'bg-[#00d66f]/10 text-[#00d66f]' : 'bg-slate-100 text-slate-400'}`}>
                {tx.type === 'earn' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </div>
              <div>
                <p className="font-black text-[11px] text-[#0f172a] uppercase">{tx.merchantName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : '---'}
                </p>
              </div>
            </div>
            <p className="font-black text-sm text-[#0f172a]">{tx.amount.toFixed(2)}€</p>
          </div>
        ))
      )}
    </div>
  );
};

export default UserHistory;