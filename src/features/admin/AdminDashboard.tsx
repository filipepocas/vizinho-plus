// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  
  // Estados para o novo lojista
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');

  // Carregar lojistas em tempo real do Firebase
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
        createdAt: new Date(),
        status: 'active'
      });
      setShopName('');
      setMerchantEmail('');
      setMerchantNif('');
      alert('Loja parceira registada com sucesso!');
    } catch (error) {
      console.error("Erro ao adicionar loja:", error);
    }
  };

  // Função para calcular o total de vendas de uma loja específica
  const getMerchantTotal = (merchantId: string) => {
    return transactions
      .filter(t => t.merchantId === merchantId)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-vplus-blue text-white p-6 shadow-xl border-b-4 border-vplus-green">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">CENTRAL DE CONTROLO VIZINHO+</h1>
            <p className="text-vplus-green text-[10px] font-bold uppercase">Admin: Filipe Rocha</p>
          </div>
          <button onClick={() => window.location.href='/login'} className="bg-red-500 px-3 py-1 text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* COLUNA ESQUERDA: CADASTRO */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 border-4 border-vplus-blue shadow-[8px_8px_0px_0px_rgba(28,48,92,1)]">
            <h2 className="text-lg font-black mb-4 uppercase text-vplus-blue border-b-2 border-gray-100 pb-2">Novo Parceiro</h2>
            <form onSubmit={handleAddMerchant} className="space-y-4 text-xs">
              <div>
                <label className="font-black uppercase block mb-1">Nome Comercial</label>
                <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" placeholder="Ex: Café Central" />
              </div>
              <div>
                <label className="font-black uppercase block mb-1">E-mail de Acesso</label>
                <input value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" placeholder="loja@vizinho.pt" />
              </div>
              <div>
                <label className="font-black uppercase block mb-1">NIF</label>
                <input value={merchantNif} onChange={e => setMerchantNif(e.target.value)} className="w-full border-2 border-gray-200 p-2 font-bold focus:border-vplus-blue outline-none" placeholder="510000000" />
              </div>
              <button type="submit" className="w-full bg-vplus-blue text-white p-3 font-black uppercase hover:bg-vplus-green hover:text-vplus-blue transition-all">
                Criar Acesso
              </button>
            </form>
          </div>
        </aside>

        {/* COLUNA DIREITA: DADOS E TABELAS */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* GRUPO DE CARDS DE RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 border-2 border-gray-200">
              <h3 className="text-[10px] font-black uppercase text-gray-400">Volume Total de Vendas</h3>
              <p className="text-4xl font-black text-vplus-blue">
                {transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}€
              </p>
            </div>
            <div className="bg-vplus-green-light p-6 border-2 border-vplus-green">
              <h3 className="text-[10px] font-black uppercase text-vplus-blue opacity-50">Cashback Acumulado</h3>
              <p className="text-4xl font-black text-vplus-blue">
                {transactions.reduce((acc, t) => acc + t.cashbackAmount, 0).toFixed(2)}€
              </p>
            </div>
          </div>

          {/* LISTA DE LOJISTAS COM AUDITORIA DE VENDAS */}
          <div className="bg-white border-2 border-gray-200">
            <div className="p-4 bg-gray-50 border-b-2 border-gray-200 font-black uppercase text-xs">Lojistas Ativos & Performance</div>
            <div className="divide-y divide-gray-100">
              {merchants.map((m: any) => (
                <div key={m.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <h4 className="font-black text-vplus-blue uppercase">{m.shopName}</h4>
                    <p className="text-[10px] font-mono text-gray-400">{m.email} | NIF: {m.nif}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black">Vendas: {getMerchantTotal(m.id).toFixed(2)}€</p>
                    <span className="text-[8px] bg-vplus-blue text-white px-2 py-0.5 font-bold rounded">ATIVO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ÚLTIMAS 5 TRANSAÇÕES CLOUD */}
          <div className="bg-white border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white p-2 font-black uppercase text-[10px] tracking-widest">Logs de Transações Recentes</div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 font-black border-b border-black uppercase text-[9px]">
                <tr>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Loja</th>
                  <th className="p-3">Cartão</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 font-mono">{t.createdAt.toLocaleString()}</td>
                    <td className="p-3 font-bold uppercase">{t.merchantName || '---'}</td>
                    <td className="p-3">{t.clientId}</td>
                    <td className="p-3 text-right font-black text-vplus-green">+{t.cashbackAmount.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;