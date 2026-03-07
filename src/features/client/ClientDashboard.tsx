// src/features/client/ClientDashboard.tsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ClientDashboard: React.FC = () => {
  const { transactions } = useStore();
  
  // ESTADOS DE SESSÃO
  const [isLogged, setIsLogged] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [loggedClient, setLoggedClient] = useState<any>(null);

  // ESTADOS DO FORMULÁRIO
  const [loginId, setLoginId] = useState(''); // NIF, Email ou Cartão
  const [password, setPassword] = useState('');
  
  // ESTADOS DE REGISTO (CONFORME CHECKLIST PAG 3)
  const [regName, setRegName] = useState('');
  const [regNif, setRegNif] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regZip, setRegZip] = useState('');
  const [regPass, setRegPass] = useState('');

  // 1. LÓGICA DE LOGIN (MULTI-IDENTIFICADOR)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientsRef = collection(db, 'clients');
    
    // Procura por NIF, Email ou Número do Cartão
    const queries = [
      query(clientsRef, where('nif', '==', loginId)),
      query(clientsRef, where('email', '==', loginId.toLowerCase())),
      query(clientsRef, where('cardNumber', '==', loginId))
    ];

    for (const q of queries) {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const clientData = snap.docs[0].data();
        if (clientData.password === password) {
          setLoggedClient({ id: snap.docs[0].id, ...clientData });
          setIsLogged(true);
          return;
        }
      }
    }
    alert("Credenciais inválidas. Verifique o identificador e a password.");
  };

  // 2. LÓGICA DE REGISTO (VALIDAÇÃO DE NIF ÚNICO)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regNif.length !== 9) return alert("NIF deve ter 9 dígitos.");

    const q = query(collection(db, 'clients'), where('nif', '==', regNif));
    const existing = await getDocs(q);
    if (!existing.empty) return alert("Este NIF já está registado!");

    const newCardNumber = Math.floor(100000000 + Math.random() * 900000000).toString();

    const newClient = {
      name: regName,
      nif: regNif,
      email: regEmail.toLowerCase(),
      phone: regPhone,
      zipCode: regZip,
      password: regPass,
      cardNumber: newCardNumber,
      createdAt: new Date()
    };

    try {
      await addDoc(collection(db, 'clients'), newClient);
      alert(`Registo concluído! O seu nº de cartão é: ${newCardNumber}`);
      setView('login');
    } catch {
      alert("Erro ao criar conta.");
    }
  };

  // 3. CÁLCULOS DE SALDO (LOGICA MOLECULAR POR LOJA)
  const userTransactions = transactions.filter(t => t.clientId === loggedClient?.cardNumber);
  
  const getBalancesByStore = () => {
    const stores: { [key: string]: { name: string, total: number, available: number } } = {};
    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));

    userTransactions.forEach(t => {
      if (!stores[t.merchantId]) stores[t.merchantId] = { name: t.merchantName, total: 0, available: 0 };
      const isAvailable = new Date(t.createdAt) <= fortyEightHoursAgo;

      if (t.type === 'earn') {
        stores[t.merchantId].total += t.cashbackAmount;
        if (isAvailable) stores[t.merchantId].available += t.cashbackAmount;
      } else {
        stores[t.merchantId].total -= t.cashbackAmount;
        stores[t.merchantId].available -= t.cashbackAmount;
      }
    });
    return stores;
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-4 font-mono text-black">
        <div className="bg-white p-6 border-8 border-black shadow-[12px_12px_0_0_rgba(163,230,53,1)] w-full max-w-md">
          <h1 className="text-3xl font-black uppercase italic mb-6 text-center">V+ CLIENTE</h1>
          
          <div className="flex border-4 border-black mb-6">
            <button onClick={() => setView('login')} className={`flex-1 p-2 font-black uppercase text-xs ${view === 'login' ? 'bg-black text-white' : 'bg-white'}`}>Entrar</button>
            <button onClick={() => setView('register')} className={`flex-1 p-2 font-black uppercase text-xs ${view === 'register' ? 'bg-black text-white' : 'bg-white'}`}>Registo</button>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input placeholder="NIF / EMAIL / CARTÃO" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full p-3 border-4 border-black font-black outline-none" required />
              <input type="password" placeholder="PASSWORD" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border-4 border-black font-black outline-none" required />
              <button className="w-full bg-vplus-green p-4 font-black uppercase border-b-8 border-black active:border-b-0 active:translate-y-1 transition-all">Aceder Carteira</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input placeholder="NOME COMPLETO" value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="NIF" value={regNif} onChange={e => setRegNif(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
                <input placeholder="TELEMÓVEL" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
              </div>
              <input placeholder="EMAIL" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
              <input placeholder="CÓDIGO POSTAL" value={regZip} onChange={e => setRegZip(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
              <input placeholder="PASSWORD" type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full p-2 border-2 border-black font-black text-xs outline-none" required />
              <button className="w-full bg-black text-white p-3 font-black uppercase text-xs border-b-4 border-vplus-green">Criar Conta</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const balances = getBalancesByStore();

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-black pb-10">
      <header className="bg-white border-b-8 border-black p-4 sticky top-0 z-20 flex justify-between items-center">
        <h2 className="font-black italic uppercase">Olá, {loggedClient.name.split(' ')[0]}</h2>
        <button onClick={() => setIsLogged(false)} className="bg-red-500 text-white p-1 border-2 border-black text-[8px] font-black uppercase">Sair</button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <section className="bg-vplus-blue text-white p-6 border-8 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center">
          <div className="bg-white p-4 border-4 border-black mb-4"><QRCodeSVG value={loggedClient.cardNumber} size={140} /></div>
          <p className="text-2xl font-black tracking-widest">{loggedClient.cardNumber}</p>
          <p className="text-[8px] uppercase opacity-50 mt-2">NIF: {loggedClient.nif}</p>
        </section>

        <section className="space-y-4">
          <h3 className="font-black uppercase italic border-b-4 border-black inline-block text-sm">Saldos por Loja</h3>
          {Object.entries(balances).map(([id, data]) => (
            <div key={id} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <p className="font-black uppercase text-lg">{data.name}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-vplus-green-light p-2 border-2 border-black">
                  <p className="text-[7px] font-black uppercase">Disponível</p>
                  <p className="font-black text-xl">{data.available.toFixed(2)}€</p>
                </div>
                <div className="bg-gray-100 p-2 border-2 border-black">
                  <p className="text-[7px] font-black uppercase">Total</p>
                  <p className="font-black text-xl">{data.total.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;