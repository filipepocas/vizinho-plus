// src/features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  Download,
  ShieldCheck,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginPageProps {
  installPrompt: any;
  onRegister?: () => void; // Adicionado para compatibilidade com App.tsx
  onForgotPassword?: () => void; // Adicionado para compatibilidade com App.tsx
}

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt, onRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();

  // Verificar se devemos mostrar o convite de instalação
  useEffect(() => {
    if (installPrompt) {
      const timer = setTimeout(() => {
        setShowInstallPopup(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [installPrompt]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPopup(false);
      toast.success('Obrigado por instalares a App!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        
        if (userData.status === 'blocked') {
          await auth.signOut();
          toast.error('Esta conta está suspensa. Contacte o suporte.');
          return;
        }

        setCurrentUser(userData);
        
        // Redirecionamento baseado no cargo
        if (userData.role === 'admin') navigate('/admin');
        else if (userData.role === 'merchant') navigate('/merchant');
        else navigate('/dashboard');

        toast.success(`Bem-vindo, ${userData.name}!`);
      } else {
        toast.error('Utilizador não encontrado no sistema.');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Email ou password incorretos.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Demasiadas tentativas. Tente mais tarde.');
      } else {
        toast.error('Erro ao aceder à conta. Verifique os seus dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00d66f]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0a2540]/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[32px] mb-6 shadow-2xl shadow-[#0a2540]/20 transform -rotate-6">
            <Zap className="text-[#00d66f]" size={40} fill="#00d66f" />
          </div>
          <h1 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none mb-2">
            Vizinho<span className="text-[#00d66f]">Plus</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Onde a tua lealdade ganha valor</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-[48px] p-8 md:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-4 border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 z-0" />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3">
              <LogIn className="text-[#00d66f]" size={28} /> Entrar
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">O teu email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-[#0a2540] transition-all placeholder:text-slate-300"
                    placeholder="teu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2 mr-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A tua password</label>
                  <Link 
                    to="/forgot-password" 
                    onClick={(e) => { if(onForgotPassword) { e.preventDefault(); onForgotPassword(); } }}
                    className="text-[10px] font-black uppercase text-[#00d66f] hover:underline"
                  >
                    Esqueceste-te?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00d66f] transition-colors" size={20} />
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-[#0a2540] transition-all placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-[#1a3a5a] transition-all active:scale-[0.98] shadow-xl shadow-[#0a2540]/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Aceder à conta <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t-4 border-dashed border-slate-50 text-center">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4 italic">Ainda não fazes parte?</p>
              <Link 
                to="/register" 
                onClick={(e) => { if(onRegister) { e.preventDefault(); onRegister(); } }}
                className="inline-flex items-center gap-2 text-[#0a2540] font-black uppercase italic hover:text-[#00d66f] transition-colors"
              >
                Criar conta gratuita <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* Badges de Confiança */}
        <div className="mt-8 flex justify-center gap-6 opacity-40">
           <div className="flex flex-col items-center gap-1">
             <ShieldCheck size={20} />
             <span className="text-[8px] font-black uppercase">Seguro</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <CheckCircle2 size={20} />
             <span className="text-[8px] font-black uppercase">Verificado</span>
           </div>
           <div className="flex flex-col items-center gap-1">
             <Smartphone size={20} />
             <span className="text-[8px] font-black uppercase">PWA Ready</span>
           </div>
        </div>
      </div>

      {/* Popup de Instalação PWA */}
      {showInstallPopup && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 bg-[#0a2540] text-white p-6 rounded-[32px] shadow-2xl z-50 animate-in slide-in-from-bottom-10 duration-500 border-4 border-[#00d66f]/20">
          <div className="flex gap-4">
            <div className="bg-[#00d66f] p-3 rounded-2xl shrink-0 h-fit transform -rotate-12">
              <Download className="text-[#0a2540]" size={24} />
            </div>
            <div>
              <h3 className="font-black uppercase italic text-sm mb-1 tracking-tight">Instala o VizinhoPlus</h3>
              <p className="text-[11px] text-slate-300 font-bold leading-relaxed mb-4">
                Adiciona ao teu ecrã principal para um acesso mais rápido e notificações de cashback em tempo real.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleInstall}
                  className="bg-[#00d66f] text-[#0a2540] px-5 py-2 rounded-xl text-[10px] font-black uppercase italic hover:scale-105 transition-transform"
                >
                  Instalar Agora
                </button>
                <button 
                  onClick={() => setShowInstallPopup(false)}
                  className="bg-white/10 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white/20 transition-all"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;