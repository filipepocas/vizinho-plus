// src/components/LoginSelector.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSelector: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado do Cliente (VIZINHO) */}
        <button 
          onClick={() => navigate('/client')}
          className="group bg-white p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all border-2 border-transparent hover:border-[#00d66f] flex flex-col items-center text-center space-y-6"
        >
          <div className="w-20 h-20 bg-[#00d66f]/10 rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
            📱
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0a2540] mb-2 tracking-tighter">Sou Vizinho</h2>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Aceda à sua carteira digital, consulte o seu saldo de cashback e acompanhe os seus movimentos.
            </p>
          </div>
          <span className="text-[#00d66f] font-black text-xs uppercase tracking-widest flex items-center gap-2">
            Ver Meu Saldo ➔
          </span>
        </button>

        {/* Lado do Comerciante (LOJISTA) */}
        <button 
          onClick={() => navigate('/merchant')} // AJUSTE: Vai direto para o terminal de vendas
          className="group bg-[#0a2540] p-10 rounded-[40px] shadow-2xl hover:bg-[#0f2d4a] transition-all flex flex-col items-center text-center space-y-6 border-b-8 border-black"
        >
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
            🏪
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tighter">Sou Comerciante</h2>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Terminal de Lojista. Registe vendas, atribua cashback e faça a gestão dos seus operadores.
            </p>
          </div>
          <span className="text-[#00d66f] font-black text-xs uppercase tracking-widest flex items-center gap-2">
            Abrir Terminal ➔
          </span>
        </button>

        {/* Link Discreto para Admin (Filipe) */}
        <div className="md:col-span-2 text-center pt-8">
          <button 
            onClick={() => navigate('/admin')}
            className="text-slate-300 hover:text-[#0a2540] text-[9px] font-black uppercase tracking-[0.3em] transition-colors p-2"
          >
            — SISTEMA DE GESTÃO CENTRAL (ADMIN) —
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;