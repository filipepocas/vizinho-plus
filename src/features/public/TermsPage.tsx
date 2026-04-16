import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ScrollText } from 'lucide-react';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-3xl mx-auto">
        
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
              Termos, Condições e Política de Privacidade – Vizinho+
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12 space-y-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <ScrollText size={200} />
          </div>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              1. Natureza da Plataforma
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>Ao registares-te no Vizinho+, aceitas que a plataforma atua exclusivamente como uma solução tecnológica facilitadora de atribuição de saldo (cashback) local. O Vizinho+ é uma ferramenta de mediação técnica, não sendo parte integrante, interveniente ou responsável por qualquer transação comercial direta entre Lojistas e Clientes.</p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              2. Entidade Responsável e Compromisso de Privacidade
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>O Vizinho+ respeita a tua privacidade e compromete-se a protegê-la. Em conformidade com o Regulamento Geral de Proteção de Dados (RGPD), a entidade responsável pelo tratamento dos dados pessoais recolhidos é a Panóplia Lógica Unipessoal Lda, com sede em Rua da Caselha 170, 4620-421 Nevogilde.</p>
              <p>Estabelecemos medidas de segurança técnica e organizacionais rigorosas para garantir que o processamento dos teus dados é realizado de forma segura, prevenindo acessos não autorizados ou o uso indevido da informação.</p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              3. Recolha e Utilização de Dados Pessoais
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>A recolha de dados ocorre de forma voluntária quando utilizas os nossos serviços ou entras em contacto connosco.</p>
              <ul className="list-disc ml-5 space-y-2 mt-2">
                <li><strong className="text-[#0a2540]">Dados Recolhidos:</strong> Nome, Email, NIF e Código Postal.</li>
                <li><strong className="text-[#0a2540]">Finalidade:</strong> Estes dados são recolhidos estritamente para o funcionamento da plataforma. O NIF é solicitado especificamente para validar, processar e cruzar de forma fidedigna as compras efetuadas nas lojas aderentes, garantindo a atribuição correta do saldo.</li>
                <li><strong className="text-[#0a2540]">Consentimento:</strong> Ao submeteres os teus dados, concedes o teu consentimento "prévio, livre e explícito" para o seu tratamento nos fins aqui descritos.</li>
                <li><strong className="text-[#0a2540]">Cookies:</strong> Poderemos utilizar cookies para melhorar a experiência de navegação e funcionalidade do sistema, sendo a sua gestão detalhada na nossa política de navegação.</li>
              </ul>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              4. Partilha de Informação
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>Garantimos que os teus dados pessoais não são partilhados, cedidos ou vendidos a terceiros para fins publicitários ou de marketing externo. A informação circula apenas dentro do ecossistema tecnológico necessário para a prestação do serviço Vizinho+.</p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              5. Natureza do Saldo (Cashback)
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>O saldo de cashback acumulado na tua carteira digital Vizinho+ possui uma natureza exclusivamente promocional e não tem valor fiduciário. Isto significa que o saldo:</p>
              <ul className="list-disc ml-5 space-y-2 mt-2">
                <li>Não pode ser levantado em numerário;</li>
                <li>Não pode ser transferido para contas bancárias;</li>
                <li>Não pode ser trocado por dinheiro vivo;</li>
                <li>Serve unicamente como desconto acumulado para utilização exclusiva na rede de lojas aderentes ao programa.</li>
              </ul>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              6. Proteção de Propriedade Intelectual
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p className="text-red-500">A tecnologia, o sistema de gestão de saldos, a interface gráfica, o design e a ideologia do programa Vizinho+ são propriedade exclusiva da entidade gestora e estão protegidos por direitos de propriedade intelectual. É estritamente proibida a reprodução, cópia, manipulação de código ou engenharia reversa por qualquer entidade ou indivíduo não autorizado.</p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              7. Restrição de Idade
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>Para garantir o cumprimento das normas legais e a segurança dos utilizadores, não serão aceites registos de menores de idade. Ao registares-te, declaras ter idade legal igual ou superior a 18 anos.</p>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tight mb-4 text-[#0a2540]">
              <div className="bg-[#00d66f] p-1.5 rounded-lg"><ShieldCheck size={16} className="text-[#0a2540]" /></div>
              8. Direitos do Utilizador
            </h2>
            <div className="space-y-4 text-sm text-slate-600 font-bold leading-relaxed">
              <p>A qualquer momento, podes exercer os teus direitos de acesso, retificação, oposição ou eliminação dos teus dados pessoais, conforme previsto na lei, através dos canais de contacto oficiais da plataforma.</p>
            </div>
          </section>

          <section className="relative z-10 pt-6 border-t-2 border-slate-100">
            <button 
              onClick={() => navigate(-1)}
              className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl"
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