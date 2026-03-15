// js/firebase.js
// Firebase 8 compat é carregado como scripts globais no index.html.
// As credenciais vêm de js/config.js (carregado antes dos módulos).

if (!window.APP_CONFIG?.firebase?.projectId) {
    console.error(
        '❌ Configuração ausente!\n' +
        'Copie js/config.example.js → js/config.js e preencha suas credenciais.'
    );
}

const firebaseConfig = window.APP_CONFIG?.firebase ?? {};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();

// Habilita persistência offline (PWA)
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
      if (err.code === 'failed-precondition') {
          console.warn('Persistência offline: múltiplas abas abertas.');
      } else if (err.code === 'unimplemented') {
          console.warn('Persistência offline não suportada neste browser.');
      }
  });

export { firebase, auth, db };
