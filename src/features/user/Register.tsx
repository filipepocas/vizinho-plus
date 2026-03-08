import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerClientProfile } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    freguesia: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('As passwords não coincidem.');
    }

    if (formData.nif.length !== 9) {
      return setError('O NIF deve ter 9 dígitos.');
    }

    setLoading(true);

    try {
      // 1. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // 2. Gravar perfil completo para os relatórios do Filipe (Admin)
      await registerClientProfile({
        uid: userCredential.user.uid,
        name: formData.name,
        nif: formData.nif,
        freguesia: formData.freguesia,
        email: formData.email,
        role: 'client'
      });

      // 3. Sucesso! Redirecionar para o Dashboard
      navigate('/client');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao criar conta. Verifique se o email já existe.');
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
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Freguesia</label>
              <select 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] appearance-none"
                value={formData.freguesia}
                onChange={e => setFormData({...formData, freguesia: e.target.value})}
              >
                <option value="">Selecionar...</option>
                <option value="freguesia1">Freguesia A</option>
                <option value="freguesia2">Freguesia B</option>
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
            {loading ? 'A CRIAR CONTA...' : 'CRIAR MEU PERFIL ➔'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 font-bold">
          Já tem conta? <button onClick={() => navigate('/client/login')} className="text-[#00d66f] uppercase tracking-widest ml-1">Fazer Login</button>
        </p>
      </div>
    </div>
  );
};

export default Register;