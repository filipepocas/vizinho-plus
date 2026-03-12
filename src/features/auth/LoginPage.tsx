// src/features/auth/LoginPage.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Caminho dinâmico para garantir que o logo carrega em qualquer sub-rota
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      setError('Credenciais inválidas ou erro de ligação.');
    }
  };

  return (
    <div className="min-h-screen bg-[#1C305C] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Marca de Água no Fundo */}
      <img 
        src={logoPath} 
        alt="" 
        className="absolute bottom-[-50px] right-[-50px] w-96 h-96 opacity-10 pointer-events-none grayscale brightness-200"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />

      <div className="max-w-md w-full bg-white p-8 border-b-8 border-[#00d66f] shadow-2xl z-10">
        
        {/* Logótipo no Topo do Formulário */}
        <div className="mb-6 flex justify-center">
          <img 
            src={logoPath} 
            alt="Vizinho+" 
            className="h-16 w-auto object-contain"
            onError={() => console.error("Logo não encontrado em: " + logoPath)}
          />
        </div>

        <h2 className="text-3xl font-black text-[#1C305C] mb-2 uppercase tracking-tighter">Login</h2>
        <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-widest">Acesso Restrito Vizinho+</p>
        
        {error && <p className="bg-red-100 text-red-600 p-3 mb-6 text-xs font-bold border-l-4 border-red-600">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">Palavra-passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#1C305C] text-white p-4 font-black uppercase hover:bg-[#00d66f] hover:text-[#1C305C] transition-all"
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-8 text-center border-t-2 border-gray-100 pt-6">
          <Link 
            to="/register" 
            className="inline-block text-[11px] font-black uppercase text-[#1C305C] hover:text-[#00d66f] transition-all underline underline-offset-4 decoration-2"
          >
            Não tem conta? Registe-se aqui
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;