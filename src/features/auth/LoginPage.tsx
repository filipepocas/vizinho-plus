import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, ShieldCheck, 
  Zap, Store, X, Loader2, AlertTriangle, Volume2, User, MapPin, Hash, Phone, Tag, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission, registerDeviceInFirebase } from '../../utils/notifications';

interface LoginPageProps {
  installPrompt: any;
  onRegister?: () => void;
  onForgotPassword?: () => void;
}

const MERCH_CATEGORIES = [
  "Restauração & Bebidas", "Mercearias & Supermercados", "Talhos & Peixarias",
  "Padarias & Pastelarias", "Moda & Acessórios", "Saúde & Farmácias",
  "Beleza & Cabeleireiros", "Oficinas & Automóveis", "Construção & Bricolage",
  "Artigos para Casa & Decoração", "Papelarias & Livrarias", "Floristas & Jardinagem",
  "Petshops & Veterinários", "Tecnologia & Informática", "Desporto & Lazer",
  "Ópticas", "Ourivesarias & Relojoarias", "Lavandarias & Engomadoria",
  "Sapateiros & Reparações", "Educação & Centros de Explicações", "Outros"
];

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt, onRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [setupStep, setSetupStep] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [submittingMerchant, setSubmittingMerchant] = useState(false);
  
  const [merchantData, setMerchantData] = useState({
    shopName: '', responsibleName: '', nif: '', email: '', phone: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: ''
  });

  const { isInstallable, installApp } = usePWAInstall();
  const navigate = useNavigate();
  const { setCurrentUser, locations } = useStore();

  const distritos = Object.keys(locations || {}).sort();
  const merchantConcelhos = merchantData.distrito ? Object.keys(locations[merchantData.distrito] || {}).sort() : [];
  const merchantFreguesias = merchantData.distrito && merchantData.concelho ? (locations[merchantData.distrito][merchantData.concelho] || []).sort() : [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        const hasNotif = Notification.permission === 'granted';
        const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        if (!hasNotif || (!isApp && isInstallable)) {
          setTempUserId(uid);
          setTempUserData(userData);
          setSetupStep(true);
          setLoading(false);
          return;
        }
        finalizeLogin(userData);
      }
    } catch (error) { toast.error('EMAIL OU PASSWORD INCORRETOS.'); setLoading(false); }
  };

  const finalizeLogin = async (userData: any) => {
    await registerDeviceInFirebase(userData.id, ""); 
    setCurrentUser(userData);
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'merchant') navigate('/merchant');
    else navigate('/dashboard');
  };

  const handleMerchantRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const zipCodeRegex = /^\d{4}-\d{3}$/;
    if (!zipCodeRegex.test(merchantData.zipCode)) return toast.error('CÓDIGO POSTAL INVÁLIDO. USE O FORMATO 0000-000');
    if (!merchantData.distrito || !merchantData.concelho || !merchantData.freguesia) return toast.error("Preencha a Localização Completa.");
    
    setSubmittingMerchant(true);
    try {
      // 1. Cria o utilizador no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, merchantData.email.trim(), merchantData.password);
      
      // 2. Faz logout imediato para não entrar na conta pendente
      await signOut(auth); 
      
      // 3. Cria o documento do Lojista como "Pendente"
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: merchantData.shopName.trim(),
        shopName: merchantData.shopName.trim(),
        responsibleName: merchantData.responsibleName.trim(),
        phone: merchantData.phone.trim(),
        email: merchantData.email.toLowerCase().trim(),
        nif: merchantData.nif.trim(),
        role: 'merchant',
        status: 'pending',
        category: merchantData.category,
        cashbackPercent: 5,
        distrito: merchantData.distrito,
        concelho: merchantData.concelho,
        freguesia: merchantData.freguesia,
        zipCode: merchantData.zipCode.trim(),
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      // 4. Cria o Pedido para o Admin Aprovar
      await addDoc(collection(db, 'merchant_requests'), { 
        uid: userCredential.user.uid,
        ...merchantData, 
        cashbackPercent: 5,
        status: 'pending', 
        createdAt: serverTimestamp() 
      });

      toast.success('PEDIDO ENVIADO! A SUA CONTA ENCONTRA-SE EM AVALIAÇÃO.');
      setShowMerchantModal(false);
      setMerchantData({shopName: '', responsibleName: '', nif: '', email: '', phone: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: ''});
    } catch (err: any) { 
      if(err.code === 'auth/email-already-in-use') toast.error("Este e-mail já está registado.");
      else toast.error('ERRO AO ENVIAR PEDIDO.'); 
    } 
    finally { setSubmittingMerchant(false); }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white text-[#0a2540] rounded-[40px] border-4 border-[#00d66f] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in slide-in-from-bottom-10">
            <div className="bg-amber-50 p-6 rounded-3xl mb-6 border-2 border-amber-200">
                <AlertTriangle className="mx-auto text-amber-500 mb-3" size={40} />
                <h2 className="text-xl font-black uppercase text-[#0a2540] mb-2 italic">Atenção!</h2>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest leading-relaxed">
                  Para sua comodidade e não perder alertas de saldo, ative as notificações antes de entrar.
                </p>
            </div>
            {diagError && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-6 flex gap-3 text-left">
                  <AlertTriangle className="text-red-500 shrink-0" size={20} />
                  <p className="text-[9px] font-bold text-red-700 leading-tight uppercase">{diagError}</p>
              </div>
            )}
            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-[#00d66f] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg border-b-4 border-black/50 hover:scale-105 transition-transform">
                        <Smartphone size={24} /> Instalar Aplicação
                    </button>
                )}
                {Notification.permission !== 'granted' && (
                  <button onClick={async () => {
                      setDiagError(null);
                      const res = await requestNotificationPermission(tempUserId);
                      if(res.success) {
                        toast.success("Notificações Ativas!");
                        setTimeout(() => finalizeLogin(tempUserData), 1000);
                      } else { setDiagError(res.error || "Erro."); }
                  }} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[4px_4px_0px_#0a2540] hover:scale-105 transition-transform">
                      <Volume2 size={24} /> Permitir Notificações
                  </button>
                )}
            </div>
            <button onClick={() => finalizeLogin(tempUserData)} className="w-full bg-slate-100 text-slate-500 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
              Entrar no meu Perfil <ArrowRight size={16} />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00d66f]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0a2540]/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[32px] mb-6 shadow-2xl transform -rotate-6"><Zap className="text-[#00d66f]" size={40} fill="#00d66f" /></div>
          <h1 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none mb-2">Vizinho<span className="text-[#00d66f]">Plus</span></h1>
        </div>

        <div className="bg-white rounded-[48px] p-8 md:p-10 shadow-2xl border-4 border-slate-100 relative overflow-hidden">
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3"><LogIn className="text-[#00d66f]" size={28} /> Entrar</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="teu@email.com" /></div>
            <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl">{loading ? <Loader2 className="animate-spin" /> : <>Aceder à conta <ArrowRight size={20} /></>}</button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-50 space-y-4 text-center">
            <Link to="/forgot-password" className="block text-slate-400 font-bold text-[10px] uppercase hover:text-[#0a2540] mb-4">Esqueci-me da Password</Link>
            <Link to="/register" className="block text-[#0a2540] font-black uppercase italic text-xs hover:text-[#00d66f]">Cliente - adesão gratuita <ArrowRight className="inline ml-1" size={14} /></Link>
            <button onClick={() => setShowMerchantModal(true)} className="w-full p-4 bg-[#00d66f]/10 text-[#0a2540] rounded-2xl font-black uppercase italic text-[10px] border-2 border-[#00d66f]/20 hover:bg-[#00d66f] transition-all mt-2">Sou Lojista / Quero Aderir</button>
          </div>
          
          <div className="mt-6 text-center"><button onClick={() => setShowTermsModal(true)} className="text-[9px] text-slate-400 uppercase hover:underline font-bold">Termos e Condições e RGPD</button></div>
        </div>
      </div>

      {showMerchantModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
          <div className="bg-white w-full max-w-xl rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in my-8 relative">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3"><Store className="text-[#00d66f]" size={24} /><h2 className="font-black uppercase italic tracking-tighter text-xl">Aderir ao Vizinho+</h2></div>
              <button onClick={() => setShowMerchantModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleMerchantRequest} className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Nome da Loja</label><div className="relative"><Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.shopName} onChange={e => setMerchantData({...merchantData, shopName: e.target.value})} /></div></div>
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Nome do Responsável</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.responsibleName} onChange={e => setMerchantData({...merchantData, responsibleName: e.target.value})} /></div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Email Comercial</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input required type="email" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.email} onChange={e => setMerchantData({...merchantData, email: e.target.value})} /></div></div>
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Telefone / Tlm</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input required type="tel" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.phone} onChange={e => setMerchantData({...merchantData, phone: e.target.value})} /></div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">NIF Comercial</label><div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input required maxLength={9} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.nif} onChange={e => setMerchantData({...merchantData, nif: e.target.value.replace(/\D/g, '')})} /></div></div>
                <div><label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Setor / Categoria</label><div className="relative"><Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><select required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm appearance-none" value={merchantData.category} onChange={e => setMerchantData({...merchantData, category: e.target.value})}><option value="">SELECIONE O SETOR...</option>{MERCH_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}</select></div></div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                 <p className="text-[10px] font-black uppercase text-slate-400">Morada da Loja Física</p>
                 <select required value={merchantData.distrito} onChange={e=>setMerchantData({...merchantData, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f]">
                    <option value="">Distrito</option>
                    {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
                 <select required disabled={!merchantData.distrito} value={merchantData.concelho} onChange={e=>setMerchantData({...merchantData, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                    <option value="">Concelho</option>
                    {merchantConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <select required disabled={!merchantData.concelho} value={merchantData.freguesia} onChange={e=>setMerchantData({...merchantData, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                    <option value="">Freguesia</option>
                    {merchantFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
                 <div className="relative">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                   <input required placeholder="Cód. Postal (0000-000)" value={merchantData.zipCode} onChange={e=> {
                     let val = e.target.value.replace(/\D/g, '');
                     if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
                     setMerchantData({...merchantData, zipCode: val});
                   }} className="w-full pl-12 p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200" />
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Defina uma Password (Para entrar no Painel)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="password" placeholder="Mínimo 6 caracteres" value={merchantData.password} onChange={e => setMerchantData({...merchantData, password: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-slate-400">
                <input required type="checkbox" className="w-4 h-4 accent-[#00d66f]" />
                <p>Confirmo que li e aceito as <a href="/merchant-terms" target="_blank" className="text-[#0a2540] underline flex items-center gap-1 inline-flex"><ExternalLink size={10}/> Condições de Adesão Comerciais</a> e o RGPD.</p>
              </div>

              <button disabled={submittingMerchant} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase flex justify-center gap-3 border-b-4 border-[#0a2540] mt-4 shadow-xl hover:scale-[1.02] transition-transform">
                {submittingMerchant ? <Loader2 className="animate-spin" /> : 'Enviar Pedido de Adesão'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-[#00d66f] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic flex items-center gap-2"><ShieldCheck className="text-[#00d66f]" /> Termos de Utilização & RGPD</h3>
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

export default LoginPage;