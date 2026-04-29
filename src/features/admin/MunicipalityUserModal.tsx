// src/features/admin/MunicipalityUserModal.tsx

import React, { useState } from 'react';
import { X, Building2, Mail, Lock, MapPin, Loader2 } from 'lucide-react';
import { provisionAuth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../../store/useStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MunicipalityUserModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { locations } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distrito || !concelho) {
      setError('Distrito e Concelho são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, email.trim(), password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: freguesia ? `Junta de ${freguesia}` : `Câmara de ${concelho}`,
        email: email.toLowerCase().trim(),
        role: 'municipality',
        status: 'active',
        distrito,
        concelho,
        freguesia: freguesia || '',
        createdAt: serverTimestamp()
      });
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
      <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-blue-500 shadow-2xl overflow-hidden animate-in zoom-in">
        <div className="bg-blue-500 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 size={24} />
            <h2 className="font-black uppercase italic tracking-tighter text-xl">Criar Acesso Municipal</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Email de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" placeholder="ex: junta@freguesia.pt" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-2 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" placeholder="••••••••" />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><MapPin size={14} /> Área de Atuação</p>
            <select required value={distrito} onChange={e => { setDistrito(e.target.value); setConcelho(''); setFreguesia(''); }} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-blue-500">
              <option value="">Distrito</option>
              {distritos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select required disabled={!distrito} value={concelho} onChange={e => { setConcelho(e.target.value); setFreguesia(''); }} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-blue-500 disabled:opacity-50">
              <option value="">Concelho</option>
              {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select disabled={!concelho} value={freguesia} onChange={e => setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-blue-500 disabled:opacity-50">
              <option value="">Todas as Freguesias (Câmara)</option>
              {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white p-5 rounded-2xl font-black uppercase text-sm shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-3 border-b-4 border-blue-700">
            {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta Municipal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MunicipalityUserModal;