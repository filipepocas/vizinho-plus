import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const { currentUser, isInitialized } = useStore();
  const navigate = useNavigate();

  // Redirecionamento Automático via Estado Global
  useEffect(() => {
    if (isInitialized && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isInitialized, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localLoading) return;

    setLocalLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // NÃO navegar aqui. Deixar o useEffect acima tratar disso.
    } catch (err: any) {
      setLocalLoading(false);
      setError('Email ou password incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="bg-[#00d66f] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-[#0a2540] rotate-3">
            <LogIn size={32} className="text-[#0a2540]" />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Vizinho+</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="email" required value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold"
                placeholder="teu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="password" required value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={localLoading}
            className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {localLoading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;