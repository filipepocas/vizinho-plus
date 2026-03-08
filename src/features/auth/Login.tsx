// src/features/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
<<<<<<< HEAD
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
=======
import { useNavigate, Link } from 'react-router-dom';
>>>>>>> df97bfc (a)

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
<<<<<<< HEAD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, currentUser } = useStore();
=======
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useStore();
>>>>>>> df97bfc (a)
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
<<<<<<< HEAD
    setLoading(true);
    setError('');
    const idnt = identifier.toLowerCase().trim();

    try {
      // 1. ADMIN (FILIPE)
      if (idnt === 'rochap.filipe@gmail.com' && password === 'admin123') {
        setCurrentUser({ email: idnt, role: 'admin', name: 'Filipe (Admin)' });
        return;
      }

      // 2. LOJISTAS (NIF, EMAIL OU TELEFONE) - Ref: CheckList pág 4
      const mRef = collection(db, 'merchants');
      const qM_Email = query(mRef, where('email', '==', idnt));
      const qM_Nif = query(mRef, where('nif', '==', idnt));
      const [sM_E, sM_N] = await Promise.all([getDocs(qM_Email), getDocs(qM_Nif)]);
      const targetM = !sM_E.empty ? sM_E : sM_N;

      if (!targetM.empty) {
        const d = targetM.docs[0].data();
        if (d.password === password) {
          setCurrentUser({ id: targetM.docs[0].id, ...d, role: 'merchant' });
          return;
        }
      }

      // 3. CLIENTES (NIF, EMAIL, CARTÃO OU TELEFONE) - Ref: CheckList pág 2
      const cRef = collection(db, 'clients');
      const qC_Email = query(cRef, where('email', '==', idnt));
      const qC_Nif = query(cRef, where('nif', '==', idnt));
      const qC_Card = query(cRef, where('cardNumber', '==', idnt));
      const [sC_E, sC_N, sC_C] = await Promise.all([getDocs(qC_Email), getDocs(qC_Nif), getDocs(qC_Card)]);
      const targetC = !sC_E.empty ? sC_E : (!sC_N.empty ? sC_N : sC_C);

      if (!targetC.empty) {
        const d = targetC.docs[0].data();
        if (d.password === password) {
          setCurrentUser({ id: targetC.docs[0].id, ...d, role: 'client' });
          return;
        }
      }

      setError("IDENTIFICADOR OU PASSWORD INCORRETOS.");
    } catch (err) {
      setError("ERRO DE LIGAÇÃO AO SISTEMA.");
    } finally {
      setLoading(false);
=======
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Lógica de Role definida no Mapa de Trabalho [cite: 309, 280]
      const role = user.email === 'rochap.filipe@gmail.com' ? 'admin' : 'merchant';
      
      setCurrentUser({
        id: user.uid,
        email: user.email || '',
        role: role
      });

      if (role === 'admin') navigate('/admin');
      else navigate('/lojista');
      
    } catch (error) {
      alert('Credenciais inválidas. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
>>>>>>> df97bfc (a)
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono text-black">
      <div className="bg-white border-[10px] border-black shadow-[30px_30px_0_0_rgba(0,0,0,1)] p-12 w-full max-w-[500px] relative overflow-hidden">
        {/* DESIGN BRUTALISTA DA IMAGEM */}
        <div className="absolute top-0 right-0 w-16 h-full bg-vplus-green -mr-8 transform skew-x-12 z-0" />
        
        <div className="relative z-10">
          <h1 className="text-8xl font-black italic uppercase mb-2 leading-none text-center">V+</h1>
          <div className="bg-black text-white text-center py-1 px-4 text-xs font-black uppercase tracking-widest mb-10 mx-auto w-max">
            CASHBACK SYSTEM
          </div>

          <form onSubmit={handleLogin} className="space-y-8 text-left">
            <div className="flex flex-col gap-2">
              <label className="font-black uppercase italic text-[10px] tracking-widest">
                IDENTIFICADOR (EMAIL / NIF / CARTÃO)
              </label>
              <input 
                type="text" 
                value={identifier} 
                onChange={e => setIdentifier(e.target.value)} 
                placeholder="DIGITE AQUI..."
                className="p-5 border-[5px] border-black font-black text-xl outline-none focus:bg-vplus-green-light placeholder:text-gray-300" 
                required 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black uppercase italic text-[10px] tracking-widest">PASSWORD</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="*****"
                className="p-5 border-[5px] border-black font-black text-xl outline-none focus:bg-vplus-green-light placeholder:text-gray-300" 
                required 
              />
            </div>

            {error && (
              <div className="bg-red-600 text-white p-4 border-4 border-black font-black uppercase italic text-xs animate-pulse">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black text-white p-7 font-black text-3xl uppercase border-b-[15px] border-black hover:translate-y-2 hover:border-b-[8px] transition-all active:translate-y-4 active:border-b-0"
            >
              {loading ? 'A PROCESSAR...' : 'ENTRAR NO SISTEMA'}
            </button>
          </form>

          <p className="mt-12 text-[10px] font-black uppercase italic text-gray-400 max-w-[200px] leading-tight">
            SE É UM NOVO CLIENTE, REGISTE-SE DIRETAMENTE NA APP DE CLIENTE.
          </p>
=======
    <div className="min-h-screen bg-[#f6f9fc] flex flex-col items-center justify-center p-6 font-sans">
      
      {/* LOGO OFICIAL VIZINHO+ */}
      <div className="mb-8 transition-transform hover:scale-105 duration-300">
        <img 
          src="/logo-vizinho.png" 
          alt="Vizinho+" 
          className="w-48 h-auto drop-shadow-sm"
          onError={(e) => {
            // Fallback caso a imagem ainda não esteja na pasta public
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<div class="w-20 h-20 bg-gradient-to-br from-[#0a2540] to-[#00d66f] rounded-2xl flex items-center justify-center shadow-lg"><span class="text-white font-black text-3xl">V+</span></div>';
          }}
        />
      </div>

      <div className="bg-white p-10 rounded-[32px] shadow-[0_20px_60px_rgba(10,37,64,0.08)] w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0a2540] tracking-tight">Painel de Gestão</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Introduza as suas credenciais de acesso</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 ml-1">Utilizador (Email/NIF)</label>
            <input 
              type="text" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white focus:ring-4 focus:ring-[#00d66f]/5 transition-all placeholder:text-slate-300 text-[#0a2540]"
              placeholder="exemplo@email.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 ml-1">Palavra-Passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white focus:ring-4 focus:ring-[#00d66f]/5 transition-all placeholder:text-slate-300 text-[#0a2540]"
              placeholder="********"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-bold text-lg hover:bg-[#153455] active:scale-[0.97] transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Entrar agora'
            )}
          </button>
        </form>

        {/* RECUPERAÇÃO AUTÓNOMA [cite: 264, 284] */}
        <div className="mt-8 text-center border-t border-slate-50 pt-6">
          <Link 
            to="/forgot-password" 
            className="text-sm font-semibold text-[#0a2540]/60 hover:text-[#00d66f] transition-colors"
          >
            Esqueceu-se da sua senha?
          </Link>
>>>>>>> df97bfc (a)
        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 Vizinho+ • Tecnologia para o Comércio Local
      </footer>
    </div>
  );
};

export default Login;