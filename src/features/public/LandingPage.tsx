// src/features/public/LandingPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, ShieldCheck, Store, Heart, Zap, Crown, 
  Megaphone, X, Loader2, Send, UserPlus, CheckCircle2, Lock, CalendarPlus, Lightbulb, Copy, Mail, AlertCircle, Image as ImageIcon, ExternalLink, Tag, MapPin, Phone, User
} from 'lucide-react';
import { db, auth } from '../../config/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDoc, doc, setDoc, getDocs, query, where, orderBy, onSnapshot, getCountFromServer } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LeafletCampaign } from '../../types';
import { useStore } from '../../store/useStore';
import ImageCropperModal from '../../components/ImageCropperModal';

const MERCH_CATEGORIES = [
  "Restauração & Bebidas", "Mercearias & Supermercados", "Talhos & Peixarias",
  "Padarias & Pastelarias", "Moda & Acessórios", "Saúde & Farmácias",
  "Beleza & Cabeleireiros", "Oficinas & Automóveis", "Construção & Bricolage",
  "Artigos para Casa & Decoração", "Papelarias & Livrarias", "Floristas & Jardinagem",
  "Petshops & Veterinários", "Tecnologia & Informática", "Desporto & Lazer",
  "Ópticas", "Ourivesarias & Relojoarias", "Lavandarias & Engomadoria",
  "Sapateiros & Reparações", "Educação & Centros de Explicações", "Outros"
];

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
  const [sysConfig, setSysConfig] = useState({ supportEmail: 'ajuda@vizinho-plus.pt', showMemberCount: true });

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

  const [partnerForm, setPartnerForm] = useState({ shopName: '', responsibleName: '', phone: '', email: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: '', address: '' });
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
  const [bannerTargets, setBannerTargets] = useState<string[]>([]);

  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropType, setCropType] = useState<'banner' | 'leaflet' | 'event'>('banner');

  useEffect(() => {
    const fetchData = async () => {
      const pSnap = await getDoc(doc(db, 'system', 'marketing_prices'));
      if (pSnap.exists()) setPrices(pSnap.data());
      const cSnap = await getDoc(doc(db, 'system', 'config'));
      if (cSnap.exists()) setSysConfig(cSnap.data() as any);

      // CORREÇÃO 3: Usar getCountFromServer para obter o número real e exato de utilizadores
      try {
        const coll = collection(db, 'users');
        const snapshot = await getCountFromServer(coll);
        setMembersCount(snapshot.data().count);
      } catch (err) {
        console.error("Erro ao obter contador de utilizadores:", err);
        setMembersCount(0);
      }
    };
    fetchData();

    const qCam = query(collection(db, 'leaflet_campaigns'), orderBy('limitDate', 'desc'));
    const unsubCam = onSnapshot(qCam, (snap: any) => {
        const now = new Date();
        setCampaigns(snap.docs.map((d: any) => ({id: d.id, ...d.data()} as LeafletCampaign)).filter((c: any) => c.limitDate.toDate() > now));
    });
    return () => unsubCam();
  }, []);

  const formatEuro = (val: any) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(val));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'leaflet' | 'event') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'banner') {
      setCropType('banner');
      setFileToCrop(file);
      e.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => { 
        if (type === 'leaflet') setLeafletForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
        else setEventForm(prev => ({...prev, imageBase64: ev.target?.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = (base64: string) => {
    if (cropType === 'banner') {
      setBannerForm(prev => ({ ...prev, imageBase64: base64 }));
    }
    setFileToCrop(null);
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

  const handleAddBannerTarget = () => {
    let target = '';
    if (bannerForm.freguesia) target = `Freguesia: ${bannerForm.freguesia} (${bannerForm.concelho})`;
    else if (bannerForm.concelho) target = `Concelho: ${bannerForm.concelho} (${bannerForm.distrito})`;
    else if (bannerForm.distrito) target = `Distrito: ${bannerForm.distrito}`;
    
    if (target && !bannerTargets.includes(target)) {
      setBannerTargets([...bannerTargets, target]);
      setBannerForm({...bannerForm, freguesia: '', concelho: ''});
    }
  };

  const simulateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extForm.companyName || !extForm.email || !extForm.nif) return toast.error("Preencha os dados da empresa primeiro.");
    if (!bannerForm.startDate || !bannerForm.endDate || !bannerForm.imageBase64) return toast.error("Preencha datas e insira a imagem.");
    if (bannerTargets.length === 0) return toast.error("Adicione pelo menos uma Zona Alvo.");
    
    const start = new Date(bannerForm.startDate);
    const end = new Date(bannerForm.endDate);
    
    if (end < start) return toast.error("A data de fim não pode ser anterior à data de início.");

    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    
    if (start < minDate) return toast.error("Pedidos de publicidade exigem 24h de antecedência.");
    
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    setLoading(true);
    try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active')));
        let clients = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));
        
        clients = clients.filter((c: any) => {
            return bannerTargets.some(z => 
                z.includes(`Freguesia: ${c.freguesia}`) || 
                z.includes(`Concelho: ${c.concelho}`) || 
                z.includes(`Distrito: ${c.distrito}`)
            );
        });

        const count = clients.length;
        const totalCost = count * 0.03 * days; 
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
                targetType: 'zonas', targetZones: bannerTargets,
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
        setBannerTargets([]);
    } catch(err) { toast.error("Erro ao enviar pedido."); } finally { setLoading(false); }
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.category) return toast.error("Selecione a categoria da loja.");
    setLoadingPartner(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, partnerForm.email.trim(), partnerForm.password);
      await signOut(auth); 
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        role: 'merchant',
        status: 'pending',
        createdAt: serverTimestamp(),
        ...partnerForm,
        name: partnerForm.shopName.trim(),
        wallet: { available: 0, pending: 0 }
      });
      await addDoc(collection(db, 'merchant_requests'), { 
        uid: userCredential.user.uid, 
        ...partnerForm, 
        status: 'pending', 
        createdAt: serverTimestamp() 
      });
      toast.success("Pedido enviado com sucesso! Aguarde a aprovação do administrador.");
      setPartnerForm({ shopName: '', responsibleName: '', phone: '', email: '', password: '', category: '', distrito: '', concelho: '', freguesia: '', zipCode: '', address: '' });
    } catch (e: any) { 
        if (e.code === 'auth/email-already-in-use') toast.error("Este email já está registado.");
        else toast.error("Erro no registo."); 
    } finally { setLoadingPartner(false); }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientForm.password !== confirmPassword) return toast.error("As passwords não coincidem.");
    if (clientForm.email !== confirmEmail) return toast.error("Os emails não coincidem.");

    setClientLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, clientForm.email.trim(), clientForm.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        role: 'client',
        status: 'active',
        customerNumber: Math.floor(100000000 + Math.random() * 900000000).toString(),
        createdAt: serverTimestamp(),
        wallet: { available: 0, pending: 0 },
        ...clientForm
      });
      toast.success("Registo efetuado com sucesso!");
      navigate('/login');
    } catch (err: any) { 
        if (err.code === 'auth/email-already-in-use') toast.error("Este email já está registado.");
        else toast.error("Erro ao criar conta."); 
    } finally { setClientLoading(false); }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eventTargets.length === 0) return toast.error("Selecione pelo menos uma Zona Alvo para o evento.");
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
      toast.success("Evento enviado!");
      setShowEventModal(false);
      setEventTargets([]);
    } catch (e) { toast.error("Erro."); } finally { setLoadingEvent(false); }
  };

  const handleOpenEmailApp = () => { window.location.href = `mailto:${sysConfig.supportEmail}`; };
  const handleCopyEmail = () => { navigator.clipboard.writeText(sysConfig.supportEmail); toast.success("Copiado!"); };

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
      
      {campaigns.length > 0 && (
        <div className="bg-[#0a2540] text-[#00d66f] text-center p-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-colors" onClick={() => navigate('/login')}>
          🔥 Campanhas Exclusivas em Vigor! Descobre nos Folhetos Digitais. Clique para Entrar. 🔥
        </div>
      )}
      
      <div className="bg-amber-400 text-amber-900 text-center py-6 px-4 text-[11px] md:text-sm font-black uppercase tracking-widest shadow-md">
        ⭐ Adira à nossa comunidade e aceda a todas as vantagens exclusivas. É grátis! ⭐
      </div>

      <nav className="max-w-7xl mx-auto px-8 py-10 flex flex-col items-center gap-8">
        <img src={logoPath} alt="Vizinho+" className="h-14 w-auto object-contain" />
        
        <div className="w-full flex justify-center mt-2">
            <button 
                onClick={() => setShowCommunityModal(true)} 
                className="w-full max-w-xl bg-[#00d66f] text-[#0a2540] px-6 py-6 rounded-[30px] font-black uppercase text-sm md:text-lg tracking-widest shadow-[0_10px_20px_rgba(0,214,111,0.4)] border-b-8 border-green-700 flex flex-col items-center justify-center gap-2 hover:translate-y-1 hover:border-b-4 hover:shadow-lg transition-all animate-[bounce_3s_infinite] relative z-20"
            >
                <div className="flex items-center gap-3">
                    <Lightbulb size={28} fill="currentColor" className="text-[#0a2540]" /> 
                    <span>Anuncie aqui</span>
                </div>
                <span className="text-[10px] font-bold text-green-900 tracking-normal opacity-90">Promover Negócio, Evento ou Anúncio Local</span>
            </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-6 pb-24 text-center flex flex-col items-center">
        
        {sysConfig.showMemberCount !== false && (
          <div className="w-full max-w-xl bg-[#0a2540] text-white px-8 py-6 rounded-[30px] font-black uppercase text-xl md:text-2xl italic tracking-tighter shadow-2xl mb-12 animate-in slide-in-from-top-10 border-4 border-[#00d66f]">
            Já somos <span className="text-[#00d66f]">{membersCount} membros!</span><br /> 
            <span className="text-sm tracking-widest opacity-80 not-italic">Junte-se a nós. Aqui todos ganhamos!</span>
          </div>
        )}

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
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#00d66f] shadow-[16px_16px_0px_#0a2540] flex flex-col">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><UserPlus className="text-[#00d66f]" size={32} /> Adesão Gratuita Cliente</h2>
              <form onSubmit={handleClientRegister} className="space-y-4 flex-grow">
                  <input required type="text" placeholder="Nome Completo" value={clientForm.name} onChange={e=>setClientForm({...clientForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-sm" />
                  <div className="grid grid-cols-1 gap-4">
                     <input required type="email" placeholder="E-mail" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                     <input required type="email" placeholder="Repita o E-mail" value={confirmEmail} onChange={e=>setConfirmEmail(e.target.value)} className="w-full p-4 bg-white border-2 border-[#00d66f] rounded-2xl font-black text-[#0a2540] focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <input required type="password" placeholder="Definir Password" value={clientForm.password} onChange={e=>setClientForm({...clientForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                     <input required type="password" placeholder="Repita a Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-[#00d66f] rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400">Morada (Acesso à rede local)</p>
                     <select required value={clientForm.distrito} onChange={e=>setClientForm({...clientForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#0a2540]">
                        <option value="">Distrito</option>
                        {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                     <select required disabled={!clientForm.distrito} value={clientForm.concelho} onChange={e=>setClientForm({...clientForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#0a2540] disabled:opacity-50">
                        <option value="">Concelho</option>
                        {clientConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select required disabled={!clientForm.concelho} value={clientForm.freguesia} onChange={e=>setClientForm({...clientForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#0a2540] disabled:opacity-50">
                        <option value="">Freguesia</option>
                        {clientFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-[#00d66f]">Data Nasc.</label><input required type="date" value={clientForm.birthDate} onChange={e=>setClientForm({...clientForm, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none" /></div>
                     <input required type="text" maxLength={8} placeholder="Cód. Postal" value={clientForm.zipCode} onChange={e=>setClientForm({...clientForm, zipCode: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <input required type="tel" placeholder="Telemóvel" value={clientForm.phone} onChange={e=>setClientForm({...clientForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  <button disabled={clientLoading} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform flex justify-center items-center gap-3 mt-6 border-b-4 border-[#0a2540]">
                    {clientLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> Aderir à Comunidade</>}
                  </button>
              </form>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_#0a2540] flex flex-col text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4 flex items-center gap-3"><Store className="text-[#00d66f]" size={32} /> Lojista? Junte-se à Rede!</h2>
              <form onSubmit={handlePartnerSubmit} className="space-y-4 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome da Loja" value={partnerForm.shopName} onChange={e=>setPartnerForm({...partnerForm, shopName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                    <input required type="text" placeholder="Nome do Responsável" value={partnerForm.responsibleName} onChange={e=>setPartnerForm({...partnerForm, responsibleName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="tel" placeholder="Telefone / Tlm" value={partnerForm.phone} onChange={e=>setPartnerForm({...partnerForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                    <input required type="email" placeholder="E-mail Comercial" value={partnerForm.email} onChange={e=>setPartnerForm({...partnerForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input required type="password" placeholder="Password de Acesso" value={partnerForm.password} onChange={e=>setPartnerForm({...partnerForm, password: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs" />
                    <select required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-[#0a2540] outline-none text-xs appearance-none" value={partnerForm.category} onChange={e => setPartnerForm({...partnerForm, category: e.target.value})}>
                      <option value="">SELECIONE O SETOR DE ATIVIDADE...</option>
                      {MERCH_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400">Localização Comercial</p>
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
                     <input required placeholder="Morada Exata (Rua, Número)" value={partnerForm.address} onChange={e=>setPartnerForm({...partnerForm, address: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200" />
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
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-[#00d66f] transition-colors">Termos & Privacidade</a>
        </div>
        <p className="text-[#0a2540] text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-center px-6">Vizinho+ &copy; 2026 • Tecnologia para o Comércio Local</p>
      </footer>

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

      {showEventModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] border-4 border-blue-500 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in relative">
            <div className="bg-blue-500 p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h2 className="font-black uppercase italic tracking-tighter text-xl flex items-center gap-3"><CalendarPlus size={24} /> Comunicar Evento</h2>
              <button onClick={() => setShowEventModal(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
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
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Nome Entidade/Organizador</label><input required value={eventForm.entityName} onChange={e=>setEventForm({...eventForm, entityName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Nome do Responsável</label><input required value={eventForm.contactName} onChange={e=>setEventForm({...eventForm, contactName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Telefone Contato</label><input required type="tel" value={eventForm.phone} onChange={e=>setEventForm({...eventForm, phone: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">E-mail</label><input required type="email" value={eventForm.email} onChange={e=>setEventForm({...eventForm, email: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                 </div>

                 <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Título do Evento</label><input required value={eventForm.title} onChange={e=>setEventForm({...eventForm, title: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" /></div>
                 <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Local da Realização</label><input required value={eventForm.location} onChange={e=>setEventForm({...eventForm, location: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                       <label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Tipo de Evento</label>
                       <select required value={eventForm.eventType} onChange={e=>setEventForm({...eventForm, eventType: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs uppercase outline-none focus:border-blue-500">
                          <option value="">Selecione...</option>
                          <option value="Desporto">Desporto</option>
                          <option value="Cultura / Artes">Cultura / Artes</option>
                          <option value="Festa / Música">Festa / Música</option>
                          <option value="Feira / Mercado">Feira / Mercado</option>
                          <option value="Outro">Outro</option>
                       </select>
                    </div>
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Preço Bilhete (Escreva "Grátis" ou valor)</label><input required value={eventForm.ticketPrice} onChange={e=>setEventForm({...eventForm, ticketPrice: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Data de Início</label><input required type="date" value={eventForm.startDate} onChange={e=>setEventForm({...eventForm, startDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Data de Fim</label><input required type="date" value={eventForm.endDate} onChange={e=>setEventForm({...eventForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                    <div className="relative"><label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Hora de Início</label><input required type="time" value={eventForm.startTime} onChange={e=>setEventForm({...eventForm, startTime: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs outline-none focus:border-blue-500" /></div>
                 </div>

                 <div className="relative">
                    <label className="absolute -top-2 left-4 bg-white px-1 text-[8px] font-black uppercase text-blue-500">Descrição Completa</label>
                    <textarea required rows={4} value={eventForm.description} onChange={e=>setEventForm({...eventForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-500 resize-none" />
                 </div>

                 <div className="bg-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1">
                       <p className="text-[10px] font-black uppercase text-[#0a2540] mb-1">Cartaz / Imagem do Evento</p>
                       <p className="text-[9px] font-bold text-slate-500 mb-3 leading-tight">A imagem ideal deve ser quadrada ou retangular vertical. Evite fotografias muito pesadas (Máx. recomendável 1MB).</p>
                       <input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'event')} className="w-full text-xs font-bold" />
                    </div>
                    {eventForm.imageBase64 && (
                       <div className="w-24 h-24 shrink-0 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-sm">
                          <img src={eventForm.imageBase64} alt="Pré-visualização" className="w-full h-full object-contain" />
                       </div>
                    )}
                 </div>

                 <button type="submit" disabled={loadingEvent} className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2 mt-4 hover:bg-blue-600 transition-colors shadow-lg border-b-4 border-blue-700">{loadingEvent ? <Loader2 className="animate-spin"/> : 'Submeter Evento Grátis'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showExternalModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] border-4 border-[#0a2540] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in relative">
            <div className="bg-[#0a2540] p-6 text-[#00d66f] flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h2 className="font-black uppercase italic tracking-tighter text-xl">Promova os seus serviços</h2>
              <button onClick={() => {setShowExternalModal(false); setBannerSimulation(null); setLeafletSimulation(null); setBannerTargets([]);}} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              
              {!bannerSimulation && !leafletSimulation ? (
                  <form onSubmit={activeTab === 'banner' ? simulateBanner : simulateLeaflet} className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 border-b-2 border-slate-100 pb-2">1. Dados da Empresa / Faturação</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <input required placeholder="Nome Empresa" value={extForm.companyName} onChange={e=>setExtForm({...extForm, companyName: e.target.value})} className="md:col-span-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                          <input required placeholder="Pessoa Contacto" value={extForm.contactName} onChange={e=>setExtForm({...extForm, contactName: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                          <input required placeholder="NIF" maxLength={9} value={extForm.nif} onChange={e=>setExtForm({...extForm, nif: e.target.value.replace(/\D/g, '')})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                          <input required type="email" placeholder="Email Contacto" value={extForm.email} onChange={e=>setExtForm({...extForm, email: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                          <input required type="tel" placeholder="Telefone" value={extForm.phone} onChange={e=>setExtForm({...extForm, phone: e.target.value})} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-[#00d66f] outline-none" />
                      </div>
                      
                      <h3 className="text-[10px] font-black uppercase text-slate-400 border-b-2 border-slate-100 pb-2">2. Tipo de Anúncio</h3>
                      <div className="flex gap-2">
                         <button type="button" onClick={() => setActiveTab('banner')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 ${activeTab === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400'}`}>Banner App</button>
                         <button type="button" onClick={() => setActiveTab('leaflet')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 ${activeTab === 'leaflet' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400'}`}>Folheto Digital</button>
                      </div>

                      {activeTab === 'banner' && (
                        <div className="space-y-4 pt-4 animate-in fade-in">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="relative"><label className="text-[8px] font-black uppercase text-[#0a2540] ml-2">Início</label><input required type="date" value={bannerForm.startDate} onChange={e=>setBannerForm({...bannerForm, startDate: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" /></div>
                              <div className="relative"><label className="text-[8px] font-black uppercase text-[#0a2540] ml-2">Fim</label><input required type="date" value={bannerForm.endDate} onChange={e=>setBannerForm({...bannerForm, endDate: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" /></div>
                           </div>
                           
                           <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 grid grid-cols-1 gap-3">
                              <p className="text-[10px] font-black uppercase text-[#0a2540]">Quais Zonas vão ver o Banner?</p>
                              <select value={bannerForm.distrito} onChange={e=>setBannerForm({...bannerForm, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200">
                                 <option value="">Escolha Distrito</option>
                                 {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select disabled={!bannerForm.distrito} value={bannerForm.concelho} onChange={e=>setBannerForm({...bannerForm, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                                 <option value="">Concelho (Ou selecione)</option>
                                 {extConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select disabled={!bannerForm.concelho} value={bannerForm.freguesia} onChange={e=>setBannerForm({...bannerForm, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-blue-200 disabled:opacity-50">
                                 <option value="">Freguesia (Ou selecione)</option>
                                 {extFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <button type="button" onClick={handleAddBannerTarget} disabled={!bannerForm.distrito} className="bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] disabled:opacity-50 hover:bg-blue-600 transition-colors">Adicionar Zona Alvo</button>
                              
                              {bannerTargets.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2"> 
                                  {bannerTargets.map((t, idx) => (
                                    <span key={idx} className="bg-white text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-blue-200 shadow-sm">
                                      {t} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setBannerTargets(bannerTargets.filter((_, i) => i !== idx))}/>
                                    </span>
                                  ))} 
                                </div>
                              )}
                           </div>

                           <div className="bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                              <p className="text-[10px] font-black uppercase mb-3">Imagem do Banner (Horizontal 16:9)</p>
                              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="w-full text-xs font-bold" />
                           </div>
                           
                           {bannerForm.imageBase64 && (
                              <div className="w-full aspect-video bg-white border-2 border-[#00d66f] rounded-xl flex items-center justify-center overflow-hidden shadow-sm mt-4">
                                <img src={bannerForm.imageBase64} alt="Preview Final" className="w-full h-full object-cover" />
                              </div>
                           )}

                           <button type="submit" disabled={loading || !bannerForm.imageBase64} className="w-full bg-[#0a2540] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50">{loading ? <Loader2 className="animate-spin mx-auto"/> : 'Simular Alcance'}</button>
                        </div>
                      )}

                      {activeTab === 'leaflet' && (
                        <div className="space-y-4 animate-in fade-in">
                           <select required value={leafletForm.campaignId} onChange={e=>setLeafletForm({...leafletForm, campaignId: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-sm uppercase outline-none focus:border-[#00d66f]">
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
                           </div>
                           <div className="bg-slate-100 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                              <div className="flex-1">
                                 <p className="text-[10px] font-black uppercase text-[#0a2540] mb-1">Imagem do Produto</p>
                                 <input required type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'leaflet')} className="w-full text-xs font-bold" />
                              </div>
                           </div>
                           <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-[1.02] transition-transform">{loading ? <Loader2 className="animate-spin mx-auto"/> : 'Ver Preço do Espaço'}</button>
                        </div>
                      )}
                  </form>
              ) : (
                  <div className="bg-[#00d66f] p-8 rounded-[30px] text-center border-4 border-[#0a2540] animate-in zoom-in">
                     <p className="text-[10px] font-black uppercase text-[#0a2540] mb-2 opacity-70">Orçamento Previsto</p>
                     <p className="text-4xl font-black italic text-[#0a2540] mb-6">{formatEuro(bannerSimulation?.cost || leafletSimulation?.cost)}</p>
                     <div className="flex gap-3">
                        <button type="button" onClick={() => {setBannerSimulation(null); setLeafletSimulation(null); setBannerTargets([]);}} className="flex-1 py-4 bg-white/30 text-[#0a2540] rounded-2xl font-black uppercase text-[10px]">Editar</button>
                        <button type="button" onClick={() => submitExternalRequest(activeTab)} className="flex-1 py-4 bg-[#0a2540] text-white rounded-2xl font-black uppercase text-[10px] border-b-4 border-black/40">Confirmar</button>
                     </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fileToCrop && (
        <ImageCropperModal 
          file={fileToCrop} 
          onCrop={handleCroppedImage} 
          onCancel={() => setFileToCrop(null)} 
        />
      )}
    </div>
  );
};

export default LandingPage;