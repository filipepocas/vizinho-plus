import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
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
    const idnt = email.toLowerCase().trim();

    try {
      // 1. ADMIN (FILIPE)
      if (idnt === 'rochap.filipe@gmail.com' && password === 'admin123') {
        setCurrentUser({ email: idnt, role: 'admin', name: 'Filipe (Admin)' });
        return;
      }

      // 2. LOJISTAS
      const mRef = collection(db, 'merchants');
      const qM = query(mRef, where('email', '==', idnt));
      const sM = await getDocs(qM);
      if (!sM.empty) {
        const d = sM.docs[0].data();
        if (d.password === password) {
          setCurrentUser({ id: sM.docs[0].id, ...d, role: 'merchant' });
          return;
        }
      }

      // 3. CLIENTES (EMAIL, NIF OU CARTÃO)
      const cRef = collection(db, 'clients');
      const qE = query(cRef, where('email', '==', idnt));
      const qN = query(cRef, where('nif', '==', idnt));
      const qC = query(cRef, where('cardNumber', '==', idnt));
      const [sE, sN, sC] = await Promise.all([getDocs(qE), getDocs(qN), getDocs(qC)]);
      const target = !sE.empty ? sE : (!sN.empty ? sN : sC);

      if (!target.empty) {
        const d = target.docs[0].data();
        if (d.password === password) {
          setCurrentUser({ id: target.docs[0].id, ...d, role: 'client' });
          return;
        }
      }

      setError("DADOS INCORRETOS.");
    } catch (err) {
      setError("ERRO DE LIGAÇÃO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono text-black">
      <div className="bg-white border-[10px] border-black shadow-[25px_25px_0_0_rgba(0,0,0,1)] p-12 w-full max-w-[500px]">
        <h1 className="text-7xl font-black italic uppercase mb-8 border-b-8 border-black pb-2 leading-none">V+ LOGIN</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col gap-2 text-left">
            <label className="font-black uppercase italic text-xs">Identificador</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="p-4 border-4 border-black font-black text-xl outline-none focus:bg-vplus-green-light" required />
          </div>
          <div className="flex flex-col gap-2 text-left">
            <label className="font-black uppercase italic text-xs">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="p-4 border-4 border-black font-black text-xl outline-none focus:bg-vplus-green-light" required />
          </div>
          {error && <div className="bg-red-600 text-white p-3 border-4 border-black font-black uppercase text-xs italic">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-black text-white p-6 font-black text-3xl uppercase border-b-[12px] border-black hover:translate-y-2 hover:border-b-[6px] transition-all">
            {loading ? '...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;