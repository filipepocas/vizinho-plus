// src/features/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, currentUser } = useStore();
  const navigate = useNavigate();

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.email === 'rochap.filipe@gmail.com') navigate('/admin');
      else if (currentUser.role === 'merchant') navigate('/merchant');
      else if (currentUser.role === 'client') navigate('/client');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const idnt = identifier.toLowerCase().trim();

    try {
      // 1. VERIFICAÇÃO DE ADMIN (FILIPE)
      if (idnt === 'rochap.filipe@gmail.com' && password === 'admin123') {
        setCurrentUser({ 
          id: 'admin_filipe',
          email: idnt, 
          role: 'admin', 
          name: 'Filipe (Admin)' 
        });
        return;
      }

      // 2. VERIFICAÇÃO DE LOJISTAS (Procura por Email ou NIF)
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

      // 3. VERIFICAÇÃO DE CLIENTES (Procura por Email, NIF ou Cartão)
      const cRef = collection(db, 'clients');
      const qC_Email = query(cRef, where('email', '==', idnt));
      const qC_Nif = query(cRef, where('nif', '==', idnt));
      const qC_Card = query(cRef, where('cardNumber', '==', idnt));
      
      const [sC_E, sC_N, sC_C] = await Promise.all([
        getDocs(qC_Email), 
        getDocs(qC_Nif), 
        getDocs(qC_Card)
      ]);
      
      const targetC = !sC_E.empty ? sC_E : (!sC_N.empty ? sC_N : sC_C);

      if (!targetC.empty) {
        const d = targetC.docs[0].data();
        if (d.password === password) {
          setCurrentUser({ id: targetC.docs[0].id, ...d, role: 'client' });
          return;
        }
      }

      setError("Credenciais incorretas. Verifique o identificador e a password.");
    } catch (err) {
      console.error("Erro no Login:", err);
      setError("Erro de ligação ao servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-[#0a2540] to-[#00d66f] rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-900/20">
          <span className="text-white font-black text-4xl italic">V+</span>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-[0_20px_60px_rgba(10,37,64,0.08)] w-full max-w-md border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#0a2540] tracking-tight">Bem-vindo</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Introduza as suas credenciais de acesso</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 ml-1">Utilizador (Email, NIF ou Cartão)</label>
            <input 
              type="text" 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white transition-all text-[#0a2540] font-medium"
              placeholder="Digite aqui..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Palavra-Passe</label>
              <Link to="/forgot-password" className="text-[10px] font-black uppercase text-[#00d66f] hover:underline">
                Esqueci-me ➔
              </Link>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] focus:bg-white transition-all text-[#0a2540] font-medium"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-bold text-lg hover:bg-[#153455] active:scale-[0.98] transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Aceder ao Painel ➔</>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-50 pt-8">
          <p className="text-slate-400 text-xs">
            Novo cliente? <Link to="/client/register" className="text-[#00d66f] font-bold hover:underline">Registe-se na App Cliente</Link>
          </p>
        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] flex flex-col items-center gap-2">
        <span>© 2026 Vizinho+ • Tecnologia para o Comércio Local</span>
        <div className="flex gap-4">
          <Link to="/" className="hover:text-[#0a2540]">Início</Link>
          <span>•</span>
          <button onClick={() => navigate('/admin')} className="hover:text-[#0a2540]">Admin</button>
        </div>
      </footer>
    </div>
  );
};

export default Login;