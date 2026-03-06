// src/features/client/ClientDashboard.tsx
import React, { useRef } from 'react';
import ClientCard from '../../components/ClientCard';
import { useStore } from '../../store/useStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ClientDashboard: React.FC = () => {
  const { transactions } = useStore();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const clientData = {
    id: "5601234567",
    name: "Filipe Rocha"
  };

  const myTransactions = transactions.filter(t => t.clientId === clientData.id);
  const totalBalance = myTransactions.reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);
  
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const availableBalance = myTransactions
    .filter(t => new Date(t.createdAt) <= fortyEightHoursAgo)
    .reduce((acc, t) => acc + (t.type === 'earn' ? t.cashbackAmount : -t.cashbackAmount), 0);

  // FUNÇÃO MÁGICA PARA GERAR O PDF
  const downloadCard = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85, 55] // Tamanho Cartão de Crédito
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 85, 55);
      pdf.save(`cartao-vizinho-plus-${clientData.id}.pdf`);
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue-light p-4 md:p-8 flex flex-col items-center font-mono">
      <div className="w-full max-w-md">
        
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black text-vplus-blue italic tracking-tighter">VIZINHO+</h1>
          <button 
            onClick={downloadCard}
            className="bg-vplus-blue text-white text-[10px] px-3 py-2 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-all border-b-4 border-black active:border-b-0"
          >
            PDF Cartão
          </button>
        </header>

        {/* ÁREA CAPTURADA PELO PDF (cardRef) */}
        <div ref={cardRef} className="rounded-xl overflow-hidden shadow-2xl">
          <ClientCard 
            name={clientData.name}
            cardNumber={clientData.id}
            totalBalance={totalBalance}
            availableBalance={availableBalance}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-xs font-black uppercase text-vplus-blue mb-4 border-b-2 border-vplus-blue pb-1">Movimentos Cloud</h3>
          <div className="space-y-3">
            {myTransactions.map((t) => (
              <div key={t.id} className="bg-white p-4 border-l-8 border-vplus-green shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  <p className="font-bold text-vplus-blue uppercase truncate w-32">{t.merchantName || "Loja Parceira"}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-500'}`}>
                    {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientDashboard;