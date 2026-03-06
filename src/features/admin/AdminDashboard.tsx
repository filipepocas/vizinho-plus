// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');
  const [shopLogo, setShopLogo] = useState(''); // Novo estado para o Logo

  useEffect(() => {
    const q = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMerchants(list);
    });
    return () => unsubscribe();
  }, []);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !merchantEmail) return;

    try {
      await addDoc(collection(db, 'merchants'), {
        shopName,
        email: merchantEmail,
        nif: merchantNif,
        logoUrl: shopLogo || 'https://via.placeholder.com/150', // Logo ou placeholder
        createdAt: new Date(),
        status: 'active'
      });
      setShopName('');
      setMerchantEmail('');
      setMerchantNif('');
      setShopLogo('');
      alert('Loja registada com sucesso!');
    } catch (error) {
      console.error("Erro ao adicionar loja:", error);
    }
  };

  const getMerchantTotal = (merchantId: string) => {
    return transactions
      .filter(t => t.merchantId === merchantId)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-mono">
      <header className="bg-vplus-blue text-white p-6 shadow-xl border-b-4 border-vplus-green">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">CENTRAL VIZINHO+</h1>
          <button onClick={() => window.location.href='/login'} className="bg-red-500 px-3 py-1 text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* FORMULÁRIO */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 border-4 border-vplus-blue shadow-[8px_8px_0px_0px_rgba(28,48,92,1)]">
            <h2 className="text-lg font-black mb-4 uppercase text-vplus-blue border-b-2 border-gray-100 pb-2">Novo Parceiro</h2>
            <form onSubmit={handleAddMerchant} className="space-y-4 text-xs">
              <div>
                <label className="font-black uppercase block mb-1">Nome Comercial</label>
                <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" />
              </div>
              <div>
                <label className="font-black uppercase block mb-1">E-mail de Acesso</label>
                <input value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" />
              </div>
              <div>
                <label className="font-black uppercase block mb-1">URL do Logotipo (Imagem)</label>
                <input value={shopLogo} onChange={e => setShopLogo(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" placeholder="https://link-da-imagem.png" />
              </div>
              <button type="submit" className="w-full bg-vplus-blue text-white p-3 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-all">Registar</button>
            </form>
          </div>
        </aside>

        {/* LISTAGEM */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white border-2 border-gray-200">
            <div className="p-4 bg-gray-50 border-b-2 border-gray-200 font-black uppercase text-xs">Performance dos Parceiros</div>
            <div className="divide-y divide-gray-100">
              {merchants.map((m: any) => (
                <div key={m.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <img src={m.logoUrl} alt="logo" className="w-12 h-12 border-2 border-vplus-blue object-cover" />
                    <div>
                      <h4 className="font-black text-vplus-blue uppercase">{m.shopName}</h4>
                      <p className="text-[10px] font-mono text-gray-400">{m.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black">Vendas: {getMerchantTotal(m.id).toFixed(2)}€</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;