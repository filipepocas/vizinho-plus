import React, { useState } from 'react';
import { X, Store, Mail, Hash, Percent, MapPin, Loader2 } from 'lucide-react';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface MerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MerchantModal: React.FC<MerchantModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    nif: '',
    cashbackPercent: '5',
    freguesia: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Criar conta no Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );

      // 2. Criar perfil de Lojista no Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        nif: formData.nif.trim(),
        role: 'merchant',
        status: 'active',
        cashbackPercent: Number(formData.cashbackPercent),
        freguesia: formData.freguesia.trim(),
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao criar parceiro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in duration-300">
        
        <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="text-[#00d66f]" size={24} />
            <h2 className="font-black uppercase italic tracking-tighter text-xl">Novo Parceiro</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Nome da Loja</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">NIF</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required maxLength={9} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                  value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required type="email" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Palavra-passe</label>
              <input required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">% Cashback</label>
              <div className="relative">
                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required type="number" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                  value={formData.cashbackPercent} onChange={e => setFormData({...formData, cashbackPercent: e.target.value})} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Freguesia / Localidade</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" 
                value={formData.freguesia} onChange={e => setFormData({...formData, freguesia: e.target.value})} />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-3 border-b-4 border-[#0a2540]">
            {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Registo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MerchantModal;