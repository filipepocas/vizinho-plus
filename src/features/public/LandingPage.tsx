import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ShieldCheck, Store, Heart, Zap, Crown, 
  Megaphone, X, Loader2, Send, UserPlus, CheckCircle2, Lock
} from 'lucide-react';
import { db, auth } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LeafletCampaign } from '../../types';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  const [showExternalModal, setShowExternalModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'leaflet'>('banner');
  const [loading, setLoading] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  
  const [prices, setPrices] = useState<any>({});
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);

  // Modais de Termos e Links
  const [showTerms, setShowTerms] = useState(false);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt' });

  // Formulário Empresa Externa
  const [extForm, setExtForm] = useState({ companyName: '', contactName: '', nif: '', email: '', phone: '' });

  // Formulários Banner e Folheto
  const [bannerForm, setBannerForm] = useState({ title: '', startDate: '', endDate: '', imageBase64: '', targetType: 'all', targetValue: '' });
  const [bannerSimulation, setBannerSimulation] = useState<{ count: number, cost: number, days: number } | null>(null);
  const [leafletForm, setLeafletForm] = useState({ campaignId: '', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: '' });
  const [leafletSimulation, setLeafletSimulation] = useState<{ cost: number } | null>(null);

  // Formulário Adesão Lojistas
  const [partnerForm, setPartnerForm] = useState({ shopName: '', responsibleName: '', phone: '', email: '', freguesia: '', zipCode: '' });

  // Formulário Registo Cliente Direto
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', zipCode: '' });
  const [clientLoading, setClientLoading] = useState(false);

  useEffect(() => {
    const fetchSys = async () => {
      const pSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (pSnap.exists()) setPrices(pSnap.data());
      const cSnap = await getDoc(doc(db, 'system', 'config'));
      if (cSnap.exists()) setSysConfig(cSnap.data() as any);
    };
    fetchSys();

    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => {
        const now = new Date();
        setCampaigns(snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign)).filter(c => c.limitDate.toDate() > now));
    });
    return () => unsubCam();
  }, []);

  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'leaflet') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
        if (type === 'banner') setBannerForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
        else setLeafletForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const simulateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extForm.companyName || !extForm.email || !extForm.nif) return toast.error("Preencha os dados da empresa primeiro.");
    if (!bannerForm.startDate || !bannerForm.endDate || !bannerForm.imageBase64) return toast.error("Preencha datas e insira a imagem.");

    const start = new Date(bannerForm.startDate);
    const end = new Date(bannerForm.endDate);
    if (end <= start) return toast.error("A data de fim tem de ser posterior à data de início.");

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

    setLoading(true);
    try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active')));
        let clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        if (bannerForm.targetType === 'cp4' || bannerForm.targetType === 'cp7') {
            const zips = bannerForm.targetValue.split(',').map(z => z.trim());
            clients = clients.filter(c => zips.some(z => (c.zipCode || '').startsWith(z)));
        } else if (bannerForm.targetType === 'birthDate') {
            const currentMonth = new Date().getMonth() + 1;
            clients = clients.filter(c => c.birthDate && parseInt(c.birthDate.split('-')[1]) === currentMonth);
        }

        const count = clients.length;
        const perClientDay = (Number(prices.banner_cost_per_client) || 0.02) * 1.5;
        const minCost = (Number(prices.banner_min_cost) || 10) * 1.5;

        let totalCost = count * perClientDay * days;
        if (totalCost < minCost && count > 0) totalCost = minCost;
        if (count === 0) totalCost = 0;

        setBannerSimulation({ count, cost: totalCost, days });
    } catch(err) { toast.error("Erro na simulação."); } finally { setLoading(false); }
  };

  const simulateLeaflet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extForm.companyName || !extForm.email || !extForm.nif) return toast.error("Preencha os dados da empresa.");
    if (!leafletForm.campaignId || !leafletForm.imageBase64) return toast.error("Selecione o folheto e insira a imagem.");
    
    const baseCost = Number(prices.leaflet_rodape_externo) || 50;
    const finalCost = baseCost * 1.5;
    
    setLeafletSimulation({ cost: finalCost });
  };

  const submitExternalRequest = async (type: 'banner' | 'leaflet') => {
    setLoading(true);
    try {
        const baseData = {
            isExternal: true, status: 'pending', createdAt: serverTimestamp(),
            companyName: extForm.companyName, contactName: extForm.contactName,
            nif: extForm.nif, email: extForm.email, phone: extForm.phone
        };

        if (type === 'banner' && bannerSimulation) {
            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'banner',
                title: bannerForm.title, imageUrl: bannerForm.imageBase64,
                requestedDate: `Início: ${bannerForm.startDate} | Fim: ${bannerForm.endDate} (${bannerSimulation.days} dias)`,
                targetType: bannerForm.targetType, targetValue: bannerForm.targetValue,
                targetCount: bannerSimulation.count, cost: bannerSimulation.cost
            });
        } else if (type === 'leaflet' && leafletSimulation) {
            const camp = campaigns.find(c => c.id === leafletForm.campaignId);
            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'leaflet',
                leafletCampaignId: leafletForm.campaignId, leafletCampaignTitle: camp?.title,
                spaceType: 'Rodapé das Páginas Interiores',
                description: leafletForm.description, sellPrice: leafletForm.sellPrice,
                unit: leafletForm.unit, promoPrice: leafletForm.promoPrice, promoType: leafletForm.promoType,
                imageUrl: leafletForm.imageBase64, cost: leafletSimulation.cost
            });
        }
        
        toast.success("Pedido submetido com sucesso! A nossa equipa entrará em contacto.");
        setShowExternalModal(false); setBannerSimulation(null); setLeafletSimulation(null);
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPartner(true);
    try {
      await addDoc(collection(db, 'merchant_requests'), {
        shopName: partnerForm.shopName, responsibleName: partnerForm.responsibleName,
        email: partnerForm.email, phone: partnerForm.phone, freguesia: partnerForm.freguesia,
        zipCode: partnerForm.zipCode, category: "Indefinida", cashbackPercent: 5,
        status: 'pending', createdAt: serverTimestamp()
      });
      toast.success("Pedido enviado! Em breve a nossa equipa entrará em contacto.");
      setPartnerForm({ shopName: '', responsibleName: '', phone: '', email: '', freguesia: '', zipCode: '' });
    } catch (e) { toast.error("Erro ao enviar o pedido."); } finally { setLoadingPartner(false); }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, clientForm.email.trim(), clientForm.password);
      const uid = userCredential.user.uid;
      let zipClean = clientForm.zipCode.replace(/\D/g, '');
      if (zipClean.length > 4) zipClean = zipClean.substring(0, 4) + '-' + zipClean.substring(4, 7);

      await setDoc(doc(db, 'users', uid), {
        id: uid, name: clientForm.name.trim(), customerNumber: Math.floor(100000000 + Math.random() * 900000000).toString(), 
        phone: clientForm.phone.trim(), zipCode: zipClean, email: clientForm.email.toLowerCase().trim(),
        birthDate: clientForm.birthDate, role: 'client', status: 'active', wallet: { available: 0, pending: 0 }, devices: [], createdAt: serverTimestamp()
      });
      
      toast.success("Bem-vindo ao Vizinho+!");
      navigate('/login');
    } catch (err: any) { toast.error("Erro ao criar conta. Email já em uso?"); } finally { setClientLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#00d66f] selection:text-[#0a2540]">
      
      <nav className="max-w-7xl mx-auto px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <img src={logoPath} alt="Vizinho+" className="h-10 w-auto object-contain" />
        <button onClick={() => setShowExternalModal(true)} className="bg-[#0a2540] text-[#00d66f] px-6 py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl border-2 border-[#00d66f] flex items-center gap-3 animate-pulse hover:bg-[#00d66f] hover:text-[#0a2540] transition-colors">
            <Megaphone size={16} /> Anuncie aqui para milhares de pessoas
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-12 pb-24 text-center flex flex-col items-center">
        <div className="mb-12 animate-in fade-in zoom-in duration-1000">
          <img src={logoPath} alt="Vizinho+" className="h-32 md:h-48 w-auto object-contain drop-shadow-2xl" />
        </div>
        <div className="space-y-6 max-w-3xl mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-[#0a2540] leading-tight tracking-tighter uppercase italic">
            Valorize o que é nosso. <br />
            <span className="text-[#00d66f]">Ganhe em cada compra.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
            A plataforma de fidelização que une os vizinhos e fortalece a economia local. Acumule cashback real em todas as lojas aderentes.
          </p>
        </div>
        
        {/* BOTÃO ALTERADO PARA APENAS LOGIN/RECUPERAR */}
        <button onClick={() => navigate('/login')} className="group relative flex items-center gap-4 bg-[#0a2540] text-white px-10 py-6 rounded-[30px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-105 transition-all duration-300 border-b-8 border-black/40 mb-20">
          Entrar / Recuperar Password
          <Lock className="group-hover:scale-110 transition-transform" size={20} strokeWidth={3} />
        </button>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 w-full border-t border-slate-100 pt-16 mb-24">
          <div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><ShieldCheck size={24} /></div><h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">100% Seguro</h3></div>
          <div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><Store size={24} /></div><h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">Comércio Local</h3></div>
          <div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-[#00d66f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#00d66f]/30"><Zap size={24} fill="currentColor" /></div><h3 className="font-black text-[#00d66f] uppercase text-[10px] tracking-widest">Adesão Grátis</h3></div>
          <div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-400/30"><Crown size={24} fill="currentColor" /></div><h3 className="font-black text-amber-600 uppercase text-[10px] tracking-widest">Ofertas VIP</h3></div>
          <div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-400"><Heart size={24} fill="currentColor" /></div><h3 className="font-black text-[#0a2540] uppercase text-[10px] tracking-widest">Bairro Forte</h3></div>
        </div>

        {/* REGISTO DE CLIENTES E LOJISTAS LADO A LADO */}
        <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl">
            
            {/* NOVO: REGISTO DE CLIENTES */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#00d66f] shadow-[16px_16px_0px_#0a2540] text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><UserPlus className="text-[#00d66f]" size={32} /> Criar Cartão Cliente</h2>
              <p className="text-sm font-bold text-slate-500 mb-8">Registe-se em 1 minuto para aceder ao seu cartão digital gratuito e começar a poupar.</p>
              <form onSubmit={handleClientRegister} className="space-y-4">
                  <input required type="text" placeholder="Nome Completo" value={clientForm.name} onChange={e=>setClientForm({...clientForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                     <input required type="email" placeholder="E-mail" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                     <input required type="tel" placeholder="Telemóvel" value={clientForm.phone} onChange={e=>setClientForm({...clientForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-[#00d66f]">Data Nasc.</label><input required type="date" value={clientForm.birthDate} onChange={e=>setClientForm({...clientForm, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none" /></div>
                     <input required type="text" maxLength={8} placeholder="Cód. Postal" value={clientForm.zipCode} onChange={e=>setClientForm({...clientForm, zipCode: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <input required type="password" placeholder="Definir Password" value={clientForm.password} onChange={e=>setClientForm({...clientForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Ao registar, aceita os <button type="button" onClick={()=>setShowTerms(true)} className="text-[#0a2540] underline">Termos e Condições e RGPD</button>.</p>

                  <button disabled={clientLoading} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform flex justify-center items-center gap-3 mt-6 border-b-4 border-[#0a2540]">
                    {clientLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Obter Cartão Grátis</>}
                  </button>
              </form>
            </div>

            {/* ADESÃO DE LOJISTAS */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_#00d66f] text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><Store className="text-[#00d66f]" size={32} /> Lojista? Junte-se à Rede!</h2>
              <p className="text-sm font-bold text-slate-500 mb-8">Faça parte da nossa comunidade, fidelize clientes e aumente as suas vendas. Preencha os dados e a nossa equipa tratará de tudo.</p>
              
              <form onSubmit={handlePartnerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome da Loja" value={partnerForm.shopName} onChange={e=>setPartnerForm({...partnerForm, shopName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                    <input required type="text" placeholder="Nome do Responsável" value={partnerForm.responsibleName} onChange={e=>setPartnerForm({...partnerForm, responsibleName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="tel" placeholder="Telefone / Tlm" value={partnerForm.phone} onChange={e=>setPartnerForm({...partnerForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                    <input required type="email" placeholder="E-mail Comercial" value={partnerForm.email} onChange={e=>setPartnerForm({...partnerForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Localidade / Freguesia" value={partnerForm.freguesia} onChange={e=>setPartnerForm({...partnerForm, freguesia: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                    <input required type="text" placeholder="Cód. Postal (CP4 ou CP7)" value={partnerForm.zipCode} onChange={e=>setPartnerForm({...partnerForm, zipCode: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>
                  <button disabled={loadingPartner} type="submit" className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex justify-center items-center gap-3 mt-6 shadow-xl">
                    {loadingPartner ? <Loader2 className="animate-spin" /> : <><Send size={20} className="text-[#00d66f]" /> Enviar Pedido de Adesão</>}
                  </button>
              </form>
            </div>
        </div>

      </main>

      <footer className="py-12 flex flex-col items-center gap-6 border-t border-slate-200 mt-20 bg-white">
        <div className="flex gap-6">
          <button onClick={() => {
            navigator.clipboard.writeText(sysConfig.supportEmail);
            toast.success("Email copiado!");
          }} className="text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f] transition-colors">
            Apoio / Contacto
          </button>
          <button onClick={() => setShowTerms(true)} className="text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f] transition-colors">
            Termos & Privacidade
          </button>
        </div>
        <div className="text-center px-6">
          <p className="text-[#0a2540] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local</p>
          <p className="text-slate-400 text-[8px] font-bold max-w-3xl leading-relaxed uppercase">A tecnologia, design, regras de negócio e ideologia do programa Vizinho+ estão legalmente protegidos por direitos de autor e propriedade intelectual. É estritamente proibida a sua reprodução, cópia, venda ou adaptação por entidades não autorizadas, sob pena de instauração de procedimentos civis e criminais.</p>
        </div>
      </footer>

      {/* MODAL EXTERNO, MODAL TERMOS AQUI... (Manteve-se igual para poupar espaço mas garantindo que o fecho e funções funcionam). Vou adicionar o modal de Termos */}
      {showTerms && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-[#00d66f] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic flex items-center gap-2"><ShieldCheck className="text-[#00d66f]" /> Termos de Utilização & RGPD</h3>
              <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-xs font-bold text-slate-600 leading-relaxed custom-scrollbar">
              <p>Ao registares-te no Vizinho+, concordas que a plataforma atua exclusivamente como solução tecnológica facilitadora de atribuição de saldo (cashback) local. A plataforma não é parte integrante de qualquer transação comercial entre Lojistas e Clientes.</p>
              <p>Os teus dados pessoais (Nome, Email, NIF, Código Postal) são recolhidos estritamente para o funcionamento da plataforma e são guardados de forma segura. Não os partilhamos ou vendemos a terceiros para fins publicitários. O NIF é necessário apenas para validar e cruzar as compras efetuadas nas lojas aderentes.</p>
              <p>O saldo de cashback acumulado na carteira não tem valor fiduciário (não pode ser levantado, transferido para contas bancárias ou trocado por dinheiro vivo), servindo unicamente como desconto acumulado a ser utilizado nas lojas da rede Vizinho+.</p>
              <p className="text-red-500">A tecnologia, sistema de gestão de saldos, interface gráfica e ideologia do programa Vizinho+ estão protegidos. É estritamente proibida a sua reprodução ou manipulação de código por entidades não autorizadas.</p>
            </div>
            <div className="p-6 border-t-2 border-slate-100 bg-slate-50"><button onClick={() => setShowTerms(false)} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase tracking-widest shadow-md">Compreendi e Aceito</button></div>
          </div>
        </div>
      )}

      {showExternalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in my-8 relative">
            
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><Megaphone className="text-[#00d66f]" size={24} /><h2 className="font-black uppercase italic tracking-tighter text-xl">Anunciar no Vizinho+</h2></div>
              <button onClick={() => {setShowExternalModal(false); setBannerSimulation(null); setLeafletSimulation(null);}}><X size={24} className="hover:text-red-400"/></button>
            </div>

            <div className="p-8">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 border-b-2 border-slate-100 pb-2">1. Dados da Empresa / Requisitante</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <input required placeholder="Nome da Empresa" value={extForm.companyName} onChange={e=>setExtForm({...extForm, companyName: e.target.value})} className="col-span-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                  <input required placeholder="Pessoa de Contacto" value={extForm.contactName} onChange={e=>setExtForm({...extForm, contactName: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                  <input required placeholder="NIF" maxLength={9} value={extForm.nif} onChange={e=>setExtForm({...extForm, nif: e.target.value.replace(/\D/g, '')})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                  <input required type="email" placeholder="Email" value={extForm.email} onChange={e=>setExtForm({...extForm, email: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                  <input required type="tel" placeholder="Telefone" value={extForm.phone} onChange={e=>setExtForm({...extForm, phone: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
              </div>

              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 border-b-2 border-slate-100 pb-2">2. Tipo de Publicidade</h3>
              <div className="flex gap-2 mb-6">
                 <button onClick={() => {setActiveTab('banner'); setLeafletSimulation(null);}} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${activeTab === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400'}`}>Banner Digital (App)</button>
                 <button onClick={() => {setActiveTab('leaflet'); setBannerSimulation(null);}} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${activeTab === 'leaflet' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400'}`}>Folheto Físico/Digital</button>
              </div>

              {activeTab === 'banner' && (
                <form onSubmit={simulateBanner} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <input required type="date" value={bannerForm.startDate} onChange={e=>setBannerForm({...bannerForm, startDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                      <input required type="date" value={bannerForm.endDate} onChange={e=>setBannerForm({...bannerForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                   </div>
                   <input type="text" placeholder="Título Opcional" value={bannerForm.title} onChange={e=>setBannerForm({...bannerForm, title: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                   
                   <div className="space-y-2">
                      <select required value={bannerForm.targetType} onChange={e=>setBannerForm({...bannerForm, targetType: e.target.value, targetValue: ''})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs uppercase outline-none focus:border-[#00d66f]">
                          <option value="all">Todos os Clientes na App</option>
                          <option value="cp4">Por Código Postal (Ex: 4000)</option>
                          <option value="cp7">Por Cód. Postal Completo (Ex: 4000-123)</option>
                          <option value="birthDate">Aniversariantes do Mês</option>
                      </select>
                      {(bannerForm.targetType === 'cp4' || bannerForm.targetType === 'cp7') && (
                        <input required type="text" placeholder="Insira CPs (Separe por vírgula. Ex: 4000, 4400)" value={bannerForm.targetValue} onChange={e=>setBannerForm({...bannerForm, targetValue: e.target.value})} className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-xl font-black text-xs" />
                      )}
                   </div>

                   <div className="bg-slate-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Upload Imagem (1920x1080px. Máx 500KB)</p>
                      <input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="w-full text-xs font-bold" />
                   </div>

                   {!bannerSimulation ? (
                     <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white py-4 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : 'Calcular Orçamento'}</button>
                   ) : (
                     <div className="bg-[#00d66f] p-6 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2">Orçamento Calculado</p>
                        <p className="text-3xl font-black italic text-[#0a2540]">{formatEuro(bannerSimulation.cost)}</p>
                        <p className="text-[10px] font-bold text-[#0a2540] mb-4">Alcance: {bannerSimulation.count} clientes durante {bannerSimulation.days} dias.</p>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setBannerSimulation(null)} className="flex-1 py-3 bg-white/40 text-[#0a2540] rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                           <button type="button" onClick={() => submitExternalRequest('banner')} className="flex-1 py-3 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[10px]">Avançar com Pedido</button>
                        </div>
                     </div>
                   )}
                </form>
              )}

              {activeTab === 'leaflet' && (
                <form onSubmit={simulateLeaflet} className="space-y-4">
                   <select required value={leafletForm.campaignId} onChange={e=>setLeafletForm({...leafletForm, campaignId: e.target.value})} className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-xl font-black text-sm uppercase outline-none focus:border-[#00d66f]">
                        <option value="">(Escolha a Edição do Folheto)</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                   </select>

                   <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl text-center">
                      <p className="text-[10px] font-black uppercase text-amber-800">Espaço Fixo para Entidades Externas:</p>
                      <p className="text-sm font-black uppercase text-amber-900">Rodapé das Páginas Interiores</p>
                   </div>

                   <input required type="text" placeholder="Nome / Descrição do Produto" value={leafletForm.description} onChange={e=>setLeafletForm({...leafletForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                   
                   <div className="grid grid-cols-2 gap-4">
                      <input required type="text" placeholder="Preço (€)" value={leafletForm.sellPrice} onChange={e=>setLeafletForm({...leafletForm, sellPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                      <input required type="text" placeholder="Unidade (ex: kg, uni)" value={leafletForm.unit} onChange={e=>setLeafletForm({...leafletForm, unit: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                      <input type="text" placeholder="Preço Riscado (Opcional)" value={leafletForm.promoPrice} onChange={e=>setLeafletForm({...leafletForm, promoPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                      <input type="text" placeholder="Destaque (Opcional)" value={leafletForm.promoType} onChange={e=>setLeafletForm({...leafletForm, promoType: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                   </div>

                   <div className="bg-slate-100 p-4 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Upload Imagem (Alta Qualidade. Fundo Branco/Transparente)</p>
                      <input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'leaflet')} className="w-full text-xs font-bold" />
                   </div>

                   {!leafletSimulation ? (
                     <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white py-4 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin"/> : 'Ver Preço do Espaço'}</button>
                   ) : (
                     <div className="bg-[#00d66f] p-6 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2">Orçamento Fixo (Rodapé)</p>
                        <p className="text-3xl font-black italic text-[#0a2540] mb-4">{formatEuro(leafletSimulation.cost)}</p>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setLeafletSimulation(null)} className="flex-1 py-3 bg-white/40 text-[#0a2540] rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                           <button type="button" onClick={() => submitExternalRequest('leaflet')} className="flex-1 py-3 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[10px]">Avançar com Pedido</button>
                        </div>
                     </div>
                   )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;