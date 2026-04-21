import React, { useState, useEffect } from 'react';
import { db, provisionAuth } from '../../config/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { CheckCircle2, XCircle, Store, Mail, Phone, MapPin, Hash, Loader2, AlertCircle, Percent, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { MerchantRequest } from '../../types';

const AdminMerchantRequests: React.FC = () => {
  const [requests, setRequests] = useState<MerchantRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'merchant_requests'));
    // Correção: Adicionado (snap: any) para o modo estrito
    const unsub = onSnapshot(q, (snap: any) => {
      // Correção: Adicionado (d: any) para o modo estrito
      setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MerchantRequest)));
    });
    return () => unsub();
  }, []);

  const handleApprove = async (req: MerchantRequest) => {
    if (!window.confirm(`Aprovar a loja ${req.shopName} e criar conta definitiva?`)) return;
    setLoadingId(req.id!);
    try {
      // O lojista já definiu a password no registo (Landing Page), aqui usamos a que ele escolheu
      // Se por algum motivo não houver, usamos a padrão de segurança
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, req.email.trim(), req.password || 'Mudar1234!');
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: req.shopName.trim(),
        shopName: req.shopName.trim(),
        responsibleName: req.responsibleName.trim(),
        phone: req.phone.trim(),
        email: req.email.toLowerCase().trim(),
        nif: req.nif.trim(),
        role: 'merchant',
        status: 'active', // Passa a estar ativo após aprovação do admin
        category: req.category,
        cashbackPercent: Number(req.cashbackPercent) || 5,
        // PONTO 1: Gravação das Zonas Oficiais
        distrito: (req as any).distrito || '',
        concelho: (req as any).concelho || '',
        freguesia: req.freguesia.trim(),
        zipCode: req.zipCode.trim(),
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      await deleteDoc(doc(db, 'merchant_requests', req.id!));
      toast.success('Lojista aprovado e conta criada com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao aprovar: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Rejeitar e apagar este pedido? Esta ação é irreversível.")) return;
    setLoadingId(id);
    try {
      await deleteDoc(doc(db, 'merchant_requests', id));
      toast.success('Pedido rejeitado.');
    } catch (err) {
      toast.error('Erro ao rejeitar pedido.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6">Pedidos de Adesão Pendentes</h2>
      
      {requests.length === 0 ? (
         <div className="p-20 bg-white border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center gap-4 text-slate-300">
            <AlertCircle size={64} />
            <p className="font-black uppercase tracking-[0.3em] text-sm">Nenhum pedido pendente</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {requests.map(req => (
            <div key={req.id} className="bg-white border-4 border-[#0a2540] rounded-[40px] p-8 shadow-[8px_8px_0px_0px_#0a2540] relative">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-slate-100">
                <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                  <Store size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">{req.shopName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Resp: {req.responsibleName}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase"><Tag size={16} className="text-[#00d66f]" /> Categoria: {req.category}</div>
                <div className="my-2 border-b border-slate-200"></div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase"><Mail size={16} className="text-[#00d66f]" /> {req.email}</div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase"><Phone size={16} className="text-[#00d66f]" /> {req.phone}</div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase"><Hash size={16} className="text-[#00d66f]" /> NIF: {req.nif}</div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase"><MapPin size={16} className="text-[#00d66f]" /> {(req as any).distrito} &gt; {(req as any).concelho} &gt; {req.freguesia} ({req.zipCode})</div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => handleApprove(req)} disabled={loadingId === req.id} className="flex-1 bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_#0a2540] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]">
                  {loadingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} strokeWidth={3} /> Aprovar e Ativar Loja</>}
                </button>
                <button onClick={() => handleReject(req.id!)} disabled={loadingId === req.id} className="px-6 bg-white text-red-500 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 shadow-sm border-2 border-red-200 transition-all flex items-center justify-center gap-2">
                   <XCircle size={16} strokeWidth={3} /> Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMerchantRequests;