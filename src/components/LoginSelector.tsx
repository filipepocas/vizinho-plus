// src/components/LoginSelector.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSelector: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado do Cliente */}
        <button 
          onClick={() => navigate('/client')}
          className="group bg-white p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col items-center text-center space-y-6"
        >
          <div className="w-20 h-20 bg-[#00d66f]/10 rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
            📱
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0a2540] mb-2">Sou Vizinho</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Aceda à sua carteira digital, consulte o seu saldo de cashback e apresente o seu QR Code nas lojas.
            </p>
          </div>
          <span className="text-[#00d66f] font-bold text-sm uppercase tracking-widest group-hover:gap-4 flex items-center gap-2">
            Entrar na Carteira ➔
          </span>
        </button>

        {/* Lado do Comerciante */}
        <button 
          onClick={() => navigate('/login')}
          className="group bg-[#0a2540] p-10 rounded-[40px] shadow-2xl hover:bg-[#0f2d4a] transition-all flex flex-col items-center text-center space-y-6"
        >
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
            🏪
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Sou Comerciante</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Área de gestão para lojistas. Registe vendas, atribua cashback e faça a gestão dos seus operadores.
            </p>
          </div>
          <span className="text-[#00d66f] font-bold text-sm uppercase tracking-widest group-hover:gap-4 flex items-center gap-2">
            Painel de Gestão ➔
          </span>
        </button>

        {/* Link Discreto para Admin (Filipe) */}
        <div className="md:col-span-2 text-center pt-4">
          <button 
            onClick={() => navigate('/admin')}
            className="text-slate-300 hover:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
          >
            Acesso Restrito ao Administrador do Sistema
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;