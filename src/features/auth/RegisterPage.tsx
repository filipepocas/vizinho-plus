// src/features/auth/RegisterPage.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, ArrowRight, Smartphone, Volume2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall'; 
import { requestNotificationPermission } from '../../utils/notifications';

interface RegisterPageProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', zipCode: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();
  const [setupStep, setSetupStep] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState('');

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
    setFormData({ ...formData, zipCode: val });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error("TENS DE ACEITAR OS TERMOS."); return; }
    if (formData.email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) { toast.error("EMAILS DIFERENTES."); return; }
    if (formData.password !== confirmPassword) { toast.error("PASSWORDS DIFERENTES."); return; }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), {
        id: uid, name: formData.name.trim(), customerNumber: Math.floor(100000000 + Math.random() * 900000000).toString(), 
        phone: formData.phone.trim(), zipCode: formData.zipCode, email: formData.email.toLowerCase().trim(),
        birthDate: formData.birthDate, role: 'client', status: 'active', wallet: { available: 0, pending: 0 }, devices: [], createdAt: serverTimestamp()
      });
      setRegisteredUserId(uid);
      setSetupStep(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("ERRO AO CRIAR CONTA.");
    } finally { setLoading(false); }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in zoom-in">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]"><CheckCircle2 size={40} className="text-[#0a2540]" /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Bem-vindo(a)!</h2>
            <div className="space-y-4 mt-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg border-2 border-[#0a2540]">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar App
                    </button>
                )}
                <button onClick={() => requestNotificationPermission(registeredUserId)} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[4px_4px_0px_#0a2540]">
                    <Volume2 size={24} /> Ativar Notificações
                </button>
                <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest">Entrar no Painel <ArrowRight className="inline ml-2" size={20} /></button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 py-12 relative">
      <button onClick={() => onBack ? onBack() : navigate('/login')} className="absolute top-8 left-8 p-4 bg-white border-4 border-slate-100 rounded-2xl text-[#0a2540] hover:border-[#00d66f] transition-all"><ArrowLeft size={24} /></button>
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 mt-8">
        <div className="text-center mb-10"><h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Ser Vizinho+</h2></div>
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold" placeholder="Nome Completo" />
          <div className="grid grid-cols-1 gap-4">
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Email" />
            <input type="email" required value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} className="w-full p-4 bg-white border-4 border-[#00d66f] rounded-3xl font-bold text-xs" placeholder="Confirmar Email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Password" />
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Confirmar Pass" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" />
            <input type="text" maxLength={8} required value={formData.zipCode} onChange={handleZipCodeChange} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="C. Postal" />
          </div>
          <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Telemóvel" />
          
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mt-2">
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-[#00d66f]" />
            <label htmlFor="terms" className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
              Aceito os {/* CORREÇÃO PONTO 1: target="_blank" */}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0a2540] underline">Termos de Utilização</Link> e a 
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0a2540] underline"> Política de Privacidade</Link>.
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl border-b-8 border-black/10 mt-4">
            {loading ? 'A processar...' : 'Confirmar Registo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;