// src/features/public/GuidePage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb } from 'lucide-react';

const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-6 mb-10">
          <button
            onClick={handleGoBack}
            className="bg-white p-4 rounded-2xl border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
          >
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
              🏘️ VIZINHO+ — A PLATAFORMA QUE VALORIZA O QUE É LOCAL
            </h1>
            <p className="text-sm md:text-base font-bold text-slate-500 uppercase tracking-[0.2em] mt-3 italic">
              Tudo o que precisas saber para aproveitar a app, independentemente do teu perfil.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12 space-y-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Lightbulb size={220} />
          </div>

          <section className="relative z-10 space-y-6">
            <p className="text-base md:text-lg text-slate-600 font-bold leading-relaxed">
              Bem-vindo ao Vizinho+, a plataforma de fidelização que fortalece a economia da tua comunidade. Aqui, cada compra gera saldo, cada loja ganha clientes fiéis e cada parceiro alcança milhares de vizinhos prontos a consumir.
            </p>
            <p className="text-base md:text-lg text-slate-600 font-bold leading-relaxed">
              Esta página explica tudo o que podes fazer na plataforma, independentemente do teu perfil. Lê com atenção e descobre como tirar o máximo partido do Vizinho+.
            </p>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-black uppercase tracking-tight text-[#0a2540] mb-4">Escolhe o teu perfil</h2>
              <ul className="space-y-2 text-sm md:text-base text-slate-600 font-bold leading-relaxed list-disc list-inside">
                <li>Cliente (Vizinho)</li>
                <li>Comerciante (Lojista)</li>
                <li>Parceiro (Vantagens VIP)</li>
                <li>Externo (Publicidade sem loja)</li>
                <li>Associação / Entidade (Eventos grátis)</li>
              </ul>
            </div>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">👤 1. CLIENTE (VIZINHO)</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">
              Tu és o coração da plataforma. Como cliente, ganhas saldo sempre que compras numa loja aderente e podes usar esse saldo como desconto em compras futuras. Tudo gratuito, sem taxas, sem esquemas.
            </p>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Como funciona?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Registas-te gratuitamente com nome, email, morada e data de nascimento.</li>
                  <li>Recebes um Cartão Digital com QR Code e número único.</li>
                  <li>Sempre que comprares numa loja aderente, mostra o cartão ANTES de pagar.</li>
                  <li>A loja regista a compra e tu recebes uma % do valor em saldo (cashback).</li>
                  <li>O saldo fica na tua carteira e podes usá-lo na próxima compra, até 50% da fatura.</li>
                  <li>E continuas a ganhar cashback sobre o valor que pagares depois de usar o saldo.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">O que podes fazer na App?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Ver o teu Cartão Digital, Saldo e QR Code.</li>
                  <li>Explorar Produtos no Marketplace local com pesquisa e filtros.</li>
                  <li>Criar Listas de Compras e gerar um Itinerário multi-loja no Google Maps.</li>
                  <li>Consultar Lojas Parceiras com horário em tempo real (Aberto/Fechado).</li>
                  <li>Avaliar as lojas onde compraste com estrelas e comentários.</li>
                  <li>Ver o teu Histórico de transações (cashback ganho e saldo usado).</li>
                  <li>Consultar Eventos locais (cultura, desporto, festas).</li>
                  <li>Aproveitar Ofertas de Desperdício Zero do dia.</li>
                  <li>Aceder a Vantagens VIP com descontos exclusivos.</li>
                  <li>Consultar informações de Câmaras e Juntas de Freguesia (Munícipe).</li>
                  <li>Gerir o teu perfil e notificações.</li>
                </ul>
              </div>
            </div>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">É grátis? Mesmo?</p>
            <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed">Sim. 100% gratuito para clientes. Sempre.</p>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">🏪 2. COMERCIANTE (LOJISTA)</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">
              És dono de um café, mercearia, talho, loja de roupa, cabeleireiro ou qualquer outro negócio local? O Vizinho+ ajuda-te a fidelizar clientes, aumentar o movimento e gerir o teu negócio com dados reais.
            </p>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Como funciona?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Registas a tua loja gratuitamente. O pedido é validado pela administração.</li>
                  <li>Defines a percentagem de cashback que queres oferecer (ex: 5%).</li>
                  <li>Sempre que um cliente apresenta o Cartão Vizinho+, usas o Terminal para registar a compra. O cliente ganha saldo. Tu ganhas um cliente que vai querer voltar.</li>
                  <li>Se o cliente já tiver saldo, pode usá-lo como desconto (até 50% da fatura).</li>
                  <li>Tudo automático, sem papéis, sem complicações.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">O que podes fazer na App?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Usar o Terminal de Vendas (atribuir cashback ou descontar saldo).</li>
                  <li>Publicar produtos no Marketplace local.</li>
                  <li>Pedir Banners, Notificações Push ou Espaços em Folhetos.</li>
                  <li>Publicar ofertas de Desperdício Zero (sobras do dia).</li>
                  <li>Consultar o Histórico de Transações com filtros e totais.</li>
                  <li>Ver o painel de Business Intelligence (ticket médio, frequência, top clientes).</li>
                  <li>Gerir o teu horário de funcionamento (visível para os clientes).</li>
                  <li>Configurar a tua loja (nome, cashback %, contactos, morada).</li>
                  <li>Ler as mensagens da administração.</li>
                </ul>
              </div>
            </div>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">Custo?</p>
            <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed">Preço especial de lançamento: 9€/mês. Sem fidelização. Cancela quando quiseres.</p>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">👑 3. PARCEIRO (VANTAGENS VIP)</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">
              Tens um ginásio, clínica, centro de estética, escola ou outro negócio que quer oferecer benefícios exclusivos aos membros Vizinho+? Torna-te um Parceiro VIP.
            </p>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Como funciona?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Contactas a administração para te tornares Parceiro.</li>
                  <li>Defines a vantagem exclusiva que queres oferecer (ex: 10% desconto, oferta na primeira consulta, avaliação gratuita).</li>
                  <li>A tua vantagem aparece na página Vantagens VIP, visível para todos os clientes da plataforma.</li>
                  <li>Podes segmentar a tua oferta por Distrito, Concelho ou Freguesia.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">O que ganhas com isso?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Visibilidade para milhares de vizinhos fidelizados.</li>
                  <li>Aumento de tráfego na tua porta.</li>
                  <li>Associação da tua marca à economia local e à comunidade.</li>
                  <li>Presença digital 24/7 sem custos de anúncios.</li>
                  <li>Zero burocracia: a plataforma trata da tecnologia.</li>
                </ul>
              </div>
            </div>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">Custo?</p>
            <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed">Sem custos fixos de adesão. Relação flexível, caso a caso, diretamente com a administração.</p>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">📢 4. EXTERNO (PUBLICIDADE SEM LOJA FÍSICA)</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">
              Não tens uma loja física mas queres promover os teus serviços ou produtos à comunidade Vizinho+? Podes fazê-lo como Anunciante Externo.
            </p>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Como funciona?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Acedes à plataforma e preenches os dados da tua empresa (nome, NIF, contacto).</li>
                  <li>Escolhes o tipo de anúncio que queres fazer: Banner na App dos clientes ou Anúncio nos Folhetos Digitais do Vizinho+.</li>
                  <li>Defines as zonas onde queres aparecer (Distrito, Concelho, Freguesia).</li>
                  <li>A plataforma calcula o alcance e o orçamento automaticamente.</li>
                  <li>O pedido é enviado para aprovação da administração.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">O que podes anunciar?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Serviços profissionais (advogados, contabilidade, consultoria).</li>
                  <li>Produtos de marcas que não têm loja física na zona.</li>
                  <li>Cursos, workshops, formações.</li>
                  <li>Serviços ao domicílio (reparações, limpezas, jardinagem).</li>
                </ul>
              </div>
            </div>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">Custo?</p>
            <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed">Preço por campanha, baseado no alcance estimado. Sem custos fixos. Orçamento transparente antes de confirmares.</p>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">🎉 5. ASSOCIAÇÃO / ENTIDADE (EVENTOS GRÁTIS)</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">
              És uma associação cultural, clube desportivo, junta de freguesia, comissão de festas ou qualquer entidade que organiza eventos para a comunidade? O Vizinho+ oferece-te uma montra gratuita para divulgares os teus eventos.
            </p>

            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Como funciona?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Acedes à plataforma e escolhes "Comunicar Evento Grátis".</li>
                  <li>Preenches os dados do evento: Nome da entidade e responsável, Contactos, Título, descrição, local, tipo de evento, Datas de início e fim, hora de início, Preço dos bilhetes (ou "Grátis"), Cartaz / Imagem do evento, Zonas onde o evento será divulgado.</li>
                  <li>O pedido é enviado para aprovação da administração.</li>
                  <li>Após aprovação, o teu evento aparece na secção "Eventos" da App de todos os clientes nas zonas selecionadas.</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#0a2540] mb-4">Que tipo de eventos podes divulgar?</h3>
                <ul className="space-y-3 text-sm text-slate-600 font-bold leading-relaxed list-disc list-inside">
                  <li>Festas populares e arraiais.</li>
                  <li>Torneios desportivos e caminhadas.</li>
                  <li>Espetáculos de teatro, música e dança.</li>
                  <li>Feiras, mercados e mostras.</li>
                  <li>Workshops e palestras comunitárias.</li>
                  <li>Iniciativas de solidariedade e voluntariado.</li>
                </ul>
              </div>
            </div>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">Custo?</p>
            <p className="text-sm md:text-base text-slate-600 font-bold leading-relaxed">Totalmente gratuito. O Vizinho+ apoia a divulgação de eventos comunitários sem qualquer custo para as entidades organizadoras.</p>
          </section>

          <section className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">❓ PERGUNTAS FREQUENTES</h2>

            <div className="space-y-6 text-sm md:text-base text-slate-600 font-bold leading-relaxed">
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">O Vizinho+ é seguro?</h3>
                <p>Sim. Todos os dados pessoais são tratados de acordo com o RGPD (Regulamento Geral de Proteção de Dados). Não partilhamos informação com terceiros para fins comerciais. Responsável: Panóplia Lógica Unipessoal Lda.</p>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">Preciso de instalar alguma coisa?</h3>
                <p>Não. A plataforma funciona no browser do telemóvel ou computador. Podes opcionalmente instalar a App no ecrã principal (PWA) para acesso rápido.</p>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">Posso cancelar a qualquer momento?</h3>
                <p>Sim. Clientes, Comerciantes e Parceiros podem cancelar a qualquer momento, sem penalizações, diretamente nas definições de perfil ou contactando o suporte.</p>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">Como contacto o apoio?</h3>
                <p>Email: geral@vizinhomais.pt Disponível no rodapé de todas as páginas da plataforma.</p>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">O saldo de cashback tem validade?</h3>
                <p>Não. O saldo acumulado não tem prazo de validade. Fica na tua carteira até decidires usá-lo.</p>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-[#0a2540] mb-2">Posso levantar o saldo em dinheiro?</h3>
                <p>Não. O saldo de cashback tem natureza exclusivamente promocional. Serve apenas como desconto em compras na rede de lojas aderentes. Não é convertível em numerário, não pode ser transferido para contas bancárias nem trocado por dinheiro.</p>
              </div>
            </div>
          </section>

          <section className="relative z-10 pt-6 border-t-2 border-slate-100">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2540] mb-4">🚀 PRONTO PARA COMEÇAR?</h2>
            <p className="text-base text-slate-600 font-bold leading-relaxed mb-4">Escolhe o teu perfil e junta-te à comunidade Vizinho+:</p>
            <ul className="space-y-3 text-sm md:text-base text-slate-600 font-bold leading-relaxed list-disc list-inside">
              <li>Cliente: Regista-te gratuitamente e começa a ganhar saldo.</li>
              <li>Comerciante: Adere à rede e fideliza os teus clientes.</li>
              <li>Parceiro: Contacta-nos para oferecer vantagens exclusivas.</li>
              <li>Externo: Promove os teus serviços à comunidade.</li>
              <li>Associação: Divulga os teus eventos gratuitamente.</li>
            </ul>
            <p className="text-base text-[#0a2540] font-black uppercase tracking-widest mt-6">A economia local começa aqui. E tu fazes parte dela.</p>
          </section>

          <section className="relative z-10 pt-6 border-t-2 border-slate-100">
            <button
              onClick={handleGoBack}
              className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              Voltar ao Landing page
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

export default GuidePage;
