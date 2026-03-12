// src/features/auth/RegisterPage.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Criar o perfil do cliente no Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name,
        nif: nif,
        email: email.toLowerCase().trim(),
        role: 'client',
        wallet: {
          available: 0,
          pending: 0
        },
        createdAt: new Date().toISOString()
      });

      // 3. Redirecionar para o dashboard do cliente
      navigate('/cliente');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em utilização.');
      } else {
        setError('Erro ao criar conta. Verifique os dados.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Marca de Água no Fundo */}
      <img 
        src="/logo-vizinho.png" 
        alt="" 
        className="absolute bottom-[-50px] right-[-50px] w-96 h-96 opacity-10 pointer-events-none grayscale brightness-200"
      />

      <div className="max-w-md w-full bg-white p-8 border-b-8 border-[#00d66f] shadow-2xl z-10">
        
        {/* Logótipo no Topo */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/logo-vizinho.png" 
            alt="Vizinho+ Logo" 
            className="h-16 w-auto"
          />
        </div>

        <h2 className="text-3xl font-black text-[#0a2540] mb-2 uppercase tracking-tighter">Criar Conta</h2>
        <p className="text-gray-400 text-xs font-bold mb-8 uppercase tracking-widest">Novo Cliente Vizinho+</p>
        
        {error && <p className="bg-red-100 text-red-600 p-3 mb-6 text-xs font-bold border-l-4 border-red-600">{error}</p>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Nome Completo</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#0a2540] outline-none font-bold"
              placeholder="O teu nome"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">NIF</label>
            <input 
              required
              type="text" 
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#0a2540] outline-none font-bold"
              placeholder="123456789"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">E-mail</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#0a2540] outline-none font-bold"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Palavra-passe</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#0a2540] outline-none font-bold"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0a2540] text-white p-4 font-black uppercase hover:bg-[#00d66f] hover:text-[#0a2540] transition-all disabled:opacity-50"
          >
            {isLoading ? 'A Processar...' : 'Finalizar Registo'}
          </button>
        </form>

        <div className="mt-6 text-center border-t-2 border-gray-100 pt-6">
          <Link to="/login" className="text-[10px] font-black uppercase text-gray-400 hover:text-[#0a2540] transition-colors">
            Já tem conta? Faça Login aqui
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;