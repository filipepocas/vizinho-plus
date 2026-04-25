// src/features/auth/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, 
  Zap, Loader2, AlertTriangle, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission } from '../../utils/notifications';

interface LoginPageProps {
  installPrompt: any;
  onRegister?: () => void;
  onForgotPassword?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [setupStep, setSetupStep] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

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
        
        // Verifica se é necessário forçar o setup de notificações/PWA
        const hasNotif = Notification.permission === 'granted';
        const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        if (!hasNotif || (!isApp && isInstallable)) {
          setTempUserId(uid);
          setTempUserData(userData);
          setSetupStep(true);
          setLoading(false);
          return;
        }
        finalizeLogin(userData);
      } else {
          toast.error("Conta não encontrada no sistema.");
          setLoading(false);
      }
    } catch (error) { 
        toast.error('EMAIL OU PASSWORD INCORRETOS.'); 
        setLoading(false); 
    }
  };

  const finalizeLogin = async (userData: any) => {
    setCurrentUser(userData);
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'merchant') navigate('/merchant');
    else navigate('/dashboard');
  };

  const handleEnableNotifications = async () => {
    setDiagError(null);
    setLoading(true);
    try {
      const res = await requestNotificationPermission(tempUserId);
      if (res.success) {
        toast.success("Notificações Ativas!");
        
        const updatedDoc = await getDoc(doc(db, 'users', tempUserId));
        if (updatedDoc.exists()) {
          const updatedData = { id: updatedDoc.id, ...updatedDoc.data() } as any;
          setTimeout(() => finalizeLogin(updatedData), 1000);
        } else {
          setTimeout(() => finalizeLogin(tempUserData), 1000);
        }
      } else { 
        setDiagError(res.error || "Erro ao ativar notificações."); 
        setLoading(false);
      }
    } catch (err) {
      setDiagError("Ocorreu um erro de comunicação com o servidor.");
      setLoading(false);
    }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-white text-[#0a2540] rounded-[40px] border-4 border-[#00d66f] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in slide-in-from-bottom-10">
            <div className="bg-amber-50 p-6 rounded-3xl mb-6 border-2 border-amber-200">
                <AlertTriangle className="mx-auto text-amber-500 mb-3" size={40} />
                <h2 className="text-xl font-black uppercase text-[#0a2540] mb-2 italic">Atenção!</h2>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest leading-relaxed">
                  Para sua comodidade e não perder alertas de saldo, ative as notificações antes de entrar.
                </p>
            </div>
            {diagError && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-6 flex gap-3 text-left">
                  <AlertTriangle className="text-red-500 shrink-0" size={20} />
                  <p className="text-[9px] font-bold text-red-700 leading-tight uppercase">{diagError}</p>
              </div>
            )}
            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-[#00d66f] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg border-b-4 border-black/50 hover:scale-105 transition-transform">
                        <Smartphone size={24} /> Instalar Aplicação
                    </button>
                )}
                {Notification.permission !== 'granted' && (
                  <button 
                    onClick={handleEnableNotifications} 
                    disabled={loading}
                    className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[4px_4px_0px_#0a2540] hover:scale-105 transition-transform disabled:opacity-50"
                  >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : <Volume2 size={24} />} 
                      Permitir Notificações
                  </button>
                )}
            </div>
            <button onClick={() => finalizeLogin(tempUserData)} className="w-full bg-slate-100 text-slate-500 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
              Entrar no meu Perfil <ArrowRight size={16} />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00d66f]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0a2540]/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <Link to="/">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[32px] mb-6 shadow-2xl transform -rotate-6">
                <Zap className="text-[#00d66f]" size={40} fill="#00d66f" />
            </div>
          </Link>
          <h1 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none mb-2">Vizinho<span className="text-[#00d66f]">Plus</span></h1>
        </div>

        <div className="bg-white rounded-[48px] p-8 md:p-10 shadow-2xl border-4 border-slate-100 relative overflow-hidden">
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3"><LogIn className="text-[#00d66f]" size={28} /> Entrar</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                    className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" 
                    placeholder="teu@email.com" 
                />
            </div>
            <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)} 
                    className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" 
                    placeholder="••••••••" 
                />
            </div>
            <button 
                type="submit" disabled={loading} 
                className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>Aceder à conta <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-50 space-y-4 text-center">
            {/* CORREÇÃO: Removido o size={14} que estava a causar o erro */}
            <Link to="/forgot-password" className="block text-slate-400 font-bold text-[10px] uppercase hover:text-[#0a2540]">
                Esqueci-me da Password
            </Link>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-4">
                Não tem conta? <Link to="/" className="text-[#0a2540] underline font-black">Registe-se na página inicial</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;