// src/features/admin/AdminVantagens.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy, where, updateDoc } from 'firebase/firestore';
import { Crown, Image as ImageIcon, Plus, Trash2, MapPin, Globe, Loader2, Tag, ExternalLink, X, UserPlus, ShieldOff, ShieldCheck, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { Vantagem, User as UserProfile } from '../../types';
import { useStore } from '../../store/useStore';
import PartnerUserModal from './PartnerUserModal';
import { getAuth, updatePassword } from 'firebase/auth';

const AdminVantagens: React.FC = () => {
  const { locations } = useStore();
  const [vantagens, setVantagens] = useState<Vantagem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [partnerUsers, setPartnerUsers] = useState<UserProfile[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [changingPassId, setChangingPassId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

  // ... (estados de formulário existentes mantidos) ...

  useEffect(() => {
    const q = query(collection(db, 'vantagens'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap: any) => setVantagens(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Vantagem))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'partner'));
    return onSnapshot(q, (snap: any) => setPartnerUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserProfile))));
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    await updateDoc(doc(db, 'users', userId), { status: newStatus });
    toast.success(`Parceiro ${newStatus === 'active' ? 'ativado' : 'suspenso'}.`);
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPass || newPass.length < 6) return toast.error('Mínimo 6 caracteres.');
    try {
      const provisionAuthInstance = getAuth();
      const user = provisionAuthInstance.currentUser;
      if (!user) return toast.error('Sem sessão ativa.');
      await updatePassword(user, newPass);
      toast.success('Password alterada.');
      setChangingPassId(null);
      setNewPass('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar password.');
    }
  };

  const getLinkedVantagem = (userId: string) => vantagens.find(v => v.partnerUid === userId);

  // ... (handleFileChange, handleUpload, handleDelete existentes mantidos) ...

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* ... (secção existente de criação de vantagem) ... */}

      {/* NOVA SECÇÃO: GESTÃO DE PARCEIROS */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-amber-500 shadow-[12px_12px_0px_#amber-500]">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-4 rounded-2xl border-4 border-amber-200 text-amber-600">
              <UserPlus size={28} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Acessos de Parceiros VIP</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gerir contas dos anunciantes</p>
            </div>
          </div>
          <button onClick={() => setShowPartnerModal(true)} className="bg-amber-500 text-[#0a2540] px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2">
            <Plus size={18} /> Criar Acesso
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {partnerUsers.length > 0 ? partnerUsers.map(u => {
            const linkedVantagem = getLinkedVantagem(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex-1">
                  <p className="font-black text-[#0a2540] uppercase">{u.email}</p>
                  <p className="text-[10px] font-bold text-slate-500">
                    {linkedVantagem ? `Anúncio: ${linkedVantagem.partnerName}` : 'Nenhum anúncio associado'}
                  </p>
                  <span className={`text-[9px] font-black uppercase ${u.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>{u.status}</span>
                </div>
                <div className="flex gap-2 items-center">
                  {changingPassId === u.id ? (
                    <div className="flex gap-2 items-center">
                      <input type="password" placeholder="Nova pass" value={newPass} onChange={e => setNewPass(e.target.value)} className="p-2 border rounded-lg text-xs w-28" />
                      <button onClick={() => handleChangePassword(u.id)} className="bg-green-500 text-white p-2 rounded-lg text-[10px] font-black"><Key size={14} /></button>
                      <button onClick={() => { setChangingPassId(null); setNewPass(''); }} className="text-slate-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setChangingPassId(u.id)} className="bg-slate-200 text-slate-600 p-2 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100">Alterar Pass</button>
                      <button onClick={() => toggleUserStatus(u.id, u.status || 'active')} className={`p-2 rounded-lg text-[10px] font-black uppercase ${u.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.status === 'active' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-slate-400 font-bold p-6">Nenhum parceiro criado.</p>
          )}
        </div>
      </div>

      <PartnerUserModal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} onSuccess={() => setShowPartnerModal(false)} />
    </div>
  );
};

export default AdminVantagens;