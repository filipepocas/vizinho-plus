import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Verifique a sua caixa de entrada. Enviamos um link para definir a nova password.');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar email. Verifique se o endereço está correto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md border-2 border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic text-[#0a2540]">RECUPERAR</h1>
          <p className="text-xs font-bold text-[#00d66f] uppercase tracking-widest">Acesso ao Vizinho+</p>
        </div>

        {message && (
          <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-green-100">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">O seu Email de Registo</label>
            <input 
              type="email" 
              required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
              placeholder="exemplo@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-lg pt-4 disabled:opacity-50"
          >
            {loading ? 'A ENVIAR...' : 'ENVIAR LINK DE RECUPERAÇÃO ➔'}
          </button>
        </form>

        <button 
          onClick={() => navigate('/login')}
          className="mt-6 w-full text-center text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-[#0a2540]"
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;