import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ScrollText, AlertTriangle } from 'lucide-react';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={() => navigate(-1)}
            className="bg-white p-4 rounded-2xl border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
              Termos & <span className="text-[#00d66f]">Condições</span>
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
              1. Sobre a Plataforma
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
              <p>
                A plataforma Vizinho+ atua exclusivamente como uma solução de software (facilitador tecnológico) de apoio ao comércio local, fornecendo as ferramentas para a gestão de fidelização e atribuição de "cashback" (retorno de saldo).
              </p>
              <p>
                Ao criar conta (como Cliente ou Lojista), o utilizador aceita integralmente estes Termos de Utilização. O saldo gerado nesta plataforma não tem valor fiduciário real (não pode ser trocado por dinheiro físico em conta bancária), servindo unicamente como desconto acumulado a ser utilizado nas lojas parceiras onde foi gerado.
              </p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><AlertTriangle size={18} className="text-[#0a2540]" /></div>
              2. Isenção de Responsabilidade
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <p>
                <b>A Vizinho+ não é parte integrante de qualquer transação comercial.</b> A venda de produtos, prestação de serviços, emissão de faturas e obrigações fiscais são da exclusiva e total responsabilidade dos Lojistas Parceiros.
              </p>
              <ul className="list-disc ml-5 space-y-3 mt-2">
                <li>
                  <b>Gestão de Campanhas:</b> Cada Lojista tem total autonomia para definir e alterar a percentagem de Cashback oferecida. A plataforma não garante nem dita as percentagens praticadas.
                </li>
                <li>
                  <b>Litígios:</b> Qualquer problema relacionado com defeito de produtos, prestação de serviços, ou falha na atribuição de saldo, deverá ser resolvido diretamente entre o Cliente (Vizinho) e o Lojista. A plataforma isenta-se de atuar como mediadora de conflitos de consumo.
                </li>
                <li>
                  <b>Feedback e Comentários:</b> A plataforma permite a avaliação da experiência por parte dos clientes. O teor desses comentários reflete a opinião do cliente e é disponibilizado diretamente ao lojista de forma privada. A plataforma não se responsabiliza pelo teor das avaliações efetuadas.
                </li>
              </ul>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={18} className="text-[#0a2540]" /></div>
              3. Regras e Condutas (Prevenção de Fraude)
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
              <p>
                Para assegurar a justiça e transparência da rede, é expressamente proibido:
              </p>
              <ul className="list-disc ml-5 space-y-2">
                <li>Fornecer o NIF de terceiros no momento da compra.</li>
                <li>Autofaturação ou transações fictícias por parte de Lojistas com o objetivo de adulterar saldos.</li>
                <li>Tentativas de engenharia reversa, manipulação do código ou "hack" dos valores em sistema.</li>
              </ul>
              <p className="font-bold text-red-500">
                O incumprimento destas regras resultará no bloqueio imediato e permanente da conta infratora e anulação total dos saldos em sistema, sem direito a recurso.
              </p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={18} className="text-[#0a2540]" /></div>
              4. Privacidade e RGPD
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
              <p>
                A Vizinho+ recolhe estritamente os dados necessários ao funcionamento (Nome, Email, NIF e Código Postal). Os seus dados não são vendidos ou partilhados com terceiros para fins publicitários.
              </p>
              <p>
                O seu NIF é usado única e exclusivamente para ligação segura às transações (cruzamento com faturação do lojista), e os dados agregados são anonimizados. Tem o direito de eliminar permanentemente a sua conta e histórico através das Definições da App.
              </p>
            </div>
          </section>

          <section className="relative z-10 pt-6">
            <button 
              onClick={() => navigate(-1)}
              className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              Compreendi. Voltar Atrás.
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