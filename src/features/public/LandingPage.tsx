import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  Heart, 
  Zap, 
  Crown 
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#00d66f] selection:text-[#0a2540]">
      
      {/* 1. NAVEGAÇÃO DISCRETA */}
      <nav className="max-w-7xl mx-auto px-8 py-8 flex justify-start items-center">
        <img src={logoPath} alt="Vizinho+" className="h-10 w-auto object-contain" />
      </nav>

      {/* 2. HERO SECTION */}
      <main className="max-w-6xl mx-auto px-8 pt-12 pb-24 text-center flex flex-col items-center">
        
        {/* LOGOTIPO IMPACTANTE */}
        <div className="mb-12 animate-in fade-in zoom-in duration-1000">
          <img 
            src={logoPath} 
            alt="Vizinho+" 
            className="h-32 md:h-48 w-auto object-contain drop-shadow-2xl" 
          />
        </div>

        {/* SLOGAN COMERCIAL */}
        <div className="space-y-6 max-w-3xl mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-[#0a2540] leading-tight tracking-tighter uppercase italic">
            Valorize o que é nosso. <br />
            <span className="text-[#00d66f]">Ganhe em cada compra.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
            A plataforma de fidelização que une os vizinhos e fortalece a economia local. 
            Acumule cashback real em todas as lojas do seu bairro.
          </p>
        </div>

        {/* BOTÃO DE AÇÃO PRINCIPAL */}
        <button 
          onClick={() => navigate('/login')}
          className="group relative flex items-center gap-4 bg-[#0a2540] text-white px-10 py-6 rounded-[30px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-105 transition-all duration-300 border-b-8 border-black/40 mb-20"
        >
          Entrar ou Registar Agora
          <ArrowRight className="group-hover:translate-x-2 transition-transform" size={20} strokeWidth={3} />
        </button>

        {/* TRUST INDICATORS - 5 COLUNAS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full border-t border-slate-100 pt-16">
          
          {/* 1. SEGURO */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">100% Seguro</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-tight">Dados e saldos protegidos.</p>
          </div>

          {/* 2. LOCAL */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
              <Store size={24} />
            </div>
            <h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">Comércio Local</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-tight">Apoie os seus vizinhos.</p>
          </div>

          {/* 3. GRATUITO - DESTAQUE VERDE */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-[#00d66f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#00d66f]/30">
              <Zap size={24} fill="currentColor" />
            </div>
            <h3 className="font-black text-[#00d66f] uppercase text-[10px] tracking-widest">Adesão Grátis</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-tight">Sem custos para o vizinho.</p>
          </div>

          {/* 4. VANTAGENS - DESTAQUE DOURADO */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-400/30">
              <Crown size={24} fill="currentColor" />
            </div>
            <h3 className="font-black text-amber-600 uppercase text-[10px] tracking-widest">Ofertas VIP</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-tight">Vantagens exclusivas.</p>
          </div>

          {/* 5. CIRCULAR */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-400">
              <Heart size={24} fill="currentColor" />
            </div>
            <h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">Bairro Forte</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-tight">O valor fica no bairro.</p>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-12 text-center text-slate-300">
        <p className="text-[9px] font-black uppercase tracking-[0.4em]">
          Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;