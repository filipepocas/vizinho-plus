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
  
  // ESTADO ADICIONADO PARA O PONTO 4
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

  const generateCustomerNumber = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      toast.error("TENS DE ACEITAR OS TERMOS E PRIVACIDADE.");
      return;
    }

    // VALIDAÇÃO DO PONTO 4: Confirmação de Email
    if (formData.email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
      toast.error("OS EMAILS INTRODUZIDOS NÃO COINCIDEM.");
      return;
    }
    
    if (formData.password !== confirmPassword) {
      toast.error("AS PASSWORDS NÃO COINCIDEM.");
      return;
    }

    if (formData.zipCode.length !== 8) {
      toast.error("CÓDIGO POSTAL INVÁLIDO (0000-000)");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );

      const newCustomerNumber = generateCustomerNumber();
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        id: uid,
        name: formData.name.trim(),
        nif: '', 
        customerNumber: newCustomerNumber, 
        phone: formData.phone.trim(),
        zipCode: formData.zipCode,
        email: formData.email.toLowerCase().trim(),
        birthDate: formData.birthDate, 
        role: 'client',
        status: 'active',
        wallet: { available: 0, pending: 0 },
        devices: [], // Inicializa array de dispositivos para o Ponto 1
        createdAt: serverTimestamp()
      });

      setRegisteredUserId(uid);
      setSetupStep(true);
      toast.success("CONTA CRIADA COM SUCESSO!");

      if (onSuccess) onSuccess();

      // Solicitação de notificação imediata
      setTimeout(() => {
        requestNotificationPermission(uid);
      }, 1500);

    } catch (err: any) {
      console.error("Erro no registo:", err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error("ESTE EMAIL JÁ ESTÁ REGISTADO.");
      } else {
        toast.error("ERRO AO CRIAR CONTA.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 text-center animate-in zoom-in duration-500">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]">
              <CheckCircle2 size={40} className="text-[#0a2540]" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Bem-vindo(a)!</h2>
            
            <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl mb-8 mt-6 text-left shadow-inner">
               <div className="flex items-center gap-2 mb-2 text-amber-600">
                  <AlertTriangle size={20} strokeWidth={3} />
                  <h3 className="font-black uppercase text-[10px] tracking-widest">Acesso Vital</h3>
               </div>
               <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  Para ter as <strong>vantagens VIP</strong> e receber o seu cashback, tem de Instalar a App e Ativar as notificações no botão abaixo.
               </p>
            </div>

            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg border-2 border-[#0a2540]">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar App
                    </button>
                )}
                <button onClick={() => requestNotificationPermission(registeredUserId)} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[4px_4px_0px_#0a2540]">
                    <Volume2 size={24} /> Ativar Notificações
                </button>
            </div>

            <div className="border-t-2 border-slate-100 pt-6 mt-4">
              <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  Entrar no Painel <ArrowRight size={20} />
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 py-12 relative">
      <button 
        onClick={() => onBack ? onBack() : navigate('/login')}
        className="absolute top-8 left-8 p-4 bg-white border-4 border-slate-100 rounded-2xl text-[#0a2540] hover:border-[#00d66f] transition-all group"
      >
        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
      </button>

      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 mt-8">
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

          {/* EMAIL DUPLO - PONTO 4 */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" placeholder="teu@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#00d66f] ml-2 italic">Confirmar Email (Repetir)</label>
              <input type="email" required value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} className="w-full p-4 bg-white border-4 border-[#00d66f] rounded-3xl outline-none font-bold text-xs" placeholder="Repete o teu email aqui" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
              <input type="password" minLength={6} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Confirmar Pass</label>
              <input type="password" minLength={6} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data Nasc.</label>
              <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cód. Postal</label>
              <input type="text" maxLength={8} required value={formData.zipCode} onChange={handleZipCodeChange} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="0000-000" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telemóvel</label>
            <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" />
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mt-2">
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-[#00d66f]" />
            <label htmlFor="terms" className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
              Aceito os <Link to="/terms" target="_blank" className="text-[#0a2540] underline">Termos</Link> e a 
              <Link to="/terms" target="_blank" className="text-[#0a2540] underline"> Política de Privacidade</Link>.
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3 border-b-8 border-black/10 mt-4">
            {loading ? 'A processar...' : 'Confirmar Registo'} <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;