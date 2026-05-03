// src/features/admin/AdminSettings.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { ShieldCheck, Mail, Lock, Save, AlertCircle, CheckCircle2, ExternalLink, Star, Database, ScrollText, HelpCircle, Copy, Smartphone, RefreshCw } from 'lucide-react';
import { SystemConfig } from '../../types';
import toast from 'react-hot-toast';

const defaultMerchantFaqs = `GUIA RÁPIDO DO COMERCIANTE VIZINHO+

1. COMO DAR CASHBACK AOS CLIENTES?
- No menu "Terminal", peça ao cliente o NIF ou o n.º do Cartão Vizinho+ (ou leia o QR Code).
- Insira o número e clique em "Avançar".
- Digite o valor TOTAL da fatura e o número do documento (opcional).
- O sistema calcula automaticamente o cashback com base na sua percentagem.
- Confirme a operação. O cliente recebe uma notificação na hora!

2. COMO O CLIENTE USA O SALDO?
- Se o cliente tiver saldo acumulado, o sistema mostra o valor disponível.
- Pode inserir o valor do desconto que o cliente quer usar (até 50% do valor da compra).
- O cliente paga o valor restante e continua a acumular novo cashback sobre a parte paga.

3. O QUE É O MENU "O MEU CATÁLOGO"?
- Pode publicar os seus produtos com foto e preço.
- Os produtos aparecem no "Marketplace" da App de todos os clientes do seu Concelho.
- Mantenha o seu catálogo atualizado para atrair mais vizinhos à sua loja!

4. COMO FUNCIONA O "DESPERDÍCIO ZERO"?
- Se tem sobras do dia (pão, refeições, etc.), publique um anúncio.
- Escolha até 2 Concelhos onde quer que ele apareça.
- O anúncio expira automaticamente à hora que definir. Os clientes adoram estas oportunidades!

5. FERRAMENTAS DE MARKETING
- Pode pedir "Banners" ou "Notificações Push" profissionais.
- O custo é calculado automaticamente pelo motor de preços.
- O seu pedido será analisado pelo Administrador Vizinho+ e, se aprovado, será publicado.

6. PRECISA DE AJUDA?
- Consulte o botão "Ler Condições de Adesão" para saber as regras oficiais do programa.
- Contacte o Administrador Vizinho+ através dos canais oficiais.`;

const defaultClientFaqs = `GUIA PASSO-A-PASSO PARA VIZINHOS:

1. O MEU SALDO E CARTÃO DIGITAL
- No painel "O meu Saldo", encontra o seu Cartão Digital com QR Code.
- Apresente este QR Code (ou diga o seu NIF/N.º Cartão) ANTES de pagar na loja.
- O saldo ganho na Loja A só pode ser descontado na Loja A.

2. AVALIAR LOJAS
- Depois de fazer uma compra, vá a "Avaliar Lojas".
- Dê uma nota de 1 a 5 estrelas e diga-nos como foi o serviço.

3. EXPLORAR LOJAS E VANTAGENS
- Use a pesquisa para encontrar Lojas Parceiras ou Vantagens VIP.
- Pode filtrar por Distrito, Concelho e Categorias.

4. ZERO DESPERDÍCIO E EVENTOS
- Fique atento à secção "Zero Desperdício" para oportunidades de última hora nos lojistas locais.
- Acompanhe a "Agenda da Freguesia" para eventos culturais e desportivos.`;

