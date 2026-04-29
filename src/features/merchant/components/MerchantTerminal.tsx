// src/features/merchant/components/MerchantTerminal.tsx

import React, { useState, useEffect } from 'react';
import { Search, Camera, ArrowRight, User as UserIcon, AlertTriangle, CheckCircle2, XCircle, Receipt, Gift, Coins } from 'lucide-react';
import { User as UserProfile } from '../../../types';
import toast from 'react-hot-toast';

interface MerchantTerminalProps {
  cardNumber: string;
  setCardNumber: (val: string) => void;
  isNifValid: boolean;
  isSearching: boolean;
  foundClient: UserProfile | null;
  amount: string; // Usado agora como Valor da Fatura (invoiceAmount)
  setAmount: (val: string) => void;
  previewCashback: number; // Legado (será ignorado no novo cálculo interno)
  documentNumber: string;
  setDocumentNumber: (val: string) => void;
  onOpenScanner: () => void;
  onProcessAction: (type: any, payload?: any) => void; // Tipo relaxado para suportar a transição
  isLoading: boolean;
  clientStoreBalance: number;
  formatCurrency: (val: number) => string;
  isLeaving?: boolean;
  merchantPercent?: number; // Nova prop que passaremos do Dashboard
}

const MerchantTerminal: React.FC<MerchantTerminalProps> = ({
  cardNumber, setCardNumber, isNifValid, foundClient,
  amount, setAmount, documentNumber, setDocumentNumber,
  onOpenScanner, onProcessAction, isLoading, clientStoreBalance, formatCurrency, isSearching, isLeaving, merchantPercent = 5
}) => {

  // Máquina de Estados do Wizard: 1 (Identificar) -> 2 (Fatura) -> 3 (Desconto) -> 4 (Resumo)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [discountStr, setDiscountStr] = useState<string>('');

  // Reset do Wizard se o cliente for limpo
  useEffect(() => {
    if (!foundClient) {
      setStep(1);
      setAmount('');
      setDiscountStr('');
      setDocumentNumber('');
    }
  }, [foundClient, setAmount, setDocumentNumber]);

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 9) val = val.substring(0, 9);
    let formatted = val;
    if (val.length > 6) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)} ${val.substring(6, 9)}`;
    else if (val.length > 3) formatted = `${val.substring(0, 3)} ${val.substring(3, 6)}`;
    setCardNumber(formatted);
  };

  // Variáveis Matemáticas da Transação
  const invoiceVal = parseFloat(amount) || 0;
  const discountVal = parseFloat(discountStr) || 0;
  const maxDiscountAllowed = invoiceVal > 0 ? invoiceVal * 0.5 : 0;
  const actualMaxDiscount = Math.min(clientStoreBalance, maxDiscountAllowed);
  
  const amountPaid = invoiceVal - discountVal;
  // O Cashback é calculado sobre o valor efetivamente pago (Fatura - Desconto)
  const cashbackEarned = invoiceVal > 0 ? (amountPaid * merchantPercent) / 100 : (invoiceVal * merchantPercent) / 100;

  // NAVEGAÇÃO DO WIZARD
  const handleNextToAmount = () => {
    if (foundClient) setStep(2);
  };

  const handleNextToDiscountOrSummary = () => {
    if (isNaN(invoiceVal) || invoiceVal === 0) {
      return toast.error("Insira um valor válido para a fatura.");
    }

    // Se for nota de crédito (negativo) ou cliente não tiver saldo, salta o passo do desconto
    if (invoiceVal < 0 || clientStoreBalance <= 0 || isLeaving) {
      setDiscountStr('0');
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleApplyDiscount = () => {
    if (discountVal < 0 || discountVal > actualMaxDiscount) {
      return toast.error(`O desconto máximo permitido é de ${formatCurrency(actualMaxDiscount)} (50% da compra).`);
    }
    setStep(4);
  };

  const handleSkipDiscount = () => {
    setDiscountStr('0');
    setStep(4);
  };

  const handleConfirmTransaction = () => {
    // Passamos um payload unificado para o Dashboard
    onProcessAction('purchase', {
      invoiceAmount: invoiceVal,
      discountUsed: discountVal,
      cashbackEarned: cashbackEarned
    });
  };

  const handleCancelWizard = () => {
    setStep(1);
    setAmount('');
    setDiscountStr('');
    setDocumentNumber('');
    setCardNumber('');
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-[12px_12px_0px_0px_#0a2540] border-4 border-[#0a2540] relative overflow-hidden animate-in fade-in duration-500">
      
      {/* PROGRESS BAR */}
      <div className="flex justify-between items-center mb-10 border-b-2 border-slate-100 pb-6 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-[#00d66f] -z-10 -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-4 transition-all duration-500 ${step >= s ? 'bg-[#00d66f] text-[#0a2540] border-[#0a2540]' : 'bg-white text-slate-300 border-slate-200'}`}>
            {s}
          </div>
        ))}
      </div>

      {/* PASSO 1: IDENTIFICAR CLIENTE */}
      {step === 1 && (
        <div className="space-y-8 animate-in slide-in-from-right">
          <div className="text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Identificar Cliente</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leia o QR Code ou insira o NIF/Nº Cartão</p>
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

          <div className={`p-6 rounded-[30px] border-4 transition-all flex items-center gap-4 ${foundClient ? 'bg-[#00d66f] border-[#0a2540] text-[#0a2540]' : 'bg-slate-50 border-slate-200 text-slate-400 border-dashed justify-center'}`}>
            {foundClient ? (
              <>
                <div className="p-3 bg-white/30 rounded-2xl border-2 border-[#0a2540]/10"><UserIcon size={24} strokeWidth={3} /></div>
                <div className="flex-1">
                  <h4 className="font-black uppercase text-lg tracking-tighter italic leading-none">{foundClient.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Saldo Disponível: {formatCurrency(clientStoreBalance)}</p>
                </div>
                <button onClick={handleNextToAmount} className="bg-[#0a2540] text-white p-4 rounded-2xl hover:scale-105 transition-transform shadow-lg">
                  <ArrowRight size={24} />
                </button>
              </>
            ) : (
              <>
                 <Search size={24} className="opacity-50" />
                 <p className="text-[10px] font-black uppercase tracking-widest">{isSearching ? 'A pesquisar...' : 'Aguardando Cliente...'}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* PASSO 2: VALOR DA COMPRA */}
      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right">
          <div className="text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Valor da Compra</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insira o valor total da fatura (Pode ser negativo)</p>
          </div>

          <div className="space-y-4">
            <input 
              type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" 
              className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-[30px] text-5xl text-center font-black text-[#0a2540] outline-none focus:border-[#0a2540] shadow-inner" 
            />
            <input 
              type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Nº Fatura / Recibo (Opcional)" 
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-center font-bold text-sm outline-none focus:border-[#00d66f]" 
            />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="px-6 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs hover:bg-slate-200 transition-colors">Voltar</button>
            <button onClick={handleNextToDiscountOrSummary} className="flex-1 bg-[#0a2540] text-[#00d66f] py-5 rounded-3xl font-black uppercase text-sm shadow-xl hover:bg-black transition-all flex justify-center items-center gap-2 border-b-4 border-black/50">
              Avançar <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3: DESCONTO (Opcional) */}
      {step === 3 && (
        <div className="space-y-8 animate-in slide-in-from-right">
          <div className="text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Utilizar Saldo</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">O cliente tem {formatCurrency(clientStoreBalance)} disponíveis.</p>
          </div>

          <div className="bg-blue-50 p-6 rounded-[30px] border-4 border-blue-100 text-center">
            <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-2 flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> Limite de Desconto (50%)
            </p>
            <p className="text-3xl font-black italic text-blue-900">{formatCurrency(actualMaxDiscount)}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase mt-2">Valor máximo que pode ser descontado nesta compra.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Valor a Descontar (€)</label>
            <input 
              type="number" step="0.01" min="0" max={actualMaxDiscount}
              value={discountStr} onChange={e => setDiscountStr(e.target.value)} placeholder="0.00" 
              className="w-full p-6 bg-white border-4 border-slate-200 rounded-3xl text-3xl text-center font-black text-[#0a2540] outline-none focus:border-[#00d66f]" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={handleSkipDiscount} className="py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors border-2 border-slate-200">
              Não Descontar
            </button>
            <button onClick={handleApplyDiscount} className="py-5 bg-[#00d66f] text-[#0a2540] rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-transform border-b-4 border-[#0a2540]/20">
              Aplicar Desconto
            </button>
          </div>
        </div>
      )}

      {/* PASSO 4: RESUMO E CONFIRMAÇÃO */}
      {step === 4 && (
        <div className="space-y-8 animate-in slide-in-from-right">
          <div className="text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Resumo da Operação</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valide os dados antes de confirmar</p>
          </div>

          <div className="bg-slate-50 rounded-[30px] border-4 border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-200">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><Receipt size={16}/> Total da Fatura</span>
              <span className="text-lg font-black text-[#0a2540]">{formatCurrency(invoiceVal)}</span>
            </div>
            
            {discountVal > 0 && (
              <div className="flex justify-between items-center pb-4 border-b-2 border-slate-200">
                <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><Gift size={16}/> Saldo Descontado</span>
                <span className="text-lg font-black text-red-500">-{formatCurrency(discountVal)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-200">
              <span className="text-xs font-black uppercase text-[#0a2540]">Total a Pagar pelo Cliente</span>
              <span className="text-2xl font-black italic text-[#0a2540]">{formatCurrency(amountPaid)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-black uppercase text-[#00d66f] flex items-center gap-2"><Coins size={16}/> Cashback a Gerar ({merchantPercent}%)</span>
              <span className={`text-xl font-black italic ${cashbackEarned >= 0 ? 'text-[#00d66f]' : 'text-red-500'}`}>
                {cashbackEarned >= 0 ? '+' : ''}{formatCurrency(cashbackEarned)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={handleCancelWizard} disabled={isLoading} className="py-5 bg-red-50 text-red-500 rounded-3xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-colors flex justify-center items-center gap-2 border-2 border-red-100 disabled:opacity-50">
              <XCircle size={18} /> Cancelar
            </button>
            <button onClick={handleConfirmTransaction} disabled={isLoading} className="py-5 bg-[#0a2540] text-[#00d66f] rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all flex justify-center items-center gap-2 border-b-4 border-black/50 disabled:opacity-50">
              <CheckCircle2 size={18} /> Confirmar Operação
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MerchantTerminal;