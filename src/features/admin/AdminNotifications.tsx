import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { Bell, Send, Trash2, AlertCircle, Loader2, Clock, CheckCircle, XCircle, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

interface NotificationRequest {
  id?: string; title: string; message: string; targetType: string; targetValue: string; 
  targetZones?: string[]; scheduledFor: any; status: 'pending' | 'approved' | 'rejected';
  senderId: string; senderName: string; type: 'merchant_request' | 'admin_broadcast'; createdAt: any;
}

const AdminNotifications: React.FC = () => {
  const { locations } = useStore();
  const [requests, setRequests] = useState<NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', message: '', targetType: 'all', targetValue: '', scheduledDate: '', scheduledTime: '10:00'
  });

  const [sendImmediate, setSendImmediate] = useState(true);
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');
  const [targetZones, setTargetZones] = useState<string[]>([]);

  // PONTO 10: Gera intervalos de 30 minutos
  const availableHours = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    // CORREÇÃO: Adicionado (snap: any) para TS Strict
    return onSnapshot(q, (snap: any) => {
      // CORREÇÃO: Adicionado (d: any) para TS Strict
      setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as NotificationRequest)));
    });
  }, []);

  const handleAddZone = () => {
    let target = '';
    if (freguesia) target = `Freguesia: ${freguesia} (${concelho})`;
    else if (concelho) target = `Concelho: ${concelho} (${distrito})`;
    else if (distrito) target = `Distrito: ${distrito}`;

    if (target && !targetZones.includes(target)) {
      setTargetZones([...targetZones, target]);
      setConcelho(''); setFreguesia('');
    }
  };

  const handleAdminSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return toast.error("Preencha Título e Mensagem.");
    if (!sendImmediate && (!formData.scheduledDate || !formData.scheduledTime)) return toast.error("Preencha Data e Hora.");
    if (formData.targetType === 'zonas' && targetZones.length === 0) return toast.error("Selecione pelo menos uma Zona.");

    setLoading(true);
    try {
      const scheduledDateTime = sendImmediate ? new Date() : new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

      await addDoc(collection(db, 'notifications'), {
        title: formData.title,
        message: formData.message,
        targetType: formData.targetType,
        targetValue: formData.targetValue.trim(),
        targetZones: formData.targetType === 'zonas' ? targetZones : [],
        scheduledFor: scheduledDateTime,
        status: 'approved', 
        type: 'admin_broadcast',
        senderId: 'admin',
        senderName: 'Administração',
        createdAt: serverTimestamp()
      });

      toast.success("Notificação Push agendada!");
      setFormData({ title: '', message: '', targetType: 'all', targetValue: '', scheduledDate: '', scheduledTime: '10:00' });
      setTargetZones([]);
      setSendImmediate(true);
    } catch (err) { toast.error("Erro ao processar envio."); } finally { setLoading(false); }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'reject') {
        if (!window.confirm("Deseja recusar e eliminar este pedido?")) return;
        await deleteDoc(doc(db, 'notifications', id));
        toast.success("Pedido eliminado.");
      } else {
        await updateDoc(doc(db, 'notifications', id), { status: 'approved', approvedAt: serverTimestamp() });
        toast.success("Notificação aprovada!");
      }
    } catch (err) { toast.error("Erro na operação."); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <form onSubmit={handleAdminSend} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540]">
            <Send size={24} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Novo Push Cloud Messaging</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Envio Direto aos Telemóveis (FCM)</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Título do Push</label>
              <input type="text" placeholder="EX: PROMOÇÃO EXCLUSIVA!" required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-sm uppercase outline-none focus:border-[#0a2540]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Mensagem (Corpo)</label>
              <textarea placeholder="Escreva o conteúdo da notificação..." required className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-[#0a2540] resize-none h-40" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-[30px] border-4 border-slate-100">
              <label className="block text-[10px] font-black uppercase text-[#0a2540] mb-4">Segmentação de Clientes</label>
              <select className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-[#0a2540] mb-4" value={formData.targetType} onChange={e => setFormData({...formData, targetType: e.target.value})}>
                <option value="all">TODOS OS DISPOSITIVOS</option>
                <option value="zonas">FILTRO GEOGRÁFICO (ZONAS)</option>
                <option value="email">EMAIL ESPECÍFICO</option>
                <option value="birthDate">ANIVERSARIANTES DO MÊS</option>
              </select>

              {formData.targetType === 'zonas' && (
                <div className="space-y-3 animate-in slide-in-from-top-2">
                  <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500">
                    <option value="">Distrito</option>
                    {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 disabled:opacity-50">
                    <option value="">Todo o Distrito</option>
                    {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 disabled:opacity-50">
                    <option value="">Todo o Concelho</option>
                    {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button type="button" onClick={handleAddZone} disabled={!distrito} className="w-full bg-blue-500 text-white p-3 rounded-xl font-black uppercase text-[10px] disabled:opacity-50">Adicionar Zona</button>
                  {targetZones.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 p-2 bg-white rounded-lg border border-blue-100">
                      {targetZones.map((z, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1 border border-blue-200">
                          {z} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setTargetZones(targetZones.filter((_, i) => i !== idx))}/>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(formData.targetType === 'email' || formData.targetType === 'birthDate') && (
                <div className="animate-in slide-in-from-top-2">
                  <input type="text" placeholder={formData.targetType === 'email' ? "joao@email.com" : "Ex: 04"} required className="w-full p-4 bg-white border-2 border-blue-300 rounded-2xl font-black text-xs outline-none focus:border-blue-500" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} />
                </div>
              )}
            </div>

            <div className="bg-amber-50 p-6 rounded-[30px] border-4 border-amber-100">
              <label className="flex items-center gap-3 text-[10px] font-black uppercase text-amber-800 mb-4 cursor-pointer">
                 <input type="checkbox" checked={sendImmediate} onChange={e=>setSendImmediate(e.target.checked)} className="w-5 h-5 accent-amber-500" /> Fazer Envio Imediato
              </label>
              
              {!sendImmediate && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-amber-700 mb-2 ml-2">Agendar Data</label>
                    <input type="date" required={!sendImmediate} className="w-full p-4 bg-white border-2 border-amber-200 rounded-2xl font-black text-xs outline-none focus:border-amber-500" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-amber-700 mb-2 ml-2">Hora (30 min)</label>
                    <select required={!sendImmediate} className="w-full p-4 bg-white border-2 border-amber-200 rounded-2xl font-black text-xs uppercase outline-none focus:border-amber-500" value={formData.scheduledTime} onChange={e => setFormData({...formData, scheduledTime: e.target.value})}>
                      {availableHours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button disabled={loading} className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1 border-b-4 border-black/50">
          {loading ? <Loader2 className="animate-spin" /> : <Send size={24} strokeWidth={3} />} {sendImmediate ? 'Disparar Push Agora' : 'Agendar Push Notification'}
        </button>
      </form>

      <div className="space-y-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] ml-2 flex items-center gap-2">
          <Clock size={20} className="text-[#00d66f]" /> Histórico de Envios
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {requests.map((req: any) => {
            const scheduledForDate = req.scheduledFor instanceof Date ? req.scheduledFor : req.scheduledFor?.toDate();
            const zones = req.targetZones || [];
            
            return (
              <div key={req.id} className={`bg-white border-4 ${req.status === 'pending' ? 'border-orange-400 shadow-[8px_8px_0px_#ffedd5]' : 'border-slate-200'} rounded-[35px] p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all`}>
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${req.type === 'admin_broadcast' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {req.type === 'admin_broadcast' ? 'ADMIN' : `LOJISTA: ${req.senderName}`}
                    </span>
                    {req.status === 'pending' && (
                      <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-600 px-3 py-1 rounded-full animate-pulse">Pendente</span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-black uppercase text-[#0a2540] text-xl leading-none">{req.title}</h4>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{req.message}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Users size={12} className="text-[#00d66f]" /> Alvo: {req.targetType === 'all' ? 'Todos' : req.targetType === 'zonas' ? zones.join(' | ') : req.targetValue}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Clock size={12} className="text-[#0a2540]" /> Agendado: {scheduledForDate ? scheduledForDate.toLocaleString() : 'Imediato'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {req.status === 'pending' ? (
                    <>
                      <button onClick={() => handleAction(req.id!, 'approve')} className="flex-1 md:flex-none bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs">
                        <CheckCircle size={18} /> Aceitar
                      </button>
                      <button onClick={() => handleAction(req.id!, 'reject')} className="flex-1 md:flex-none bg-red-100 text-red-600 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 font-black uppercase text-xs">
                        <XCircle size={18} /> Recusar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleAction(req.id!, 'reject')} className="bg-slate-100 text-slate-400 p-4 rounded-2xl hover:bg-red-50 text-red-500 transition-all">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;