const defaultMerchantTerms = `CONDIÇÕES GERAIS DE ADESÃO AO PROGRAMA VIZINHO+

1. NATUREZA DO SERVIÇO
O Vizinho+ é uma plataforma tecnológica de fidelização local que disponibiliza um sistema de gestão de cashback entre comerciantes e clientes. A plataforma não é parte nas transações comerciais, limitando-se a fornecer a infraestrutura digital para atribuição e resgate de saldo promocional.

2. ADESÃO E PERFIL DO COMERCIANTE
- O registo é gratuito e está sujeito a validação pela administração do Vizinho+.
- O comerciante declara que toda a informação fornecida (NIF, morada, contactos) é verdadeira e atual.
- A percentagem de cashback é definida livremente pelo comerciante no seu painel e pode ser alterada a qualquer momento, aplicando-se apenas a transações futuras.

3. ATRIBUIÇÃO DE CASHBACK (DAR SALDO)
- O comerciante obriga-se a atribuir a percentagem de cashback definida no seu perfil sobre o valor total faturado ao cliente.
- O sistema calcula automaticamente o valor do cashback no momento da transação. A responsabilidade financeira pelo cashback atribuído é exclusivamente do comerciante.
- O cashback gerado fica disponível na carteira digital do cliente de forma imediata.

4. RESGATE DE SALDO (DESCONTO)
- O comerciante obriga-se a aceitar o saldo de cashback como forma de desconto sobre novas compras, até ao limite de 50% do valor da nova fatura.
- O comerciante NÃO pode recusar o desconto se o cliente tiver saldo disponível e cumprir o limite de 50%.
- O valor do desconto é deduzido da responsabilidade do comerciante perante o sistema.

5. OBRIGAÇÕES E RESPONSABILIDADES
- O comerciante é responsável por verificar a identidade do cliente no momento da transação (via NIF/Cartão).
- Qualquer uso fraudulento da plataforma, simulação de transações ou manipulação de saldos resultará no cancelamento imediato da conta e na perda de todos os saldos associados.
- O Vizinho+ reserva-se o direito de auditar as transações e suspender contas em caso de atividade suspeita.

6. PROPRIEDADE INTELECTUAL
A plataforma Vizinho+, incluindo código, design, base de dados e ideologia do programa, é propriedade intelectual da Panóplia Lógica Unipessoal Lda. Não é permitida a reprodução, cópia ou engenharia reversa.`;

