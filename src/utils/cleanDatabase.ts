// src/utils/cleanDatabase.ts
import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';

export const cleanUserProfiles = async () => {
  console.log("Iniciando limpeza molecular da base de dados...");
  
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of querySnapshot.docs) {
      const data = userDoc.data();
      const userRef = doc(db, 'users', userDoc.id);

      // 1. LIMPEZA PARA COMERCIANTES (MERCHANT)
      if (data.role === 'merchant') {
        console.log(`Limpando perfil de Comerciante: ${data.name || userDoc.id}`);
        await updateDoc(userRef, {
          // Remove campos que são exclusivos de Clientes
          wallet: deleteField(),
          customerNumber: deleteField(),
          // Garante que campos essenciais existem
          status: data.status || 'active',
          cashbackPercent: data.cashbackPercent || 0
        });
      }

      // 2. LIMPEZA PARA CLIENTES (CLIENT)
      if (data.role === 'client' || data.role === 'user') {
        console.log(`Limpando perfil de Cliente: ${data.email || userDoc.id}`);
        await updateDoc(userRef, {
          role: 'client', // Unifica 'user' para 'client'
          // Remove campos que são exclusivos de Comerciantes
          category: deleteField(),
          cashbackPercent: deleteField(),
          operators: deleteField(),
          // Garante que a carteira existe
          wallet: data.wallet || { available: 0, pending: 0 }
        });
      }
      
      // 3. CASO O USER NÃO TENHA ROLE (O teu caso da Loja Teste)
      if (!data.role) {
        console.log(`Corrigindo utilizador sem role: ${userDoc.id}`);
        // Se tiver categoria, assumimos que é Merchant
        const assumedRole = data.category ? 'merchant' : 'client';
        await updateDoc(userRef, { role: assumedRole });
      }
    }
    
    console.log("Limpeza concluída com sucesso!");
    alert("Base de dados higienizada!");
  } catch (error) {
    console.error("Erro na limpeza:", error);
  }
};