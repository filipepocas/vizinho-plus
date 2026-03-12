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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Mantive a tua rota original de redirecionamento para admin
      navigate('/admin');
    } catch (err: any) {
      setError('Credenciais inválidas ou erro de ligação.');
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Marca de Água no Fundo */}
      <img 
        src="/logo-vizinho.png" 
        alt="" 
        className="absolute bottom-[-50px] right-[-50px] w-96 h-96 opacity-10 pointer-events-none grayscale brightness-200"
      />

      <div className="max-w-md w-full bg-white p-8 border-b-8 border-vplus-green shadow-2xl z-10">
        
        {/* Logótipo no Topo do Formulário */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/logo-vizinho.png" 
            alt="Vizinho+ Logo" 
            className="h-16 w-auto"
          />
        </div>

        <h2 className="text-3xl font-black text-vplus-blue mb-2 uppercase tracking-tighter">Login</h2>
        <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Acesso Restrito Vizinho+</p>
        
        {error && <p className="bg-red-100 text-red-600 p-3 mb-6 text-xs font-bold border-l-4 border-red-600">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-vplus-blue outline-none font-bold"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Palavra-passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-vplus-blue outline-none font-bold"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-vplus-blue text-white p-4 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-all"
          >
            Entrar no Sistema
          </button>
        </form>

        {/* Bloco de registo mantido */}
        <div className="mt-6 text-center border-t-2 border-gray-100 pt-6">
          <Link 
            to="/register" 
            className="text-[10px] font-black uppercase text-gray-400 hover:text-vplus-blue transition-all"
          >
            Não tem conta? Registe-se aqui
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;