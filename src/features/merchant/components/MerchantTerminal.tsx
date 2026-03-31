import React from 'react';
import { Search, Camera, ArrowRight, User as UserIcon, Coins, Gift, RotateCcw, AlertTriangle } from 'lucide-react';
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
  onProcessAction: (type: 'earn' | 'redeem' | 'cancel') => void;
  isLoading: boolean;
  clientStoreBalance: number;
  formatCurrency: (val: number) => string;
}

const MerchantTerminal: React.FC<MerchantTerminalProps> = ({
  cardNumber, setCardNumber, isNifValid, foundClient,
  amount, setAmount, previewCashback, documentNumber, setDocumentNumber,
  onOpenScanner, onProcessAction, isLoading, clientStoreBalance, formatCurrency, isSearching
}) => {

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 9) val = val.substring(0, 9);
    let formatted = val;
    if (val.length > 6) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)} ${val.substring(6, 9)}`;
    else if (val.length > 3) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)}`;
    setCardNumber(formatted);
  };

  const invoiceAmount = Number(amount) || 0;
  // CÁLCULO DA REGRA DOS 50%
  const maxDiscountAllowed = invoiceAmount * 0.5;
  const actualDiscountToApply = Math.min(clientStoreBalance, maxDiscountAllowed);

  const canProcess = !isLoading && foundClient !== null && invoiceAmount > 0 && documentNumber.trim().length > 0;
  const canCancel = !isLoading && foundClient !== null && documentNumber.trim().length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-[12px_12px_0px_0px_#0a2540] border-4 border-[#0a2540] relative overflow-hidden">
        <div className="space-y-10 relative z-10">
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">
              <Search size={16} /> Identificar Cliente (NIF)
            </label>
            <div className="flex gap-4">
              <input 
                type="text" inputMode="numeric" value={cardNumber} onChange={handleNifChange} placeholder="000 000 000" 
                className={`flex-grow p-6 bg-slate-50 border-4 rounded-3xl text-3xl font-black text-[#0a2540] outline-none transition-all shadow-inner tracking-widest ${isNifValid ? 'border-[#00d66f] bg-green-50/30' : 'border-slate-100 focus:border-[#0a2540]'}`}
              />
              <button onClick={onOpenScanner} className="bg-[#0a2540] px-8 rounded-3xl text-[#00d66f] hover:bg-black transition-all shadow-[6px_6px_0px_0px_#00d66f] border-2 border-[#00d66f] active:translate-y-1 active:shadow-none"><Camera size={32} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Valor da Nova Fatura (€)</label>
              <input 
                type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" 
                className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0a2540] outline-none focus:border-[#0a2540] shadow-inner" 
              />
              
              {invoiceAmount > 0 && (
                <div className="flex flex-col gap-2 animate-in zoom-in">
                  <div className="flex items-center gap-3 bg-green-50 p-4 rounded-2xl border-2 border-green-200">
                    <ArrowRight size={16} className="text-[#00d66f]" />
                    <span className="text-[11px] font-black uppercase text-[#0a2540] tracking-widest">
                      Cashback a Emitir: <span className="text-[#00d66f] text-sm italic ml-1">{formatCurrency(previewCashback)}</span>
                    </span>
                  </div>

                  {clientStoreBalance > 0 && (
                     <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-800 mb-2 flex items-center gap-2">
                           <AlertTriangle size={14} /> Regra de Desconto (Máx 50%)
                        </p>
                        <div className="flex justify-between text-[11px] font-bold text-blue-600">
                           <span>Limite Permitido: {formatCurrency(maxDiscountAllowed)}</span>
                           <span className="font-black text-blue-900">Aplicar: {formatCurrency(actualDiscountToApply)}</span>
                        </div>
                     </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nº Fatura / Recibo</label>
              <input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value.toUpperCase())} placeholder="EX: FT 123/2026" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black uppercase text-[#0a2540] outline-none focus:border-[#0a2540] shadow-inner tracking-widest" />
            </div>
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

        <button onClick={() => onProcessAction('earn')} disabled={!canProcess} className="flex-1 bg-[#0a2540] p-6 rounded-[35px] text-white transition-all hover:bg-black hover:scale-[1.02] shadow-[8px_8px_0px_0px_#00d66f] border-2 border-[#0a2540] flex flex-col items-center justify-center gap-3 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100">
          <Coins size={32} className="text-[#00d66f]" />
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Atribuir Cashback</span>
        </button>

        <button onClick={() => onProcessAction('redeem')} disabled={!canProcess || clientStoreBalance <= 0 || actualDiscountToApply <= 0} className="flex-1 bg-white p-6 rounded-[35px] text-[#0a2540] border-4 border-[#0a2540] transition-all hover:bg-slate-50 hover:scale-[1.02] shadow-xl flex flex-col items-center justify-center gap-3 disabled:opacity-40 disabled:hover:scale-100">
          <Gift size={32} className="text-[#0a2540]" />
          <span className="font-black text-[11px] uppercase tracking-[0.2em]">Descontar Saldo</span>
        </button>

        <button onClick={() => onProcessAction('cancel')} disabled={!canCancel} className="py-6 px-4 bg-red-50 rounded-[35px] text-red-500 border-4 border-red-100 transition-all hover:bg-red-500 hover:text-white hover:border-red-600 flex items-center justify-center gap-3 disabled:opacity-40">
          <RotateCcw size={16} strokeWidth={3} />
          <span className="font-black text-[10px] uppercase tracking-widest">Anular Movimento</span>
        </button>
      </div>
    </div>
  );
};

export default MerchantTerminal;