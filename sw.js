// sw.js
// IMPORTANTE: sempre que fizer deploy de arquivos novos, mude o número da versão.
// Isso força todos os visitantes a receberem os arquivos atualizados automaticamente.
const CACHE_NAME = 'idpnews-v3.0';

// Arquivos que ficam no cache para funcionar offline
// config.js está FORA desta lista de propósito — ele nunca deve ser cacheado
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/auth.js',
    './js/firebase.js',
    './js/state.js',
    './js/geo.js',
    './js/noticias.js',
    './js/publicacao.js',
    './js/votacao.js',
    './js/ui.js',
    './js/demo-data.js',
    './js/data.json',
    './favicon_io/android-chrome-192x192.png',
    './favicon_io/android-chrome-512x512.png'
];

// Arquivos que NUNCA devem ser cacheados — sempre buscados da rede
const nuncaCachear = [
    'config.js'
];

self.addEventListener('install', event => {
    // Ativa imediatamente sem esperar a aba ser fechada
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(nomes => Promise.all(
                nomes
                    .filter(nome => nome !== CACHE_NAME)
                    .map(nome => caches.delete(nome))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;

    const url = event.request.url;

    // config.js e recursos externos (Firebase, CDN) — sempre da rede
    const deveBuscarDaRede =
        nuncaCachear.some(arquivo => url.includes(arquivo)) ||
        url.includes('firestore.googleapis.com') ||
        url.includes('firebasestorage.googleapis.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('cdnjs.cloudflare.com') ||
        url.includes('google.com/recaptcha');

    if (deveBuscarDaRede) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Recursos locais: cache primeiro, atualiza em background
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
