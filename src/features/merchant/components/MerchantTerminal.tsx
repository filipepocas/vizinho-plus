import React, { useState } from 'react';
import { Search, Camera, ArrowRight, User as UserIcon, Coins, Gift, AlertTriangle } from 'lucide-react';
import { User as UserProfile } from '../../../types';
import { normalizeClientCardValue } from '../../../utils/clientCard';
import { getMaxRedeemableCashback } from '../../../utils/clientBalance';

interface MerchantTerminalProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  isNifValid: boolean;
  isSearching: boolean;
  foundClient: UserProfile | null;
  amount: string;
  setAmount: (val: string) => void;
  cashbackPercent: number;
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
  amount, setAmount, cashbackPercent,
  onOpenScanner, onProcessAction, isLoading, clientStoreBalance, formatCurrency, isSearching, isLeaving
}) => {

  const [customRedeem, setCustomRedeem] = useState<string>('');

  // Correção: Adicionado (e: any) para TS Strict Mode
  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeClientCardValue(e.target.value);
    const trimmed = normalized.slice(0, 9);
    let formatted = trimmed;
    if (trimmed.length > 6) formatted = `${trimmed.substring(0, 3)} ${trimmed.substring(3, 6)} ${trimmed.substring(6, 9)}`;
    else if (trimmed.length > 3) formatted = `${trimmed.substring(0, 3)} ${trimmed.substring(3, 6)}`;
    setCardNumber(formatted);
  };

  const invoiceAmount = Number(amount) || 0;
  const actualDiscountToApply = getMaxRedeemableCashback(clientStoreBalance, invoiceAmount);
  const selectedRedeemAmount = Number(customRedeem) || 0;
  const isRedeemExceeded = selectedRedeemAmount > (actualDiscountToApply + 0.001);
  const effectiveDiscount = isRedeemExceeded ? 0 : selectedRedeemAmount;
  const cashbackToIssue = Number((Math.max(0, invoiceAmount - effectiveDiscount) * (cashbackPercent / 100)).toFixed(2));

  const canProcessEarn = !isLoading && foundClient !== null && invoiceAmount > 0 && !isLeaving;
  
  const redeemVal = parseFloat(customRedeem);
  const canProcessRedeem = !isLoading && 
                          foundClient !== null && 
                          invoiceAmount > 0 && 
                          !isNaN(redeemVal) && 
                          redeemVal > 0 && 
                          !isRedeemExceeded;

  const handleApplyMaxDiscount = () => {
    if (actualDiscountToApply > 0) {
      setCustomRedeem(actualDiscountToApply.toFixed(2));
    }
  };

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
                <div className="flex flex-col gap-1.5 bg-green-50 p-4 rounded-2xl border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-[#0a2540] tracking-widest flex items-center gap-2">
                      <ArrowRight size={16} className="text-[#00d66f]" />
                      Cashback a Emitir:
                    </span>
                    <span className="text-[#00d66f] text-base font-black italic">{formatCurrency(cashbackToIssue)}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-6">
                    Fórmula: ({formatCurrency(invoiceAmount)} - {formatCurrency(effectiveDiscount)}) × {cashbackPercent}% da loja
                  </p>
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
              <div className="bg-[#0a2540] px-4 py-3 rounded-2xl text-center w-full mt-2 shadow-inner border border-[#0a2540]">
                <p className="text-[8px] font-black text-[#00d66f] uppercase tracking-widest mb-0.5">Saldo nesta Loja</p>
                <p className="text-xl font-black text-white italic">{formatCurrency(clientStoreBalance)}</p>
                <p className="text-[7px] font-bold text-slate-300 uppercase tracking-wider mt-1">Cashback líquido deste cliente nesta loja</p>
              </div>
            </>
          ) : (
            <>
               <Search size={32} className="opacity-50" />
               <p className="text-[10px] font-black uppercase tracking-widest text-center">{isSearching ? 'A pesquisar...' : 'Aguardando Cliente...'}</p>
            </>
          )}
        </div>

        <button onClick={() => onProcessAction('earn')} disabled={!canProcessEarn} className="bg-[#0a2540] p-6 rounded-[35px] text-white transition-all hover:bg-black hover:scale-[1.02] shadow-[8px_8px_0px_0px_#00d66f] border-2 border-[#0a2540] flex flex-col items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100">
          <Coins size={28} className="text-[#00d66f]" />
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Atribuir Cashback Total</span>
          <span className="text-[8px] font-bold text-slate-300 uppercase">Sem desconto ({formatCurrency(invoiceAmount * (cashbackPercent / 100))} a emitir)</span>
        </button>

        {clientStoreBalance > 0 && invoiceAmount > 0 && (
           <div className="bg-blue-50 p-5 rounded-3xl border-2 border-blue-200 animate-in fade-in space-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-blue-600" /> Máximo a descontar (50%):</span>
                  <span className="font-black text-base text-blue-900">{formatCurrency(actualDiscountToApply)}</span>
                </p>
                <p className="text-[8px] font-bold text-blue-700 leading-tight">
                  Regra: nunca superior a 50% do valor da compra nem ao saldo líquido do cliente nesta loja.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input 
                    type="number" step="0.01" min="0" max={actualDiscountToApply}
                    value={customRedeem} onChange={e => setCustomRedeem(e.target.value)} 
                    placeholder="Valor a descontar (€)" 
                    className={`flex-1 p-3.5 bg-white border-2 rounded-2xl text-center font-black outline-none transition-colors ${
                      isRedeemExceeded ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-blue-300 text-blue-900 focus:border-blue-500'
                    }`}
                  />
                  {actualDiscountToApply > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyMaxDiscount}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider shrink-0 transition-all shadow-sm"
                    >
                      Máx.
                    </button>
                  )}
                </div>

                {isRedeemExceeded && (
                  <p className="text-red-500 text-[9px] font-black uppercase text-center leading-tight">
                    O valor a descontar não pode ultrapassar {formatCurrency(actualDiscountToApply)}!
                  </p>
                )}
              </div>

              <button 
                onClick={() => onProcessAction('redeem', Number(customRedeem))} 
                disabled={!canProcessRedeem} 
                className="w-full bg-[#0a2540] text-white p-4 rounded-2xl border-2 border-[#0a2540] transition-all hover:bg-black hover:scale-[1.01] shadow-lg flex flex-col items-center justify-center gap-0.5 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
              >
                <div className="flex items-center gap-2">
                  <Gift size={20} className="text-[#00d66f]" />
                  <span className="font-black text-[10px] uppercase tracking-[0.2em]">Confirmar Desconto</span>
                </div>
                {canProcessRedeem && (
                  <span className="text-[8px] font-bold text-slate-300">
                    Desconta {formatCurrency(redeemVal)} &bull; Emite +{formatCurrency(cashbackToIssue)}
                  </span>
                )}
              </button>
           </div>
        )}

        {foundClient && clientStoreBalance <= 0 && invoiceAmount > 0 && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-slate-500 text-[9px] font-bold uppercase leading-relaxed">
            Este cliente ainda não tem saldo líquido acumulado nesta loja para aplicar descontos.
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantTerminal;