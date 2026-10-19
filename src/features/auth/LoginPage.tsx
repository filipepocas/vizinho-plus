import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, 
  Zap, Loader2, AlertTriangle, Volume2, Eye, EyeOff
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
  const [keepLoggedIn, setKeepLoggedIn] = useState<boolean>(() => localStorage.getItem('vplus_keep_logged_in') !== 'false');

  const [savedAccount, setSavedAccount] = useState<{ uid: string; email: string; name: string; role: string; savedPassword?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('vplus_saved_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [directPassword, setDirectPassword] = useState<string>(() => {
    return savedAccount?.savedPassword || '';
  });
  const [showDirectPassword, setShowDirectPassword] = useState(false);
  
  const [setupStep, setSetupStep] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  const { isInstallable, installApp } = usePWAInstall();
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();

  const handleDirectLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      // 1. Limpeza garantida de resquícios de operador
      localStorage.removeItem('vplus_operator_mode');
      sessionStorage.removeItem('vplus_operator_mode');

      // 2. Verificar se auth.currentUser já está ativo e coincide com a conta
      if (auth.currentUser && (!savedAccount || auth.currentUser.email === savedAccount.email)) {
        const uid = auth.currentUser.uid;
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as any;
          finalizeLogin(userData, directPassword || savedAccount?.savedPassword);
          return;
        }
      }

      // 3. Autenticar com a password guardada na sessão ou introduzida no campo
      const effectivePassword = directPassword.trim() || savedAccount?.savedPassword || '';
      const targetEmail = savedAccount?.email?.trim();

      if (!targetEmail) {
        toast.error("Nenhuma conta guardada no dispositivo.");
        setLoading(false);
        return;
      }

      if (!effectivePassword) {
        toast.error("Por favor, introduza a password no campo acima para entrar direto.");
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, effectivePassword);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        finalizeLogin(userData, effectivePassword);
      } else {
        toast.error("Conta não encontrada no sistema.");
        setLoading(false);
      }
    } catch (e: any) {
      console.warn("Direct login fallback:", e);
      const code = e?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error("Password incorreta. Verifique a password no campo.");
      } else {
        toast.error("Erro na autenticação. Verifique a password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgetAccount = () => {
    localStorage.removeItem('vplus_saved_account');
    setSavedAccount(null);
    setDirectPassword('');
  };

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
        finalizeLogin(userData, password);
      } else {
          toast.error("Conta não encontrada no sistema.");
          setLoading(false);
      }
    } catch (error: any) {
        const code = error?.code || '';
        const messages: Record<string, string> = {
          'auth/invalid-email': 'O email introduzido não é válido.',
          'auth/user-disabled': 'Esta conta foi desativada.',
          'auth/user-not-found': 'Nenhuma conta encontrada com este email.',
          'auth/wrong-password': 'Password incorreta.',
          'auth/invalid-credential': 'Email ou password inválidos.',
          'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
          'auth/network-request-failed': 'Erro de rede. Verifique a ligação à internet.'
        };
        toast.error(messages[code] || 'EMAIL OU PASSWORD INCORRETOS.');
        setLoading(false);
    }
  };

  const finalizeLogin = async (userData: any, pwdUsed?: string) => {
    // O modo operador NUNCA deve ficar gravado quando sai ou inicia sessão
    localStorage.removeItem('vplus_operator_mode');
    sessionStorage.removeItem('vplus_operator_mode');

    const effectivePwd = pwdUsed || directPassword || savedAccount?.savedPassword || '';

    if (keepLoggedIn) {
      localStorage.setItem('vplus_keep_logged_in', 'true');
      const accountData = {
        uid: userData.id,
        email: userData.email,
        name: userData.name || userData.shopName || '',
        role: userData.role,
        savedPassword: effectivePwd
      };
      localStorage.setItem('vplus_saved_account', JSON.stringify(accountData));
      setSavedAccount(accountData);
    } else {
      localStorage.setItem('vplus_keep_logged_in', 'false');
      localStorage.removeItem('vplus_saved_account');
      setSavedAccount(null);
    }

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
          
          {/* BOTÃO EM DESTAQUE: LIGAR / ENTRAR DIRETO */}
          {savedAccount && (
            <div className="mb-8 p-6 rounded-[32px] bg-gradient-to-br from-[#0a2540] to-[#13385e] border-4 border-[#00d66f] shadow-[0_12px_24px_rgba(0,214,111,0.2)] text-white text-center space-y-4 animate-in zoom-in">
              <div className="flex items-center justify-center gap-2">
                <span className="p-1.5 bg-[#00d66f] text-[#0a2540] rounded-full inline-flex">
                  <Zap size={16} fill="#0a2540" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00d66f]">
                  Sessão Guardada Neste Equipamento
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-white leading-tight">
                  {savedAccount.name || 'Conta Utilizador'}
                </h3>
                <p className="text-xs font-bold text-slate-300 mt-0.5">{savedAccount.email}</p>
              </div>

              {/* CAMPO DE PASSWORD NO ENTRAR DIRETO */}
              <div className="text-left space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 ml-1 flex items-center justify-between">
                  <span>Password da Conta:</span>
                  {savedAccount.savedPassword ? (
                    <span className="text-[#00d66f] text-[9px] font-bold">✓ Guardada na sessão</span>
                  ) : (
                    <span className="text-amber-300 text-[9px] font-bold">Introduza para entrar direto</span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showDirectPassword ? "text" : "password"}
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDirectLogin();
                      }
                    }}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 bg-white/10 border-2 border-white/20 focus:border-[#00d66f] rounded-2xl text-white placeholder-slate-400 outline-none font-bold text-sm tracking-widest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDirectPassword(!showDirectPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors"
                  >
                    {showDirectPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDirectLogin()}
                disabled={loading}
                className="w-full bg-[#00d66f] text-[#0a2540] py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#00c263] transition-all flex items-center justify-center gap-2 shadow-lg border-b-4 border-black/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="#0a2540" />}
                ⚡ LIGAR / ENTRAR DIRETO
              </button>

              <button
                type="button"
                onClick={handleForgetAccount}
                className="text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-wider underline pt-1 block mx-auto transition-colors"
              >
                Entrar com outra conta
              </button>
            </div>
          )}

          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3">
            <LogIn className="text-[#00d66f]" size={28} /> {savedAccount ? 'Ou Iniciar Sessão' : 'Entrar'}
          </h2>

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

            {/* OPÇÃO COMUTÁVEL: MANTER SESSÃO SEMPRE LIGADA */}
            <label className="flex items-start gap-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#00d66f] rounded cursor-pointer shrink-0"
              />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-[#0a2540] block leading-tight">
                  Manter sessão sempre ligada neste equipamento
                </span>
                <span className="text-[9px] font-bold text-slate-400 block leading-tight">
                  A sessão não fecha mesmo quando desliga o telemóvel.
                </span>
              </div>
            </label>

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