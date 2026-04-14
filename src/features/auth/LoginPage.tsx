// src/features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  Volume2,
  AlertTriangle,
  Zap,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission, registerDeviceInFirebase } from '../../utils/notifications';

interface LoginPageProps {
  installPrompt: any;
  onRegister?: () => void;
  onForgotPassword?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt, onRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ESTADOS PARA O PONTO 1: Verificação de Setup
  const [setupStep, setSetupStep] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  const { isInstallable, installApp } = usePWAInstall();

  const navigate = useNavigate();
  const { setCurrentUser } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        
        if (userData.status === 'blocked') {
          await auth.signOut();
          toast.error('ESTA CONTA ESTÁ SUSPENSA.');
          setLoading(false);
          return;
        }

        // PONTO 1: Verificação Automática de Notificações e PWA
        const hasNotifPermission = Notification.permission === 'granted';
        const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;

        // Se faltar algum passo, mostramos o ecrã de setup obrigatório
        if (!hasNotifPermission || (isInstallable && !isAppInstalled)) {
          setTempUserId(uid);
          setSetupStep(true);
          setLoading(false);
          return;
        }

        // Se estiver tudo OK, regista o dispositivo (máx 2) e entra
        await registerDeviceInFirebase(uid, ""); // O token será atualizado automaticamente
        setCurrentUser(userData);
        
        if (userData.role === 'admin') navigate('/admin');
        else if (userData.role === 'merchant') navigate('/merchant');
        else navigate('/dashboard');

      }
    } catch (error: any) {
      toast.error('EMAIL OU PASSWORD INCORRETOS.');
      setLoading(false);
    }
  };

  // ECRÃ DE SETUP OBRIGATÓRIO (PONTO 1)
  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in zoom-in duration-500">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]">
              <Zap size={40} className="text-[#0a2540]" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Ação Necessária</h2>
            
            <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl mb-8 mt-6 text-left shadow-inner">
               <div className="flex items-center gap-2 mb-2 text-amber-600">
                  <AlertTriangle size={20} strokeWidth={3} />
                  <h3 className="font-black uppercase text-[10px] tracking-widest">Segurança de Cashback</h3>
               </div>
               <p className="text-xs font-bold text-amber-900 leading-relaxed uppercase">
                 Para garantires o teu cashback e a segurança da conta, precisas de instalar a app e ativar as notificações.
               </p>
            </div>

            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg border-2 border-[#0a2540]">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar App
                    </button>
                )}
                <button onClick={async () => { 
                    const ok = await requestNotificationPermission(tempUserId);
                    if(ok) window.location.reload(); // Recarrega para validar e entrar
                }} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[4px_4px_0px_#0a2540]">
                    <Volume2 size={24} /> Ativar Alertas
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[32px] mb-6 shadow-2xl transform -rotate-6">
            <Zap className="text-[#00d66f]" size={40} fill="#00d66f" />
          </div>
          <h1 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none mb-2">
            Vizinho<span className="text-[#00d66f]">Plus</span>
          </h1>
        </div>

        <div className="bg-white rounded-[48px] p-8 shadow-2xl border-4 border-slate-100">
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3">
            <LogIn className="text-[#00d66f]" size={28} /> Entrar
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="teu@email.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t-4 border-dashed border-slate-50 text-center">
            <Link to="/register" className="inline-flex items-center gap-2 text-[#0a2540] font-black uppercase italic hover:text-[#00d66f] transition-colors">
              Criar conta gratuita <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;