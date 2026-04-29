// src/features/admin/PartnerUserModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Crown, Mail, Lock, Loader2, Search } from 'lucide-react';
import { provisionAuth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Vantagem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PartnerUserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [selectedVantagemId, setSelectedVantagemId] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchVantagens = async () => {
        const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setVantagens(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Vantagem)));
      };
      fetchVantagens();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVantagemId) {
      setError('Selecione um anúncio VIP para associar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, email.trim(), password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        name: email.split('@')[0],
        email: email.toLowerCase().trim(),
        role: 'partner',
        status: 'active',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'vantagens', selectedVantagemId), { partnerUid: uid });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está a ser utilizado.');
      } else {
        setError(err.message || 'Erro ao criar utilizador.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a2540]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-amber-500 shadow-2xl overflow-hidden animate-in zoom-in">
        <div className="bg-amber-500 p-6 text-[#0a2540] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Crown size={24} />
            <h2 className="font-black uppercase italic tracking-tighter text-xl">Criar Acesso de Parceiro</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-[#0a2540]"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Anúncio VIP a Associar</label>
            <select required value={selectedVantagemId} onChange={e => setSelectedVantagemId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500">
              <option value="">Selecione...</option>
              {vantagens.map(v => (
                <option key={v.id} value={v.id}>{v.partnerName} ({v.category})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Email de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" placeholder="ex: parceiro@email.com" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-amber-500 text-[#0a2540] p-5 rounded-2xl font-black uppercase text-sm shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-3 border-b-4 border-amber-700">
            {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta de Parceiro'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PartnerUserModal;