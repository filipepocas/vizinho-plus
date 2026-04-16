import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Mail, Key, ArrowLeft, AlertTriangle } from 'lucide-react';

interface ForgotPasswordProps {
  onBack?: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true); // Ativa o Modal de Sucesso
    } catch (err) {
      alert("Erro ao enviar email. Verifica se o endereço está correto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      
      {/* MODAL DE AVISO DE SPAM */}
      {sent ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] border-4 border-[#00d66f] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in text-center p-8">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h3 className="font-black uppercase italic tracking-tighter text-[#0a2540] text-2xl mb-2">E-mail Enviado!</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">
              Foi enviado um link de recuperação para a sua caixa de entrada.
            </p>
            
            <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl mb-8">
               <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-2">⚠️ Atenção à pasta SPAM</p>
               <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
                 O e-mail de recuperação pode ir parar à sua pasta de Lixo Eletrónico (SPAM). Por favor, verifique essa pasta caso não o encontre na caixa principal.
               </p>
            </div>
            
            <Link to="/login" className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform shadow-lg">
              Compreendi, Voltar ao Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12">
          <button 
            onClick={() => onBack ? onBack() : window.history.back()}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-[#0a2540] mb-8 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao Login
          </button>

          <div className="text-center mb-10">
            <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-[#0a2540]">
              <Key size={32} className="text-[#0a2540]" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Recuperar Acesso</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">O teu email registado</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold text-sm" placeholder="teu@email.com" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50">
              {loading ? 'A enviar...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;