import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore, UserProfile } from '../../store/useStore';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, currentUser, setLoading } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') navigate('/admin');
      else if (currentUser.role === 'merchant') navigate('/merchant');
      else if (currentUser.role === 'client') navigate('/client');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoading(true);
    setError('');
    
    const email = identifier.toLowerCase().trim();

    try {
      // 1. TENTAR AUTENTICAÇÃO NO FIREBASE AUTH
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. BUSCAR PERFIL NA COLEÇÃO 'users'
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile: UserProfile = {
          id: uid,
          ...userData
        } as UserProfile;

        setCurrentUser(profile);
      } else {
        // Caso especial: Se o user existe no Auth mas não no Firestore (ex: Admin de Backup)
        if (email === 'rochap.filipe@gmail.com') {
          const adminProfile: UserProfile = {
            id: uid,
            email: email,
            role: 'admin',
            name: 'Filipe (Admin)'
          };
          setCurrentUser(adminProfile);
        } else {
          setError("Perfil não encontrado no sistema.");
          await auth.signOut();
        }
      }

    } catch (err: any) {
      console.error("Erro no Login:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Credenciais incorretas.");
      } else {
        setError("Erro de ligação ou acesso negado.");
      }
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-8">
        <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-900/10 border-2 border-slate-50 p-4 transform hover:rotate-3 transition-transform">
          <img src="/logo-vizinho.png" alt="Vizinho+" className="w-full h-full object-contain" />
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-[0_20px_60px_rgba(10,37,64,0.08)] w-full max-w-md border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d66f]/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-[#0a2540] tracking-tight uppercase italic">VIZINHO+</h1>
          <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-widest">Painel de Acesso</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email</label>
            <input 
              type="email" 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white transition-all text-[#0a2540] font-black"
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Palavra-Passe</label>
              <Link to="/forgot-password" title="Recuperar acesso" className="text-[10px] font-black uppercase text-[#00d66f] hover:underline">
                Esqueci-me ➔
              </Link>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white transition-all text-[#0a2540] font-black"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black text-lg hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 group"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>ENTRAR <span className="group-hover:translate-x-1 transition-transform">➔</span></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t-2 border-slate-50 pt-8">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            Novo por aqui? <Link to="/client/register" className="text-[#00d66f] hover:underline">Registe-se agora</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;