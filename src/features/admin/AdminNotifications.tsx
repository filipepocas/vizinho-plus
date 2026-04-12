import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy, updateDoc, where } from 'firebase/firestore';
import { Bell, Send, Trash2, AlertCircle, Loader2, Clock, CheckCircle, XCircle, Users, Mail, MapPin, Cake } from 'lucide-react';
import toast from 'react-hot-toast';

interface NotificationRequest {
  id?: string;
  title: string;
  message: string;
  targetType: 'all' | 'email' | 'zipCode' | 'birthDate' | 'multiple_emails' | 'multiple_zip';
  targetValue: string;
  scheduledFor: any;
  status: 'pending' | 'approved' | 'rejected';
  senderId: string;
  senderName: string;
  type: 'merchant_request' | 'admin_broadcast';
  createdAt: any;
}

const AdminNotifications: React.FC = () => {
  const [requests, setRequests] = useState<NotificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all' as NotificationRequest['targetType'],
    targetValue: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  useEffect(() => {
    // Escuta pedidos pendentes e notificações enviadas
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationRequest)));
    });
  }, []);

  const handleAdminSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }

    setLoading(true);
    try {
      const scheduledDateTime = formData.scheduledDate && formData.scheduledTime 
        ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
        : new Date();

      await addDoc(collection(db, 'notifications'), {
        title: formData.title,
        message: formData.message,
        targetType: formData.targetType,
        targetValue: formData.targetValue.trim(),
        scheduledFor: scheduledDateTime,
        status: 'approved', // Admin envia direto
        type: 'admin_broadcast',
        senderId: 'admin',
        senderName: 'Administração',
        createdAt: serverTimestamp()
      });

      toast.success("Notificação Cloud Messaging agendada!");
      setFormData({ title: '', message: '', targetType: 'all', targetValue: '', scheduledDate: '', scheduledTime: '' });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar envio.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'reject') {
        if (!window.confirm("Deseja recusar e eliminar este pedido?")) return;
        await deleteDoc(doc(db, 'notifications', id));
        toast.success("Pedido eliminado.");
      } else {
        await updateDoc(doc(db, 'notifications', id), {
          status: 'approved',
          approvedAt: serverTimestamp()
        });
        toast.success("Notificação aprovada para envio!");
      }
    } catch (err) {
      toast.error("Erro na operação.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* FORMULÁRIO DE ENVIO DIRETO (ADMIN) */}
      <form onSubmit={handleAdminSend} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540]">
            <Send size={24} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Novo Push Cloud Messaging</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Firebase Cloud Messaging (FCM) Ativo</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Título do Push</label>
              <input type="text" placeholder="EX: PROMOÇÃO EXCLUSIVA!" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Mensagem (Corpo)</label>
              <textarea placeholder="Escreva o conteúdo da notificação..." className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-[#0a2540] resize-none h-32" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Segmentação de Clientes</label>
              <select className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]" value={formData.targetType} onChange={e => setFormData({...formData, targetType: e.target.value as any})}>
                <option value="all">TODOS OS DISPOSITIVOS</option>
                <option value="multiple_zip">CÓDIGOS POSTAIS (CP4/CP7 Separados por vírgula)</option>
                <option value="multiple_emails">LISTA DE EMAILS (Separados por vírgula)</option>
                <option value="birthDate">POR DATA DE NASCIMENTO (DIA/MÊS)</option>
              </select>
            </div>

            {formData.targetType !== 'all' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Valores para Filtro</label>
                <input type="text" placeholder="Ex: 4000, 4450, 4400 ou email@exemplo.com" className="w-full p-5 bg-white border-4 border-[#00d66f] rounded-3xl font-black text-xs outline-none" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Data de Envio</label>
                <input type="date" className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Hora (Aprox.)</label>
                <input type="time" className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-xs outline-none" value={formData.scheduledTime} onChange={e => setFormData({...formData, scheduledTime: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <button disabled={loading} className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1">
          {loading ? <Loader2 className="animate-spin" /> : <Send size={24} strokeWidth={3} />} Agendar Push Notification
        </button>
      </form>

      {/* LISTA DE PEDIDOS PENDENTES (LOJISTAS) E HISTÓRICO */}
      <div className="space-y-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] ml-2 flex items-center gap-2">
          <Clock size={20} className="text-[#00d66f]" /> Gestão de Pedidos e Envios
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <div key={req.id} className={`bg-white border-4 ${req.status === 'pending' ? 'border-orange-400 shadow-[8px_8px_0px_#ffedd5]' : 'border-slate-200'} rounded-[35px] p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all`}>
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${req.type === 'admin_broadcast' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {req.type === 'admin_broadcast' ? 'ADMIN' : `LOJISTA: ${req.senderName}`}
                  </span>
                  {req.status === 'pending' && (
                    <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-600 px-3 py-1 rounded-full animate-pulse">
                      Aguardando Aprovação
                    </span>
                  )}
                </div>
                
                <div>
                  <h4 className="font-black uppercase text-[#0a2540] text-xl leading-none">{req.title}</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">{req.message}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl">
                    <Users size={12} /> {req.targetType === 'all' ? 'Todos' : req.targetValue}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl">
                    <Clock size={12} /> Agendado: {req.scheduledFor instanceof Date ? req.scheduledFor.toLocaleString() : req.scheduledFor?.toDate().toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {req.status === 'pending' ? (
                  <>
                    <button onClick={() => handleAction(req.id!, 'approve')} className="flex-1 md:flex-none bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2 font-black uppercase text-xs">
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
          ))}

          {requests.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
              <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="font-black text-xs uppercase text-slate-400 tracking-widest">Nenhuma atividade de notificações</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;