const AdminSettings: React.FC = () => {
  const { currentUser, setCurrentUser } = useStore();
  
  const [activeTab, setActiveTab] = useState<'system' | 'security' | 'legal'>('system');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    globalServiceFee: 0, maturationHours: 0, minRedeemAmount: 5.00,
    platformStatus: 'active', supportEmail: 'ajuda@vizinho-plus.pt', vantagensUrl: '', merchantTerms: defaultMerchantTerms,
    clientFaqs: defaultClientFaqs, merchantFaqs: defaultMerchantFaqs, showMemberCount: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setSysConfig({ 
            ...data, 
            supportEmail: data.supportEmail || 'ajuda@vizinho-plus.pt',
            merchantTerms: data.merchantTerms || defaultMerchantTerms,
            clientFaqs: data.clientFaqs || defaultClientFaqs,
            merchantFaqs: data.merchantFaqs || defaultMerchantFaqs,
            showMemberCount: data.showMemberCount !== false
          });
        }
      } catch (e) {
        console.error("Erro:", e);
      }
    };
    fetchConfig();
  }, []);

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'As passwords não coincidem!' }); return; }
    setIsSaving(true); setMessage({ type: '', text: '' });
    try {
      const adminRef = doc(db, 'users', currentUser?.id || 'admin');
      await setDoc(adminRef, { email: newEmail.toLowerCase().trim(), updatedAt: serverTimestamp() }, { merge: true });
      if (currentUser) setCurrentUser({ ...currentUser, email: newEmail });
      setMessage({ type: 'success', text: 'Credenciais atualizadas!' });
      setNewPassword(''); setConfirmPassword('');
    } catch (error) { setMessage({ type: 'error', text: 'Erro ao atualizar.' }); } finally { setIsSaving(false); }
  };

  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setMessage({ type: '', text: '' });
    try {
      await setDoc(doc(db, 'system', 'config'), { ...sysConfig, updatedAt: serverTimestamp(), lastChangeBy: currentUser?.id || 'admin' }, { merge: true });
      setMessage({ type: 'success', text: 'Configurações gravadas com sucesso!' });
    } catch (e) { setMessage({ type: 'error', text: 'Falha ao gravar.' }); } finally { setIsSaving(false); }
  };

  const handleForceCache = async () => {
    setIsCacheLoading(true);
    try {
      const refreshFn = httpsCallable(functions, 'refreshAppCache');
      await refreshFn();
      toast.success('Cache atualizado com sucesso! As alterações já estão visíveis.');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar o cache. Verifique as permissões.');
    } finally {
      setIsCacheLoading(false);
    }
  };

  const handleCopyInstallLink = () => {
    const link = `${window.location.origin}/instalar`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copiado! Partilhe no WhatsApp ou Redes Sociais.');
    }).catch(() => {
      toast.error('Erro ao copiar. Tente manualmente.');
    });
  };

  return (
    <div className="font-sans text-[#0a2540] animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Definições <span className="text-[#00d66f]">Master</span></h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center gap-2"><Database size={12} /> Ajustes Globais da Plataforma</p>
          </div>

          <div className="flex flex-wrap bg-[#0a2540] border-4 border-[#0a2540] p-1 rounded-3xl shadow-[6px_6px_0px_0px_#00d66f]">
            <button onClick={() => setActiveTab('system')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'}`}>Plataforma</button>
            <button onClick={() => setActiveTab('legal')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'legal' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'}`}>Textos & FAQs</button>
            <button onClick={() => setActiveTab('security')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'}`}>Segurança</button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-8 p-6 rounded-3xl border-4 font-black text-[11px] uppercase flex items-center gap-4 animate-in zoom-in-95 ${message.type === 'success' ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' : 'bg-red-50 text-red-600 border-red-500'}`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />} {message.text}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                <div className="space-y-4 md:col-span-2 bg-blue-50 p-6 rounded-3xl border-4 border-blue-100">
                  <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-[#0a2540] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sysConfig.showMemberCount} 
                      onChange={e => setSysConfig({...sysConfig, showMemberCount: e.target.checked})} 
                      className="w-6 h-6 accent-[#00d66f] cursor-pointer" 
                    />
                    Mostrar Contador "Já somos X membros" na Landing Page
                  </label>
                  <p className="text-[10px] font-bold text-slate-500 ml-9">Se desativar esta opção, o quadro verde que diz quantos membros tem a plataforma ficará oculto na página principal.</p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Mail size={16} className="text-[#00d66f]" /> E-mail Apoio ao Cliente (Rodapé)
                  </label>
                  <input type="email" value={sysConfig.supportEmail} onChange={e => setSysConfig({...sysConfig, supportEmail: e.target.value})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black outline-none focus:border-[#00d66f]" />
                </div>

                <div className="space-y-4 bg-amber-50 p-6 rounded-3xl border-4 border-amber-200">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">
                    <Star size={16} className="text-amber-500 fill-amber-500" /> Link "Vantagens VIP" (App Clientes)
                  </label>
                  <div className="relative">
                    <input type="url" placeholder="https://..." value={sysConfig.vantagensUrl} onChange={e => setSysConfig({...sysConfig, vantagensUrl: e.target.value})} className="w-full p-6 bg-white border-4 border-amber-300 rounded-3xl font-black outline-none focus:border-amber-500" />
                    <ExternalLink className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400" size={24} />
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2 bg-green-50 p-6 rounded-3xl border-4 border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-500 p-2 rounded-xl">
                      <Smartphone size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl uppercase italic tracking-tighter text-[#0a2540]">Link de Instalação da App</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Partilhe este link para qualquer pessoa instalar a App Vizinho+ no telemóvel, mesmo sem registo.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/instalar`} 
                      className="flex-1 p-4 bg-white border-2 border-green-300 rounded-2xl font-bold text-xs text-slate-600 outline-none"
                    />
                    <button 
                      type="button"
                      onClick={handleCopyInstallLink}
                      className="bg-[#0a2540] text-[#00d66f] px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Copy size={18} /> Copiar Link
                    </button>
                  </div>
                </div>

                {/* BOTÃO DE FORÇAR CACHE */}
                <div className="space-y-4 md:col-span-2 bg-purple-50 p-6 rounded-3xl border-4 border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-500 p-2 rounded-xl">
                      <Database size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl uppercase italic tracking-tighter text-[#0a2540]">Cache da Plataforma</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Forçar a atualização imediata dos dados em cache (distritos, FAQs, preços).</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleForceCache}
                    disabled={isCacheLoading}
                    className="bg-[#0a2540] text-[#00d66f] px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isCacheLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    {isCacheLoading ? 'A Atualizar...' : 'Atualizar Cache Agora'}
                  </button>
                </div>

              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#00d66f] text-[#0a2540] p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-[#00c265] transition-all shadow-xl border-b-8 border-black/10 flex justify-center gap-2">
                <Save size={20} /> Gravar Configurações
              </button>
            </form>
          </div>
        )}

        {activeTab === 'legal' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              
              <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><ScrollText size={24} /></div>
                    <div>
                        <h3 className="font-black text-xl uppercase italic tracking-tighter text-[#0a2540]">Condições de Adesão Comerciais</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Este texto aparecerá no registo e no painel do Comerciante.</p>
                    </div>
                  </div>
                  <textarea 
                    value={sysConfig.merchantTerms} 
                    onChange={e => setSysConfig({...sysConfig, merchantTerms: e.target.value})} 
                    className="w-full h-64 p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-amber-400 custom-scrollbar resize-none"
                    placeholder="Escreva aqui as regras de negócio..."
                  />
              </div>

              <div className="space-y-4 pt-8 border-t-4 border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><HelpCircle size={24} /></div>
                    <div>
                        <h3 className="font-black text-xl uppercase italic tracking-tighter text-[#0a2540]">Guia / FAQs Lojista</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Instruções de como usar a App. Visível no Painel do Lojista.</p>
                    </div>
                  </div>
                  <textarea 
                    value={sysConfig.merchantFaqs} 
                    onChange={e => setSysConfig({...sysConfig, merchantFaqs: e.target.value})} 
                    className="w-full h-64 p-6 bg-blue-50 border-4 border-blue-100 rounded-3xl font-bold text-sm outline-none focus:border-blue-400 custom-scrollbar resize-none"
                    placeholder="Escreva aqui o passo-a-passo..."
                  />
              </div>

              <div className="space-y-4 pt-8 border-t-4 border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 p-3 rounded-2xl text-green-600"><HelpCircle size={24} /></div>
                    <div>
                        <h3 className="font-black text-xl uppercase italic tracking-tighter text-[#0a2540]">Guia / FAQs Vizinho (Cliente)</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Instruções de como usar a App. Visível no Painel do Cliente.</p>
                    </div>
                  </div>
                  <textarea 
                    value={sysConfig.clientFaqs} 
                    onChange={e => setSysConfig({...sysConfig, clientFaqs: e.target.value})} 
                    className="w-full h-64 p-6 bg-green-50 border-4 border-green-100 rounded-3xl font-bold text-sm outline-none focus:border-green-400 custom-scrollbar resize-none"
                    placeholder="Escreva aqui o passo-a-passo..."
                  />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl flex justify-center gap-2 border-b-4 border-black/50">
                <Save size={20} /> Gravar Textos e Guias
              </button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none"><ShieldCheck size={280} className="text-[#0a2540]" /></div>
            
            <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-10">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Mail size={16} className="text-[#0a2540]" /> E-mail de Administrador</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Lock size={16} className="text-[#0a2540]" /> Nova Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Vazio para manter" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Lock size={16} className="text-[#0a2540]" /> Confirmar Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#0a2540] text-white p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl"><Save size={20} /> Atualizar Credenciais</button>
            </form>
          </div>
        )}
    </div>
  );
};

export default AdminSettings;