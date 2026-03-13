import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Para feedback de sucesso
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser, isInitialized, resetPassword } = useStore();
  const navigate = useNavigate();

  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  useEffect(() => {
    if (isInitialized && currentUser) {
      if (currentUser.role === 'admin') navigate('/admin');
      else if (currentUser.role === 'merchant') navigate('/merchant');
      else navigate('/client');
    }
  }, [currentUser, isInitialized, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error("Erro ao entrar:", err);
      setError('Credenciais inválidas ou erro de ligação.');
      setIsLoading(false);
    }
  };

  // Função para lidar com a recuperação de password
  const handleForgotPassword = async () => {
    const userEmail = prompt("Introduza o seu e-mail para recuperar a palavra-passe:");
    if (!userEmail) return;

    try {
      setIsLoading(true);
      await resetPassword(userEmail.trim());
      setMessage('E-mail de recuperação enviado! Verifique a sua caixa de entrada.');
      setError('');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C305C] flex items-center justify-center p-4 relative overflow-hidden">
      
      <img 
        src={logoPath} 
        alt="" 
        className="absolute bottom-[-50px] right-[-50px] w-96 h-96 opacity-10 pointer-events-none grayscale brightness-200"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />

      <div className="max-w-md w-full bg-white p-8 border-b-8 border-[#00d66f] shadow-2xl z-10">
        
        <div className="mb-6 flex justify-center">
          <img 
            src={logoPath} 
            alt="Vizinho+" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <h2 className="text-3xl font-black text-[#1C305C] mb-2 uppercase tracking-tighter">Login</h2>
        <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-widest">Acesso Restrito Vizinho+</p>
        
        {error && <p className="bg-red-100 text-red-600 p-3 mb-6 text-xs font-bold border-l-4 border-red-600">{error}</p>}
        {message && <p className="bg-green-100 text-green-600 p-3 mb-6 text-xs font-bold border-l-4 border-[#00d66f]">{message}</p>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">E-mail</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">Palavra-passe</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[9px] font-black uppercase text-gray-400 hover:text-[#00d66f] transition-all"
              >
                Esqueceu-se da palavra-passe?
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1C305C] text-white p-4 font-black uppercase hover:bg-[#00d66f] hover:text-[#1C305C] transition-all disabled:opacity-50"
          >
            {isLoading ? 'A processar...' : 'Entrar no Sistema'}
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