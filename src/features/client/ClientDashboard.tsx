import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ClientDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions, setCurrentUser } = useStore();
  
  // ESTADOS DE SESSÃO
  const [isLogged, setIsLogged] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [loggedClient, setLoggedClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ESTADOS DO FORMULÁRIO
  const [loginId, setLoginId] = useState(''); 
  const [password, setPassword] = useState('');
  
  // ESTADOS DE REGISTO
  const [regName, setRegName] = useState('');
  const [regNif, setRegNif] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regZip, setRegZip] = useState('');
  const [regPass, setRegPass] = useState('');

  // Ativa a escuta de transações em tempo real
  useEffect(() => {
    if (isLogged && loggedClient) {
      const unsubscribe = subscribeToTransactions('client', loggedClient.cardNumber);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [isLogged, loggedClient, subscribeToTransactions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const clientsRef = collection(db, 'clients');
    
    // Tenta encontrar por NIF, Email ou Número de Cartão
    const queries = [
      query(clientsRef, where('nif', '==', loginId)),
      query(clientsRef, where('email', '==', loginId.toLowerCase().trim())),
      query(clientsRef, where('cardNumber', '==', loginId))
    ];

    try {
      let found = false;
      for (const q of queries) {
        const snap = await getDocs(q);
        if (!snap.empty) {
          const clientData = snap.docs[0].data();
          if (clientData.password === password) {
            const fullClient = { id: snap.docs[0].id, ...clientData };
            setLoggedClient(fullClient);
            // Sincroniza com a Store global
            setCurrentUser({
              id: snap.docs[0].id,
              name: clientData.name,
              nif: clientData.nif,
              email: clientData.email,
              role: 'client',
              customerNumber: clientData.cardNumber
            });
            setIsLogged(true);
            found = true;
            break;
          }
        }
      }
      if (!found) alert("Credenciais inválidas.");
    } catch (err) {
      console.error(err);
      alert("Erro ao aceder à conta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regNif.length !== 9) return alert("NIF deve ter 9 dígitos.");
    
    setIsLoading(true);
    try {
      const q = query(collection(db, 'clients'), where('nif', '==', regNif));
      const existing = await getDocs(q);
      
      if (!existing.empty) {
        setIsLoading(false);
        return alert("Este NIF já está registado!");
      }

      const newCardNumber = Math.floor(100000000 + Math.random() * 900000000).toString();

      const newClient = {
        name: regName,
        nif: regNif,
        email: regEmail.toLowerCase().trim(),
        phone: regPhone,
        zipCode: regZip,
        password: regPass,
        cardNumber: newCardNumber,
        createdAt: serverTimestamp() // Usar o timestamp do servidor
      };

      await addDoc(collection(db, 'clients'), newClient);
      alert(`Bem-vindo à Vizinho+! O seu cartão é: ${newCardNumber}`);
      setView('login');
    } catch (err) {
      alert("Erro ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculo de Saldos por Loja com lógica de 48h corrigida
  const balancesByStore = useMemo(() => {
    const stores: { [key: string]: { name: string, total: number, available: number } } = {};
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);

    transactions.forEach(t => {
      if (!stores[t.merchantId]) {
        stores[t.merchantId] = { name: t.merchantName, total: 0, available: 0 };
      }

      // Converte o Timestamp do Firestore para milisegundos
      const txTime = t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now();
      const isAvailable = txTime <= fortyEightHoursAgo;

      if (t.type === 'earn') {
        stores[t.merchantId].total += t.cashbackAmount;
        if (isAvailable) stores[t.merchantId].available += t.cashbackAmount;
      } else {
        stores[t.merchantId].total -= t.cashbackAmount;
        stores[t.merchantId].available -= t.cashbackAmount;
      }
    });
    return stores;
  }, [transactions]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl w-full max-w-md border border-slate-100 text-center">
          <div className="text-3xl mb-6">🏪</div>
          <h1 className="text-2xl font-black text-[#0a2540] mb-8 uppercase italic">Vizinho+ Carteira</h1>
          
          <div className="bg-slate-50 p-1.5 rounded-2xl flex mb-8 border border-slate-100">
            <button onClick={() => setView('login')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${view === 'login' ? 'bg-white text-[#0a2540] shadow-sm' : 'text-slate-400'}`}>Entrar</button>
            <button onClick={() => setView('register')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${view === 'register' ? 'bg-white text-[#0a2540] shadow-sm' : 'text-slate-400'}`}>Criar Conta</button>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Identificador (NIF/Email/Cartão)</label>
                <input placeholder="Digite aqui..." value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] transition-all" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Sua Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] transition-all" required />
              </div>
              <button disabled={isLoading} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-bold hover:bg-[#153455] transition-all shadow-lg mt-4 disabled:opacity-50">
                {isLoading ? 'A autenticar...' : 'Abrir Minha Carteira'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-left overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
              <input placeholder="Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="NIF (9 dígitos)" value={regNif} onChange={e => setRegNif(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
                <input placeholder="Telemóvel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
              </div>
              <input placeholder="Email Principal" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
              <input placeholder="Código Postal (XXXX-XXX)" value={regZip} onChange={e => setRegZip(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
              <input placeholder="Escolha uma Senha" type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
              <button disabled={isLoading} className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-bold hover:bg-[#00c265] transition-all shadow-md mt-4 disabled:opacity-50">
                {isLoading ? 'A criar...' : 'Finalizar Registo'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 sticky top-0 z-20 flex justify-between items-center px-8">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carteira Vizinho+</p>
          <h2 className="text-xl font-bold text-[#0a2540]">{loggedClient.name.split(' ')[0]}</h2>
        </div>
        <button onClick={() => setIsLogged(false)} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-all">Sair</button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        {/* CARTÃO VIRTUAL */}
        <section className="bg-[#0a2540] rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d66f] rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-white p-5 rounded-[32px] shadow-inner mb-6 scale-110">
              <QRCodeSVG value={loggedClient.cardNumber} size={160} fgColor="#0a2540" />
            </div>
            <p className="text-white text-3xl font-bold tracking-[0.2em] mb-1">{loggedClient.cardNumber}</p>
            <p className="text-[#00d66f] text-[10px] font-bold uppercase tracking-widest">NIF: {loggedClient.nif}</p>
          </div>
        </section>

        {/* SALDOS POR LOJA */}
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-[#0a2540] text-lg uppercase italic">Os Meus Saldos</h3>
          </div>

          {Object.entries(balancesByStore).length > 0 ? (
            Object.entries(balancesByStore).map(([id, data]) => (
              <div key={id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-[#0a2540] text-lg uppercase tracking-tight">{data.name}</p>
                  <span className="p-2 bg-slate-50 rounded-lg text-xl">🏪</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#00d66f]/5 p-4 rounded-2xl border border-[#00d66f]/10 text-center">
                    <p className="text-[9px] font-bold text-[#00d66f] uppercase mb-1">Disponível</p>
                    <p className="font-bold text-2xl text-[#0a2540]">{data.available.toFixed(2)}€</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Pendente</p>
                    <p className="font-bold text-2xl text-slate-400">{(data.total - data.available).toFixed(2)}€</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-[32px] border-2 border-dashed border-slate-200 px-6">
              <p className="text-slate-400 text-xs font-bold uppercase">Sem cashback acumulado.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="text-center px-10 text-slate-300 text-[10px] font-bold uppercase leading-relaxed tracking-tighter">
        O saldo só pode ser utilizado na loja onde foi obtido.
      </footer>
    </div>
  );
};

export default ClientDashboard;