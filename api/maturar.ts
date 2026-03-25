import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// 1. Inicializar o Firebase Admin (Seguro)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // SEGURANÇA: Verifica se a chamada vem da Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const agora = new Date();
    // Definir o início do mês atual (ex: 1 de Abril às 00:00)
    const inicioDesteMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    // 2. Procurar transações pendentes de meses ANTERIORES
    const snapshot = await db.collection('transactions')
      .where('status', '==', 'pending')
      .where('type', '==', 'earn')
      .where('createdAt', '<', inicioDesteMes)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'Nada para maturar hoje.' });
    }

    const batch = db.batch();
    
    // 3. Processar cada transação
    snapshot.docs.forEach((txDoc) => {
      const txData = txDoc.data();
      const valor = Number(txData.cashbackAmount);
      const clientId = txData.clientId;
      const merchantId = txData.merchantId;

      // A. Atualizar transação para 'available'
      batch.update(txDoc.ref, { 
        status: 'available', 
        maturedAt: admin.firestore.FieldValue.serverTimestamp() 
      });

      // B. Atualizar saldos do Utilizador
      const userRef = db.collection('users').doc(clientId);
      batch.update(userRef, {
        [`wallet.available`]: admin.firestore.FieldValue.increment(valor),
        [`wallet.pending`]: admin.firestore.FieldValue.increment(-valor),
        [`storeWallets.${merchantId}.available`]: admin.firestore.FieldValue.increment(valor),
        [`storeWallets.${merchantId}.pending`]: admin.firestore.FieldValue.increment(-valor),
      });
    });

    await batch.commit();

    return res.status(200).json({ 
      message: `Sucesso! ${snapshot.size} transações maturadas.` 
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}