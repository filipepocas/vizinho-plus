// src/features/public/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-mono text-black selection:bg-vplus-green">
      {/* NAV MOLECULAR */}
      <nav className="border-b-8 border-black p-6 flex justify-between items-center bg-white sticky top-0 z-50">
        <h1 className="text-3xl font-black italic tracking-tighter">VIZINHO<span className="text-vplus-blue">+</span></h1>
        <Link to="/login" className="bg-black text-white px-6 py-2 font-black uppercase hover:bg-vplus-blue transition-colors border-4 border-black shadow-[4px_4px_0px_0px_rgba(163,230,53,1)]">
          Área Lojista
        </Link>
      </nav>

      {/* HERO SECTION - O IMPACTO */}
      <header className="p-8 lg:p-20 border-b-8 border-black bg-vplus-green-light">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-6xl lg:text-9xl font-black uppercase leading-none tracking-tighter mb-8">
            O SEU DINHEIRO <br /> 
            <span className="text-vplus-blue underline decoration-8">FICA NO BAIRRO.</span>
          </h2>
          <p className="text-xl lg:text-2xl font-bold max-w-2xl mb-10 leading-tight">
            Ganhe 10% de cashback em cada compra no comércio local. Sem apps complicadas, sem cartões de plástico. Apenas a sua vizinhança unida.
          </p>
          <div className="flex flex-wrap gap-6">
            <Link to="/cliente" className="bg-vplus-blue text-white p-8 text-2xl font-black uppercase border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              Criar o meu Cartão Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* COMO FUNCIONA - TRIADE BRUTALISTA */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-b-8 border-black">
        <div className="p-12 border-b-8 md:border-b-0 md:border-r-8 border-black hover:bg-vplus-blue hover:text-white transition-colors">
          <span className="text-6xl font-black mb-4 block">01.</span>
          <h3 className="text-2xl font-black uppercase mb-4 italic">Compre Local</h3>
          <p className="font-bold uppercase text-sm">Visite os lojistas aderentes na sua zona. Do talho à mercearia.</p>
        </div>
        <div className="p-12 border-b-8 md:border-b-0 md:border-r-8 border-black bg-black text-white">
          <span className="text-6xl font-black mb-4 block text-vplus-green">02.</span>
          <h3 className="text-2xl font-black uppercase mb-4 italic">Mostre o QR</h3>
          <p className="font-bold uppercase text-sm">O lojista lê o seu código e 10% do valor volta para si em saldo.</p>
        </div>
        <div className="p-12 hover:bg-vplus-green transition-colors">
          <span className="text-6xl font-black mb-4 block">03.</span>
          <h3 className="text-2xl font-black uppercase mb-4 italic">Use no Bairro</h3>
          <p className="font-bold uppercase text-sm">Use o saldo acumulado para pagar compras futuras em qualquer loja da rede.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="p-10 bg-black text-white text-center">
        <p className="font-black uppercase tracking-widest text-xs">
          Vizinho+ &copy; 2026 | Gestão por Filipe Rocha
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;