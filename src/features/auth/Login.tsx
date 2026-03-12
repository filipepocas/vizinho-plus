import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useStore, UserProfile } from '../../store/useStore';
import { LogIn, ShieldCheck, Mail, Lock, Info } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useStore(); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Perfil não encontrado na base de dados.');
      }

      const userData = { id: fbUser.uid, ...userDoc.data() } as UserProfile;
      setCurrentUser(userData);

      if (userData.role === 'admin') navigate('/admin');
      else if (userData.role === 'merchant') navigate('/merchant');
      else navigate('/client');

    } catch (err: any) {
      console.error("ERRO LOGIN:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou password incorretos.');
      } else {
        setError(err.message || 'Erro ao entrar no sistema.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('POR FAVOR, INTRODUZ O TEU EMAIL NO CAMPO ACIMA PRIMEIRO.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log("INICIANDO PROCESSO DE RECUPERAÇÃO PARA:", email);
      await sendPasswordResetEmail(auth, email);
      console.log("FIREBASE: PEDIDO DE E-MAIL ACEITE COM SUCESSO.");
      setMessage('E-MAIL DE RECUPERAÇÃO ENVIADO! VERIFICA A TUA CAIXA DE ENTRADA E SPAM.');
    } catch (err: any) {
      console.error("ERRO TÉCNICO FIREBASE NA RECUPERAÇÃO:", {
        code: err.code,
        message: err.message,
        fullError: err
      });
      setError(`ERRO: ${err.code === 'auth/user-not-found' ? 'UTILIZADOR NÃO ENCONTRADO.' : 'FALHA NO ENVIO. TENTA MAIS TARDE.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[44px] shadow-2xl w-full max-w-md border-2 border-slate-50 relative overflow-hidden">
        
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00d66f]/5 rounded-full blur-3xl" />

        <div className="text-center mb-10 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[28px] mb-6 shadow-2xl transform -rotate-3">
            <ShieldCheck className="text-[#00d66f]" size={40} />
          </div>
          <h1 className="text-4xl font-black italic text-[#0a2540] tracking-tighter">VIZINHO+</h1>
          <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.3em] mt-2">Plataforma de Fidelização</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl text-[11px] font-black mb-8 flex items-center gap-3">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            {error.toUpperCase()}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border-2 border-green-100 text-green-600 p-4 rounded-2xl text-[11px] font-black mb-8 flex items-center gap-3">
            <Info size={16} />
            {message.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
              <Mail size={12} /> Email
            </label>
            <input 
              type="email" 
              required
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[22px] outline-none focus:border-[#00d66f] transition-all font-bold text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Lock size={12} /> Password
              </label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[9px] font-black text-[#00d66f] uppercase tracking-tighter hover:underline transition-opacity active:opacity-50"
              >
                Esqueci-me da password
              </button>
            </div>
            <input 
              type="password" 
              required
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[22px] outline-none focus:border-[#00d66f] transition-all font-bold text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a2540] text-white p-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? 'A AUTENTICAR...' : <>ENTRAR NO PAINEL <LogIn size={18} /></>}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t-2 border-slate-50 text-center">
          <button 
            onClick={() => navigate('/register')} 
            className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter hover:text-[#00d66f]"
          >
            Não tens conta? <span className="text-[#00d66f] font-black underline">REGISTA-TE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;