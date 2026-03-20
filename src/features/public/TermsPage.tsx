import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ScrollText } from 'lucide-react';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={() => navigate('/login')}
            className="bg-white p-4 rounded-2xl border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
              Termos & <span className="text-[#00d66f]">Privacidade</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 italic">
              Última atualização: Março 2026
            </p>
          </div>
        </div>

        {/* CONTEÚDO LEGAL */}
        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12 space-y-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <ScrollText size={200} />
          </div>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={18} className="text-[#0a2540]" /></div>
              1. Termos de Utilização
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
              <p>
                Bem-vindo ao Vizinho+. Ao utilizar esta plataforma, concorda em cumprir os nossos termos. O Vizinho+ é um sistema de fidelização que permite acumular cashback em lojas parceiras.
              </p>
              <p>
                O utilizador compromete-se a fornecer dados verdadeiros (NIF e Email) e a não utilizar a plataforma para fins fraudulentos. O saldo acumulado é de uso exclusivo nas lojas onde foi gerado ou conforme as regras de maturação do sistema.
              </p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={18} className="text-[#0a2540]" /></div>
              2. Proteção de Dados (RGPD)
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
              <p>
                Em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD), informamos que o Vizinho+ recolhe apenas os dados estritamente necessários para o funcionamento do serviço:
              </p>
              <ul className="list-disc ml-5 space-y-2">
                <li><b>NIF:</b> Para identificação única nas transações comerciais.</li>
                <li><b>Email:</b> Para gestão de conta e recuperação de password.</li>
                <li><b>Histórico de Compras:</b> Para cálculo de cashback e estatísticas de negócio.</li>
              </ul>
              <p>
                Os seus dados não são partilhados com entidades terceiras para fins comerciais. Tem o direito de aceder, retificar ou eliminar os seus dados a qualquer momento através das definições de perfil.
              </p>
            </div>
          </section>

          <section className="relative z-10 pt-6">
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              Compreendo e Quero Voltar ao Login
            </button>
          </section>
        </div>

        <footer className="mt-12 text-center text-slate-300 text-[9px] font-black uppercase tracking-widest">
          Vizinho+ &copy; 2026 • Todos os direitos reservados
        </footer>
      </div>
    </div>
  );
};

export default TermsPage;