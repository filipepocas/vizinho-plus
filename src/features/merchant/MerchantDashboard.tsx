// src/features/merchant/MerchantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MerchantDashboard: React.FC = () => {
  const { transactions, addTransaction } = useStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ESTADOS DA OPERAÇÃO
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [opCode, setOpCode] = useState(''); // PIN de 5 dígitos
  const [showScanner, setShowScanner] = useState(false);

  // ESTADOS DE GESTÃO DE OPERADORES
  const [newOpName, setNewOpName] = useState('');
  const [newOpCode, setNewOpCode] = useState('');
  const [showOpManager, setShowOpManager] = useState(false);

  const brandColor = activeMerchant?.primaryColor || '#1C305C';

  // CONTROLO DO SCANNER QR
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (text) => {
          setCardNumber(text);
          setShowScanner(false);
          scanner.clear();
        },
        (error) => { /* ignora erros de leitura contínua */ }
      );
      return () => {
        try { scanner.clear(); } catch (e) { console.error(e); }
      };
    }
  }, [showScanner]);

  // LOGIN DO LOJISTA
  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query(collection(db, 'merchants'), where('email', '==', loginEmail.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setActiveMerchant({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setIsAuthorized(true);
    } else {
      alert("Lojista não registado pelo Administrador.");
    }
  };

  // GESTÃO DE OPERADORES (PAGINA 6 DO PDF)
  const handleAddOperator = async () => {
    if (newOpCode.length !== 5) return alert("O código deve ter exatamente 5 dígitos.");
    if (!newOpName) return alert("Insira o nome do operador.");

    const newOp = {
      id: Date.now().toString(),
      name: newOpName,
      code: newOpCode
    };

    try {
      const merchantRef = doc(db, 'merchants', activeMerchant.id);
      await updateDoc(merchantRef, {
        operators: arrayUnion(newOp)
      });
      setActiveMerchant({
        ...activeMerchant,
        operators: [...(activeMerchant.operators || []), newOp]
      });
      setNewOpName('');
      setNewOpCode('');
      alert("Operador adicionado com sucesso!");
    } catch (error) {
      alert("Erro ao guardar operador.");
    }
  };

  // FUNÇÃO DE CÁLCULO DE SALDO DISPONÍVEL (REGRA 48H)
  const getClientAvailableBalance = (id: string) => {
    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));
    return transactions
      .filter(t => t.clientId === id && t.merchantId === activeMerchant.id)
      .reduce((acc, t) => {
        const isAvailable = new Date(t.createdAt) <= fortyEightHoursAgo;
        if (t.type === 'earn') {
          return isAvailable ? acc + t.cashbackAmount : acc;
        } else {
          // Descontos e notas de crédito abatem sempre ao disponível
          return acc - t.cashbackAmount;
        }
      }, 0);
  };

  // PROCESSAR MOVIMENTOS (ADICIONAR / SUBTRAIR / DESCONTAR)
  const processAction = async (type: 'earn' | 'redeem' | 'subtract') => {
    const val = parseFloat(amount);
    if (!cardNumber || isNaN(val) || val <= 0 || !docNumber) {
      return alert("Preencha todos os campos: Cartão, Valor e Nº do Documento.");
    }
    
    // 1. VALIDAR OPERADOR PELO PIN
    const operator = activeMerchant.operators?.find((o: any) => o.code === opCode);
    if (!operator) return alert("PIN de Operador Inválido! Operação cancelada.");

    // 2. VALIDAR SALDO PARA DESCONTO EM COMPRAS (PAGINA 5 PDF)
    if (type === 'redeem') {
      const available = getClientAvailableBalance(cardNumber);
      if (val > available) {
        return alert(`Operação Rejeitada! O cliente só tem ${available.toFixed(2)}€ disponíveis nesta loja.`);
      }
    }

    // 3. CALCULAR VALOR DE CASHBACK
    // Se for 'earn', aplica a % da loja. Se for 'redeem' ou 'subtract', o valor é o próprio montante.
    const cashback = type === 'earn' ? (val * (activeMerchant.cashbackPercent / 100)) : val;

    try {
      await addTransaction({
        clientId: cardNumber,
        merchantId: activeMerchant.id,
        merchantName: activeMerchant.shopName,
        amount: type === 'earn' ? val : 0,
        cashbackAmount: cashback,
        type: type,
        docNumber: docNumber,
        operatorId: operator.id,
        operatorName: operator.name,
        status: type === 'earn' ? 'pending' : 'available',
        createdAt: new Date()
      });
      
      setMessage({ type: 'success', text: "Movimento registado com sucesso!" });
      setAmount('');
      setDocNumber('');
      setOpCode('');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: "Erro ao comunicar com a base de dados." });
    }
  };

  // ECRÃ DE LOGIN
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-vplus-green-light flex items-center justify-center p-6 font-mono text-black">
        <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0_0_rgba(0,0,0,1)] w-full max-w-md text-center">
          <h1 className="text-4xl font-black uppercase italic mb-6">Terminal V+</h1>
          <form onSubmit={handleMerchantLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase italic">Login Estabelecimento</label>
              <input 
                type="email" 
                placeholder="EMAIL DA CONTA" 
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
                className="w-full p-4 border-4 border-black font-black outline-none focus:bg-yellow-50" 
                required 
              />
            </div>
            <button className="w-full bg-black text-white p-4 font-black uppercase border-b-8 border-vplus-green active:border-b-0 active:translate-y-2 transition-all">
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ECRÃ PRINCIPAL DO TERMINAL
  return (
    <div className="min-h-screen bg-white font-mono p-4 lg:p-8 border-[12px]" style={{ borderColor: brandColor }}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER DO TERMINAL */}
        <header className="flex justify-between items-end border-b-8 border-black pb-6">
          <div>
            <h2 className="text-4xl font-black uppercase italic leading-none" style={{ color: brandColor }}>
              {activeMerchant.shopName}
            </h2>
            <div className="flex gap-4 mt-2">
              <p className="text-[10px] font-black uppercase px-2 bg-black text-white italic">NIF: {activeMerchant.nif}</p>
              <p className="text-[10px] font-black uppercase px-2 bg-vplus-green text-black italic">Taxa: {activeMerchant.cashbackPercent}%</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowOpManager(!showOpManager)} 
              className="bg-black text-white px-6 py-2 font-black uppercase text-xs border-2 border-black hover:bg-white hover:text-black transition-all"
            >
              {showOpManager ? 'Fechar Gestão' : 'Operadores'}
            </button>
            <button 
              onClick={() => setIsAuthorized(false)} 
              className="bg-red-600 text-white px-6 py-2 font-black uppercase text-xs border-2 border-black"
            >
              Sair
            </button>
          </div>
        </header>

        {showOpManager ? (
          /* GESTÃO DE OPERADORES (EXPANSÍVEL) */
          <div className="bg-gray-100 border-8 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black uppercase italic mb-6 border-b-4 border-black pb-2">Configurar Equipa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <input 
                placeholder="NOME DO OPERADOR" 
                value={newOpName} 
                onChange={e => setNewOpName(e.target.value)} 
                className="p-4 border-4 border-black font-black uppercase"
              />
              <input 
                placeholder="PIN (5 DÍGITOS)" 
                value={newOpCode} 
                onChange={e => setNewOpCode(e.target.value)} 
                maxLength={5}
                className="p-4 border-4 border-black font-black text-center"
              />
              <button 
                onClick={handleAddOperator}
                className="bg-vplus-green p-4 border-4 border-black font-black uppercase hover:bg-black hover:text-white transition-all"
              >
                Registar Operador
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeMerchant.operators?.map((op: any) => (
                <div key={op.id} className="bg-white border-4 border-black p-3 relative">
                  <p className="font-black uppercase text-xs">{op.name}</p>
                  <p className="text-[10px] font-bold opacity-30 mt-1 italic leading-none">CÓDIGO: {op.code}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* INTERFACE DE PICAÇÃO (OPERAÇÃO) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUNA DADOS */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase italic">1. Identificar Cliente (Cartão/NIF)</label>
                <div className="flex gap-2">
                  <input 
                    value={cardNumber} 
                    onChange={e => setCardNumber(e.target.value)} 
                    placeholder="000000000" 
                    className="flex-grow p-6 border-8 border-black text-3xl font-black outline-none focus:bg-vplus-green-light" 
                  />
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="bg-vplus-green border-8 border-black px-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <span className="text-3xl">📷</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase italic">2. Valor da Venda (€)</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full p-6 border-8 border-black text-3xl font-black outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase italic">3. Nº da Fatura/Doc</label>
                  <input 
                    value={docNumber} 
                    onChange={e => setDocNumber(e.target.value)} 
                    placeholder="FT 2024/..." 
                    className="w-full p-6 border-8 border-black text-3xl font-black outline-none uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase italic text-red-600">4. PIN de Segurança do Operador</label>
                <input 
                  type="password" 
                  value={opCode} 
                  onChange={e => setOpCode(e.target.value)} 
                  maxLength={5} 
                  placeholder="*****" 
                  className="w-full p-6 border-8 border-red-600 text-4xl font-black text-center tracking-[0.5em] outline-none bg-red-50" 
                />
              </div>
            </div>

            {/* COLUNA AÇÕES (BOTÕES DO PDF) */}
            <div className="lg:col-span-5 flex flex-col gap-4 justify-center">
              <button 
                onClick={() => processAction('earn')} 
                className="bg-vplus-green p-8 border-8 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] font-black uppercase text-2xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                (+) Adicionar Cashback
              </button>
              <button 
                onClick={() => processAction('subtract')} 
                className="bg-yellow-400 p-8 border-8 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] font-black uppercase text-2xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                (-) Nota de Crédito
              </button>
              <button 
                onClick={() => processAction('redeem')} 
                className="bg-black text-white p-8 border-8 border-black shadow-[10px_10px_0_0_rgba(163,230,53,1)] font-black uppercase text-2xl hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                ($) Descontar Saldo
              </button>
              
              {message.text && (
                <div className={`p-6 border-8 border-black font-black uppercase text-center text-xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] ${message.type === 'success' ? 'bg-vplus-green text-black' : 'bg-red-600 text-white'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DO SCANNER */}
        {showScanner && (
          <div className="fixed inset-0 bg-black z-50 p-4 flex flex-col">
            <div className="bg-white p-2 border-8 border-black flex-grow relative overflow-hidden">
              <div id="reader" className="w-full h-full"></div>
            </div>
            <button 
              onClick={() => setShowScanner(false)} 
              className="w-full bg-red-600 text-white p-8 font-black mt-4 uppercase text-2xl border-4 border-black"
            >
              Cancelar Leitura
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantDashboard;