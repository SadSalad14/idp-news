// js/firebase.js
const projectId  = window.APP_CONFIG?.firebase?.projectId;
const forceDemo  = window.APP_CONFIG?.forceDemo === true;

export const isDemoMode = forceDemo || !projectId || projectId === '';

const firebase = window.firebase;
let auth = null;
let db   = null;

if (!isDemoMode) {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.APP_CONFIG.firebase);
    }
    auth = firebase.auth();
    db   = firebase.firestore();

    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
            console.warn('Persistência offline indisponível:', err.code);
        }
    });
} else {
    console.info('Modo demo ativo.');
}

export { firebase, auth, db };
