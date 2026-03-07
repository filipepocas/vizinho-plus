// src/features/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState(''); // Pode ser Email, NIF ou Cartão
  const [password, setPassword] = useState('');
  const { setCurrentUser } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = email.toLowerCase().trim();

    try {
      // 1. VERIFICAR SE É O ADMINISTRADOR (FILIPE)
      if (identifier === 'rochap.filipe@gmail.com' && password === 'admin123') {
        const adminUser = { 
          email: identifier, 
          role: 'admin', 
          name: 'Administrador V+' 
        };
        setCurrentUser(adminUser);
        navigate('/admin');
        return;
      }

      // 2. VERIFICAR SE É UM LOJISTA (PÁGINA 4 DO PDF)
      const merchantsRef = collection(db, 'merchants');
      const qMerchant = query(merchantsRef, where('email', '==', identifier));
      const merchantSnap = await getDocs(qMerchant);

      if (!merchantSnap.empty) {
        const merchantData = merchantSnap.docs[0].data();
        if (merchantData.password === password) {
          if (merchantData.status === 'inactive') {
            return alert("Acesso suspenso. Contacte o Administrador.");
          }
          setCurrentUser({ 
            id: merchantSnap.docs[0].id, 
            ...merchantData, 
            role: 'merchant' 
          });
          navigate('/merchant');
          return;
        }
      }

      // 3. VERIFICAR SE É UM CLIENTE (PÁGINAS 2 E 3 DO PDF)
      // O Cliente pode entrar por NIF, Email ou Número do Cartão
      const clientsRef = collection(db, 'clients');
      const clientQueries = [
        query(clientsRef, where('nif', '==', identifier)),
        query(clientsRef, where('email', '==', identifier)),
        query(clientsRef, where('cardNumber', '==', identifier))
      ];

      for (const q of clientQueries) {
        const clientSnap = await getDocs(q);
        if (!clientSnap.empty) {
          const clientData = clientSnap.docs[0].data();
          if (clientData.password === password) {
            setCurrentUser({ 
              id: clientSnap.docs[0].id, 
              ...clientData, 
              role: 'client' 
            });
            navigate('/client');
            return;
          }
        }
      }

      alert("Credenciais inválidas ou conta inexistente.");

    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro técnico ao tentar aceder. Verifique a ligação.");
    }
  };

  return (
    <div className="min-h-screen bg-vplus-blue flex items-center justify-center p-6 font-mono text-black">
      <div className="bg-white p-8 border-8 border-black shadow-[15px_15px_0_0_rgba(163,230,53,1)] w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black uppercase italic leading-none">V+</h1>
          <p className="text-xs font-bold uppercase tracking-tighter mt-2 bg-black text-white inline-block px-2">
            Cashback System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic">Identificador (Email / NIF / Cartão)</label>
            <input 
              type="text" 
              placeholder="DIGITE AQUI..." 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full p-4 border-4 border-black font-black outline-none focus:bg-vplus-green-light transition-colors" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic">Password</label>
            <input 
              type="password" 
              placeholder="*****" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full p-4 border-4 border-black font-black outline-none focus:bg-vplus-green-light transition-colors" 
              required 
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white p-5 font-black uppercase text-xl border-b-8 border-vplus-green active:border-b-0 active:translate-y-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all"
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-4 border-black flex justify-between items-center">
          <p className="text-[8px] font-bold uppercase opacity-40 italic max-w-[150px]">
            Se é um novo cliente, registe-se diretamente na app de cliente.
          </p>
          <div className="h-8 w-8 bg-vplus-green border-2 border-black rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;