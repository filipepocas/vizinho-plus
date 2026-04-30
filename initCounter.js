// initCounter.js
const admin = require('firebase-admin');
const serviceAccount = require('./caminho-para-a-chave.json'); // Substituir pelo caminho real

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initCounter() {
  const usersSnapshot = await db.collection('users').get();
  const count = usersSnapshot.size;
  
  await db.doc('system/stats').set({
    membersCount: count,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`Contador inicializado com ${count} membros.`);
}

initCounter().catch(console.error);