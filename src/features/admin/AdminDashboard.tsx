// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  
  // Estados para o novo lojista
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');

  // Carregar lojistas em tempo real
  useEffect(() => {
    const q = query(collection(db, 'merchants'));
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
        createdAt: new Date(),
        status: 'active'
      });
      setShopName('');
      setMerchantEmail('');
      setMerchantNif('');
      alert('Loja registada com sucesso!');
    } catch (error) {
      console.error("Erro ao adicionar loja:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-vplus-blue text-white p-6 shadow-xl border-b-4 border-vplus-green">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black uppercase italic">Master Admin: Filipe Rocha</h1>
          <span className="bg-white text-vplus-blue px-3 py-1 font-black text-xs uppercase">Modo Cloud Ativo</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: REGISTO DE NOVAS LOJAS */}
        <section className="lg:col-span-1">
          <div className="bg-white p-6 border-4 border-vplus-blue shadow-[8px_8px_0px_0px_rgba(28,48,92,1)]">
            <h2 className="text-xl font-black mb-6 uppercase border-b-2 border-vplus-blue pb-2">Novo Lojista</h2>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase">Nome da Loja</label>
                <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-green outline-none" placeholder="Ex: Pastelaria Central" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase">Email de Acesso</label>
                <input value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-green outline-none" placeholder="loja@email.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase">NIF da Empresa</label>
                <input value={merchantNif} onChange={e => setMerchantNif(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-green outline-none" placeholder="500600700" />
              </div>
              <button type="submit" className="w-full bg-vplus-green text-vplus-blue p-3 font-black uppercase hover:bg-vplus-blue hover:text-white transition-colors">
                Registar Parceiro
              </button>
            </form>
          </div>
        </section>

        {/* COLUNA 2 e 3: LISTAGEM E AUDITORIA */}
        <section className="lg:col-span-2 space-y-8">
          {/* LISTA DE LOJAS */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h2 className="font-black uppercase mb-4 text-gray-400">Lojistas Parceiros ({merchants.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchants.map((m: any) => (
                <div key={m.id} className="p-4 bg-vplus-blue-light border-l-4 border-vplus-blue flex justify-between items-center">
                  <div>
                    <p className="font-black text-vplus-blue uppercase">{m.shopName}</p>
                    <p className="text-[10px] font-mono">{m.email}</p>
                  </div>
                  <span className="text-[8px] bg-vplus-green px-2 py-1 font-black">ATIVO</span>
                </div>
              ))}
            </div>
          </div>

          {/* ÚLTIMAS VENDAS CLOUD */}
          <div className="bg-white border-2 border-vplus-blue overflow-hidden">
            <div className="bg-vplus-blue text-white p-3 font-black uppercase text-xs">Auditoria Cloud em Tempo Real</div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-gray-50 font-black uppercase">
                  <th className="p-3">Data</th>
                  <th className="p-3">Cartão</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-right">Cashback</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 font-bold">{t.clientId}</td>
                    <td className="p-3 text-right font-bold">{t.amount.toFixed(2)}€</td>
                    <td className="p-3 text-right font-black text-vplus-green">{t.cashbackAmount.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;