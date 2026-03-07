// src/features/auth/Login.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { useNavigate, Link } from 'react-router-dom'; // Adicionado o Link aqui

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setCurrentUser } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Lógica de Role (Admin Filipe vs outros)
      const role = user.email === 'rochap.filipe@gmail.com' ? 'admin' : 'merchant';
      
      setCurrentUser({
        id: user.uid,
        email: user.email || '',
        role: role
      });

      if (role === 'admin') navigate('/admin');
      else navigate('/lojista');
      
    } catch (error) {
      alert('Erro no acesso. Verifica as credenciais.');
    }
  };

  return (
    <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono">
      <div className="bg-white p-10 border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
        <h1 className="text-4xl font-black uppercase italic mb-8 border-b-8 border-vplus-blue pb-2">Acesso V+</h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase">E-mail Profissional</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-4 border-black font-black outline-none focus:bg-vplus-blue focus:text-white transition-all"
              placeholder="exemplo@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase">Palavra-Passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border-4 border-black font-black outline-none focus:bg-vplus-blue focus:text-white transition-all"
              placeholder="********"
            />
          </div>

          <button className="w-full bg-black text-white p-5 font-black uppercase text-xl border-b-8 border-gray-600 active:border-b-0 active:translate-y-2 transition-all">
            Entrar no Painel
          </button>
        </form>

        {/* O NOVO LINK ESTÁ AQUI */}
        <div className="mt-8 text-center">
          <Link 
            to="/forgot-password" 
            className="text-[10px] font-black uppercase underline opacity-60 hover:opacity-100 hover:text-vplus-blue transition-opacity"
          >
            Esqueci-me da minha senha
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;