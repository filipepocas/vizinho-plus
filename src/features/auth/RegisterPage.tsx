import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, ArrowRight, Smartphone, Volume2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall'; 
import { requestNotificationPermission } from '../../utils/notifications';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', zipCode: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { isInstallable, installApp } = usePWAInstall();

  // Estados para a fase de "Pós-Registo"
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
    
    if (formData.password !== confirmPassword) {
      toast.error("AS PASSWORDS NÃO COINCIDEM.");
      return;
    }

    setLoading(true);

    if (formData.zipCode.length !== 8) {
      toast.error("CÓDIGO POSTAL INVÁLIDO (0000-000)");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const newCustomerNumber = generateCustomerNumber();

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: formData.name.trim(),
        nif: '', // Fica vazio para ser preenchido nas definições pelo utilizador
        customerNumber: newCustomerNumber, 
        phone: formData.phone.trim(),
        zipCode: formData.zipCode,
        email: formData.email.toLowerCase().trim(),
        birthDate: formData.birthDate, 
        role: 'client',
        status: 'active',
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      setRegisteredUserId(userCredential.user.uid);
      setSetupStep(true); // Abre a nova janela final
      toast.success("CONTA CRIADA COM SUCESSO!");
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error("ESTE EMAIL JÁ ESTÁ REGISTADO.");
      } else {
        toast.error("ERRO AO CRIAR CONTA.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ECRÃ PÓS REGISTO (PARA NOTIFICAÇÕES E APP)
  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 text-center animate-in zoom-in">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]">
              <CheckCircle2 size={40} className="text-[#0a2540]" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Bem-vindo(a)!</h2>
            <p className="text-sm font-bold text-slate-500 mb-8">A tua conta foi criada. Para tirar o máximo partido do Vizinho+, ativa já as opções abaixo:</p>
            
            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar Aplicação (Ecrã)
                    </button>
                )}
                <button onClick={() => requestNotificationPermission(registeredUserId)} className="w-full bg-blue-50 border-2 border-blue-200 text-blue-600 p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-sm">
                    <Volume2 size={24} /> Permitir Alertas (Telemóvel)
                </button>
            </div>

            <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                Concluir e Entrar <ArrowRight size={20} />
            </button>
        </div>
      </div>
    );
  }

  // ECRÃ NORMAL DE REGISTO
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data Nasc. <span className="text-[8px]">(Opcional)</span></label>
              <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cód. Postal</label>
              <input type="text" maxLength={8} required value={formData.zipCode} onChange={handleZipCodeChange} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telemóvel <span className="text-[8px]">(Opcional)</span></label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
              <input type="password" minLength={6} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Confirmar</label>
              <input type="password" minLength={6} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mt-2">
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-[#00d66f]" />
            <label htmlFor="terms" className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
              Aceito os <Link to="/terms" className="text-[#0a2540] underline">Termos de Utilização</Link> e a 
              <Link to="/terms" className="text-[#0a2540] underline"> Política de Privacidade</Link> do Vizinho+.
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3 border-b-8 border-black/10 mt-4">
            {loading ? 'A processar...' : 'Confirmar Registo'} <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <Link to="/login" className="block text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540]">Já tenho conta. Quero entrar.</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;