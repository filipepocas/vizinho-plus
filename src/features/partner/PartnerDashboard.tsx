// src/features/partner/PartnerDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Vantagem } from '../../types';
import { Crown, Image as ImageIcon, Loader2, LogOut, Lock, Save, Key, MapPin, Globe, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage, dataURLtoBlob } from '../../utils/imageUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

const PartnerDashboard: React.FC = () => {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();

  const [myVantagem, setMyVantagem] = useState<Vantagem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    websiteUrl: '',
    address: '',
    category: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showSecurityForm, setShowSecurityForm] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'vantagens'), where('partnerUid', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snap: any) => {
      if (!snap.empty) {
        const docData = snap.docs[0];
        const data = { id: docData.id, ...docData.data() } as Vantagem;
        setMyVantagem(data);
        setFormData({
          description: data.description || '',
          websiteUrl: data.websiteUrl || '',
          address: data.address || '',
          category: data.category || ''
        });
        setPreview(data.imageBase64 || data.imageUrl || '');
      } else {
        setMyVantagem(null);
      }
      setLoading(false);
    }, (error: any) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myVantagem?.id) return toast.error("Anúncio não encontrado.");

    setSaving(true);
    const toastId = toast.loading("A guardar alterações...");
    try {
      let imageUrl = myVantagem.imageUrl || myVantagem.imageBase64 || '';

      if (selectedFile) {
        const compressedBase64 = await compressImage(selectedFile);
        const blob = dataURLtoBlob(compressedBase64);
        const storageRef = ref(storage, `vantagens/${currentUser?.id}/${Date.now()}_${selectedFile.name}`);
        const uploadSnap = await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(uploadSnap.ref);
      }

      await updateDoc(doc(db, 'vantagens', myVantagem.id), {
        description: formData.description.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        address: formData.address.trim(),
        category: formData.category.trim(),
        imageUrl: imageUrl,
        imageBase64: imageUrl,
        updatedAt: serverTimestamp()
      });

      toast.success("Anúncio atualizado com sucesso!", { id: toastId });
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao guardar. Verifique as permissões.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return toast.error("As passwords não coincidem.");
    if (newPass.length < 6) return toast.error("Mínimo 6 caracteres.");

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        toast.success("Password alterada com sucesso!");
        setNewPass('');
        setConfirmPass('');
        setShowSecurityForm(false);
      } else {
        toast.error("Sessão não encontrada.");
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Por segurança, faça logout e entre novamente para mudar a password.");
      } else {
        toast.error("Erro ao alterar password.");
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#00d66f]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      <header className="bg-[#0a2540] p-6 text-white flex items-center justify-between border-b-8 border-amber-500 shadow-xl rounded-b-[30px]">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-2xl text-[#0a2540]">
            <Crown size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Painel do Parceiro VIP</h1>
            <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">
              {myVantagem?.partnerName || currentUser?.name || 'Parceiro'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSecurityForm(!showSecurityForm)}
            className={`p-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all ${showSecurityForm ? 'bg-amber-500 text-[#0a2540]' : 'bg-white/10 text-amber-300 hover:bg-white/20'}`}
          >
            <Lock size={16} /> Segurança
          </button>
          <button onClick={handleLogout} className="p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 mt-8">
        {showSecurityForm && (
          <div className="bg-white rounded-[40px] border-4 border-amber-500 shadow-xl p-8 animate-in slide-in-from-top-4">
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] mb-6 flex items-center gap-2"><Key className="text-amber-500" /> Alterar Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <input required type="password" placeholder="Nova Password (mín. 6 caracteres)" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" />
              <input required type="password" placeholder="Confirmar Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500" />
              <button type="submit" className="w-full bg-amber-500 text-[#0a2540] p-4 rounded-2xl font-black uppercase text-sm shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> Guardar Nova Password
              </button>
            </form>
          </div>
        )}

        {myVantagem ? (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540] p-8 animate-in fade-in">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8 flex items-center gap-3">
              <Crown className="text-amber-500" size={28} /> Editar o Meu Anúncio
            </h2>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Parceiro</label>
                <input
                  type="text"
                  value={myVantagem.partnerName}
                  disabled
                  className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-[9px] text-slate-400 ml-2">O nome é gerido pelo Administrador.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="Ex: Saúde, Lazer..."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Website (Opcional)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Morada (Opcional)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Morada completa"
                    className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Texto das Vantagens</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva as vantagens exclusivas para membros Vizinho+..."
                  rows={5}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 resize-none"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Fotografia / Logotipo</label>
                <div className="relative h-48 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[30px] overflow-hidden group hover:border-amber-500 transition-colors">
                  {preview ? (
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={48} className="mb-2" />
                      <span className="text-[10px] font-black uppercase">Clique para alterar a imagem</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm shadow-xl hover:bg-black transition-all flex justify-center items-center gap-3 border-b-8 border-black/30 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Guardar Alterações do Anúncio</>}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] border-4 border-dashed border-slate-200 p-20 text-center">
            <Crown size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black uppercase text-slate-400 text-lg">Nenhum anúncio associado a esta conta.</p>
            <p className="text-sm font-bold text-slate-300 mt-2">Contacte o administrador.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PartnerDashboard;