import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Bell, Send, Trash2, AlertCircle, Loader2, Smartphone, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppNotification } from '../../types';

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all' as 'all' | 'email' | 'zipCode' | 'birthDate',
    targetValue: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    if (formData.targetType !== 'all' && !formData.targetValue) {
      toast.error("Preencha o valor do filtro.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: formData.title,
        message: formData.message,
        targetType: formData.targetType,
        targetValue: formData.targetValue.trim(),
        createdAt: serverTimestamp()
      });
      toast.success("Comunicado interno enviado para a App!");
      setFormData({ title: '', message: '', targetType: 'all', targetValue: '' });
    } catch (err) {
      toast.error("Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apagar este comunicado?")) return;
    await deleteDoc(doc(db, 'notifications', id));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* MANUAL ONESIGNAL PUSH */}
      <div className="bg-blue-50 border-4 border-blue-200 p-8 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-blue-900 mb-4 flex items-center gap-3">
                  <Smartphone size={24} className="text-blue-500"/> Enviar Push Notifications (OneSignal)
              </h3>
              <p className="text-sm font-bold text-blue-800 mb-4">Para enviar um alerta real que toca e vibra no telemóvel dos clientes (mesmo com a app fechada):</p>
              <div className="bg-white p-6 rounded-2xl text-xs font-bold text-slate-600 space-y-2 border-2 border-blue-100">
                  <p>1 - Acede a <b className="text-blue-500">onesignal.com</b> e entra na tua conta.</p>
                  <p>2 - Abre a tua app "Vizinho+".</p>
                  <p>3 - Clica no botão azul <b>"New Message"</b> e escolhe <b>"Push"</b>.</p>
                  <p>4 - Escreve o Título, a Mensagem e até podes colocar imagens.</p>
                  <p>5 - Escolhe enviar para "Subscribed Users" (Todos) e clica em <b>"Send Message"</b>.</p>
              </div>
          </div>
          <a href="https://onesignal.com" target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-center whitespace-nowrap">
              Abrir OneSignal <ExternalLink size={18} />
          </a>
      </div>

      <form onSubmit={handleSend} className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#00d66f] p-3 rounded-2xl text-[#0a2540]">
            <Bell size={24} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Avisos Internos (Pop-up na App)</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Aparece APENAS quando o cliente ABRE a App</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Título do Aviso</label>
              <input type="text" placeholder="EX: FELIZ ANIVERSÁRIO!" className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Mensagem Curta</label>
              <textarea placeholder="Escreva a mensagem..." className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-sm outline-none focus:border-[#0a2540] resize-none h-32" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Para quem enviar?</label>
              <select className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xs uppercase outline-none focus:border-[#0a2540]" value={formData.targetType} onChange={e => setFormData({...formData, targetType: e.target.value as any})}>
                <option value="all">TODOS OS VIZINHOS (GLOBAL)</option>
                <option value="zipCode">POR CÓDIGO POSTAL (EX: 4000)</option>
                <option value="birthDate">POR DATA DE NASCIMENTO</option>
                <option value="email">UM CLIENTE ESPECÍFICO (EMAIL)</option>
              </select>
            </div>

            {formData.targetType !== 'all' && (
              <div className="animate-in fade-in">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">
                  {formData.targetType === 'zipCode' && "Inserir os 4 dígitos iniciais (Ex: 4000)"}
                  {formData.targetType === 'birthDate' && "Inserir data no formato YYYY-MM-DD"}
                  {formData.targetType === 'email' && "Inserir E-mail exato do Cliente"}
                </label>
                <input type={formData.targetType === 'birthDate' ? 'date' : 'text'} className="w-full p-5 bg-white border-4 border-[#00d66f] rounded-3xl font-black text-xs outline-none" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} />
              </div>
            )}
          </div>
        </div>

        <button disabled={loading} className="mt-10 w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase italic tracking-tighter text-sm hover:bg-black transition-all flex items-center justify-center gap-4 shadow-xl active:translate-y-1">
          {loading ? <Loader2 className="animate-spin" /> : <Send size={24} strokeWidth={3} />} Enviar Alerta Interno
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-2">Histórico de Avisos Internos</h3>
        {notifications.map(n => (
            <div key={n.id} className="bg-white border-4 border-[#0a2540] rounded-[30px] p-6 flex justify-between items-center gap-4">
              <div className="flex gap-4 items-start">
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-500"><Bell size={20} /></div>
                  <div>
                      <h4 className="font-black uppercase text-[#0a2540] text-lg leading-none mb-2">{n.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mb-3">{n.message}</p>
                      <div className="flex gap-2">
                          <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md text-slate-500">
                             Alvo: {n.targetType === 'all' ? 'Todos' : `${n.targetType}: ${n.targetValue}`}
                          </span>
                          <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md text-slate-500">
                             Enviado a: {n.createdAt?.toDate().toLocaleDateString()}
                          </span>
                      </div>
                  </div>
              </div>
              <button onClick={() => handleDelete(n.id!)} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-colors">
                  <Trash2 size={20} />
              </button>
            </div>
        ))}
        {notifications.length === 0 && (
           <div className="text-center py-10 bg-slate-50 rounded-[30px] border-4 border-dashed border-slate-200">
               <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
               <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Nenhum aviso emitido</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;