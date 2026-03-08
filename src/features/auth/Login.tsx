// src/features/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, currentUser } = useStore();
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
    }
  };

  return (
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
        </div>
      </div>
    </div>
  );
};

export default Login;