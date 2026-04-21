import React, { useState } from 'react';
import { Search, Camera, ArrowRight, User as UserIcon, Coins, Gift, AlertTriangle } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface MerchantTerminalProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  isNifValid: boolean;
  isSearching: boolean;
  foundClient: UserProfile | null;
  amount: string;
  setAmount: (val: string) => void;
  previewCashback: number;
  documentNumber: string;
  setDocumentNumber: (val: string) => void;
  onOpenScanner: () => void;
  onProcessAction: (type: 'earn' | 'redeem' | 'cancel', redeemAmount?: number) => void;
  isLoading: boolean;
  clientStoreBalance: number;
  formatCurrency: (val: number) => string;
  isLeaving?: boolean;
}

const MerchantTerminal: React.FC<MerchantTerminalProps> = ({
  cardNumber, setCardNumber, isNifValid, foundClient,
  amount, setAmount, previewCashback,
  onOpenScanner, onProcessAction, isLoading, clientStoreBalance, formatCurrency, isSearching, isLeaving
}) => {

  const [customRedeem, setCustomRedeem] = useState<string>('');

  // Correção: Adicionado (e: any) para TS Strict Mode
  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 9) val = val.substring(0, 9);
    let formatted = val;
    if (val.length > 6) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)} ${val.substring(6, 9)}`;
    else if (val.length > 3) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)}`;
    setCardNumber(formatted);
  };

  const invoiceAmount = Number(amount) || 0;
  const maxDiscountAllowed = invoiceAmount * 0.5;
  const actualDiscountToApply = Math.min(clientStoreBalance, maxDiscountAllowed);

  const canProcessEarn = !isLoading && foundClient !== null && invoiceAmount > 0 && !isLeaving;
  
  const redeemVal = parseFloat(customRedeem);
  const canProcessRedeem = !isLoading && 
                          foundClient !== null && 
                          invoiceAmount > 0 && 
                          !isNaN(redeemVal) && 
                          redeemVal > 0 && 
                          redeemVal <= (actualDiscountToApply + 0.01); 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-[12px_12px_0px_0px_#0a2540] border-4 border-[#0a2540] relative overflow-hidden">
        <div className="space-y-10 relative z-10">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center ml-2">
               <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                 <Search size={16} /> Identificar Cliente
               </label>
               <span className="text-[9px] font-bold text-[#00d66f] bg-green-50 px-3 py-1 rounded-lg uppercase">
                 Apresentar cartão antes do pagamento
               </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" inputMode="numeric" value={cardNumber} onChange={handleNifChange} placeholder="000 000 000" 
                className={`flex-grow p-6 bg-slate-50 border-4 rounded-3xl text-3xl font-black text-[#0a2540] outline-none transition-all shadow-inner tracking-widest text-center sm:text-left ${isNifValid ? 'border-[#00d66f] bg-green-50/30' : 'border-slate-100 focus:border-[#0a2540]'}`}
              />
              <button 
                onClick={onOpenScanner} 
                className="bg-[#0a2540] px-6 py-4 rounded-3xl text-[#00d66f] hover:bg-black transition-all shadow-[6px_6px_0px_0px_#00d66f] border-2 border-[#00d66f] active:translate-y-1 active:shadow-none flex items-center justify-center gap-3 whitespace-nowrap"
              >
                <Camera size={28} />
                <span className="font-black uppercase text-xs tracking-widest">Ler QR Code</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Valor da Nova Fatura (€)</label>
            <input 
              type="number" step="0.01" min="0" value={amount} onChange={e => { setAmount(e.target.value); setCustomRedeem(''); }} placeholder="0.00" 
              className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0a2540] outline-none focus:border-[#0a2540] shadow-inner" 
            />
            
            {invoiceAmount > 0 && !isLeaving && (
              <div className="flex flex-col gap-2 animate-in zoom-in">
                <div className="flex items-center gap-3 bg-green-50 p-4 rounded-2xl border-2 border-green-200">
                  <ArrowRight size={16} className="text-[#00d66f]" />
                  <span className="text-[11px] font-black uppercase text-[#0a2540] tracking-widest">
                    Cashback a Emitir: <span className="text-[#00d66f] text-sm italic ml-1">{formatCurrency(previewCashback)}</span>
                  </span>
                </div>
              </div>
            )}

            {isLeaving && (
              <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 flex items-center gap-3 text-red-600 font-bold text-[10px] uppercase">
                <AlertTriangle size={16} /> Loja em Saída: Apenas resgates de saldo permitidos.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className={`p-6 rounded-[35px] border-4 transition-all flex flex-col items-center gap-3 justify-center shadow-lg ${foundClient ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-white border-slate-200 text-slate-300 border-dashed'}`}>
          {foundClient ? (
            <>
              <div className="p-3 bg-white/30 rounded-2xl mb-1 border-2 border-[#0a2540]/10"><UserIcon size={24} className="text-[#0a2540]" strokeWidth={3} /></div>
              <h4 className="font-black uppercase text-center text-sm tracking-tighter italic">{foundClient.name}</h4>
              <div className="bg-[#0a2540] px-4 py-2 rounded-xl text-center w-full mt-2 shadow-inner border border-[#0a2540]">
                <p className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest mb-1">Saldo nesta Loja</p>
                <p className="text-xl font-black text-white italic">{formatCurrency(clientStoreBalance)}</p>
              </div>
            </>
          ) : (
            <>
               <Search size={32} className="opacity-50" />
               <p className="text-[10px] font-black uppercase tracking-widest text-center">{isSearching ? 'A pesquisar...' : 'Aguardando Cliente...'}</p>
            </>
          )}
        </div>

        <button onClick={() => onProcessAction('earn')} disabled={!canProcessEarn} className="flex-1 bg-[#0a2540] p-6 rounded-[35px] text-white transition-all hover:bg-black hover:scale-[1.02] shadow-[8px_8px_0px_0px_#00d66f] border-2 border-[#0a2540] flex flex-col items-center justify-center gap-3 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100">
          <Coins size={32} className="text-[#00d66f]" />
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Atribuir Cashback</span>
        </button>

        {clientStoreBalance > 0 && invoiceAmount > 0 && (
           <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-200 animate-in fade-in">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-800 mb-2 flex items-center gap-2">
                 <AlertTriangle size={14} /> Máximo a descontar (50%): <span className="font-bold text-lg">{formatCurrency(actualDiscountToApply)}</span>
              </p>
              <input 
                type="number" step="0.01" min="0" max={actualDiscountToApply}
                value={customRedeem} onChange={e => setCustomRedeem(e.target.value)} 
                placeholder="Valor a descontar" 
                className="w-full p-4 bg-white border-2 border-blue-300 rounded-2xl text-center font-black text-blue-900 outline-none focus:border-blue-500 mb-2" 
              />
              <button 
                onClick={() => onProcessAction('redeem', Number(customRedeem))} 
                disabled={!canProcessRedeem} 
                className="w-full bg-white p-4 rounded-2xl text-[#0a2540] border-4 border-[#0a2540] transition-all hover:bg-slate-50 hover:scale-[1.02] shadow-xl flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:hover:scale-100"
              >
                <Gift size={24} className="text-[#0a2540]" />
                <span className="font-black text-[10px] uppercase tracking-[0.2em]">Confirmar Desconto</span>
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default MerchantTerminal;