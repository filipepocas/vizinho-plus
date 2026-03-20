import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { User as UserProfile, Transaction } from '../../types';
import { LayoutDashboard, History, UserCircle, LogOut, Users, Loader2, Mail, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// Sub-componentes
import MerchantTerminal from './components/MerchantTerminal';
import QRScannerModal from './components/QRScannerModal';

const MerchantDashboard: React.FC = () => {
  const { currentUser, transactions, addTransaction, subscribeToTransactions, logout, setCurrentUser } = useStore();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'terminal' | 'history' | 'customers' | 'profile'>('terminal');
  const [showScanner, setShowScanner] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [foundClient, setFoundClient] = useState<UserProfile | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'earn' | 'redeem' | 'cancel', val: number} | null>(null);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const isNifValid = useMemo(() => cardNumber.replace(/\s/g, '').length === 9, [cardNumber]);

  // Pesquisa Automática de Cliente por NIF
  useEffect(() => {
    const search = async () => {
      const cleanNif = cardNumber.replace(/\s/g, '');
      if (cleanNif.length === 9) {
        setIsSearching(true);
        const q = query(collection(db, 'users'), where('nif', '==', cleanNif), where('role', '==', 'client'));
        const snap = await getDocs(q);
        if (!snap.empty) setFoundClient({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
        else setFoundClient(null);
        setIsSearching(false);
      } else { setFoundClient(null); }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [cardNumber]);

  useEffect(() => {
    if (currentUser?.id) return subscribeToTransactions('merchant', currentUser.id);
  }, [currentUser?.id, subscribeToTransactions]);

  const processAction = (type: 'earn' | 'redeem' | 'cancel') => {
    const val = parseFloat(amount);
    if (!foundClient || isNaN(val) || val <= 0 || !documentNumber) {
      alert("Preencha todos os campos corretamente.");
      return;
    }
    setPendingAction({ type, val });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction || !currentUser || !foundClient) return;
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      await addTransaction({
        clientId: foundClient.id,
        merchantId: currentUser.id,
        merchantName: currentUser.name || 'Loja Vizinho+',
        amount: pendingAction.val,
        type: pendingAction.type,
        documentNumber: documentNumber
      });
      setMessage({ type: 'success', text: "Operação concluída com sucesso!" });
      setAmount(''); setDocumentNumber(''); setCardNumber('');
    } catch (e) {
      setMessage({ type: 'error', text: "Erro ao processar operação." });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative pb-20">
      <header className="bg-[#0f172a] p-8 rounded-b-[40px] shadow-2xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b-8 border-[#00d66f]">
        <div className="flex items-center gap-4 text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">{currentUser.name}</h2>
          <span className="text-[10px] font-black text-[#00d66f] bg-[#00d66f]/10 py-1 px-3 rounded-full border border-[#00d66f]/20">LOJA PARCEIRA</span>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md">
          <button onClick={() => setView('terminal')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'terminal' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><LayoutDashboard size={16} /> Terminal</button>
          <button onClick={() => setView('history')} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[11px] uppercase transition-all ${view === 'history' ? 'bg-[#00d66f] text-[#0f172a]' : 'text-white hover:bg-white/10'}`}><History size={16} /> Movimentos</button>
          <button onClick={logout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20} /></button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 w-full">
        {view === 'terminal' && (
          <MerchantTerminal 
            cardNumber={cardNumber} setCardNumber={setCardNumber}
            isNifValid={isNifValid} isSearching={isSearching} foundClient={foundClient}
            amount={amount} setAmount={setAmount}
            liveCashback={parseFloat(amount) * ((currentUser.cashbackPercent || 0) / 100)}
            documentNumber={documentNumber} setDocumentNumber={setDocumentNumber}
            onOpenScanner={() => setShowScanner(true)}
            onProcessAction={processAction}
            isLoading={isLoading}
            clientStoreBalance={foundClient?.storeWallets?.[currentUser.id]?.available || 0}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Mensagens de Feedback */}
        {message.text && (
          <div className={`mt-8 p-5 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-bounce shadow-xl border-b-4 ${message.type === 'success' ? 'bg-green-500 text-white border-green-700' : 'bg-red-500 text-white border-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}
      </main>

      {showScanner && <QRScannerModal onScan={(text) => { setCardNumber(text); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}

      {/* Modal de Confirmação */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-[#0f172a] animate-in zoom-in">
            <div className={`p-8 text-center ${pendingAction.type === 'earn' ? 'bg-[#00d66f]' : 'bg-red-500'} text-[#0f172a]`}>
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase italic">Confirmar Operação?</h3>
              <p className="font-bold text-xs uppercase opacity-70">{foundClient?.name}</p>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
              <button onClick={handleConfirm} className="py-4 bg-[#00d66f] rounded-2xl font-black uppercase text-[10px] shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;