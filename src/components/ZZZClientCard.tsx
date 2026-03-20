import React from 'react';
import Barcode from 'react-barcode';

interface ClientCardProps {
  name: string;
  cardNumber: string;
  totalBalance: number;
  availableBalance: number;
}

// URL Estável do Firebase Storage para garantir a exibição do logo
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/vizinho-plus.appspot.com/o/assets%2Flogo-v-plus.png?alt=media";

const ClientCard: React.FC<ClientCardProps> = ({ 
  name, 
  cardNumber, 
  totalBalance, 
  availableBalance 
}) => {
  
  // Efeito de relevo (Embossing) para simular gravação física no plástico
  const embossStyle: React.CSSProperties = {
    textShadow: '2px 2px 2px rgba(0,0,0,0.8), -1px -1px 1px rgba(255,255,255,0.3)',
    color: '#e2e8f0',
    letterSpacing: '0.15em',
    fontFamily: 'monospace'
  };

  return (
    <div className="w-full max-w-md bg-[#0f172a] rounded-[20px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-white/5 relative overflow-hidden aspect-[1.586/1] flex flex-col group">
      
      {/* 1. CABEÇALHO (Verde Esmeralda Metálico VIP) */}
      <div className="h-1/3 w-full bg-gradient-to-r from-[#064e3b] via-[#059669] to-[#064e3b] p-6 flex justify-between items-start relative border-b border-black/20">
        {/* Reflexo metálico no cabeçalho */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-1">
          <img 
            src={LOGO_URL} 
            alt="Vizinho+" 
            className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" 
          />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">
            VIP MEMBER
          </span>
        </div>

        {/* Chip de Ouro Realista */}
        <div className="w-12 h-10 bg-gradient-to-br from-[#ffd700] via-[#fbbf24] to-[#d97706] rounded-lg relative overflow-hidden border border-black/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] z-10">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-40">
            <div className="border-r border-b border-black/30"></div>
            <div className="border-b border-black/30"></div>
            <div className="border-r border-black/30"></div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-6 border border-black/20 rounded-sm"></div>
        </div>
      </div>

      {/* 2. CORPO DO CARTÃO (Efeito Plástico Premium) */}
      <div className="flex-grow p-6 flex flex-col justify-between relative bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
        
        {/* Número do Cartão com Relevo */}
        <div className="relative">
          <p className="text-[7px] uppercase text-[#00d66f] font-black tracking-[0.2em] mb-1">Card Number</p>
          <p className="text-2xl font-bold italic" style={embossStyle}>
            {cardNumber.match(/.{1,4}/g)?.join('   ') || cardNumber}
          </p>
        </div>

        {/* Rodapé: Nome e Saldo */}
        <div className="flex justify-between items-end">
          <div className="max-w-[60%]">
            <p className="text-[7px] uppercase text-white/40 font-black tracking-[0.2em] mb-1">Card Holder</p>
            <p className="text-sm font-black uppercase text-white tracking-widest truncate drop-shadow-md" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {name}
            </p>
          </div>

          <div className="text-right">
            <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
              <p className="text-[7px] uppercase text-[#00d66f] font-black tracking-[0.1em]">Balance</p>
              <p className="text-xl font-black text-white italic">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(availableBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ZONA DO BARCODE */}
      <div className="bg-white/90 mx-6 mb-6 p-2 rounded-lg flex flex-col items-center shadow-inner relative z-10">
        <Barcode 
          value={cardNumber} 
          width={1.4} 
          height={30} 
          displayValue={false}
          background="transparent"
          lineColor="#000"
        />
        <div className="w-full flex justify-between px-2 mt-1">
           <span className="text-[6px] text-black font-bold uppercase italic">Security Encrypted</span>
           <span className="text-[6px] text-black font-bold uppercase">Vizinho+ Corporate</span>
        </div>
      </div>

      {/* Efeito de brilho holográfico ao passar o mouse */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
    </div>
  );
};

export default ClientCard;