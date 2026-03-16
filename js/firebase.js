// js/firebase.js
// Firebase 8 compat é carregado como scripts globais no index.html.
// As credenciais vêm de js/config.js (carregado antes dos módulos).
//
// MODO DEMO: quando projectId não está configurado, o site funciona com
// dados de exemplo locais. Todas as interações ficam só na memória.

const _projectId = window.APP_CONFIG?.firebase?.projectId;

// isDemoMode = true quando não há Firebase configurado (ex: GitHub Pages sem config real)
export const isDemoMode = !_projectId || _projectId === '';

let auth = null;
let db   = null;

if (!isDemoMode) {
    const firebaseConfig = window.APP_CONFIG.firebase;

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    db   = firebase.firestore();

    db.enablePersistence({ synchronizeTabs: true })
      .catch(err => {
          if (err.code === 'failed-precondition') console.warn('Persistência offline: múltiplas abas abertas.');
          else if (err.code === 'unimplemented')  console.warn('Persistência offline não suportada.');
      });
} else {
    console.info('ℹ️ idp.news rodando em MODO DEMO — dados locais, sem Firebase.');
}

export { firebase, auth, db };
