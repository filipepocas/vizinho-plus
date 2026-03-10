import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerClientProfile } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    postalCode: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const generateCustomerNumber = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validações Locais
    if (formData.password !== formData.confirmPassword) {
      return setError('As passwords não coincidem.');
    }
    if (formData.nif.length !== 9) {
      return setError('O NIF deve ter 9 dígitos.');
    }
    if (formData.postalCode.length < 4) {
      return setError('Introduza um Código Postal válido.');
    }

    setLoading(true);

    try {
      // 2. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const newUser = userCredential.user;

      // Pausa de segurança para propagação da sessão
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Gerar o novo número de cliente
      const customerNumber = generateCustomerNumber();

      // 4. Gravar perfil completo
      try {
        await registerClientProfile({
          id: newUser.uid,
          customerNumber: customerNumber,
          name: formData.name,
          nif: formData.nif,
          postalCode: formData.postalCode,
          phone: formData.phone.trim() || '', // Correção Passo 1: Envia string vazia em vez de undefined
          email: formData.email,
          role: 'client'
        });
        
        // 5. Sucesso! (Passo 2)
        setIsSuccess(true);
        
        // Aguarda 2 segundos para o utilizador ver a mensagem antes de entrar
        setTimeout(() => {
          navigate('/client');
        }, 2000);

      } catch (profileErr: any) {
        await deleteUser(newUser);
        throw profileErr;
      }

    } catch (err: any) {
      console.error("ERRO DETALHADO NO REGISTO:", err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        setError('Erro de permissão no servidor. Por favor, tente novamente ou contacte o Administrador.');
      } else if (err.code === 'auth/weak-password') {
        setError('A password deve ter pelo menos 6 caracteres.');
      } else {
        setError(`Erro: ${err.message || 'Falha ao criar conta. Tente novamente.'}`);
      }
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md border-2 border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic text-[#0a2540]">VIZINHO+</h1>
          <p className="text-xs font-bold text-[#00d66f] uppercase tracking-widest">Criar Perfil de Vizinho</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {isSuccess && (
          <div className="bg-[#00d66f]/10 text-[#00d66f] p-4 rounded-2xl text-xs font-bold mb-6 border border-[#00d66f]/20 text-center animate-bounce">
            ✅ PERFIL CRIADO COM SUCESSO! A ENTRAR...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
            <input 
              type="text" 
              required
              placeholder="Ex: João Silva"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              disabled={isSuccess}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">NIF</label>
              <input 
                type="text" 
                required
                maxLength={9}
                placeholder="9 dígitos"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value})}
                disabled={isSuccess}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telemóvel (Opcional)</label>
              <input 
                type="tel" 
                placeholder="Ex: 912345678"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={isSuccess}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código Postal</label>
            <input 
              type="text" 
              required
              placeholder="0000-000"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
              value={formData.postalCode}
              onChange={e => setFormData({...formData, postalCode: e.target.value})}
              disabled={isSuccess}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
            <input 
              type="email" 
              required
              placeholder="seu@email.com"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              disabled={isSuccess}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                disabled={isSuccess}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirmar</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] transition-all"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                disabled={isSuccess}
              />
            </div>
          </div>

          <button 
            disabled={loading || isSuccess}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-lg pt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isSuccess ? 'SUCESSO!' : 'A PROCESSAR...') : 'CRIAR MEU PERFIL ➔'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 font-bold">
          Já tem conta? <button onClick={() => navigate('/login')} className="text-[#00d66f] uppercase tracking-widest ml-1">Fazer Login</button>
        </p>
      </div>
    </div>
  );
};

export default Register;