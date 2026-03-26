import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Mail, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      alert("Erro ao enviar email. Verifica se o endereço está correto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12">
        <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540] mb-8 transition-colors">
          <ArrowLeft size={14} /> Voltar ao Login
        </Link>

        <div className="text-center mb-10">
          <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-[#0a2540]">
            <Key size={32} className="text-[#0a2540]" />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Recuperar Acesso</h2>
        </div>

        {sent ? (
          <div className="text-center space-y-6 animate-in zoom-in">
            <div className="bg-green-50 p-6 rounded-3xl border-4 border-green-100 flex flex-col items-center gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-black uppercase text-xs text-green-600">Email Enviado!</p>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">Verifica a tua caixa de entrada e segue as instruções para criar uma nova password.</p>
            </div>
            <Link to="/login" className="block w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest transition-all">Ir para o Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">O teu email registado</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="teu@email.com" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50">
              {loading ? 'A enviar...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;