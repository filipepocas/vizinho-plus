// src/features/auth/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Se já estiver logado, redireciona para o sítio certo automaticamente
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
    
    const identifier = email.toLowerCase().trim();
    console.log("Iniciando processo de autenticação para:", identifier);

    try {
      // 1. PRIORIDADE TOTAL: ADMINISTRADOR (FILIPE)
      if (identifier === 'rochap.filipe@gmail.com' && password === 'admin123') {
        const adminData = { 
          email: identifier, 
          role: 'admin', 
          name: 'Filipe (Admin)',
          lastLogin: new Date().toISOString()
        };
        setCurrentUser(adminData);
        console.log("Admin autenticado. Gravando na memória...");
        setTimeout(() => navigate('/admin'), 200);
        return;
      }

      // 2. PESQUISA EM LOJISTAS (PÁGINA 4 DO PDF)
      const merchantsRef = collection(db, 'merchants');
      const qMerchant = query(merchantsRef, where('email', '==', identifier));
      const merchantSnap = await getDocs(qMerchant);

      if (!merchantSnap.empty) {
        const mData = merchantSnap.docs[0].data();
        if (mData.password === password) {
          if (mData.status === 'inactive') {
            setError("ESTABELECIMENTO SUSPENSO. CONTACTE O ADMIN.");
            setLoading(false);
            return;
          }
          setCurrentUser({ id: merchantSnap.docs[0].id, ...mData, role: 'merchant' });
          setTimeout(() => navigate('/merchant'), 200);
          return;
        }
      }

      // 3. PESQUISA EM CLIENTES (PÁGINAS 2 E 3 DO PDF)
      const clientsRef = collection(db, 'clients');
      // O Cliente pode entrar por Email ou NIF
      const qClientEmail = query(clientsRef, where('email', '==', identifier));
      const qClientNif = query(clientsRef, where('nif', '==', identifier));
      
      const [snapEmail, snapNif] = await Promise.all([
        getDocs(qClientEmail),
        getDocs(qClientNif)
      ]);

      const targetSnap = !snapEmail.empty ? snapEmail : snapNif;

      if (!targetSnap.empty) {
        const cData = targetSnap.docs[0].data();
        if (cData.password === password) {
          setCurrentUser({ id: targetSnap.docs[0].id, ...cData, role: 'client' });
          setTimeout(() => navigate('/client'), 200);
          return;
        }
      }

      setError("IDENTIFICADOR OU PASSWORD INCORRETOS.");
    } catch (err) {
      console.error("Erro Molecular no Login:", err);
      setError("ERRO DE LIGAÇÃO AO SERVIDOR FIREBASE.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-4 lg:p-8 font-mono overflow-hidden">
      {/* BACKGROUND DECORATIVO BRUTALISTA */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vplus-green opacity-20 rotate-12 -z-10 shadow-[20px_20px_0_0_rgba(0,0,0,1)]"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[50%] bg-black opacity-10 -rotate-12 -z-10"></div>

      <div className="bg-white w-full max-w-[450px] border-[10px] border-black shadow-[25px_25px_0_0_rgba(0,0,0,1)] p-8 lg:p-12 relative">
        {/* HEADER DO LOGIN */}
        <div className="text-center mb-10">
          <div className="inline-block bg-black text-white px-4 py-1 text-xs font-black uppercase italic mb-2 tracking-widest">
            V+ Digital Assets
          </div>
          <h1 className="text-6xl font-black uppercase italic leading-none tracking-tighter">
            LOGIN
          </h1>
          <div className="h-2 bg-vplus-green mt-2 w-full border-2 border-black"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* CAMPO IDENTIFICADOR */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic flex justify-between">
              <span>Utilizador (Email ou NIF)</span>
              <span className="text-vplus-blue">Requerido*</span>
            </label>
            <input 
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="ex: rochap.filipe@gmail.com"
              className="w-full p-4 border-4 border-black font-black text-sm outline-none focus:bg-vplus-green-light focus:shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all uppercase"
              disabled={loading}
              required 
            />
          </div>

          {/* CAMPO PASSWORD */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic flex justify-between">
              <span>Chave de Acesso</span>
              <span className="text-vplus-blue">Seguro*</span>
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-4 border-4 border-black font-black text-sm outline-none focus:bg-vplus-green-light focus:shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all"
              disabled={loading}
              required 
            />
          </div>

          {/* MENSAGEM DE ERRO BRUTALISTA */}
          {error && (
            <div className="bg-red-600 text-white p-4 border-4 border-black font-black text-[10px] uppercase animate-bounce italic">
              ⚠ {error}
            </div>
          )}

          {/* BOTÃO DE ENTRADA */}
          <button 
            type="submit"
            disabled={loading}
            className={`w-full p-6 font-black uppercase text-2xl border-b-[12px] border-black shadow-[8px_8px_0_0_rgba(163,230,53,1)] transition-all flex items-center justify-center gap-4
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white hover:translate-y-2 hover:border-b-[4px] active:translate-y-4 active:border-b-0'}
            `}
          >
            {loading ? 'A PROCESSAR...' : 'ENTRAR NO V+'}
          </button>
        </form>

        {/* RODAPÉ DO LOGIN */}
        <div className="mt-12 pt-6 border-t-4 border-black flex justify-between items-center opacity-60">
          <p className="text-[9px] font-black uppercase leading-tight max-w-[180px]">
            Sistema de Gestão de Cashback & Fidelização V+ © 2026
          </p>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-black"></div>
            <div className="w-3 h-3 bg-vplus-green"></div>
            <div className="w-3 h-3 bg-vplus-blue"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;