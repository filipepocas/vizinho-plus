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
}

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();

  // Verificar se devemos mostrar o convite de instalação
  useEffect(() => {
    // Se temos o evento de instalação disponível e não estamos no meio de um processo
    if (installPrompt) {
      const timer = setTimeout(() => {
        setShowInstallPopup(true);
      }, 2000); // Espera 2 segundos para não ser demasiado agressivo logo ao abrir
      return () => clearTimeout(timer);
    }
  }, [installPrompt]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    
    // Esconde o nosso popup
    setShowInstallPopup(false);
    
    // Mostra o prompt nativo do navegador (Chrome, Safari, etc)
    installPrompt.prompt();
    
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success("EXCELENTE ESCOLHA! A INSTALAR...");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCurrentUser({ ...userData, id: userCredential.user.uid } as any);

        // Redirecionar com base no cargo (role)
        if (userData.role === 'admin') navigate('/admin');
        else if (userData.role === 'merchant') navigate('/merchant');
        else navigate('/dashboard');

        toast.success(`BEM-VINDO, ${userData.name.toUpperCase()}!`);
      }
    } catch (error: any) {
      toast.error("ERRO: CREDENCIAIS INVÁLIDAS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* POP-UP DE INSTALAÇÃO (Ponto 2) */}
      {showInstallPopup && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[#0a2540]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setShowInstallPopup(false)}
                className="text-slate-400 hover:text-[#0a2540] font-black"
              >
                FECHAR
              </button>
            </div>

            <div className="w-20 h-20 bg-[#00d66f] border-4 border-[#0a2540] rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-[4px_4px_0px_0px_#0a2540]">
              <Download className="text-[#0a2540]" size={40} />
            </div>

            <h2 className="text-2xl font-black text-[#0a2540] leading-none uppercase mb-4">
              INSTALA A APP <br/><span className="text-[#00d66f]">VIZINHO+</span>
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <div className="mt-1"><Zap size={18} className="text-[#00d66f]" /></div>
                <p className="text-sm font-bold text-slate-600">
                  <span className="text-[#0a2540] uppercase">Comodidade Total:</span> Acede ao teu cashback com um clique, sem precisar de abrir o navegador.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="mt-1"><ShieldCheck size={18} className="text-[#00d66f]" /></div>
                <p className="text-sm font-bold text-slate-600">
                  <span className="text-[#0a2540] uppercase">Importância Elevada:</span> Recebe alertas de promoções e saldo disponível em tempo real, mesmo com o telemóvel bloqueado.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallApp}
              className="w-full bg-[#00d66f] text-[#0a2540] py-5 rounded-2xl font-black uppercase text-lg shadow-[4px_4px_0px_0px_#0a2540] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#0a2540] active:translate-y-[2px] transition-all flex items-center justify-center gap-3"
            >
              <Smartphone size={24} /> Instalar Agora
            </button>
          </div>
        </div>
      )}

      {/* LOGIN FORM */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[48px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8 md:p-12">
          
          <div className="text-center mb-10">
            <div className="inline-block bg-[#00d66f] border-4 border-[#0a2540] p-4 rounded-[24px] mb-4 -rotate-3">
              <LogIn size={32} className="text-[#0a2540]" />
            </div>
            <h1 className="text-4xl font-black text-[#0a2540] uppercase tracking-tighter italic">Entrar</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Bem-vindo à rede Vizinho+</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-3xl py-5 pl-14 pr-6 outline-none transition-all font-bold text-[#0a2540] placeholder:text-slate-300"
                  placeholder="teu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest">Palavra-passe</label>
                <Link to="/forgot-password" size={20} className="text-[10px] font-black uppercase text-[#00d66f] hover:underline">Esqueci-me</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-3xl py-5 pl-14 pr-6 outline-none transition-all font-bold text-[#0a2540] placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a2540] text-white py-6 rounded-3xl font-black uppercase text-lg shadow-[0_8px_0_0_#1e293b] hover:translate-y-[2px] hover:shadow-[0_6px_0_0_#1e293b] active:translate-y-[6px] active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Aceder <ArrowRight size={24} /></>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-slate-400 font-bold text-sm uppercase">Ainda não tens conta?</p>
            <Link 
              to="/register" 
              className="inline-block mt-2 text-[#00d66f] font-black uppercase text-lg hover:scale-105 transition-transform"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;