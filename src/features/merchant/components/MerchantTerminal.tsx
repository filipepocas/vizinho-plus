import React from 'react';
import { Search, Camera, ArrowRight, User, Coins, Gift, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { User as UserProfile } from '../../../types';

interface MerchantTerminalProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  isNifValid: boolean;
  isSearching: boolean;
  foundClient: UserProfile | null;
  amount: string;
  setAmount: (val: string) => void;
  liveCashback: number;
  documentNumber: string;
  setDocumentNumber: (val: string) => void;
  onOpenScanner: () => void;
  onProcessAction: (type: 'earn' | 'redeem' | 'cancel') => void;
  isLoading: boolean;
  clientStoreBalance: number;
  formatCurrency: (val: number) => string;
}

const MerchantTerminal: React.FC<MerchantTerminalProps> = ({
  cardNumber, setCardNumber, isNifValid, isSearching, foundClient,
  amount, setAmount, liveCashback, documentNumber, setDocumentNumber,
  onOpenScanner, onProcessAction, isLoading, clientStoreBalance, formatCurrency
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[40px] shadow-xl border-2 border-slate-100">
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest">
              <Search size={14} /> Identificar Cliente (NIF)
            </label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={cardNumber} 
                onChange={e => setCardNumber(e.target.value)}
                placeholder="000 000 000" 
                className={`flex-grow p-6 bg-slate-50 border-4 rounded-3xl text-3xl font-black text-[#0f172a] outline-none transition-all ${isNifValid ? 'border-[#00d66f]' : 'border-slate-100'}`}
              />
              <button onClick={onOpenScanner} className="bg-[#0f172a] px-8 rounded-3xl text-[#00d66f] hover:bg-black transition-all shadow-lg"><Camera size={32} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Valor da Fatura (€)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-4xl font-black text-[#0f172a] outline-none" />
              {Number(amount) > 0 && (
                <div className="flex items-center gap-3 bg-[#00d66f]/10 p-4 rounded-2xl border-2 border-[#00d66f]/20 animate-in zoom-in">
                  <ArrowRight size={16} className="text-[#00d66f]" />
                  <span className="text-[11px] font-black uppercase text-[#0f172a]">Retorno de <span className="text-[#00d66f] text-sm">{formatCurrency(liveCashback)}</span></span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Nº Fatura / Recibo</label>
              <input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Ex: FT/123" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black uppercase text-[#0f172a] outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className={`p-6 rounded-[32px] border-4 transition-all flex flex-col items-center gap-2 ${foundClient ? 'bg-[#0f172a] border-[#00d66f] text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
          {foundClient ? (
            <>
              <div className="p-3 bg-[#00d66f] rounded-2xl mb-2"><User size={24} className="text-[#0f172a]" /></div>
              <h4 className="font-black uppercase text-center text-sm">{foundClient.name}</h4>
              <p className="text-[10px] font-bold text-[#00d66f] uppercase tracking-widest">Saldo na Loja: {formatCurrency(clientStoreBalance)}</p>
            </>
          ) : (
            <p className="text-[10px] font-black uppercase text-center">{isSearching ? 'A pesquisar...' : 'Aguardando NIF...'}</p>
          )}
        </div>

        <button onClick={() => onProcessAction('earn')} disabled={isLoading || !foundClient} className="flex-1 bg-[#00d66f] p-6 rounded-[32px] text-[#0f172a] transition-all hover:scale-[1.02] shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-30">
          <Coins size={32} />
          <span className="font-black text-lg uppercase italic tracking-tighter">Atribuir Cashback</span>
        </button>

        <button onClick={() => onProcessAction('redeem')} disabled={isLoading || !foundClient || clientStoreBalance <= 0} className="flex-1 bg-[#0f172a] p-6 rounded-[32px] text-[#00d66f] border-b-8 border-[#00d66f] transition-all hover:scale-[1.02] flex flex-col items-center justify-center gap-2 disabled:opacity-30">
          <Gift size={32} />
          <span className="font-black text-lg uppercase italic tracking-tighter">Utilizar Saldo Loja</span>
        </button>

        <button onClick={() => onProcessAction('cancel')} disabled={isLoading || !foundClient} className="flex-1 bg-white p-6 rounded-[32px] text-red-500 border-4 border-red-500 transition-all hover:bg-red-50 flex flex-col items-center justify-center gap-2 disabled:opacity-30">
          <RotateCcw size={32} />
          <span className="font-black text-lg uppercase italic tracking-tighter">Anular Compra</span>
        </button>
      </div>
    </div>
  );
};

export default MerchantTerminal;