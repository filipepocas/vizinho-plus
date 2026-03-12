import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { UserPlus, ShieldCheck, ArrowRight, Mail, Lock, User, Hash, Phone, MapPin } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerClientProfile, checkNifExists } = useStore();
  
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

    // 1. Validações Locais Rigorosas
    if (formData.password !== formData.confirmPassword) {
      return setError('As passwords não coincidem.');
    }
    if (formData.nif.length !== 9) {
      return setError('O NIF deve ter exatamente 9 dígitos.');
    }
    if (formData.postalCode.length < 4) {
      return setError('Introduza um Código Postal válido (ex: 4000-000).');
    }

    setLoading(true);

    try {
      // 2. Verificar se o NIF já existe antes de criar a conta Auth
      const nifExists = await checkNifExists(formData.nif);
      if (nifExists) {
        setLoading(false);
        return setError('Este NIF já se encontra registado. Tente fazer login.');
      }

      // 3. Criar utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const newUser = userCredential.user;

      // Pequena pausa para garantir que o Auth context está pronto
      await new Promise(resolve => setTimeout(resolve, 600));

      const customerNumber = generateCustomerNumber();

      // 4. Gravar perfil completo no Firestore
      try {
        await registerClientProfile({
          id: newUser.uid,
          customerNumber: customerNumber,
          name: formData.name,
          nif: formData.nif,
          zipCode: formData.postalCode,
          phone: formData.phone.trim() || '', 
          email: formData.email,
          role: 'client',
          status: 'active',
          wallet: {
            available: 0,
            pending: 0
          }
        });
        
        setIsSuccess(true);
        
        // Redirecionamento após feedback visual de sucesso
        setTimeout(() => {
          navigate('/client');
        }, 1500);

      } catch (profileErr: any) {
        // FAIL-SAFE: Se o Firestore falhar, apaga o user do Auth para permitir nova tentativa
        await deleteUser(newUser);
        throw profileErr;
      }

    } catch (err: any) {
      console.error("ERRO NO REGISTO:", err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A password deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'permission-denied') {
        setError('Erro de permissão no servidor. Contacte o suporte.');
      } else {
        setError(err.message || 'Falha ao criar conta. Tente novamente.');
      }
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-[44px] shadow-2xl w-full max-w-md border-2 border-slate-50 relative overflow-hidden">
        
        {/* Elemento Decorativo Brutalista */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d66f]/5 rounded-bl-[100px] -mr-10 -mt-10" />

        <div className="text-center mb-10 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0a2540] rounded-[22px] mb-4 shadow-xl">
            <UserPlus className="text-[#00d66f]" size={32} />
          </div>
          <h1 className="text-3xl font-black italic text-[#0a2540] tracking-tighter">VIZINHO+</h1>
          <p className="text-[10px] font-black text-[#00d66f] uppercase tracking-[0.2em] mt-1">Registo de Novo Membro</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl text-[11px] font-black mb-6 flex items-center gap-3 animate-shake">
            <span className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">!</span>
            {error.toUpperCase()}
          </div>
        )}

        {isSuccess && (
          <div className="bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl text-[11px] font-black mb-6 flex items-center justify-center gap-3 animate-bounce">
            <ShieldCheck size={20} />
            CONTA CRIADA! A PREPARAR O TEU PAINEL...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
              <User size={12} /> Nome Completo
            </label>
            <input 
              type="text" 
              required
              placeholder="Ex: Manuel Antunes"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              disabled={loading || isSuccess}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                <Hash size={12} /> NIF
              </label>
              <input 
                type="text" 
                required
                maxLength={9}
                placeholder="9 dígitos"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})}
                disabled={loading || isSuccess}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                <Phone size={12} /> Telemóvel
              </label>
              <input 
                type="tel" 
                placeholder="912..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                disabled={loading || isSuccess}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
              <MapPin size={12} /> Código Postal
            </label>
            <input 
              type="text" 
              required
              placeholder="0000-000"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
              value={formData.postalCode}
              onChange={e => setFormData({...formData, postalCode: e.target.value})}
              disabled={loading || isSuccess}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
              <Mail size={12} /> Email de Acesso
            </label>
            <input 
              type="email" 
              required
              placeholder="vizinho@exemplo.pt"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              disabled={loading || isSuccess}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                <Lock size={12} /> Password
              </label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                disabled={loading || isSuccess}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                Confirmar
              </label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] outline-none focus:border-[#00d66f] focus:bg-white transition-all font-bold text-sm"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                disabled={loading || isSuccess}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || isSuccess}
            className="w-full bg-[#0a2540] text-white p-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
          >
            {loading ? 'A Validar Dados...' : (
              <>Criar Minha Conta <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-slate-50 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
            Já fazes parte da vizinhança? 
            <button 
              onClick={() => navigate('/login')} 
              className="text-[#00d66f] ml-2 font-black hover:underline tracking-widest"
            >
              ENTRAR AQUI
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;