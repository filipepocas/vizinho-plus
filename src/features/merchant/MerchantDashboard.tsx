// src/features/merchant/MerchantDashboard.tsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';

const MerchantDashboard: React.FC = () => {
  const { addTransaction } = useStore();
  
  // Estados para o formulário
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSale = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !amount) {
      setMessage({ type: 'error', text: 'Preencha todos os campos!' });
      return;
    }

    const saleAmount = parseFloat(amount);
    const cashbackGenerated = saleAmount * 0.10; // Exemplo: 10% de Cashback fixo por agora

    const newTransaction = {
      id: `VPLUS-${Math.floor(Math.random() * 100000)}`,
      clientId: cardNumber, // Usamos o cartão como ID por agora
      merchantId: 'M-001',   // ID da loja (será dinâmico no futuro)
      operatorId: 'OP-01',
      amount: saleAmount,
      cashbackAmount: cashbackGenerated,
      type: 'earn' as const,
      status: 'pending' as const,
      createdAt: new Date(),
    };

    addTransaction(newTransaction);
    
    setMessage({ 
      type: 'success', 
      text: `Sucesso! ${cashbackGenerated.toFixed(2)}€ de cashback atribuídos.` 
    });
    
    // Limpar campos
    setCardNumber('');
    setAmount('');
    
    // Limpar mensagem após 3 segundos
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* Cabeçalho Brutalista */}
      <div className="border-4 border-vplus-blue p-6 mb-8 bg-vplus-green-light">
        <h1 className="text-4xl font-black text-vplus-blue uppercase tracking-tighter">
          REGISTAR VENDA
        </h1>
        <p className="font-bold text-vplus-blue opacity-70">COMERCIANTE: LOJA EXEMPLO</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {message.text && (
          <div className={`p-4 mb-6 font-bold uppercase text-center border-2 ${
            message.type === 'success' ? 'bg-vplus-green text-vplus-blue border-vplus-blue' : 'bg-red-500 text-white border-black'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSale} className="space-y-6">
          <div className="flex flex-col">
            <label className="text-sm font-black uppercase mb-2">Número do Cartão (ou ler código)</label>
            <input 
              type="text" 
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Ex: 5601234567"
              className="p-4 border-4 border-vplus-blue text-2xl font-mono focus:outline-none focus:bg-vplus-blue-light"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-black uppercase mb-2">Valor Total da Venda (€)</label>
            <input 
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="p-4 border-4 border-vplus-blue text-4xl font-black focus:outline-none focus:bg-vplus-green-light"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-vplus-blue text-white p-6 text-2xl font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-colors border-b-8 border-black active:border-b-0 active:translate-y-2"
          >
            VALIDAR CASHBACK
          </button>
        </form>

        <div className="mt-12 grid grid-cols-2 gap-4">
          <div className="border-2 border-gray-200 p-4">
            <p className="text-xs font-bold uppercase text-gray-400">Vendas hoje</p>
            <p className="text-2xl font-black">--</p>
          </div>
          <div className="border-2 border-gray-200 p-4">
            <p className="text-xs font-bold uppercase text-gray-400">Total Cashback</p>
            <p className="text-2xl font-black text-vplus-green">-- €</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;