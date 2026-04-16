import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, ArrowRight, Smartphone, Volume2, CheckCircle2, AlertTriangle, ArrowLeft, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall'; 
import { requestNotificationPermission } from '../../utils/notifications';

interface RegisterPageProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', zipCode: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [setupStep, setSetupStep] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState('');
  
  const navigate = useNavigate();
  const { isInstallable, installApp } = usePWAInstall();

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
    setFormData({ ...formData, zipCode: val });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error("TENS DE ACEITAR OS TERMOS."); return; }
    if (formData.email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) { toast.error("EMAILS DIFERENTES."); return; }
    if (formData.password !== confirmPassword) { toast.error("PASSWORDS DIFERENTES."); return; }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), {
        id: uid, name: formData.name.trim(), customerNumber: Math.floor(100000000 + Math.random() * 900000000).toString(), 
        phone: formData.phone.trim(), zipCode: formData.zipCode, email: formData.email.toLowerCase().trim(),
        birthDate: formData.birthDate, role: 'client', status: 'active', wallet: { available: 0, pending: 0 }, devices: [], createdAt: serverTimestamp()
      });
      setRegisteredUserId(uid);
      setSetupStep(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("ERRO AO CRIAR CONTA. Email já existe?");
    } finally { setLoading(false); }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white text-[#0a2540] rounded-[40px] border-4 border-[#00d66f] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in zoom-in">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]"><CheckCircle2 size={40} className="text-[#0a2540]" /></div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Bem-vindo(a)!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Para sua comodidade, configure os alertas.</p>
            
            <div className="space-y-4 mt-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-[#00d66f] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg border-2 border-[#0a2540]">
                        <Smartphone size={24} /> Instalar App
                    </button>
                )}
                {Notification.permission !== 'granted' && (
                  <button onClick={() => requestNotificationPermission(registeredUserId)} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[4px_4px_0px_#0a2540]">
                      <Volume2 size={24} /> Ativar Notificações
                  </button>
                )}
                <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest mt-4">Entrar no Painel <ArrowRight className="inline ml-2" size={20} /></button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 py-12 relative">
      <button onClick={() => onBack ? onBack() : navigate('/login')} className="absolute top-8 left-8 p-4 bg-white border-4 border-slate-100 rounded-2xl text-[#0a2540] hover:border-[#00d66f] transition-all"><ArrowLeft size={24} /></button>
      
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 mt-8">
        <div className="text-center mb-10"><h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Ser Vizinho+</h2></div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold" placeholder="Nome Completo" />
          
          <div className="grid grid-cols-1 gap-4">
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Email" />
            <input type="email" required value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} className="w-full p-4 bg-white border-4 border-[#00d66f] rounded-3xl font-bold text-xs" placeholder="Confirmar Email" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Password" />
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Confirmar Pass" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-[#00d66f]">Data de Nasc.</label>
              <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none" />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-[#00d66f]">C. Postal</label>
              <input type="text" maxLength={8} required value={formData.zipCode} onChange={handleZipCodeChange} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs outline-none" placeholder="0000-000" />
            </div>
          </div>
          
          <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-xs" placeholder="Telemóvel" />
          
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mt-2">
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-[#00d66f]" />
            <label htmlFor="terms" className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
              Aceito os <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#0a2540] underline">Termos de Utilização e Privacidade</button>.
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl border-b-8 border-black/10 mt-4">
            {loading ? 'A processar...' : 'Confirmar Registo'}
          </button>
        </form>
      </div>

      {showTermsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-[#00d66f] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic flex items-center gap-2"><ShieldCheck className="text-[#00d66f]" /> Termos & RGPD</h3>
              <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-xs font-bold text-slate-600 leading-relaxed custom-scrollbar">
              <p>Ao registares-te no Vizinho+, aceitas que a plataforma atua exclusivamente como uma solução tecnológica facilitadora de atribuição de saldo (cashback) local. O Vizinho+ é uma ferramenta de mediação técnica, não sendo parte integrante, interveniente ou responsável por qualquer transação comercial direta entre Lojistas e Clientes.</p>
              <p>Em conformidade com o Regulamento Geral de Proteção de Dados (RGPD), a entidade responsável pelo tratamento dos dados pessoais recolhidos é a Panóplia Lógica Unipessoal Lda, com sede em Rua da Caselha 170, 4620-421 Nevogilde. Os teus dados pessoais (Nome, Email, NIF e Código Postal) são recolhidos estritamente para o funcionamento da plataforma. O NIF é solicitado especificamente para validar, processar e cruzar de forma fidedigna as compras efetuadas nas lojas aderentes.</p>
              <p>Garantimos que os teus dados pessoais não são partilhados, cedidos ou vendidos a terceiros para fins publicitários ou de marketing externo.</p>
              <p>O saldo de cashback acumulado na tua carteira digital Vizinho+ possui uma natureza exclusivamente promocional e não tem valor fiduciário. Isto significa que o saldo não pode ser levantado em numerário, transferido para contas bancárias ou trocado por dinheiro vivo; serve unicamente como desconto acumulado nas lojas da rede.</p>
              <p className="text-red-500">A tecnologia, o sistema de gestão de saldos, a interface gráfica, o design e a ideologia do programa Vizinho+ são propriedade exclusiva da entidade gestora e estão protegidos por direitos de propriedade intelectual. É estritamente proibida a reprodução, cópia, manipulação de código ou engenharia reversa por qualquer entidade ou indivíduo não autorizado.</p>
              <p>Para garantir o cumprimento das normas legais, não serão aceites registos de menores de idade. Ao registares-te, declaras ter idade legal igual ou superior a 18 anos.</p>
            </div>
            <div className="p-6 border-t-2 border-slate-100 bg-slate-50"><button onClick={() => setShowTermsModal(false)} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase tracking-widest shadow-md">Compreendi e Aceito</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;