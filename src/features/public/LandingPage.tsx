import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, ShieldCheck, Store, Heart, Zap, Crown, 
  Megaphone, X, Loader2, Send, UserPlus, CheckCircle2, Lock, CalendarPlus, Lightbulb, Copy, Mail
} from 'lucide-react';
import { db, auth } from '../../config/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where, orderBy, onSnapshot, getCountFromServer, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LeafletCampaign } from '../../types';
import { useStore } from '../../store/useStore';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';
  const { locations } = useStore();

  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'leaflet'>('banner');
  const [loading, setLoading] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  
  const [prices, setPrices] = useState<any>({});
  const [campaigns, setCampaigns] = useState<LeafletCampaign[]>([]);
  const [membersCount, setMembersCount] = useState(0);

  const [showTerms, setShowTerms] = useState(false);
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt' });

  const distritos = Object.keys(locations || {}).sort();

  const [extForm, setExtForm] = useState({ companyName: '', contactName: '', nif: '', email: '', phone: '' });
  
  const [bannerForm, setBannerForm] = useState({ 
    title: '', startDate: '', endDate: '', imageBase64: '', 
    targetType: 'zonas', targetValue: '',
    distrito: '', concelho: '', freguesia: '' 
  });

  const [bannerSimulation, setBannerSimulation] = useState<{ count: number, cost: number, days: number } | null>(null);
  const [leafletForm, setLeafletForm] = useState({ campaignId: '', description: '', sellPrice: '', unit: '', promoPrice: '', promoType: '', imageBase64: '' });
  const [leafletSimulation, setLeafletSimulation] = useState<{ cost: number } | null>(null);

  const [partnerForm, setPartnerForm] = useState({ shopName: '', responsibleName: '', phone: '', email: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: '' });
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', distrito: '', concelho: '', freguesia: '', zipCode: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientLoading, setClientLoading] = useState(false);

  const [eventForm, setEventForm] = useState({
    entityName: '', contactName: '', phone: '', email: '', title: '', location: '',
    eventType: '', ticketPrice: '', description: '', startDate: '', endDate: '', startTime: '', imageBase64: '',
    distrito: '', concelho: '', freguesia: ''
  });
  const [eventTargets, setEventTargets] = useState<string[]>([]);

  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const pSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (pSnap.exists()) setPrices(pSnap.data());
      const cSnap = await getDoc(doc(db, 'system', 'config'));
      if (cSnap.exists()) setSysConfig(cSnap.data() as any);

      try {
        const collUsers = collection(db, 'users');
        const snapshot = await getCountFromServer(collUsers);
        setMembersCount(snapshot.data().count);
      } catch (err) { setMembersCount(1250); }
    };
    fetchData();

    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap) => {
        const now = new Date();
        setCampaigns(snap.docs.map(d => ({id: d.id, ...d.data()} as LeafletCampaign)).filter(c => c.limitDate.toDate() > now));
    });
    return () => unsubCam();
  }, []);

  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'leaflet' | 'event') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
        if (type === 'banner') setBannerForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
        else if (type === 'leaflet') setLeafletForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
        else setEventForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const handleAddEventTarget = () => {
    let target = '';
    if (eventForm.freguesia) target = `Freguesia: ${eventForm.freguesia} (${eventForm.concelho})`;
    else if (eventForm.concelho) target = `Concelho: ${eventForm.concelho} (${eventForm.distrito})`;
    else if (eventForm.distrito) target = `Distrito: ${eventForm.distrito}`;
    
    if (target && !eventTargets.includes(target)) {
      setEventTargets([...eventTargets, target]);
      setEventForm({...eventForm, freguesia: '', concelho: ''});
    }
  };

  const simulateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extForm.companyName || !extForm.email || !extForm.nif) return toast.error("Preencha os dados da empresa primeiro.");
    if (!bannerForm.startDate || !bannerForm.endDate || !bannerForm.imageBase64) return toast.error("Preencha datas e insira a imagem.");
    if (!bannerForm.distrito) return toast.error("Selecione pelo menos o Distrito Alvo.");

    const start = new Date(bannerForm.startDate);
    const end = new Date(bannerForm.endDate);
    if (end <= start) return toast.error("A data de fim tem de ser posterior à data de início.");

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

    setLoading(true);
    try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active')));
        let clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        if (bannerForm.freguesia) clients = clients.filter(c => c.freguesia === bannerForm.freguesia);
        else if (bannerForm.concelho) clients = clients.filter(c => c.concelho === bannerForm.concelho);
        else if (bannerForm.distrito) clients = clients.filter(c => c.distrito === bannerForm.distrito);

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
            let targetVal = bannerForm.distrito;
            if (bannerForm.concelho) targetVal += ` > ${bannerForm.concelho}`;
            if (bannerForm.freguesia) targetVal += ` > ${bannerForm.freguesia}`;

            await addDoc(collection(db, 'marketing_requests'), {
                ...baseData, type: 'banner',
                title: bannerForm.title, imageUrl: bannerForm.imageBase64,
                requestedDate: `Início: ${bannerForm.startDate} | Fim: ${bannerForm.endDate} (${bannerSimulation.days} dias)`,
                targetType: 'zonas', targetValue: targetVal,
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
        setShowExternalModal(false); setShowCommunityModal(false); setBannerSimulation(null); setLeafletSimulation(null);
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.distrito || !partnerForm.concelho || !partnerForm.freguesia) {
      return toast.error("Por favor, preencha a localização completa.");
    }
    // EXIGÊNCIA CP7
    const zipCodeRegex = /^\d{4}-\d{3}$/;
    if (!zipCodeRegex.test(partnerForm.zipCode)) return toast.error('CÓDIGO POSTAL DA LOJA INVÁLIDO. USE O FORMATO 0000-000');

    setLoadingPartner(true);
    try {
      // Cria a conta do Lojista com a password escolhida
      const userCredential = await createUserWithEmailAndPassword(auth, partnerForm.email.trim(), partnerForm.password);
      // Logout imediato pois ele só entra após validação do Admin
      await signOut(auth); 
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: partnerForm.shopName.trim(),
        shopName: partnerForm.shopName.trim(),
        responsibleName: partnerForm.responsibleName.trim(),
        phone: partnerForm.phone.trim(),
        email: partnerForm.email.toLowerCase().trim(),
        role: 'merchant',
        status: 'pending', // Bloqueado até validação
        category: partnerForm.category,
        cashbackPercent: 5,
        distrito: partnerForm.distrito,
        concelho: partnerForm.concelho,
        freguesia: partnerForm.freguesia,
        zipCode: partnerForm.zipCode.trim(),
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'merchant_requests'), {
        uid: userCredential.user.uid,
        shopName: partnerForm.shopName, responsibleName: partnerForm.responsibleName,
        email: partnerForm.email, phone: partnerForm.phone, 
        distrito: partnerForm.distrito, concelho: partnerForm.concelho, freguesia: partnerForm.freguesia,
        zipCode: partnerForm.zipCode, category: partnerForm.category,
        status: 'pending', createdAt: serverTimestamp()
      });

      toast.success("Registo concluído! A nossa equipa irá validar o seu acesso em breve.");
      setPartnerForm({ shopName: '', responsibleName: '', phone: '', email: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: '' });
    } catch (e: any) { 
      if(e.code === 'auth/email-already-in-use') toast.error("Este e-mail já está registado.");
      else toast.error("Erro ao registar comerciante."); 
    } finally { setLoadingPartner(false); }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientForm.email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) return toast.error("OS EMAILS NÃO COINCIDEM.");
    if (clientForm.password !== confirmPassword) return toast.error("AS PASSWORDS NÃO COINCIDEM.");
    if (!clientForm.distrito || !clientForm.concelho || !clientForm.freguesia) return toast.error("Preencha a sua morada completa.");

    setClientLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, clientForm.email.trim(), clientForm.password);
      const uid = userCredential.user.uid;
      let zipClean = clientForm.zipCode.replace(/\D/g, '');
      if (zipClean.length > 4) zipClean = zipClean.substring(0, 4) + '-' + zipClean.substring(4, 7);

      await setDoc(doc(db, 'users', uid), {
        id: uid, name: clientForm.name.trim(), customerNumber: Math.floor(100000000 + Math.random() * 900000000).toString(), 
        phone: clientForm.phone.trim(), zipCode: zipClean, email: clientForm.email.toLowerCase().trim(),
        birthDate: clientForm.birthDate, role: 'client', status: 'active', wallet: { available: 0, pending: 0 }, devices: [], 
        distrito: clientForm.distrito, concelho: clientForm.concelho, freguesia: clientForm.freguesia,
        createdAt: serverTimestamp()
      });
      
      toast.success("Bem-vindo ao Vizinho+!");
      navigate('/login');
    } catch (err: any) { toast.error("Erro ao criar conta. Email já em uso?"); } finally { setClientLoading(false); }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!eventForm.imageBase64) return toast.error("A imagem do cartaz é obrigatória.");
    if(eventTargets.length === 0) return toast.error("Adicione pelo menos um Local de Destino.");
    setLoadingEvent(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...eventForm,
        targetZones: eventTargets,
        startDate: new Date(eventForm.startDate),
        endDate: new Date(eventForm.endDate),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Evento enviado para aprovação!");
      setShowEventModal(false); setShowCommunityModal(false);
      setEventForm({entityName:'', contactName:'', phone:'', email:'', title:'', location:'', eventType:'', ticketPrice:'', description:'', startDate:'', endDate:'', startTime:'', imageBase64:'', distrito:'', concelho:'', freguesia:''});
      setEventTargets([]);
    } catch (e) { toast.error("Erro ao enviar evento."); } finally { setLoadingEvent(false); }
  };

  const handleOpenEmailApp = () => {
    window.location.href = `mailto:${sysConfig.supportEmail}?subject=Contacto%20Plataforma%20Vizinho%2B`;
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(sysConfig.supportEmail);
    setEmailCopied(true);
    toast.success("E-mail copiado!");
    setTimeout(() => setEmailCopied(false), 3000);
  };

  // Variaveis de Localização em Cascata
  const clientConcelhos = clientForm.distrito ? Object.keys(locations[clientForm.distrito] || {}).sort() : [];
  const clientFreguesias = clientForm.distrito && clientForm.concelho ? (locations[clientForm.distrito][clientForm.concelho] || []).sort() : [];

  const partnerConcelhos = partnerForm.distrito ? Object.keys(locations[partnerForm.distrito] || {}).sort() : [];
  const partnerFreguesias = partnerForm.distrito && partnerForm.concelho ? (locations[partnerForm.distrito][partnerForm.concelho] || []).sort() : [];

  const extConcelhos = bannerForm.distrito ? Object.keys(locations[bannerForm.distrito] || {}).sort() : [];
  const extFreguesias = bannerForm.distrito && bannerForm.concelho ? (locations[bannerForm.distrito][bannerForm.concelho] || []).sort() : [];

  const eventConcelhos = eventForm.distrito ? Object.keys(locations[eventForm.distrito] || {}).sort() : [];
  const eventFreguesias = eventForm.distrito && eventForm.concelho ? (locations[eventForm.distrito][eventForm.concelho] || []).sort() : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#00d66f] selection:text-[#0a2540]">
      
      {/* AVISOS TOPO */}
      {campaigns.length > 0 && (
        <div className="bg-[#0a2540] text-[#00d66f] text-center p-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-colors" onClick={() => navigate('/login')}>
          🔥 Campanhas Exclusivas em Vigor! Descubra as novidades nos Folhetos Digitais. Clique para Entrar. 🔥
        </div>
      )}
      <div className="bg-amber-400 text-amber-900 text-center p-2 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-amber-500 transition-colors" onClick={() => navigate('/login')}>
        ⭐ Membros têm acesso a Vantagens Exclusivas VIP! Adira Hoje. ⭐
      </div>

      <nav className="max-w-7xl mx-auto px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <img src={logoPath} alt="Vizinho+" className="h-10 w-auto object-contain" />
        <div className="flex gap-3">
            <button onClick={() => setShowCommunityModal(true)} className="bg-[#0a2540] text-[#00d66f] px-6 py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl border-2 border-[#00d66f] flex items-center justify-center gap-2 animate-pulse hover:bg-[#00d66f] hover:text-[#0a2540] transition-colors relative z-20">
                <Lightbulb size={18} fill="currentColor" className="text-amber-300" /> Comunicar na Comunidade
            </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-6 pb-24 text-center flex flex-col items-center">
        
        <div className="bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-full font-black uppercase text-xl md:text-3xl italic tracking-tighter shadow-[8px_8px_0px_#0a2540] mb-12 animate-in slide-in-from-top-10">
          Já somos {membersCount} membros! Junte-se a nós.<br /> <span className="text-white drop-shadow-md">Aqui todos ganhamos!</span>
        </div>

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
        <button onClick={() => navigate('/login')} className="group relative flex items-center gap-4 bg-[#0a2540] text-white px-10 py-6 rounded-[30px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-black hover:scale-105 transition-all duration-300 border-b-8 border-black/40 mb-20 z-10">
          Entrar / Recuperar Password
          <Lock className="group-hover:scale-110 transition-transform" size={20} strokeWidth={3} />
        </button>

        <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl text-left">
            {/* QUADRO CLIENTE */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#00d66f] shadow-[16px_16px_0px_#0a2540] flex flex-col">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><UserPlus className="text-[#00d66f]" size={32} /> Adesão Gratuita Cliente</h2>
              <p className="text-sm font-bold text-slate-500 mb-8">Registe-se em 1 minuto para aceder ao seu cartão digital gratuito e começar a poupar.</p>
              
              <form onSubmit={handleClientRegister} className="space-y-4 flex-grow">
                  <input required type="text" placeholder="Nome Completo" value={clientForm.name} onChange={e=>setClientForm({...clientForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-sm" />
                  
                  <div className="grid grid-cols-1 gap-4">
                     <input required type="email" placeholder="E-mail" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                     <input required type="email" placeholder="Repita o E-mail" value={confirmEmail} onChange={e=>setConfirmEmail(e.target.value)} className="w-full p-4 bg-white border-2 border-[#00d66f] rounded-2xl font-black text-[#0a2540] focus:border-[#0a2540] outline-none text-xs" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <input required type="password" placeholder="Password" value={clientForm.password} onChange={e=>setClientForm({...clientForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                     <input required type="password" placeholder="Repita Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-[#00d66f] rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400">Onde reside? (Acesso à sua rede local)</p>
                     <select required value={clientForm.distrito} onChange={e=>setClientForm({...clientForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f]">
                        <option value="">Escolha Distrito</option>
                        {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                     <select required disabled={!clientForm.distrito} value={clientForm.concelho} onChange={e=>setClientForm({...clientForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Concelho</option>
                        {clientConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select required disabled={!clientForm.concelho} value={clientForm.freguesia} onChange={e=>setClientForm({...clientForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Freguesia</option>
                        {clientFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-[#00d66f]">Data Nasc.</label><input required type="date" value={clientForm.birthDate} onChange={e=>setClientForm({...clientForm, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none" /></div>
                     <input required type="text" maxLength={8} placeholder="Cód. Postal" value={clientForm.zipCode} onChange={e=>setClientForm({...clientForm, zipCode: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  
                  <input required type="tel" placeholder="Telemóvel" value={clientForm.phone} onChange={e=>setClientForm({...clientForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />

                  <p className="text-[9px] font-bold text-slate-400 mt-2">Ao registar, aceita os <button type="button" onClick={()=>setShowTerms(true)} className="text-[#0a2540] underline">Termos e Condições e RGPD</button>.</p>

                  <button disabled={clientLoading} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform flex justify-center items-center gap-3 mt-6 border-b-4 border-[#0a2540]">
                    {clientLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Aderir à Comunidade</>}
                  </button>
              </form>
            </div>

            {/* QUADRO LOJISTA */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_#00d66f] flex flex-col text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><Store className="text-[#00d66f]" size={32} /> Lojista? Junte-se à Rede!</h2>
              <p className="text-sm font-bold text-slate-500 mb-8">Aumente as suas vendas e fidelize os seus vizinhos. Registe os seus dados comerciais.</p>
              
              <form onSubmit={handlePartnerSubmit} className="space-y-4 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome da Loja" value={partnerForm.shopName} onChange={e=>setPartnerForm({...partnerForm, shopName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                    <input required type="text" placeholder="Nome Responsável" value={partnerForm.responsibleName} onChange={e=>setPartnerForm({...partnerForm, responsibleName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="tel" placeholder="Telefone / Tlm" value={partnerForm.phone} onChange={e=>setPartnerForm({...partnerForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                    <input required type="email" placeholder="E-mail Comercial" value={partnerForm.email} onChange={e=>setPartnerForm({...partnerForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <input required type="password" placeholder="Defina Password de Acesso" value={partnerForm.password} onChange={e=>setPartnerForm({...partnerForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                    <input required type="text" placeholder="Setor de Atividade (Ex: Padaria, Café)" value={partnerForm.category} onChange={e=>setPartnerForm({...partnerForm, category: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#00d66f] outline-none text-xs" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400">Localização da Loja Física</p>
                     <select required value={partnerForm.distrito} onChange={e=>setPartnerForm({...partnerForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f]">
                        <option value="">Distrito</option>
                        {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                     <select required disabled={!partnerForm.distrito} value={partnerForm.concelho} onChange={e=>setPartnerForm({...partnerForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Concelho</option>
                        {partnerConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select required disabled={!partnerForm.concelho} value={partnerForm.freguesia} onChange={e=>setPartnerForm({...partnerForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Freguesia</option>
                        {partnerFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                     <input required placeholder="Cód. Postal (0000-000)" value={partnerForm.zipCode} onChange={e=> {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
                        setPartnerForm({...partnerForm, zipCode: val});
                     }} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200" />
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
          <button onClick={() => setShowContactModal(true)} className="text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f] transition-colors flex items-center gap-2"><Mail size={16}/> Apoio / Contacto</button>
          <button onClick={() => setShowTerms(true)} className="text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f] transition-colors">Termos & Privacidade</button>
        </div>
        <div className="text-center px-6">
          <p className="text-[#0a2540] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local</p>
          <p className="text-slate-400 text-[8px] font-bold max-w-3xl leading-relaxed uppercase">A tecnologia, design, regras de negócio e ideologia do programa Vizinho+ estão legalmente protegidos por direitos de autor e propriedade intelectual. É estritamente proibida a sua reprodução, cópia, venda ou adaptação por entidades não autorizadas, sob pena de instauração de procedimentos civis e criminais.</p>
        </div>
      </footer>

      {/* MODAL CONTACTO */}
      {showContactModal && (
        <div className="fixed inset-0 z-[200] bg-[#0a2540]/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border-4 border-[#00d66f]">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><Mail className="text-[#00d66f]" size={20} /><h2 className="font-black uppercase italic tracking-tighter text-lg">Apoio ao Cliente</h2></div>
              <button onClick={() => setShowContactModal(false)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4 text-center">
              <button onClick={handleOpenEmailApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3"><Send size={16} className="text-[#00d66f]"/> Abrir App de Email</button>
              <button onClick={handleCopyEmail} className="w-full bg-slate-50 text-[#0a2540] p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-slate-200 hover:border-[#00d66f] transition-all flex items-center justify-center gap-3"><Copy size={16} /> {emailCopied ? 'Copiado!' : 'Copiar Email'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMUNIDADE */}
      {showCommunityModal && (
         <div className="fixed inset-0 z-[100] bg-[#0a2540]/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
             <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border-4 border-[#0a2540] animate-in zoom-in">
                 <div className="bg-[#0a2540] p-6 text-[#00d66f] flex justify-between items-center"><h2 className="font-black uppercase italic tracking-tighter text-xl flex items-center gap-2"><Lightbulb /> Comunicar na Comunidade</h2><button onClick={() => setShowCommunityModal(false)}><X size={24}/></button></div>
                 <div className="p-8 grid gap-6">
                    <button onClick={() => {setShowCommunityModal(false); setShowEventModal(true);}} className="bg-blue-50 border-4 border-blue-100 hover:border-blue-500 p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 group">
                       <CalendarPlus size={40} className="text-blue-500 group-hover:scale-110 transition-transform" /><h3 className="font-black text-[#0a2540] uppercase text-lg">Comunicar Evento Grátis</h3>
                    </button>
                    <button onClick={() => {setShowCommunityModal(false); setShowExternalModal(true);}} className="bg-[#0a2540] border-4 border-[#0a2540] hover:border-[#00d66f] p-6 rounded-3xl transition-all flex flex-col items-center text-center gap-3 group shadow-xl">
                       <Megaphone size={40} className="text-[#00d66f] group-hover:scale-110 transition-transform" /><h3 className="font-black text-white uppercase text-lg">Promova os seus serviços</h3>
                    </button>
                 </div>
             </div>
         </div>
      )}

      {/* MODAL EVENTOS */}
      {showEventModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[40px] border-4 border-blue-500 shadow-2xl overflow-hidden animate-in zoom-in relative my-8">
            <div className="bg-blue-500 p-6 text-white flex justify-between items-center sticky top-0 z-10"><h2 className="font-black uppercase italic tracking-tighter text-xl flex items-center gap-3"><CalendarPlus size={24} /> Comunicar Evento</h2><button onClick={() => setShowEventModal(false)}><X size={24}/></button></div>
            <div className="p-8">
              <form onSubmit={handleEventSubmit} className="space-y-6">
                 <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 grid grid-cols-1 gap-3">
                    <p className="text-[10px] font-black uppercase text-[#0a2540]">Onde promover o Evento?</p>
                    <select value={eventForm.distrito} onChange={e=>setEventForm({...eventForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200">
                       <option value="">Escolha Distrito</option>
                       {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select disabled={!eventForm.distrito} value={eventForm.concelho} onChange={e=>setEventForm({...eventForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                       <option value="">Concelho (Ou selecione)</option>
                       {eventConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select disabled={!eventForm.concelho} value={eventForm.freguesia} onChange={e=>setEventForm({...eventForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                       <option value="">Freguesia (Ou selecione)</option>
                       {eventFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button type="button" onClick={handleAddEventTarget} disabled={!eventForm.distrito} className="bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] disabled:opacity-50">Adicionar Zona Alvo</button>
                    <div className="flex flex-wrap gap-1"> {eventTargets.map((t, idx) => <span key={idx} className="bg-white text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-blue-200">{t} <X size={10} className="cursor-pointer" onClick={() => setEventTargets(eventTargets.filter((_, i) => i !== idx))}/></span>)} </div>
                 </div>
                 <input required placeholder="Nome Entidade" value={eventForm.entityName} onChange={e=>setEventForm({...eventForm, entityName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" />
                 <input required placeholder="Título Evento" value={eventForm.title} onChange={e=>setEventForm({...eventForm, title: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" />
                 <textarea required placeholder="Descrição" rows={4} value={eventForm.description} onChange={e=>setEventForm({...eventForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 resize-none" />
                 <div className="bg-slate-100 p-4 rounded-2xl"><p className="text-[10px] font-black uppercase text-slate-500 mb-2">Cartaz Evento</p><input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'event')} className="w-full text-xs font-bold" /></div>
                 <button type="submit" disabled={loadingEvent} className="w-full bg-blue-500 text-white py-4 rounded-xl font-black uppercase text-xs flex justify-center items-center gap-2 mt-4 hover:bg-blue-600 transition-colors shadow-lg">{loadingEvent ? <Loader2 className="animate-spin"/> : 'Submeter Evento Grátis'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MARKETING EXTERNO */}
      {showExternalModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
          <div className="bg-white w-full max-w-2xl rounded-[40px] border-4 border-[#0a2540] shadow-2xl overflow-hidden animate-in zoom-in relative my-8">
            <div className="bg-[#0a2540] p-6 text-[#00d66f] flex justify-between items-center sticky top-0 z-10"><h2 className="font-black uppercase italic tracking-tighter text-xl">Promova os seus serviços</h2><button onClick={() => setShowExternalModal(false)}><X size={24}/></button></div>
            <div className="p-8">
              <form onSubmit={simulateBanner} className="space-y-6">
                   <input required placeholder="Nome da Empresa" value={extForm.companyName} onChange={e=>setExtForm({...extForm, companyName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                   <div className="grid grid-cols-2 gap-4">
                      <input required type="date" value={bannerForm.startDate} onChange={e=>setBannerForm({...bannerForm, startDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                      <input required type="date" value={bannerForm.endDate} onChange={e=>setBannerForm({...bannerForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 grid grid-cols-1 gap-3">
                      <p className="text-[10px] font-black uppercase text-[#0a2540]">Onde promover este Banner?</p>
                      <select required value={bannerForm.distrito} onChange={e=>setBannerForm({...bannerForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f]">
                         <option value="">Distrito</option>
                         {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select disabled={!bannerForm.distrito} value={bannerForm.concelho} onChange={e=>setBannerForm({...bannerForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                         <option value="">Todo o Distrito</option>
                         {extConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select disabled={!bannerForm.concelho} value={bannerForm.freguesia} onChange={e=>setBannerForm({...bannerForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                         <option value="">Todo o Concelho</option>
                         {extFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>
                   <div className="bg-slate-100 p-4 rounded-2xl"><p className="text-[10px] font-black uppercase text-slate-500 mb-2">Upload Imagem (1920x1080px)</p><input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="w-full text-xs font-bold" /></div>
                   {!bannerSimulation ? (
                     <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg">{loading ? <Loader2 className="animate-spin"/> : 'Calcular Orçamento'}</button>
                   ) : (
                     <div className="bg-[#00d66f] p-6 rounded-2xl text-center"><p className="text-3xl font-black italic text-[#0a2540]">{formatEuro(bannerSimulation.cost)}</p><button type="button" onClick={() => submitExternalRequest('banner')} className="w-full mt-4 py-3 bg-[#0a2540] text-white rounded-xl font-black uppercase text-[10px] shadow-lg border-b-4 border-black/40">Avançar com Pedido</button></div>
                   )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TERMOS E CONDIÇÕES COMPLETOS */}
      {showTerms && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[40px] border-4 border-[#00d66f] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic flex items-center gap-2"><ShieldCheck className="text-[#00d66f]" /> Termos & RGPD</h3>
              <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6 text-xs font-bold text-slate-600 leading-relaxed custom-scrollbar">
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">1. Natureza da Plataforma</h4>
                <p>Ao registares-te no Vizinho+, aceitas que a plataforma atua exclusivamente como uma solução tecnológica facilitadora de atribuição de saldo (cashback) local. O Vizinho+ é uma ferramenta de mediação técnica, não sendo parte integrante, interveniente ou responsável por qualquer transação comercial direta entre Lojistas e Clientes.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">2. Entidade Responsável e Compromisso de Privacidade</h4>
                <p>O Vizinho+ respeita a tua privacidade e compromete-se a protegê-la. Em conformidade com o Regulamento Geral de Proteção de Dados (RGPD), a entidade responsável pelo tratamento dos dados pessoais recolhidos é a Panóplia Lógica Unipessoal Lda, com sede em Rua da Caselha 170, 4620-421 Nevogilde. Estabelecemos medidas de segurança técnica e organizacionais rigorosas para garantir que o processamento dos teus dados é realizado de forma segura.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">3. Recolha e Utilização de Dados Pessoais</h4>
                <p>A recolha de dados ocorre de forma voluntária quando utilizas os nossos serviços ou entras em contacto connosco. Estes dados (Nome, Email, NIF e Código Postal) são recolhidos estritamente para o funcionamento da plataforma. O NIF é solicitado especificamente para validar, processar e cruzar de forma fidedigna as compras efetuadas nas lojas aderentes.</p>
              </div>
              <div>
                <h4 className="font-black text-[#0a2540] mb-1 uppercase">4. Natureza do Saldo (Cashback)</h4>
                <p>O saldo de cashback acumulado na tua carteira digital Vizinho+ possui uma natureza exclusivamente promocional e não tem valor fiduciário. Não pode ser levantado em numerário, transferido para contas bancárias ou trocado por dinheiro vivo; serve unicamente como desconto acumulado na rede de lojas aderentes.</p>
              </div>
              <div>
                <h4 className="font-black text-red-500 mb-1 uppercase">5. Proteção de Propriedade Intelectual</h4>
                <p>A tecnologia, o sistema de gestão de saldos, a interface gráfica, o design e a ideologia do programa Vizinho+ são propriedade exclusiva da entidade gestora e estão protegidos por direitos de propriedade intelectual. É estritamente proibida a reprodução, cópia, manipulação de código ou engenharia reversa por qualquer indivíduo não autorizado.</p>
              </div>
            </div>
            <div className="p-6 border-t-2 border-slate-100 bg-slate-50"><button onClick={() => setShowTerms(false)} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase tracking-widest shadow-md">Compreendi e Aceito</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;