// src/features/auth/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, 
  Zap, Loader2, AlertTriangle, Volume2, CheckCircle2, ShieldAlert
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
  
  // Estados do Wizard de Entrada Unificado
  const [setupStep, setSetupStep] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);

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
        
        // Verifica o estado atual do dispositivo
        const hasNotif = Notification.permission === 'granted';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        // Se for Cliente e faltar configuração, ativa o Wizard Unificado
        if (userData.role === 'client' && (!hasNotif || (!isStandalone && isInstallable))) {
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

  const finalizeLogin = (userData: any) => {
    setCurrentUser(userData);
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'merchant') navigate('/merchant');
    else navigate('/dashboard');
  };

  const handleUnifiedSetup = async () => {
    setLoading(true);
    
    // 1. Tentar Instalação PWA (Se disponível)
    if (isInstallable) {
      await installApp();
    }

    // 2. Tentar Notificações (Sempre tenta, pois o utilizador pode ter a App mas não as notificações)
    await requestNotificationPermission(tempUserId);

    // 3. Verificação Final após interação com os prompts nativos
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const hasNotif = Notification.permission === 'granted';

    if (!hasNotif || (!isStandalone && isInstallable)) {
      // Se o utilizador recusou ou ignorou, mostramos o aviso pedagógico
      setShowWarning(true);
      setLoading(false);
    } else {
      // Sucesso total ou parcial aceitável
      toast.success("Configuração concluída!");
      finalizeLogin(tempUserData);
    }
  };

  // ECRÃ A: AVISO DE VALOR (Caso recuse instalação ou notificações)
  if (showWarning) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-white text-[#0a2540] rounded-[40px] border-4 border-amber-500 shadow-[12px_12px_0px_#f59e0b] p-8 text-center animate-in zoom-in">
            <div className="bg-amber-50 p-6 rounded-3xl mb-6 border-2 border-amber-200">
                <ShieldAlert className="mx-auto text-amber-500 mb-3" size={48} />
                <h2 className="text-xl font-black uppercase text-[#0a2540] mb-2 italic">Atenção!</h2>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest leading-relaxed">
                  Sem a App instalada e as notificações ativas, perderá alertas de cashback em tempo real e o acesso imediato às ofertas exclusivas da sua vizinhança.
                </p>
            </div>
            
            <div className="space-y-4">
                <button 
                  onClick={() => { setShowWarning(false); handleUnifiedSetup(); }}
                  className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-transform"
                >
                    <CheckCircle2 size={24} /> Quero Ativar Agora
                </button>
                
                <button 
                  onClick={() => finalizeLogin(tempUserData)}
                  className="w-full bg-slate-100 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Entrar com experiência limitada
                </button>
            </div>
        </div>
      </div>
    );
  }

  // ECRÃ B: SETUP UNIFICADO (Combo de Entrada)
  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-white text-[#0a2540] rounded-[40px] border-4 border-[#00d66f] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in slide-in-from-bottom-10">
            <div className="mb-8">
                <div className="bg-[#00d66f]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="text-[#00d66f]" size={40} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-black uppercase text-[#0a2540] italic tracking-tighter">Quase lá!</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Vamos configurar o seu acesso VIP
                </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl mb-8 text-left space-y-4 border-2 border-slate-100">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#00d66f] shrink-0" size={18} />
                    <p className="text-[10px] font-black uppercase text-slate-600">Alertas de Saldo em Tempo Real</p>
                </div>
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#00d66f] shrink-0" size={18} />
                    <p className="text-[10px] font-black uppercase text-slate-600">Acesso rápido no ecrã principal</p>
                </div>
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#00d66f] shrink-0" size={18} />
                    <p className="text-[10px] font-black uppercase text-slate-600">Ofertas exclusivas da vizinhança</p>
                </div>
            </div>

            <button 
              onClick={handleUnifiedSetup} 
              disabled={loading}
              className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl border-b-8 border-black/50 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <><Smartphone size={24} /> <Volume2 size={24} /></>}
                Ativar e Entrar
            </button>
            
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-6 tracking-widest">
              Ao clicar, autorize os pedidos do seu navegador
            </p>
        </div>
      </div>
    );
  }

  // ECRÃ C: LOGIN NORMAL
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
            <Link to="/forgot-password" title="Recuperar Password" className="block text-slate-400 font-bold text-[10px] uppercase hover:text-[#0a2540]">
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