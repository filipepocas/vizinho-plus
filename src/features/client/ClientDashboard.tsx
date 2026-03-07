// src/features/client/ClientDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';

const ClientDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [cardNumber, setCardNumber] = useState('');

  // Simulação de login por número de cartão (para simplificar o acesso do cliente no bairro)
  const [isLogged, setIsLogged] = useState(false);

  // CÁLCULOS DE SALDO MOLECULARES
  const totalEarned = transactions
    .filter(t => t.clientId === cardNumber && t.type === 'earn')
    .reduce((acc, curr) => acc + curr.cashbackAmount, 0);

  const totalRedeemed = transactions
    .filter(t => t.clientId === cardNumber && t.type === 'redeem')
    .reduce((acc, curr) => acc + curr.cashbackAmount, 0);

  const pendingBalance = transactions
    .filter(t => t.clientId === cardNumber && t.type === 'earn' && t.status === 'pending')
    .reduce((acc, curr) => acc + curr.cashbackAmount, 0);

  const availableBalance = transactions
    .filter(t => t.clientId === cardNumber && t.status === 'available')
    .reduce((acc, curr) => (curr.type === 'earn' ? acc + curr.cashbackAmount : acc - curr.cashbackAmount), 0);

  const clientTransactions = transactions
    .filter(t => t.clientId === cardNumber)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: [85, 55] }); // Tamanho cartão de visita
    doc.setFillColor(28, 48, 92); // VPlus Blue
    doc.rect(0, 0, 55, 85, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("VIZINHO+", 27.5, 10, { align: 'center' });
    doc.setFontSize(6);
    doc.text("O SEU CARTÃO DE BAIRRO", 27.5, 15, { align: 'center' });
    
    // Simulação de QR Code no PDF (Texto por agora)
    doc.setDrawColor(255, 255, 255);
    doc.rect(12.5, 25, 30, 30);
    doc.text(cardNumber, 27.5, 60, { align: 'center' });
    
    doc.save(`Cartao_VPlus_${cardNumber}.pdf`);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0px_0px_rgba(163,230,53,1)] w-full max-w-md text-center">
          <h1 className="text-4xl font-black uppercase italic mb-2">O MEU CARTÃO</h1>
          <p className="text-xs font-bold uppercase mb-8 opacity-60 italic text-vplus-blue">Introduza o número do seu cartão V+</p>
          <input 
            type="text" 
            placeholder="000 000 000" 
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full p-4 border-4 border-black font-black text-2xl text-center outline-none mb-6 focus:bg-vplus-green-light"
          />
          <button 
            onClick={() => cardNumber.length > 3 && setIsLogged(true)}
            className="w-full bg-black text-white p-5 font-black uppercase text-xl border-b-8 border-vplus-blue active:border-b-0 active:translate-y-2 transition-all"
          >
            Aceder ao Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-vplus-blue pb-20">
      {/* HEADER */}
      <header className="bg-white border-b-8 border-black p-6 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h2 className="text-2xl font-black italic">V+ <span className="text-vplus-green">CLIENTE</span></h2>
          <button onClick={() => setIsLogged(false)} className="text-[10px] font-black uppercase underline">Sair</button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        
        {/* CARTÃO VIRTUAL */}
        <section className="bg-vplus-blue text-white p-8 border-8 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white p-4 border-4 border-black mb-4">
              <QRCodeSVG value={cardNumber} size={150} level="H" />
            </div>
            <p className="text-2xl font-black tracking-widest mb-2">{cardNumber}</p>
            <p className="text-[10px] font-bold uppercase opacity-60 italic">Apresente este código no lojista</p>
          </div>
          {/* Decoração Brutalista */}
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-vplus-green rotate-12 opacity-20"></div>
        </section>

        {/* SALDOS */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase opacity-60">Disponível</p>
            <p className="text-3xl font-black text-vplus-green">{availableBalance.toFixed(2)}€</p>
          </div>
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase opacity-60">A Processar</p>
            <p className="text-3xl font-black text-gray-400">{pendingBalance.toFixed(2)}€</p>
          </div>
        </section>

        <button 
          onClick={downloadPDF}
          className="w-full bg-vplus-green text-black p-4 font-black uppercase border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white transition-all"
        >
          Download PDF Cartão 📄
        </button>

        {/* ÚLTIMOS MOVIMENTOS */}
        <section className="space-y-4">
          <h3 className="font-black uppercase italic border-b-4 border-black inline-block">Últimos Movimentos</h3>
          {clientTransactions.length === 0 ? (
            <p className="text-xs font-bold uppercase opacity-40 py-8 text-center">Ainda não tem movimentos nesta rede.</p>
          ) : (
            <div className="space-y-3">
              {clientTransactions.map(t => (
                <div key={t.id} className="bg-white border-4 border-black p-4 flex justify-between items-center shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
                  <div>
                    <p className="text-[10px] font-black opacity-40">{t.createdAt.toLocaleDateString()}</p>
                    <p className="font-black uppercase italic">{t.merchantName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                    </p>
                    <p className="text-[8px] font-bold uppercase opacity-40">{t.status === 'pending' ? 'Pendente' : 'Confirmado'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;