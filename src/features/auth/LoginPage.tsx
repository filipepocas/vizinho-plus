import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, 
  Zap, Loader2, AlertTriangle, Volume2, Eye, EyeOff,
  Users, Store, UserCheck
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
  const [loginTab, setLoginTab] = useState<'standard' | 'operator'>('standard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState<boolean>(() => localStorage.getItem('vplus_keep_logged_in') !== 'false');

  // Estado para login de Operador de Caixa
  const [opName, setOpName] = useState('');
  const [opPassword, setOpPassword] = useState('');
  const [showOpPassword, setShowOpPassword] = useState(false);
  const [merchantsList, setMerchantsList] = useState<{ id: string; name: string; shopName: string; email: string; operators: any[] }[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(() => {
    return localStorage.getItem('vplus_terminal_merchant_id') || '';
  });
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [storePassword, setStorePassword] = useState('');
  const [showStorePassword, setShowStorePassword] = useState(false);

  const [savedAccount, setSavedAccount] = useState<{ uid: string; email: string; name: string; role: string; savedPassword?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('vplus_saved_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [directPassword, setDirectPassword] = useState<string>(() => {
    return (
      savedAccount?.savedPassword ||
      sessionStorage.getItem('vplus_saved_password') ||
      localStorage.getItem('vplus_saved_password') ||
      ''
    );
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
      const effectivePassword = (
        directPassword ||
        savedAccount?.savedPassword ||
        sessionStorage.getItem('vplus_saved_password') ||
        localStorage.getItem('vplus_saved_password') ||
        ''
      ).trim();
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
    localStorage.removeItem('vplus_saved_password');
    sessionStorage.removeItem('vplus_saved_password');
    setSavedAccount(null);
    setDirectPassword('');
  };

  const fetchMerchants = async () => {
    if (merchantsList.length > 0) return;
    setLoadingMerchants(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'merchant'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d: any) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          shopName: data.shopName || data.name || 'Loja',
          email: data.email || '',
          operators: data.operators || []
        });
      });
      setMerchantsList(list);
      if (!selectedMerchantId && list.length === 1) {
        setSelectedMerchantId(list[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar comerciantes:", err);
    } finally {
      setLoadingMerchants(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = opName.trim();
    const cleanPassword = opPassword.trim();

    if (!cleanName) {
      return toast.error("Introduza o nome do operador.");
    }
    if (!cleanPassword) {
      return toast.error("Introduza a password do operador.");
    }

    setLoading(true);
    try {
      let candidateMerchants = merchantsList;
      if (candidateMerchants.length === 0) {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'merchant')));
        candidateMerchants = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        setMerchantsList(candidateMerchants);
      }

      let targetMerchant: any = null;

      // 1. Se uma loja foi selecionada na lista ou no equipamento
      if (selectedMerchantId) {
        targetMerchant = candidateMerchants.find(m => m.id === selectedMerchantId);
        if (!targetMerchant) {
          const mDoc = await getDoc(doc(db, 'users', selectedMerchantId));
          if (mDoc.exists()) {
            targetMerchant = { id: mDoc.id, ...mDoc.data() };
          }
        }
      }

      // 2. Se nenhuma loja selecionada, tentar correspondência automática
      if (!targetMerchant) {
        const matches = candidateMerchants.filter(m => {
          const ops = m.operators || [];
          return ops.some((o: any) => 
            o.active !== false &&
            o.name.trim().toLowerCase() === cleanName.toLowerCase() &&
            ((o.pin && o.pin.trim() === cleanPassword) || (o.password && o.password.trim() === cleanPassword))
          );
        });

        if (matches.length === 1) {
          targetMerchant = matches[0];
          setSelectedMerchantId(targetMerchant.id);
        } else if (matches.length > 1) {
          toast.error("Existem várias lojas com este operador. Selecione a sua loja na lista.");
          setLoading(false);
          return;
        }
      }

      if (!targetMerchant) {
        toast.error("Selecione a loja correspondente na lista para validar o operador.");
        setLoading(false);
        return;
      }

      // 3. Verificar se o operador existe na loja e se a password confere
      const ops = targetMerchant.operators || [];
      const matchedOp = ops.find((o: any) => 
        o.active !== false &&
        o.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        ((o.pin && o.pin.trim() === cleanPassword) || (o.password && o.password.trim() === cleanPassword))
      );

      if (!matchedOp) {
        toast.error(`Operador ou password incorretos para a loja "${targetMerchant.shopName || targetMerchant.name}".`);
        setLoading(false);
        return;
      }

      // 4. Autenticar sessão da loja no Firebase para permitir transações no terminal
      const savedStorePwd = (
        storePassword.trim() ||
        localStorage.getItem(`vplus_terminal_pwd_${targetMerchant.id}`) ||
        (savedAccount && savedAccount.uid === targetMerchant.id ? savedAccount.savedPassword : '') ||
        localStorage.getItem('vplus_saved_password') ||
        sessionStorage.getItem('vplus_saved_password') ||
        ''
      );

      if (auth.currentUser && auth.currentUser.uid === targetMerchant.id) {
        // Já se encontra autenticado com a loja
      } else if (savedStorePwd && targetMerchant.email) {
        try {
          await signInWithEmailAndPassword(auth, targetMerchant.email, savedStorePwd);
          localStorage.setItem(`vplus_terminal_pwd_${targetMerchant.id}`, savedStorePwd);
        } catch (authErr) {
          console.warn("Could not sign in with stored store password:", authErr);
        }
      } else if (targetMerchant.email) {
        if (!storePassword.trim()) {
          toast.error("Primeiro acesso deste terminal: introduza a password da loja para vincular o equipamento.");
          setLoading(false);
          return;
        }
        try {
          await signInWithEmailAndPassword(auth, targetMerchant.email, storePassword.trim());
          localStorage.setItem(`vplus_terminal_pwd_${targetMerchant.id}`, storePassword.trim());
        } catch {
          toast.error("Password da loja incorreta. Contacte o comerciante.");
          setLoading(false);
          return;
        }
      }

      // 5. Ativar Modo Operador (Apenas na sessão, NUNCA no localStorage)
      localStorage.removeItem('vplus_operator_mode');
      sessionStorage.setItem('vplus_operator_mode', 'true');
      sessionStorage.setItem('vplus_active_operator', JSON.stringify({
        id: matchedOp.id,
        name: matchedOp.name,
        merchantId: targetMerchant.id,
        shopName: targetMerchant.shopName || targetMerchant.name
      }));
      localStorage.setItem('vplus_terminal_merchant_id', targetMerchant.id);

      setCurrentUser(targetMerchant);
      toast.success(`Operador "${matchedOp.name}" autenticado! A abrir terminal...`);
      navigate('/merchant');
    } catch (err: any) {
      console.error("Erro no login de operador:", err);
      toast.error(err?.message || "Erro ao entrar no terminal.");
    } finally {
      setLoading(false);
    }
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
    sessionStorage.removeItem('vplus_active_operator');

    const effectivePwd = pwdUsed || directPassword || savedAccount?.savedPassword || sessionStorage.getItem('vplus_saved_password') || localStorage.getItem('vplus_saved_password') || '';

    if (effectivePwd) {
      sessionStorage.setItem('vplus_saved_password', effectivePwd);
    }

    if (keepLoggedIn) {
      localStorage.setItem('vplus_keep_logged_in', 'true');
      if (effectivePwd) {
        localStorage.setItem('vplus_saved_password', effectivePwd);
      }
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
      localStorage.removeItem('vplus_saved_password');
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
          
          {/* SELETOR DE MODO: CONTA GERAL VS OPERADOR DE CAIXA */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200">
            <button
              type="button"
              onClick={() => setLoginTab('standard')}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                loginTab === 'standard'
                  ? 'bg-[#0a2540] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#0a2540]'
              }`}
            >
              <UserCheck size={16} /> Loja / Cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginTab('operator');
                fetchMerchants();
              }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                loginTab === 'operator'
                  ? 'bg-[#00d66f] text-[#0a2540] shadow-md'
                  : 'text-slate-500 hover:text-[#0a2540]'
              }`}
            >
              <Users size={16} /> Operador de Caixa
            </button>
          </div>

          {loginTab === 'standard' ? (
            <div className="animate-in fade-in">
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
                <Link to="/forgot-password" className="block text-slate-400 font-bold text-[10px] uppercase hover:text-[#0a2540]">
                    Esqueci-me da Password
                </Link>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-4">
                    Não tem conta? <Link to="/" className="text-[#0a2540] underline font-black">Registe-se na página inicial</Link>
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in space-y-6">
              <div>
                <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-2 flex items-center gap-3">
                  <Users className="text-[#00d66f]" size={28} /> Operador de Caixa
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  Entrada direta no Terminal de Caixa com nome de operador e password.
                </p>
              </div>

              <form onSubmit={handleOperatorLogin} className="space-y-5">
                {/* SELEÇÃO OU CONFIRMAÇÃO DA LOJA */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1 flex items-center justify-between">
                    <span>Loja / Estabelecimento:</span>
                    {loadingMerchants && <span className="text-[9px] text-[#00d66f]">A carregar...</span>}
                  </label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <select
                      value={selectedMerchantId}
                      onChange={(e) => setSelectedMerchantId(e.target.value)}
                      className="w-full pl-12 pr-4 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-sm text-[#0a2540]"
                    >
                      <option value="">-- Deteção Automática ou Escolher Loja --</option>
                      {merchantsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.shopName || m.name || m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NOME DO OPERADOR */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                    Nome do Operador:
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                      type="text" 
                      required 
                      value={opName} 
                      onChange={e => setOpName(e.target.value)} 
                      className="w-full pl-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-sm text-[#0a2540]" 
                      placeholder="Ex: João Ferreira ou Caixa 1" 
                    />
                  </div>
                </div>

                {/* PASSWORD / PIN DO OPERADOR */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                    Password / PIN do Operador:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                      type={showOpPassword ? "text" : "password"} 
                      required 
                      value={opPassword} 
                      onChange={e => setOpPassword(e.target.value)} 
                      className="w-full pl-12 pr-12 p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-sm text-[#0a2540]" 
                      placeholder="Password ou PIN de operador" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpPassword(!showOpPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showOpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* PASSWORD DA LOJA (apenas no 1º acesso se não houver credenciais da loja gravadas) */}
                {(!auth.currentUser && !localStorage.getItem(`vplus_terminal_pwd_${selectedMerchantId}`) && !localStorage.getItem('vplus_saved_password') && !savedAccount?.savedPassword) && (
                  <div className="space-y-1.5 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center justify-between">
                      <span>Password da Loja (1º acesso):</span>
                      <span className="text-[9px] text-amber-600">Vinculação do terminal</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" size={16} />
                      <input 
                        type={showStorePassword ? "text" : "password"} 
                        value={storePassword} 
                        onChange={e => setStorePassword(e.target.value)} 
                        className="w-full pl-10 pr-10 py-3 bg-white border-2 border-amber-300 rounded-xl outline-none focus:border-[#0a2540] font-bold text-xs" 
                        placeholder="Password da conta de comerciante" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowStorePassword(!showStorePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600"
                      >
                        {showStorePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[8px] font-bold text-amber-700 leading-tight">
                      Apenas necessária na primeira vez neste equipamento para associar o terminal à loja.
                    </p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-3xl font-black uppercase italic tracking-widest hover:bg-[#00c263] transition-all flex items-center justify-center gap-3 shadow-xl border-b-4 border-black/10 disabled:opacity-50 hover:scale-[1.01] active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Abrir Terminal de Caixa <ArrowRight size={20} /></>}
                </button>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    🛡️ <span className="font-black text-[#0a2540]">Acesso Exclusivo ao Terminal:</span> O operador tem apenas acesso ao terminal de caixa para atribuição e descontos. Todos os restantes menus e dados financeiros da loja estão protegidos.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;