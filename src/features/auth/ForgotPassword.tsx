// src/features/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifica a tua caixa de entrada.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro: E-mail não encontrado ou inválido.' });
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono">
      <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
        <h1 className="text-3xl font-black uppercase italic mb-2">Recuperar Acesso</h1>
        <p className="text-[10px] font-bold uppercase mb-6 opacity-60 italic">Introduz o teu e-mail de lojista</p>

        {message.text && (
          <div className={`p-4 mb-6 font-black uppercase text-xs border-4 border-black ${message.type === 'success' ? 'bg-vplus-green text-black' : 'bg-red-500 text-white'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <input 
            type="email" 
            placeholder="O TEU EMAIL" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border-4 border-black font-black outline-none focus:bg-vplus-green-light transition-colors"
          />
          <button className="w-full bg-black text-white p-4 font-black uppercase border-b-8 border-vplus-blue active:border-b-0 active:translate-y-2 transition-all">
            Enviar Link
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-gray-100 flex justify-between items-center">
          <Link to="/login" className="text-[10px] font-black uppercase underline hover:text-vplus-blue">Voltar ao Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;