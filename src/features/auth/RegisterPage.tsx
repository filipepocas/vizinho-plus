import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, Mail, Lock, User, Hash, ArrowRight, MapPin, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', nif: '', email: '', password: '', zipCode: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false); // RGPD
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkNifExists } = useStore();

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
    setFormData({ ...formData, zipCode: val });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("TENS DE ACEITAR OS TERMOS E PRIVACIDADE.");
      return;
    }
    setLoading(true);

    if (formData.zipCode.length !== 8) {
      toast.error("CÓDIGO POSTAL INVÁLIDO (0000-000)");
      setLoading(false);
      return;
    }

    try {
      const nifExists = await checkNifExists(formData.nif);
      if (nifExists) {
        toast.error("ESTE NIF JÁ ESTÁ REGISTADO.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: formData.name.trim(),
        nif: formData.nif,
        zipCode: formData.zipCode,
        email: formData.email.toLowerCase().trim(),
        role: 'client',
        status: 'active',
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      toast.success("BEM-VINDO VIZINHO!");
      navigate('/dashboard');
    } catch (err: any) {
      toast.error("ERRO AO CRIAR CONTA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="bg-[#0a2540] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-[#00d66f]">
            <UserPlus size={32} className="text-[#00d66f]" />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Ser Vizinho+</h2>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">NIF</label>
              <input type="text" maxLength={9} required value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cód. Postal</label>
              <input type="text" maxLength={8} required value={formData.zipCode} onChange={handleZipCodeChange} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
            <input type="password" minLength={6} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
          </div>

          {/* CHECKBOX RGPD */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mt-2">
            <input 
              type="checkbox" 
              id="terms" 
              checked={acceptedTerms} 
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#00d66f]"
            />
            <label htmlFor="terms" className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
              Aceito os <Link to="/terms" className="text-[#0a2540] underline">Termos de Utilização</Link> e a 
              <Link to="/terms" className="text-[#0a2540] underline"> Política de Privacidade</Link> do Vizinho+.
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3 border-b-8 border-black/10 mt-4">
            {loading ? 'A processar...' : 'Confirmar Registo'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540]">Já tenho conta. Quero entrar.</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;