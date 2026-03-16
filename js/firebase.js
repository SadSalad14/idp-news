// js/firebase.js
// Inicializa o Firebase e detecta se está em modo demo (sem credenciais configuradas).

const projectId = window.APP_CONFIG?.firebase?.projectId;

// Modo demo: ativo quando não há Firebase configurado (ex: GitHub Pages sem config real)
export const isDemoMode = !projectId || projectId === '';

// Declara como variável local para poder exportar do módulo
const firebase = window.firebase;

let auth = null;
let db   = null;

if (!isDemoMode) {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.APP_CONFIG.firebase);
    }

    auth = firebase.auth();
    db   = firebase.firestore();

    // Permite uso offline (PWA)
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
            console.warn('Persistência offline indisponível:', err.code);
        }
    });
} else {
    console.info('Modo demo ativo — dados locais, sem Firebase.');
}

export { firebase, auth, db };
