// src/components/ClientCard.tsx
import React from 'react';
import Barcode from 'react-barcode';

interface ClientCardProps {
  name: string;
  cardNumber: string;
  totalBalance: number;
  availableBalance: number;
}

const ClientCard: React.FC<ClientCardProps> = ({ 
  name, 
  cardNumber, 
  totalBalance, 
  availableBalance 
}) => {
  return (
    <div className="w-full max-w-md bg-vplus-blue rounded-3xl p-6 shadow-2xl border-b-8 border-vplus-green text-white relative overflow-hidden">
      {/* Decoração de fundo para parecer um cartão premium */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-vplus-green opacity-10 rounded-full -mr-16 -mt-16"></div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-vplus-green font-black text-xl tracking-tighter">VIZINHO+</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Cartão de Fidelidade</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase opacity-70">Saldo Disponível</p>
          <p className="text-2xl font-black text-vplus-green">{availableBalance.toFixed(2)}€</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs opacity-70 mb-1">Titular</p>
        <p className="text-lg font-bold tracking-wide uppercase">{name}</p>
      </div>

      <div className="bg-white p-4 rounded-xl flex flex-col items-center">
        {/* Gerador de Código de Barras Real */}
        <Barcode 
          value={cardNumber} 
          width={1.5} 
          height={50} 
          displayValue={false}
          background="transparent"
        />
        <p className="text-vplus-blue font-mono mt-2 tracking-[0.5em] font-bold">
          {cardNumber}
        </p>
      </div>

      <div className="mt-6 flex justify-between items-end">
        <div>
          <p className="text-[10px] opacity-70">Saldo em Processamento (48h)</p>
          <p className="text-sm font-bold">{(totalBalance - availableBalance).toFixed(2)}€</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] opacity-70 italic">Vizinho+ Corporate</p>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;