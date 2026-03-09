import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { auth, db } from '../../config/firebase';
import { useStore } from '../../store/useStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerClientProfile } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    freguesia: '',
    postalCode: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // FUNÇÃO PARA GERAR NÚMERO DE CLIENTE (10 DÍGITOS)
  const generateCustomerNumber = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validações de Interface
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
      // 2. Verificação de NIF duplicado
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('nif', '==', formData.nif));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setLoading(false);
        return setError('Este NIF já está associado a uma conta ativa.');
      }

      // 3. Gerar o novo número de cliente de 10 dígitos
      const customerNumber = generateCustomerNumber();

      // 4. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // 5. Gravar perfil completo com o NOVO número gerado
      await registerClientProfile({
        uid: userCredential.user.uid,
        customerNumber: customerNumber, // Campo novo para o cartão
        name: formData.name,
        nif: formData.nif,
        freguesia: formData.freguesia,
        postalCode: formData.postalCode,
        phone: formData.phone || undefined,
        email: formData.email,
        role: 'client'
      });

      // 6. Sucesso!
      navigate('/client');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
            <input 
              type="text" 
              required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">NIF</label>
              <input 
                type="text" 
                required
                maxLength={9}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telemóvel (Opcional)</label>
              <input 
                type="tel" 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código Postal</label>
              <input 
                type="text" 
                required
                placeholder="0000-000"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
                value={formData.postalCode}
                onChange={e => setFormData({...formData, postalCode: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Freguesia</label>
              <select 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] appearance-none"
                value={formData.freguesia}
                onChange={e => setFormData({...formData, freguesia: e.target.value})}
              >
                <option value="">Selecionar...</option>
                <option value="Freguesia A">Freguesia A</option>
                <option value="Freguesia B">Freguesia B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirmar</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f]"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black hover:bg-black transition-all shadow-lg pt-4 disabled:opacity-50"
          >
            {loading ? 'A VERIFICAR...' : 'CRIAR MEU PERFIL ➔'}
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