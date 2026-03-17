import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { checkNifExists } = useStore();

  // Caminho dinâmico para garantir que o logo carrega
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validação básica de NIF (9 dígitos)
    if (nif.trim().length !== 9) {
      setError('O NIF deve ter exatamente 9 dígitos.');
      setIsLoading(false);
      return;
    }

    // Validação de Código Postal (xxxx-xxx)
    const zipCodeRegex = /^\d{4}-\d{3}$/;
    if (!zipCodeRegex.test(zipCode.trim())) {
      setError('Código Postal inválido. Use o formato 0000-000.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Verificar se o NIF já existe
      const nifExists = await checkNifExists(nif.trim());
      if (nifExists) {
        setError('Este NIF já está registado no sistema.');
        setIsLoading(false);
        return;
      }

      // 2. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 3. Definir Role (Admin para o Filipe, Client para os restantes)
      const userEmail = email.toLowerCase().trim();
      const userRole = userEmail === 'rochap.filipe@gmail.com' ? 'admin' : 'client';

      // 4. Criar documento de perfil no Firestore (Estrutura ADN Limpa)
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name.trim(),
        nif: nif.trim(),
        email: userEmail,
        zipCode: zipCode.trim(),
        role: userRole,
        status: 'active',
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      // 5. Redirecionar conforme a role
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }

    } catch (err: any) {
      console.error("Erro no registo:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em utilização.');
      } else if (err.code === 'auth/weak-password') {
        setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Verifique os dados.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C305C] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Marca de Água no Fundo */}
      <img 
        src={logoPath} 
        alt="" 
        className="absolute bottom-[-50px] right-[-50px] w-96 h-96 opacity-10 pointer-events-none grayscale brightness-200"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />

      <div className="max-w-md w-full bg-white p-8 border-b-8 border-[#00d66f] shadow-2xl z-10">
        
        <div className="mb-6 flex justify-center">
          <img 
            src={logoPath} 
            alt="Vizinho+" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <h2 className="text-3xl font-black text-[#1C305C] mb-2 uppercase tracking-tighter">Criar Conta</h2>
        <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-widest">Novo Cliente Vizinho+</p>
        
        {error && <p className="bg-red-100 text-red-600 p-3 mb-6 text-xs font-bold border-l-4 border-red-600">{error}</p>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">Nome Completo</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
              placeholder="O teu nome"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">NIF</label>
              <input 
                required
                type="text" 
                maxLength={9}
                value={nif}
                onChange={(e) => setNif(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">Código Postal</label>
              <input 
                required
                type="text" 
                maxLength={8}
                value={zipCode}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length > 4) value = value.substring(0, 4) + '-' + value.substring(4, 7);
                  setZipCode(value);
                }}
                className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
                placeholder="0000-000"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">E-mail</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-[#1C305C]">Palavra-passe</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 focus:border-[#1C305C] outline-none font-bold text-sm"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1C305C] text-white p-4 font-black uppercase hover:bg-[#00d66f] hover:text-[#1C305C] transition-all disabled:opacity-50 mt-4"
          >
            {isLoading ? 'A Processar...' : 'Finalizar Registo'}
          </button>
        </form>

        <div className="mt-6 text-center border-t-2 border-gray-100 pt-6">
          <Link 
            to="/login" 
            className="inline-block text-[11px] font-black uppercase text-[#1C305C] hover:text-[#00d66f] transition-all underline underline-offset-4 decoration-2"
          >
            Já tem conta? Faça Login aqui
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;